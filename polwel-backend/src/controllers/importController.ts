import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { PrismaClient, CourseStatus, CourseRunType, VenueType, FeeType, PaymentMode, EnrollmentStatus, AttendanceStatus, OrganizationType, UserRole, UserStatus, CourseRunFeeType } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse an Excel date serial or string into a JS Date representing UTC midnight of that calendar date.
 * The result is used as a calendar-date container only; time is added by buildDatetime()
 * which treats times as SGT (UTC+8) and converts to UTC.
 */
function parseExcelDate(value: unknown): Date | null {
  if (value == null || value === '') return null;

  if (typeof value === 'number') {
    // Strip any fractional time component from combined date+time Excel serials
    const intSerial = Math.floor(value);
    const d = (XLSX.SSF as any).parse_date_code(intSerial) as { y: number; m: number; d: number } | null;
    if (d && d.y > 1899) return new Date(Date.UTC(d.y, d.m - 1, d.d));
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const monthMap: Record<string, number> = {
      jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12,
    };

    // "2-Jan-25" or "2-Jan-2025"
    const m1 = trimmed.match(/^(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{2,4})$/);
    if (m1 && m1[1] && m1[2] && m1[3]) {
      const day = parseInt(m1[1], 10);
      const month = monthMap[m1[2].toLowerCase()];
      let year = parseInt(m1[3], 10);
      if (year < 100) year += 2000;
      if (month) return new Date(Date.UTC(year, month - 1, day));
    }

    // ISO "YYYY-MM-DD" (possibly with trailing time/timezone we ignore)
    const isoM = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/);
    if (isoM && isoM[1] && isoM[2] && isoM[3]) {
      return new Date(Date.UTC(parseInt(isoM[1], 10), parseInt(isoM[2], 10) - 1, parseInt(isoM[3], 10)));
    }

    // "DD/MM/YYYY" or "MM/DD/YYYY" — treat first part > 12 as day (DD/MM)
    const slashM = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (slashM && slashM[1] && slashM[2] && slashM[3]) {
      let year = parseInt(slashM[3], 10);
      if (year < 100) year += 2000;
      const a = parseInt(slashM[1], 10);
      const b = parseInt(slashM[2], 10);
      const [day, month] = a > 12 ? [a, b] : [b, a];
      if (month >= 1 && month <= 12) return new Date(Date.UTC(year, month - 1, day));
    }

    // "DD-MM-YYYY"
    const dashM = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
    if (dashM && dashM[1] && dashM[2] && dashM[3]) {
      let year = parseInt(dashM[3], 10);
      if (year < 100) year += 2000;
      const a = parseInt(dashM[1], 10);
      const b = parseInt(dashM[2], 10);
      const [day, month] = a > 12 ? [a, b] : [b, a];
      if (month >= 1 && month <= 12) return new Date(Date.UTC(year, month - 1, day));
    }
  }

  return null;
}

/**
 * Build a full datetime by combining a UTC-midnight date with an Excel time value.
 *
 * TIMEZONE STRATEGY: Singapore Time (SGT, UTC+8)
 * Times from Excel are treated as Singapore local time and converted to UTC for storage.
 * Example: Excel "09:00" (SGT) → stored as T01:00:00.000Z (09:00 - 8h = 01:00 UTC)
 * All display code uses timeZone: 'Asia/Singapore' so T01:00:00Z renders as "09:00 SGT".
 *
 * Supports:
 *  - Excel fractional day (0.375 = 9:00 AM)
 *  - String: "9:00", "09:00", "9:00:00", "09:00 AM", "5:00 PM"
 *  - Falls back to 09:00 SGT (T01:00:00Z) if unparseable
 */
function buildDatetime(date: Date | null, timeStr: unknown): Date | null {
  if (!date) return null;

  let hours = 9;   // default 09:00 SGT
  let minutes = 0;

  if (typeof timeStr === 'number' && timeStr >= 0 && timeStr < 1) {
    // Excel fractional day: e.g. 0.375 = 9:00 AM
    const totalMinutes = Math.round(timeStr * 24 * 60);
    hours = Math.floor(totalMinutes / 60) % 24;
    minutes = totalMinutes % 60;
  } else {
    const timeRaw = typeof timeStr === 'string' ? timeStr.trim() : typeof timeStr === 'number' ? String(timeStr) : '';
    // Matches: "9:00", "09:00", "9:00:00", "9:00 AM", "17:00 PM"
    const match = timeRaw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(AM|PM))?$/i);
    if (match && match[1] && match[2]) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
      const ampm = (match[3] ?? '').toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    }
    // If no match, falls through with hours=9, minutes=0 (09:00 SGT default)
  }

  // Clamp to valid range
  hours = Math.min(23, Math.max(0, hours));
  minutes = Math.min(59, Math.max(0, minutes));

  // Treat as Singapore Time (UTC+8) and convert to UTC for storage.
  // E.g. "09:00 SGT" → stored as T01:00:00.000Z.
  // Display with timeZone:'Asia/Singapore' will show "09:00" correctly.
  const y = date.getUTCFullYear();
  const mo = date.getUTCMonth() + 1; // 1-based for string formatting
  const d = date.getUTCDate();
  const sgtStr = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+08:00`;
  return new Date(sgtStr);
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

/** Format an Excel time value (string or fractional day) for human-readable preview display */
function fmtTimeForPreview(value: unknown): string {
  if (typeof value === 'number' && value >= 0 && value < 1) {
    const totalMinutes = Math.round(value * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`;
  }
  return str(value);
}

