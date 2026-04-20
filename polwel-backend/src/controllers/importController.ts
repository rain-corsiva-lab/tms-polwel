import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import { PrismaClient, CourseStatus, CourseRunType, VenueType, FeeType, PaymentMode, EnrollmentStatus, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse an Excel date serial or string into a JS Date, or null */
function parseExcelDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    const d = (XLSX.SSF as any).parse_date_code(value) as { y: number; m: number; d: number } | null;
    if (d) return new Date(d.y, d.m - 1, d.d);
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const monthMap: Record<string, number> = {
      jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12,
    };
    // "2-Jan-25" or "2-Jan-2025"
    const m = trimmed.match(/^(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{2,4})$/);
    if (m && m[1] && m[2] && m[3]) {
      const day = parseInt(m[1], 10);
      const month = monthMap[m[2].toLowerCase()];
      let year = parseInt(m[3], 10);
      if (year < 100) year += 2000;
      if (month) return new Date(year, month - 1, day);
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

/** Build a full datetime from a date + time string like "9:00" */
function buildDatetime(date: Date | null, timeStr: unknown): Date | null {
  if (!date) return null;
  const time = typeof timeStr === 'string' ? timeStr.trim() : typeof timeStr === 'number' ? String(timeStr) : '';
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (match && match[1] && match[2]) {
    const result = new Date(date);
    result.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
    return result;
  }
  return new Date(date);
}

/** Normalize row keys by trimming whitespace */
function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.trim()] = typeof v === 'string' ? v.trim() : v;
  }
  return out;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
}

function strOrNull(v: unknown): string | null {
  const s = str(v);
  return s || null;
}

function parseCourseStatus(value: string): CourseStatus {
  const map: Record<string, CourseStatus> = {
    completed: CourseStatus.COMPLETED,
    cancelled: CourseStatus.CANCELLED,
    active: CourseStatus.ACTIVE,
    confirmed: CourseStatus.CONFIRMED,
    draft: CourseStatus.DRAFT,
    pending: CourseStatus.PENDING,
    in_progress: CourseStatus.IN_PROGRESS,
    pending_billing: CourseStatus.PENDING_BILLING,
    incompleted: CourseStatus.INCOMPLETED,
  };
  return map[value.toLowerCase().replace(/\s+/g, '_')] ?? CourseStatus.COMPLETED;
}

function parseCourseRunType(value: string): CourseRunType | null {
  const map: Record<string, CourseRunType> = {
    open: CourseRunType.OPEN,
    dedicated: CourseRunType.DEDICATED,
    talks: CourseRunType.TALKS,
    customized: CourseRunType.CUSTOMIZED,
  };
  return map[value.toLowerCase()] ?? null;
}

function parseVenueType(value: string): VenueType | null {
  const map: Record<string, VenueType> = {
    hotel: VenueType.HOTEL,
    'on premise': VenueType.ON_PREMISE,
    'on-premise': VenueType.ON_PREMISE,
    on_premise: VenueType.ON_PREMISE,
    'client facility': VenueType.CLIENT_FACILITY,
    client_facility: VenueType.CLIENT_FACILITY,
    facility: VenueType.CLIENT_FACILITY,
    online: VenueType.ONLINE,
  };
  return map[value.toLowerCase()] ?? null;
}

function parseFeeType(value: string): FeeType | null {
  const map: Record<string, FeeType> = {
    'per head': FeeType.PER_HEAD,
    per_head: FeeType.PER_HEAD,
    'per venue': FeeType.PER_VENUE,
    per_venue: FeeType.PER_VENUE,
    fixed: FeeType.FIXED,
  };
  return map[value.toLowerCase()] ?? null;
}

function parsePaymentMode(value: string): PaymentMode | null {
  const lower = value.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '');
  const map: Record<string, PaymentMode> = {
    company_billing: PaymentMode.COMPANY_BILLING,
    credit_card: PaymentMode.CREDIT_CARD,
    bank_transfer: PaymentMode.BANK_TRANSFER,
    ultf: PaymentMode.ULTF,
    unit_local_training_fund: PaymentMode.ULTF,
    unit_local_training_fund_ultf: PaymentMode.ULTF,
    transition_dollars: PaymentMode.TRANSITION_DOLLARS,
    self_sponsored: PaymentMode.SELF_SPONSORED,
    government_funding: PaymentMode.GOVERNMENT_FUNDING,
    not_applicable: PaymentMode.NOT_APPLICABLE,
  };
  return map[lower] ?? null;
}

// ─── Course Runs Import ───────────────────────────────────────────────────────