/** Format an Excel date value (serial or string) as DD/MM/YYYY for preview display */
function fmtDateForPreview(value: unknown): string {
  const d = parseExcelDate(value);
  if (d) {
    const day = d.getUTCDate();
    const mo = d.getUTCMonth() + 1;
    const y = d.getUTCFullYear();
    return `${String(day).padStart(2, '0')}/${String(mo).padStart(2, '0')}/${y}`;
  }
  return str(value);
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
              startDatetime: startDatetime,
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
          // startDateRaw is UTC midnight of the calendar date (from parseExcelDate).
          // Since times are stored as SGT (UTC+8), we search the SGT calendar day:
          // SGT 00:00 to SGT 23:59:59 of that date, expressed in UTC.
          const y = startDateRaw.getUTCFullYear();
          const mo = startDateRaw.getUTCMonth() + 1; // 1-based
          const day = startDateRaw.getUTCDate();
          const sgtDateStr = `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayStart = new Date(`${sgtDateStr}T00:00:00+08:00`);
          const dayEnd   = new Date(`${sgtDateStr}T23:59:59.999+08:00`);

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
          where: { name: orgName, status: { not: 'INACTIVE' } },
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
        startDate: fmtDateForPreview(row['Start Date']),
        endDate: fmtDateForPreview(row['End Date']),
        startTime: fmtTimeForPreview(row['Start Time']),
        endTime: fmtTimeForPreview(row['End Time']),
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
        startDate: fmtDateForPreview(row['Course Start Date']),
        endDate: fmtDateForPreview(row['Course End Date']),
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

// ─── Course Run Learners 2 Import ─────────────────────────────────────────────
//
// Designed for SPF-format Excel exports with columns:
//   Name, Department, Designation, SPF Email Address, Contact Number,
//   Retiring Officer? (IGNORED), Payment Mode, Fees before GST,
//   Fees Remarks, PO No./ Payment Advice, Invoice No., Receipt No.,
//   Business Unit Number, Training Officer's Name, Training Officer's Email,
//   Training Officer's Phone Number, Enrollment Status, Attendance Status,
//   Course Run Title, Course Run Start Date (DD-MM-YYYY)
//
// Logic:
//   1. Upsert Learner via SPF Email Address
//   2. Upsert Organization (Department) with type SPF, creating if needed
//   3. Upsert Training Coordinator User via Training Officer's Email, creating if needed
//   4. Find ALL CourseRuns matching (Course Run Title, Start Date) — may be multiple
//   5. For each matched CourseRun:
//      a. Upsert CourseRunBilling
//      b. Per unique Invoice No. per billing: upsert CourseRunBillingEntry
//      c. Upsert CourseRunLearner, linking to the billing entry
// ─────────────────────────────────────────────────────────────────────────────

export const previewCourseRunLearners2 = async (req: Request, res: Response): Promise<void> => {
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
        name: str(row['Name']),
        department: str(row['Department']),
        designation: str(row['Designation']),
        email: str(row['SPF Email Address']),
        contactNumber: str(row['Contact Number']),
        paymentMode: str(row['Payment Mode']),
        feesBeforeGST: str(row['Fees before GST']),
        feesRemarks: str(row['Fees Remarks']),
        poNumber: str(row['PO No./ Payment Advice']),
        invoiceNo: str(row['Invoice No.']),
        receiptNo: str(row['Receipt No.']),
        buNumber: str(row['Business Unit Number']),
        trainingOfficerName: str(row["Training Officer's Name"]),
        trainingOfficerEmail: str(row["Training Officer's Email"]),
        enrollmentStatus: str(row['Enrollment Status']),
        attendanceStatus: str(row['Attendance Status']),
        courseRunTitle: str(row['Course Run Title']),
        courseRunStartDate: fmtDateForPreview(row['Course Run Start Date']),
        courseRunEndDate: row['Course Run End Date'] ? fmtDateForPreview(row['Course Run End Date']) : fmtDateForPreview(row['Course Run Start Date']),
      };
    });

    res.json({ success: true, totalRows: rawRows.length, rows });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Preview failed';
    console.error('[previewCourseRunLearners2]', error);
    res.status(500).json({ success: false, error: msg });
  }
};

export const importCourseRunLearners2 = async (req: Request, res: Response): Promise<void> => {
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
      organizationsCreated: 0,
      coordinatorsCreated: 0,
      enrollmentsCreated: 0,
      enrollmentsUpdated: 0,
      billingsCreated: 0,
      billingEntriesCreated: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; reason: string }>,
    };

    // ── In-memory caches to minimise repeated DB round-trips ──
    // key: email or "name:<fullname>"  → learnerId
    const learnerCache = new Map<string, string>();
    // key: org name → orgId
    const orgCache = new Map<string, string>();
    // key: coordinator email → userId
    const coordinatorCache = new Map<string, string>();
    // key: `${courseTitle}|${YYYY-MM-DD}` → courseRunId[]
    const courseRunCache = new Map<string, string[]>();
    // key: courseRunId → courseRunBillingId
    const billingCache = new Map<string, string>();
    // key: `${billingId}|${invoiceNumber}` → billingEntryId
    const billingEntryCache = new Map<string, string>();

    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 2;
      const raw = rawRows[i];
      if (!raw) { results.skipped++; continue; }
      const row = normalizeRow(raw);

      const learnerName = str(row['Name']);
      const courseTitle  = str(row['Course Run Title']);

      if (!learnerName || !courseTitle) {
        results.errors.push({ row: rowNum, reason: 'Missing "Name" or "Course Run Title"' });
        results.skipped++;
        continue;
      }

      const startDateObj = parseExcelDate(row['Course Run Start Date']);
      if (!startDateObj) {
        results.errors.push({ row: rowNum, reason: `Invalid or missing "Course Run Start Date": "${str(row['Course Run Start Date'])}"` });
        results.skipped++;
        continue;
      }

      const endDateObj = parseExcelDate(row['Course Run End Date']) || startDateObj;
      const endDatetime = buildDatetime(endDateObj, '18:00');

      // Parse fees early so we can use them during default Course creation if needed
      const rawFees    = str(row['Fees before GST']).replace(/[\$,\s]/g, '');
      const totalFees  = rawFees && !isNaN(parseFloat(rawFees)) ? parseFloat(rawFees) : null;

      // ─── 1. Resolve / Upsert Learner ───────────────────────────────────────
      const learnerEmail      = strOrNull(row['SPF Email Address']);
      const learnerDesig      = strOrNull(row['Designation']);
      const learnerContact    = strOrNull(row['Contact Number']);
      const learnerCacheKey   = learnerEmail ?? `name:${learnerName}`;

      let learnerId: string;
      if (learnerCache.has(learnerCacheKey)) {
        learnerId = learnerCache.get(learnerCacheKey)!;
      } else {
        const existing = learnerEmail
          ? await prisma.learner.findFirst({ where: { email: learnerEmail, deletedAt: null } })
          : await prisma.learner.findFirst({ where: { fullname: learnerName, deletedAt: null } });

        if (existing) {
          await prisma.learner.update({
            where: { id: existing.id },
            data: {
              fullname: learnerName,
              ...(learnerDesig   !== null ? { designation: learnerDesig } : {}),
              ...(learnerContact !== null ? { contact: learnerContact }   : {}),
              ...(learnerEmail   !== null ? { email: learnerEmail }       : {}),
            },
          });
          learnerId = existing.id;
          results.learnersUpdated++;
        } else {
          const created = await prisma.learner.create({
            data: { fullname: learnerName, email: learnerEmail, designation: learnerDesig, contact: learnerContact },
          });
          learnerId = created.id;
          results.learnersCreated++;
        }
        learnerCache.set(learnerCacheKey, learnerId);
      }

      // ─── 2. Resolve / Create Organization (Department = SPF unit) ──────────
      const departmentName = str(row['Department']);
      const buNumber       = strOrNull(row['Business Unit Number']);
      let clientOrganizationId: string | null = null;

      if (departmentName) {
        if (orgCache.has(departmentName)) {
          clientOrganizationId = orgCache.get(departmentName)!;
        } else {
          const existingOrg = await prisma.organization.findFirst({
            where: { name: departmentName, status: { not: 'INACTIVE' } },
          });
          if (existingOrg) {
            clientOrganizationId = existingOrg.id;
          } else {
            const newOrg = await prisma.organization.create({
              data: {
                name: departmentName,
                buNumber,
                organizationType: OrganizationType.SPF,
                status: UserStatus.ACTIVE,
              },
            });
            clientOrganizationId = newOrg.id;
            results.organizationsCreated++;
          }
          orgCache.set(departmentName, clientOrganizationId);
        }
      }

      // ─── 3. Resolve / Create Training Coordinator ──────────────────────────
      const coordName  = strOrNull(row["Training Officer's Name"]);
      const coordEmail = strOrNull(row["Training Officer's Email"]);
      const coordPhone = strOrNull(row["Training Officer's Phone Number"]);
      let trainingCoordinatorId: string | null = null;

      if (coordEmail) {
        if (coordinatorCache.has(coordEmail)) {
          trainingCoordinatorId = coordinatorCache.get(coordEmail)!;
        } else {
          // Look up by email regardless of role — avoids duplicates
          const existingUser = await prisma.user.findFirst({
            where: { email: coordEmail, deletedAt: null },
          });
          if (existingUser) {
            trainingCoordinatorId = existingUser.id;
          } else if (coordName) {
            // Auto-create with a random unusable password; coordinator must reset via email
            const tempPassword = crypto.randomBytes(16).toString('hex');
            const hashedPassword = await bcrypt.hash(tempPassword, 12);
            const newCoord = await prisma.user.create({
              data: {
                name: coordName,
                email: coordEmail,
                password: hashedPassword,
                role: UserRole.TRAINING_COORDINATOR,
                status: UserStatus.ACTIVE,
                contactNumber: coordPhone,
              },
            });
            trainingCoordinatorId = newCoord.id;
            results.coordinatorsCreated++;
          }
          if (trainingCoordinatorId) {
            coordinatorCache.set(coordEmail, trainingCoordinatorId);
          }
        }
      }

      // ─── 4. Find ALL matching CourseRuns (title + calendar date) ───────────
      const dateCacheKey = `${courseTitle}|${startDateObj.toISOString().slice(0, 10)}`;
      if (!courseRunCache.has(dateCacheKey)) {
        let course = await prisma.course.findFirst({ where: { title: courseTitle } });
        if (!course) {
          // Auto-create missing Course
          const codeSuffix = Math.floor(1000 + Math.random() * 9000);
          const cleanTitle = courseTitle.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15).toUpperCase();
          const generatedCode = `AUTO-${cleanTitle}-${codeSuffix}`;
          
          console.log(`[importCourseRunLearners2] Auto-creating missing course: "${courseTitle}" with code "${generatedCode}"`);
          course = await prisma.course.create({
            data: {
              title: courseTitle,
              courseCode: generatedCode,
              duration: '1',
              durationType: 'days',
              minParticipants: 1,
              maxParticipants: 25,
              remarks: 'Auto-created during learner import',
              certificates: 'polwel',
              defaultCourseFee: totalFees !== null ? totalFees : 0,
              venueFee: 0.0,
              status: 'ACTIVE',
            }
          });
        }

        // startDateObj is UTC midnight from parseExcelDate.
        // Times are stored as SGT (UTC+8); search the full SGT calendar day.
        const y = startDateObj.getUTCFullYear();
        const mo = startDateObj.getUTCMonth() + 1; // 1-based
        const day = startDateObj.getUTCDate();
        const sgtDateStr = `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayStart = new Date(`${sgtDateStr}T00:00:00+08:00`);
        const dayEnd   = new Date(`${sgtDateStr}T23:59:59.999+08:00`);
        
        let runs = await prisma.courseRun.findMany({
          where: { courseId: course.id, startDatetime: { gte: dayStart, lte: dayEnd }, deletedAt: null },
          orderBy: { startDatetime: 'asc' },
        });

        if (runs.length === 0) {
          // Auto-create missing CourseRun
          const dayStr = String(day).padStart(2, '0');
          const monthStr = String(mo).padStart(2, '0');
          const yearStr = String(y).slice(-2);
          const serialNumber = `${course.courseCode}-${dayStr}${monthStr}${yearStr}`;
          
          const runStart = new Date(`${sgtDateStr}T09:00:00+08:00`);
          const runEnd = new Date(`${sgtDateStr}T17:00:00+08:00`);

          console.log(`[importCourseRunLearners2] Auto-creating missing CourseRun: "${serialNumber}" for course: "${courseTitle}"`);
          const createdRun = await prisma.courseRun.create({
            data: {
              courseId: course.id,
              serialNumber,
              courseRunType: CourseRunType.OPEN,
              startDatetime: runStart,
              endDatetime: runEnd,
              status: CourseStatus.COMPLETED,
              venueType: VenueType.ON_PREMISE,
              individualRegistrationRequired: false,
              courseRunFeeType: CourseRunFeeType.PER_HEAD,
              minClassSize: 1,
              maxClassSize: 25,
            }
          });
          runs = [createdRun];
        }

        courseRunCache.set(dateCacheKey, runs.map(r => r.id));
      }

      const courseRunIds = courseRunCache.get(dateCacheKey) ?? [];
      if (courseRunIds.length === 0) {
        results.errors.push({ row: rowNum, reason: `No course run found: "${courseTitle}" on ${fmtDateForPreview(row['Course Run Start Date'])}` });
        results.skipped++;
        continue;
      }

      // ─── 5. Enrollment + Attendance Status ─────────────────────────────────
      const enrollRaw   = str(row['Enrollment Status']).toUpperCase();
      const attendRaw   = str(row['Attendance Status']).toUpperCase();
      const enrollStatus: EnrollmentStatus = enrollRaw === 'WITHDRAWN' ? EnrollmentStatus.WITHDRAWN : EnrollmentStatus.ENROLLED;
      const attendStatus: AttendanceStatus = attendRaw === 'PRESENT' ? AttendanceStatus.PRESENT
        : attendRaw === 'ABSENT' ? AttendanceStatus.ABSENT
        : AttendanceStatus.PENDING;

      // ─── 6. Financial fields ────────────────────────────────────────────────
      const feesRemarks  = strOrNull(row['Fees Remarks']);
      const invoiceNumber = strOrNull(row['Invoice No.']);
      const poNumber      = strOrNull(row['PO No./ Payment Advice']);
      const receiptNumber = strOrNull(row['Receipt No.']);
      const paymentMode   = parsePaymentMode(str(row['Payment Mode']));

      // ─── 7. For each matched CourseRun: billing + enrollment ───────────────
      for (const courseRunId of courseRunIds) {
        try {
          // Update CourseRun endDatetime (SGT)
          await prisma.courseRun.update({
            where: { id: courseRunId },
            data: { endDatetime },
          });

          // 7a. Upsert CourseRunBilling (1:1 with CourseRun)
          let billingId: string;
          if (billingCache.has(courseRunId)) {
            billingId = billingCache.get(courseRunId)!;
          } else {
            const existingBilling = await prisma.courseRunBilling.findUnique({ where: { courseRunId } });
            if (existingBilling) {
              billingId = existingBilling.id;
            } else {
              const newBilling = await prisma.courseRunBilling.create({ data: { courseRunId } });
              billingId = newBilling.id;
              results.billingsCreated++;
            }
            billingCache.set(courseRunId, billingId);
          }

          // 7b. Upsert CourseRunBillingEntry per (billingId + invoiceNumber)
          let billingEntryId: string | null = null;
          if (invoiceNumber) {
            const entryCacheKey = `${billingId}|${invoiceNumber}`;
            if (billingEntryCache.has(entryCacheKey)) {
              billingEntryId = billingEntryCache.get(entryCacheKey)!;
            } else {
              const existingEntry = await prisma.courseRunBillingEntry.findFirst({
                where: { courseRunBillingId: billingId, pbmsInvoiceNumber: invoiceNumber, deletedAt: null },
              });
              if (existingEntry) {
                billingEntryId = existingEntry.id;
              } else {
                const newEntry = await prisma.courseRunBillingEntry.create({
                  data: {
                    courseRunBillingId: billingId,
                    pbmsInvoiceNumber: invoiceNumber,
                    remarks: feesRemarks,
                  },
                });
                billingEntryId = newEntry.id;
                results.billingEntriesCreated++;
              }
              billingEntryCache.set(entryCacheKey, billingEntryId);
            }
          }

          // 7c. Upsert CourseRunLearner
          const existingEnrollment = await prisma.courseRunLearner.findUnique({
            where: { courseRunId_learnerId: { courseRunId, learnerId } },
          });

          if (existingEnrollment) {
            await prisma.courseRunLearner.update({
              where: { id: existingEnrollment.id },
              data: {
                clientOrganizationId,
                trainingCoordinatorId,
                buNumber,
                paymentMode,
                totalFees,
                feesRemarks,
                invoiceNumber,
                poNumber,
                receiptNumber,
                enrollmentStatus: enrollStatus,
                attendanceStatus: attendStatus,
                ...(billingEntryId !== null ? { courseRunBillingEntryId: billingEntryId } : {}),
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
                buNumber,
                paymentMode,
                totalFees,
                feesRemarks,
                invoiceNumber,
                poNumber,
                receiptNumber,
                enrollmentStatus: enrollStatus,
                attendanceStatus: attendStatus,
                courseRunBillingEntryId: billingEntryId,
              },
            });
            results.enrollmentsCreated++;
          }
        } catch (rowError: unknown) {
          const msg = rowError instanceof Error ? rowError.message : 'Database error';
          results.errors.push({ row: rowNum, reason: `CourseRun ${courseRunId}: ${msg}` });
        }
      }
    }

    res.json({
      success: true,
      results,
      message: [
        `${results.learnersCreated} new learners`,
        `${results.learnersUpdated} learners updated`,
        `${results.organizationsCreated} new organisations`,
        `${results.coordinatorsCreated} new coordinators`,
        `${results.enrollmentsCreated} enrollments created`,
        `${results.enrollmentsUpdated} enrollments updated`,
        `${results.billingsCreated} billing records created`,
        `${results.billingEntriesCreated} billing entries created`,
        results.skipped > 0 ? `${results.skipped} rows skipped` : null,
      ].filter(Boolean).join(', '),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Import failed';
    console.error('[importCourseRunLearners2]', error);
    res.status(500).json({ success: false, error: msg });
  }
};

// ─── Course Runs Import 2 (Complete) ──────────────────────────────────────────

function parseCourseRunFeeType(value: string): CourseRunFeeType | null {
  const map: Record<string, CourseRunFeeType> = {
    'per head': CourseRunFeeType.PER_HEAD,
    per_head: CourseRunFeeType.PER_HEAD,
    'per run': CourseRunFeeType.PER_RUN,
    per_run: CourseRunFeeType.PER_RUN,
  };
  return map[value.toLowerCase()] ?? null;
}

export const previewCourseRuns2 = async (req: Request, res: Response): Promise<void> => {
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
        courseTitle: str(row['Course Title *'] ?? row['Course Title'] ?? ''),
        serialNumber: str(row['Course Run Code'] ?? ''),
        courseRunType: str(row['Course Run Type *'] ?? row['Course Run Type'] ?? ''),
        clientOrganization: str(row['Client Organisation'] ?? ''),
        startDate: fmtDateForPreview(row['Start Date *'] ?? row['Start Date'] ?? ''),
        endDate: fmtDateForPreview(row['End Date'] ?? ''),
        startTime: fmtTimeForPreview(row['Start Time'] ?? ''),
        endTime: fmtTimeForPreview(row['End Time'] ?? ''),
        venueType: str(row['Venue Type *'] ?? row['Venue Type'] ?? ''),
        venueName: str(row['Venue Name'] ?? ''),
        specifiedLocation: str(row['Specified Location'] ?? ''),
        minClassSize: str(row['Min Class Size'] ?? ''),
        maxClassSize: str(row['Max Class Size'] ?? ''),
        indivReg: str(row['Individual Registration Required'] ?? ''),
        baseCourseFee: str(row['Base Course Fee'] ?? ''),
        courseRunFeeType: str(row['Course Run Fee Type'] ?? ''),
        venueFinalFee: str(row['Venue Final Fee'] ?? ''),
        venueMaxParticipants: str(row['Venue Max Participants'] ?? ''),
        perHeadFeeIfMaxExceed: str(row['Per Head Fee if Max Exceeded'] ?? ''),
        trainer1: str(row['Trainer 1'] ?? ''),
        trainer2: str(row['Trainer 2'] ?? ''),
        trainer3: str(row['Trainer 3'] ?? ''),
        partner1: str(row['Partner 1'] ?? ''),
        partner2: str(row['Partner 2'] ?? ''),
        partner3: str(row['Partner 3'] ?? ''),
        remarks: str(row['Remarks'] ?? ''),
        status: str(row['Course Status'] ?? ''),
      };
    });

    res.json({ success: true, totalRows: rawRows.length, rows });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Preview failed';
    res.status(500).json({ success: false, error: msg });
  }
};