export const importCourseRuns = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      res.status(400).json({ success: false, error: 'Empty workbook' });
      return;
    }
    const sheet = workbook.Sheets[sheetName]!;
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    const results = {
      total: rawRows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; reason: string }>,
    };

    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 2;
      const raw = rawRows[i];
      if (!raw) { results.skipped++; continue; }
      const row = normalizeRow(raw);

      const courseTitle = str(row['Course Title']);
      if (!courseTitle) {
        results.errors.push({ row: rowNum, reason: 'Missing "Course Title"' });
        results.skipped++;
        continue;
      }

      const startDateRaw = parseExcelDate(row['Start Date']);
      const endDateRaw = parseExcelDate(row['End Date']);
      if (!startDateRaw) {
        results.errors.push({ row: rowNum, reason: 'Invalid or missing "Start Date"' });
        results.skipped++;
        continue;
      }

      const startDatetime = buildDatetime(startDateRaw, row['Start Time']);
      const endDatetime = buildDatetime(endDateRaw ?? startDateRaw, row['End Time']);

      const course = await prisma.course.findFirst({
        where: { title: courseTitle },
      });
      if (!course) {
        results.errors.push({ row: rowNum, reason: `Course not found: "${courseTitle}"` });
        results.skipped++;
        continue;
      }

      const venueName = str(row['Venue']);
      let venueId: string | null = null;
      if (venueName) {
        const venue = await prisma.venue.findFirst({
          where: { name: venueName, deletedAt: null },
        });
        venueId = venue?.id ?? null;
      }

      const courseRunType = parseCourseRunType(str(row['Course Run Type']));
      const venueType = parseVenueType(str(row['Venue Type']));
      const feeType = parseFeeType(str(row['Fee Type']));
      const status = parseCourseStatus(str(row['Course Status']));
      const costRaw = str(row['Default Cost'] || row['Default Co']).replace(/^\$/, '');
      const baseCourseFee = costRaw && !isNaN(parseFloat(costRaw)) ? parseFloat(costRaw) : null;
      const indivReg = str(row['Individual Registration Required'] || row['Individual Registration Requ']).toLowerCase();
      const individualRegistrationRequired = indivReg === 'yes' || indivReg === 'true' || indivReg === '1';
      const specifiedLocation = strOrNull(row['Specified Location']);

      // Resolve trainers by name
      const trainerIds: string[] = [];
      for (const key of ['Trainer1', 'Trainer2'] as const) {
        const name = str(row[key]);
        if (!name) continue;
        const trainer = await prisma.user.findFirst({
          where: { name, role: UserRole.TRAINER, deletedAt: null },
        });
        if (trainer) trainerIds.push(trainer.id);
      }

      // Look for existing course run within 1-hour window of startDatetime
      const windowStart = new Date(startDatetime!.getTime() - 60 * 60 * 1000);
      const windowEnd = new Date(startDatetime!.getTime() + 60 * 60 * 1000);
      const existing = await prisma.courseRun.findFirst({
        where: {
          courseId: course.id,
          startDatetime: { gte: windowStart, lte: windowEnd },
          deletedAt: null,
        },
      });

      try {
        if (existing) {
          await prisma.courseRun.update({
            where: { id: existing.id },
            data: {
              venueId: venueId,
              venueType: venueType ?? null,
              courseRunType: courseRunType ?? null,
              status,
              baseCourseFee: baseCourseFee,
              feeType: feeType ?? null,
              endDatetime: endDatetime,
              specifiedLocation,
              individualRegistrationRequired,
            },
          });

          for (const trainerId of trainerIds) {
            await prisma.courseRunTrainer.upsert({
              where: { courseRunId_trainerId: { courseRunId: existing.id, trainerId } },
              create: { courseRunId: existing.id, trainerId },
              update: {},
            });
          }

          results.updated++;
        } else {
          const created = await prisma.courseRun.create({
            data: {
              courseId: course.id,
              venueId,
              venueType: venueType ?? null,
              courseRunType: courseRunType ?? null,
              status,
              baseCourseFee,
              feeType: feeType ?? null,
              startDatetime,
              endDatetime,
              specifiedLocation,
              individualRegistrationRequired,
            },
          });

          for (const trainerId of trainerIds) {
            await prisma.courseRunTrainer.create({
              data: { courseRunId: created.id, trainerId },
            });
          }

          results.created++;
        }
      } catch (rowError: unknown) {
        const msg = rowError instanceof Error ? rowError.message : 'Database error';
        results.errors.push({ row: rowNum, reason: msg });
        results.skipped++;
      }
    }

    res.json({
      success: true,
      results,
      message: `Import complete: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Import failed';
    console.error('[importCourseRuns]', error);
    res.status(500).json({ success: false, error: msg });
  }
};

// ─── Learners Import ──────────────────────────────────────────────────────────

export const importLearners = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      res.status(400).json({ success: false, error: 'Empty workbook' });
      return;
    }
    const sheet = workbook.Sheets[sheetName]!;
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    const results = {
      total: rawRows.length,
      learnersCreated: 0,
      learnersUpdated: 0,
      enrollmentsCreated: 0,
      enrollmentsUpdated: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; reason: string }>,
    };

    // Cache to reduce repeated DB calls
    const courseRunCache = new Map<string, string | null>();
    const orgCache = new Map<string, string | null>();
    const coordinatorCache = new Map<string, string | null>();

    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 2;
      const raw = rawRows[i];
      if (!raw) { results.skipped++; continue; }
      const row = normalizeRow(raw);

      const learnerName = str(row['Name']);
      const courseTitle = str(row['Course Title']);

      if (!learnerName || !courseTitle) {
        results.errors.push({ row: rowNum, reason: 'Missing "Name" or "Course Title"' });
        results.skipped++;
        continue;
      }

      const startDateRaw = parseExcelDate(row['Course Start Date']);
      if (!startDateRaw) {
        results.errors.push({ row: rowNum, reason: 'Invalid or missing "Course Start Date"' });
        results.skipped++;
        continue;
      }

      // ── Resolve Course Run ──
      const cacheKey = `${courseTitle}|${startDateRaw.toDateString()}`;
      if (!courseRunCache.has(cacheKey)) {
        const course = await prisma.course.findFirst({
          where: { title: courseTitle },
        });

        if (!course) {
          courseRunCache.set(cacheKey, null);
        } else {
          const dayStart = new Date(startDateRaw);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(startDateRaw);
          dayEnd.setHours(23, 59, 59, 999);

          const courseRun = await prisma.courseRun.findFirst({
            where: {
              courseId: course.id,
              startDatetime: { gte: dayStart, lte: dayEnd },
              deletedAt: null,
            },
            orderBy: { startDatetime: 'asc' },
          });

          courseRunCache.set(cacheKey, courseRun?.id ?? null);
        }
      }

      const courseRunId = courseRunCache.get(cacheKey) ?? null;
      if (!courseRunId) {
        results.errors.push({ row: rowNum, reason: `Course run not found: "${courseTitle}" on ${startDateRaw.toDateString()}` });
        results.skipped++;
        continue;
      }

      // ── Resolve / Create Learner ──
      const learnerEmail = strOrNull(row['Email']);
      const learnerDesignation = strOrNull(row['Designation']);
      const learnerContact = strOrNull(row['Contact']);

      let learnerId: string;
      const existingLearner = learnerEmail
        ? await prisma.learner.findFirst({ where: { email: learnerEmail, deletedAt: null } })
        : await prisma.learner.findFirst({ where: { fullname: learnerName, deletedAt: null } });

      if (existingLearner) {
        await prisma.learner.update({
          where: { id: existingLearner.id },
          data: {
            fullname: learnerName,
            designation: learnerDesignation,
            email: learnerEmail,
            contact: learnerContact,
          },
        });
        learnerId = existingLearner.id;
        results.learnersUpdated++;
      } else {
        const newLearner = await prisma.learner.create({
          data: {
            fullname: learnerName,
            designation: learnerDesignation,
            email: learnerEmail,
            contact: learnerContact,
          },
        });
        learnerId = newLearner.id;
        results.learnersCreated++;
      }

      // ── Resolve Organisation ──
      const orgName = str(row['Client Organisation Name']);
      if (orgName && !orgCache.has(orgName)) {
        const org = await prisma.organization.findFirst({
          where: { name: orgName },
        });
        orgCache.set(orgName, org?.id ?? null);
      }
      const clientOrganizationId = orgName ? (orgCache.get(orgName) ?? null) : null;

      // ── Resolve Training Coordinator ──
      const coordEmail = strOrNull(row['Training Coordinator Email']);
      if (coordEmail && !coordinatorCache.has(coordEmail)) {
        const coord = await prisma.user.findFirst({
          where: {
            email: coordEmail,
            role: UserRole.TRAINING_COORDINATOR,
            deletedAt: null,
          },
        });
        coordinatorCache.set(coordEmail, coord?.id ?? null);
      }
      const trainingCoordinatorId = coordEmail ? (coordinatorCache.get(coordEmail) ?? null) : null;

      // ── Build CourseRunLearner data ──
      const division = strOrNull(row['Division']);
      const departmentName = strOrNull(row['Department']);
      const buNumber = strOrNull(row['BU Number']);
      const paymentMode = parsePaymentMode(str(row['Payment Method']));
      const feesRemarks = strOrNull(row['Fees Remarks']);
      const invoiceNumber = strOrNull(row['Invoice']);
      const remarks = strOrNull(row['Remarks']);

      // Get current default fee from course run
      const courseRunForFee = await prisma.courseRun.findUnique({
        where: { id: courseRunId },
        select: { baseCourseFee: true },
      });
      const currentDefaultCourseFee = courseRunForFee?.baseCourseFee != null
        ? Number(courseRunForFee.baseCourseFee)
        : null;

      try {
        const existingEnrollment = await prisma.courseRunLearner.findUnique({
          where: { courseRunId_learnerId: { courseRunId, learnerId } },
        });

        if (existingEnrollment) {
          await prisma.courseRunLearner.update({
            where: { id: existingEnrollment.id },
            data: {
              clientOrganizationId,
              trainingCoordinatorId,
              division,
              departmentName,
              buNumber,
              paymentMode,
              feesRemarks,
              invoiceNumber,
              remarks,
            },
          });
          results.enrollmentsUpdated++;
        } else {
          await prisma.courseRunLearner.create({
            data: {
              courseRunId,
              learnerId,
              clientOrganizationId,
              trainingCoordinatorId,
              division,
              departmentName,
              buNumber,
              paymentMode,
              currentDefaultCourseFee,
              feesRemarks,
              invoiceNumber,
              remarks,
              enrollmentStatus: EnrollmentStatus.ENROLLED,
            },
          });
          results.enrollmentsCreated++;
        }
      } catch (rowError: unknown) {
        const msg = rowError instanceof Error ? rowError.message : 'Database error';
        results.errors.push({ row: rowNum, reason: msg });
        results.skipped++;
      }
    }

    res.json({
      success: true,
      results,
      message: `Import complete: ${results.learnersCreated} new learners, ${results.learnersUpdated} updated, ${results.enrollmentsCreated} enrollments created, ${results.enrollmentsUpdated} enrollment records updated`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Import failed';
    console.error('[importLearners]', error);
    res.status(500).json({ success: false, error: msg });
  }
};

// ─── Preview Endpoints ────────────────────────────────────────────────────────

export const previewCourseRuns = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      res.status(400).json({ success: false, error: 'Empty workbook' });
      return;
    }
    const sheet = workbook.Sheets[sheetName]!;
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    const rows = rawRows.slice(0, 100).map((rawRow, i) => {
      const row = normalizeRow(rawRow);
      return {
        rowNum: i + 2,
        courseTitle: str(row['Course Title']),
        courseRunType: str(row['Course Run Type']),
        startDate: str(row['Start Date']),
        endDate: str(row['End Date']),
        startTime: str(row['Start Time']),
        endTime: str(row['End Time']),
        status: str(row['Course Status']),
        venueType: str(row['Venue Type']),
        venue: str(row['Venue']),
        specifiedLocation: str(row['Specified Location']),
        indivReg: str(row['Individual Registration Required'] ?? row['Individual Registration Requ'] ?? ''),
        dedicatedDivision: str(row['Dedicated Division'] ?? row['Dedicated Divi'] ?? ''),
        trainer1: str(row['Trainer1']),
        trainer2: str(row['Trainer2']),
        defaultCost: str(row['Default Cost'] ?? row['Default Co'] ?? ''),
        feeType: str(row['Fee Type']),
      };
    });

    res.json({ success: true, totalRows: rawRows.length, rows });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Preview failed';
    res.status(500).json({ success: false, error: msg });
  }
};

export const previewLearners = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      res.status(400).json({ success: false, error: 'Empty workbook' });
      return;
    }
    const sheet = workbook.Sheets[sheetName]!;
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    const rows = rawRows.slice(0, 100).map((rawRow, i) => {
      const row = normalizeRow(rawRow);
      return {
        rowNum: i + 2,
        courseTitle: str(row['Course Title']),
        startDate: str(row['Course Start Date']),
        endDate: str(row['Course End Date']),
        learnerName: str(row['Name']),
        orgName: str(row['Client Organisation Name']),
        division: str(row['Division']),
        department: str(row['Department']),
        designation: str(row['Designation']),
        email: str(row['Email']),
        contact: str(row['Contact']),
        paymentMethod: str(row['Payment Method']),
        buNumber: str(row['BU Number']),
        coordinatorName: str(row['Training Coordinator Name']),
        coordinatorEmail: str(row['Training Coordinator Email']),
        coordinatorContact: str(row['Training Coordinator Contact']),
        discountName: str(row['Discount Name']),
        feesRemarks: str(row['Fees Remarks']),
        invoice: str(row['Invoice']),
        invoiceRemarks: str(row['Invoice Remarks']),
        remarks: str(row['Remarks']),
      };
    });

    res.json({ success: true, totalRows: rawRows.length, rows });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Preview failed';
    res.status(500).json({ success: false, error: msg });
  }
};