export const importCourseRuns2 = async (req: Request, res: Response): Promise<void> => {
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

      const courseTitle = str(row['Course Title *'] ?? row['Course Title'] ?? '');
      if (!courseTitle) {
        results.errors.push({ row: rowNum, reason: 'Missing required field: "Course Title"' });
        results.skipped++;
        continue;
      }

      const courseRunTypeStr = str(row['Course Run Type *'] ?? row['Course Run Type'] ?? '');
      const courseRunType = parseCourseRunType(courseRunTypeStr);
      if (!courseRunType) {
        results.errors.push({ row: rowNum, reason: `Invalid Course Run Type: "${courseRunTypeStr}"` });
        results.skipped++;
        continue;
      }

      const startDateRaw = parseExcelDate(row['Start Date *'] ?? row['Start Date'] ?? '');
      if (!startDateRaw) {
        results.errors.push({ row: rowNum, reason: 'Invalid or missing "Start Date"' });
        results.skipped++;
        continue;
      }
      const endDateRaw = parseExcelDate(row['End Date'] ?? '');

      const startDatetime = buildDatetime(startDateRaw, row['Start Time'] || '09:00');
      const endDatetime = buildDatetime(endDateRaw ?? startDateRaw, row['End Time'] || '17:00');

      const venueTypeStr = str(row['Venue Type *'] ?? row['Venue Type'] ?? '');
      const venueType = parseVenueType(venueTypeStr);
      if (!venueType) {
        results.errors.push({ row: rowNum, reason: `Invalid Venue Type: "${venueTypeStr}"` });
        results.skipped++;
        continue;
      }

      // 1. Resolve Course
      const course = await prisma.course.findFirst({
        where: { title: courseTitle },
      });
      if (!course) {
        results.errors.push({ row: rowNum, reason: `Course not found: "${courseTitle}"` });
        results.skipped++;
        continue;
      }

      // 2. Resolve Serial Number
      let serialNumber = strOrNull(row['Course Run Code'] ?? '');
      if (!serialNumber && course.courseCode) {
        const dayStr = String(startDateRaw.getUTCDate()).padStart(2, '0');
        const monthStr = String(startDateRaw.getUTCMonth() + 1).padStart(2, '0');
        const yearStr = String(startDateRaw.getUTCFullYear()).slice(-2);
        serialNumber = `${course.courseCode}-${dayStr}${monthStr}${yearStr}`;
      }

      // 3. Resolve Organisation
      const clientOrgName = strOrNull(row['Client Organisation'] ?? '');
      let clientOrganizationId: string | null = null;
      if (clientOrgName) {
        const org = await prisma.organization.findFirst({
          where: { name: clientOrgName, status: { not: 'INACTIVE' } },
        });
        if (org) {
          clientOrganizationId = org.id;
        } else {
          results.errors.push({ row: rowNum, reason: `Organisation not found: "${clientOrgName}"` });
          results.skipped++;
          continue;
        }
      } else if (courseRunType !== 'OPEN') {
        results.errors.push({ row: rowNum, reason: `Client Organisation is required for Course Run Type: "${courseRunTypeStr}"` });
        results.skipped++;
        continue;
      }

      // 4. Resolve Venue
      const venueName = strOrNull(row['Venue Name'] ?? '');
      let venueId: string | null = null;
      if (venueName) {
        const venue = await prisma.venue.findFirst({
          where: { name: venueName, deletedAt: null },
        });
        if (venue) {
          venueId = venue.id;
        } else {
          results.errors.push({ row: rowNum, reason: `Venue Name not found: "${venueName}"` });
          results.skipped++;
          continue;
        }
      }

      // 5. Resolve Trainers
      const trainerNames = [
        strOrNull(row['Trainer 1']),
        strOrNull(row['Trainer 2']),
        strOrNull(row['Trainer 3']),
      ].filter((name): name is string => name !== null);

      const trainerIds: string[] = [];
      let trainerResolutionFailed = false;
      for (const tName of trainerNames) {
        const trainer = await prisma.user.findFirst({
          where: { name: tName, role: 'TRAINER', deletedAt: null },
        });
        if (trainer) {
          trainerIds.push(trainer.id);
        } else {
          results.errors.push({ row: rowNum, reason: `Trainer not found: "${tName}"` });
          trainerResolutionFailed = true;
          break;
        }
      }
      if (trainerResolutionFailed) {
        results.skipped++;
        continue;
      }

      // 5.5 Resolve Partners
      const partnerNames = [
        strOrNull(row['Partner 1']),
        strOrNull(row['Partner 2']),
        strOrNull(row['Partner 3']),
      ].filter((name): name is string => name !== null);

      const partnerIds: string[] = [];
      let partnerResolutionFailed = false;
      for (const pName of partnerNames) {
        const partner = await prisma.partner.findFirst({
          where: { name: pName, deletedAt: null },
        });
        if (partner) {
          partnerIds.push(partner.id);
        } else {
          results.errors.push({ row: rowNum, reason: `Partner not found: "${pName}"` });
          partnerResolutionFailed = true;
          break;
        }
      }
      if (partnerResolutionFailed) {
        results.skipped++;
        continue;
      }

      // 6. Parse other properties
      const specifiedLocation = strOrNull(row['Specified Location'] ?? '');
      const minClassSize = row['Min Class Size'] && !isNaN(parseInt(str(row['Min Class Size']))) ? parseInt(str(row['Min Class Size'])) : null;
      const maxClassSize = row['Max Class Size'] && !isNaN(parseInt(str(row['Max Class Size']))) ? parseInt(str(row['Max Class Size'])) : null;
      
      const indivRegStr = str(row['Individual Registration Required'] ?? '').toLowerCase();
      const individualRegistrationRequired = indivRegStr === 'yes' || indivRegStr === 'true' || indivRegStr === '1';

      const baseCourseFee = row['Base Course Fee'] && !isNaN(parseFloat(str(row['Base Course Fee']).replace(/^\$/, ''))) 
        ? parseFloat(str(row['Base Course Fee']).replace(/^\$/, '')) 
        : null;

      const courseRunFeeTypeStr = str(row['Course Run Fee Type'] ?? '');
      const courseRunFeeType = parseCourseRunFeeType(courseRunFeeTypeStr);

      const venueFinalFee = row['Venue Final Fee'] && !isNaN(parseFloat(str(row['Venue Final Fee']).replace(/^\$/, '')))
        ? parseFloat(str(row['Venue Final Fee']).replace(/^\$/, ''))
        : null;

      const venueMaxParticipants = row['Venue Max Participants'] && !isNaN(parseInt(str(row['Venue Max Participants'])))
        ? parseInt(str(row['Venue Max Participants']))
        : null;

      const perHeadFeeIfMaxExceed = row['Per Head Fee if Max Exceeded'] && !isNaN(parseFloat(str(row['Per Head Fee if Max Exceeded']).replace(/^\$/, '')))
        ? parseFloat(str(row['Per Head Fee if Max Exceeded']).replace(/^\$/, ''))
        : null;

      const remarks = strOrNull(row['Remarks'] ?? '');
      const statusStr = str(row['Course Status'] ?? '');
      const status = statusStr ? parseCourseStatus(statusStr) : 'DRAFT';

      // 7. Look up existing Course Run
      let existing = null;
      if (serialNumber) {
        existing = await prisma.courseRun.findFirst({
          where: { serialNumber, deletedAt: null },
        });
      }
      if (!existing && startDatetime) {
        const windowStart = new Date(startDatetime.getTime() - 60 * 60 * 1000);
        const windowEnd = new Date(startDatetime.getTime() + 60 * 60 * 1000);
        existing = await prisma.courseRun.findFirst({
          where: {
            courseId: course.id,
            startDatetime: { gte: windowStart, lte: windowEnd },
            deletedAt: null,
          },
        });
      }

      try {
        const dataPayload = {
          courseId: course.id,
          serialNumber,
          courseRunType,
          clientOrganizationId,
          startDatetime,
          endDatetime,
          venueType,
          venueId,
          specifiedLocation,
          minClassSize,
          maxClassSize,
          individualRegistrationRequired,
          baseCourseFee,
          courseRunFeeType,
          venueFinalFee,
          venueMaxParticipant: venueMaxParticipants,
          perHeadFeeIfMaxExceed,
          remarks,
          status,
        };

        let courseRunId = '';
        if (existing) {
          await prisma.courseRun.update({
            where: { id: existing.id },
            data: dataPayload,
          });
          courseRunId = existing.id;
          results.updated++;
        } else {
          const created = await prisma.courseRun.create({
            data: dataPayload,
          });
          courseRunId = created.id;
          results.created++;
        }

        // 8. Handle Trainer Assignments and Fees
        // Sync assignments by deleting non-included ones and upserting included ones
        await prisma.courseRunTrainer.deleteMany({
          where: {
            courseRunId,
            trainerId: { notIn: trainerIds },
          },
        });

        for (const trainerId of trainerIds) {
          let trainerBaseAmount = baseCourseFee;
          if (trainerBaseAmount === null) {
            // Find default feePerRun from CourseTrainer
            const courseTrainer = await prisma.courseTrainer.findUnique({
              where: { courseId_trainerId: { courseId: course.id, trainerId } },
            });
            trainerBaseAmount = courseTrainer ? courseTrainer.feePerRun : 0;
          }

          await prisma.courseRunTrainer.upsert({
            where: { courseRunId_trainerId: { courseRunId, trainerId } },
            create: {
              courseRunId,
              trainerId,
              trainerBaseAmount,
            },
            update: {
              trainerBaseAmount,
            },
          });
        }

        // 9. Handle Partner Assignments
        await prisma.courseRunPartner.deleteMany({
          where: {
            courseRunId,
            partnerId: { notIn: partnerIds },
          },
        });

        for (const partnerId of partnerIds) {
          await prisma.courseRunPartner.upsert({
            where: { courseRunId_partnerId: { courseRunId, partnerId } },
            create: { courseRunId, partnerId },
            update: {},
          });
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
    console.error('[importCourseRuns2]', error);
    res.status(500).json({ success: false, error: msg });
  }
};
