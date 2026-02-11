// @ts-nocheck
import path from 'path';
import { promises as fs } from 'fs';
import { Request, Response } from 'express';
import {
  PrismaClient,
  CourseStatus,
  UserRole,
  Organization,
  User,
  Learner,
  CourseRunType,
  LearnerEmailStatus,
} from '@prisma/client';
import { z } from 'zod';
import { convertDecimalsToNumbers } from '../lib/decimal-converter';
import {
  courseRunWorkflowService,
  CourseRunWorkflowAction,
  CourseRunWorkflowError,
} from '../services/courseRunWorkflowService';
import EmailService from '../services/emailService';
import { buildCertificatePDFBuffer, buildCertificatesZipBuffer, generateCertificateHTML } from '../services/certificateService';

const prisma = new PrismaClient();

const SOURCE_FILE = 'src/controllers/courseRunController.ts';

const buildErrorResponse = (method: string, userMessage: string, error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const stack = error instanceof Error ? error.stack : undefined;
  const stackSnippet = stack?.split('\n').find((line) => line.includes('courseRunController'))?.trim();

  return {
    success: false,
    error: userMessage,
    details: {
      message: errorMessage,
      sourceFile: SOURCE_FILE,
      method,
      stack: stackSnippet ?? stack,
    },
  };
};

/**
 * Get billing month string from date (format: "March 2025")
 */
const getBillingMonthString = (dateInput: Date | string): string => {
  // Accept either a Date or an ISO date string
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Business rule: if the course run end date falls on or before the 7th of the month,
  // it is considered part of the previous month's billing cycle.
  // Example: end on 2 Nov => counts to October.
  const day = date.getDate();
  let year = date.getFullYear();
  let month = date.getMonth(); // 0-based

  if (day <= 7) {
    // move to previous month
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
  }

  return `${monthNames[month]} ${year}`;
};

/**
 * Find or create billing report for the given month
 */
const findOrCreateBillingReport = async (billingMonth: string): Promise<string> => {
  let billingReport = await prisma.billingReport.findFirst({
    where: {
      billingMonth,
      deletedAt: null,
    },
  });

  if (!billingReport) {
    billingReport = await prisma.billingReport.create({
      data: {
        billingMonth,
        status: 'ALL_INCOMPLETED',
      },
    });
  }

  return billingReport.id;
};

/**
 * Calculate billing report status based on connected course runs
 * ALL_COMPLETED: All course runs are COMPLETED
 * MIXED_STATUS: Some course runs are COMPLETED, some are not
 * ALL_INCOMPLETED: No course runs are COMPLETED
 */
const calculateBillingReportStatus = async (billingReportId: string): Promise<'ALL_COMPLETED' | 'MIXED_STATUS' | 'ALL_INCOMPLETED'> => {
  const billingReport = await prisma.billingReport.findUnique({
    where: { id: billingReportId },
    include: {
      courseRunBillings: {
        where: { deletedAt: null },
        include: {
          courseRun: {
            select: { status: true },
          },
        },
      },
    },
  });

  if (!billingReport || billingReport.courseRunBillings.length === 0) {
    return 'ALL_INCOMPLETED';
  }

  const completedCount = billingReport.courseRunBillings.filter(
    (billing) => billing.courseRun.status === 'COMPLETED'
  ).length;
  const totalCount = billingReport.courseRunBillings.length;

  if (completedCount === 0) {
    return 'ALL_INCOMPLETED';
  } else if (completedCount === totalCount) {
    return 'ALL_COMPLETED';
  } else {
    return 'MIXED_STATUS';
  }
};

/**
 * Calculate venue final fee based on fee type, participants, and venue limits
 */
const calculateVenueFinalFee = async (courseRunId: string): Promise<number> => {
  // Get course run with venue and learners count
  const courseRun = await prisma.courseRun.findUnique({
    where: { id: courseRunId },
    include: {
      venue: {
        select: {
          fee: true,
        },
      },
      course: {
        select: {
          venueMaxParticipants: true,
          perHeadPriceIfMaxExceed: true,
        }
      },
      courseRunLearners: {
        where: {
          enrollmentStatus: 'ENROLLED', // Only count enrolled learners
          deletedAt: null,
        },
      },
    },
  });

  if (!courseRun || !courseRun.venue) {
    return 0;
  }

  const participantCount = courseRun.courseRunLearners.length;
  const venue = courseRun.venue;

  let finalFee = venue.fee ?? 0;

  // If max participants is set and exceeded, add per-head charges
  if (courseRun.course?.venueMaxParticipants && courseRun.course?.perHeadPriceIfMaxExceed && participantCount > courseRun.course.venueMaxParticipants) {
    const excessParticipants = participantCount - courseRun.course.venueMaxParticipants;
    const excessFee = excessParticipants * Number(courseRun.course.perHeadPriceIfMaxExceed);
    finalFee += excessFee;
  }

  return finalFee;
};

/**
 * Check if trainers have schedule conflicts with existing course runs
 */
const checkTrainerAvailability = async (
  trainerIds: string[],
  startDatetime: Date | null,
  endDatetime: Date | null,
  excludeCourseRunId?: string
): Promise<{ available: boolean; conflicts: any[] }> => {
  if (!trainerIds || trainerIds.length === 0 || !startDatetime || !endDatetime) {
    return { available: true, conflicts: [] };
  }

  try {
    // Build where clause conditionally
    const whereClause: any = {
      deletedAt: null,
      courseRunTrainers: {
        some: {
          trainerId: { in: trainerIds },
          deletedAt: null,
        },
      },
      AND: [
        { startDatetime: { not: null } },
        { endDatetime: { not: null } },
      ],
    };

    // Only add id filter if excludeCourseRunId is provided
    if (excludeCourseRunId) {
      whereClause.id = { not: excludeCourseRunId };
    }

    // Find all course runs that have any of the trainers assigned
    const conflictingRuns = await prisma.courseRun.findMany({
      where: whereClause,
      include: {
        course: {
          select: {
            title: true,
            courseCode: true,
          },
        },
        courseRunTrainers: {
          where: {
            trainerId: { in: trainerIds },
            deletedAt: null,
          },
          include: {
            trainer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const conflicts: any[] = [];

    for (const run of conflictingRuns) {
      if (!run.startDatetime || !run.endDatetime) continue;

      // Check for date overlap: (start1 <= end2) AND (end1 >= start2)
      const hasOverlap =
        startDatetime <= run.endDatetime && endDatetime >= run.startDatetime;

      if (hasOverlap) {
        conflicts.push({
          courseRunId: run.id,
          serialNumber: run.serialNumber,
          courseTitle: run.course?.title,
          courseCode: run.course?.courseCode,
          startDate: run.startDatetime,
          endDate: run.endDatetime,
          trainers: run.courseRunTrainers.map((crt: any) => ({
            id: crt.trainer.id,
            name: crt.trainer.name,
          })),
        });
      }
    }

    return {
      available: conflicts.length === 0,
      conflicts,
    };
  } catch (error) {
    console.error('Error checking trainer availability:', error);
    // On error, allow the operation to proceed
    return { available: true, conflicts: [] };
  }
};

const ALLOWED_COURSE_STATUSES: CourseStatus[] = [
  'DRAFT',
  'PENDING',
  'CONFIRMED_PENDING_TA_APPROVAL',
  'ACTIVE',
  'CONFIRMED',
  'CONFIRMED_PENDING_CONFIRMATION_EMAILS',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'INCOMPLETED',
  'PENDING_BILLING'
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const calculateCourseRunDayCount = (courseRun: {
  startDatetime: Date | null;
  endDatetime: Date | null;
  course?: { duration?: string | null; durationType?: string | null } | null;
}): number => {
  let derivedFromSchedule = 0;
  const { startDatetime, endDatetime } = courseRun;

  if (startDatetime && endDatetime) {
    const start = new Date(startDatetime);
    const end = new Date(endDatetime);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start) {
      derivedFromSchedule = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
    }
  }

  const rawDuration = courseRun.course?.duration ? Number.parseFloat(courseRun.course.duration) : NaN;
  const durationType = courseRun.course?.durationType?.toLowerCase();
  let derivedFromCourse = 0;

  if (!Number.isNaN(rawDuration) && rawDuration > 0) {
    if (durationType?.startsWith('day')) {
      derivedFromCourse = Math.ceil(rawDuration);
    } else if (durationType?.startsWith('week')) {
      derivedFromCourse = Math.ceil(rawDuration * 7);
    } else if (durationType?.startsWith('month')) {
      derivedFromCourse = Math.ceil(rawDuration * 30);
    } else {
      // For hours or unspecified units, default to at least 1 instructional day
      derivedFromCourse = 1;
    }
  }

  const computed = Math.max(derivedFromSchedule, derivedFromCourse, 1);
  return computed;
};

const normalizeEmailList = (value: unknown): string[] => {
  if (!value) {
    return [];
  }

  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[;,]/)
      : [];

  const cleaned = raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);

  return Array.from(new Set(cleaned.map((item) => item.toLowerCase()))).map((lowercase) => {
    const original = cleaned.find((item) => item.toLowerCase() === lowercase);
    return original ?? lowercase;
  });
};

type AttendanceDayRecord = {
  day: number;
  attendAM: boolean;
  attendPM: boolean;
  updatedAt: string | null;
  editedBy: string | null;
  attendanceId: string | null;
};

type AttendanceLearnerRecord = {
  courseRunLearnerId: string;
  learnerId: string;
  fullName: string;
  email: string | null;
  contactNumber: string | null;
  departmentName: string | null;
  attendanceStatus: string | null;
  attendance: AttendanceDayRecord[];
};

type AttendanceSnapshot = {
  courseRunId: string;
  totalDays: number;
  days: Array<{ day: number; label: string }>;
  learners: AttendanceLearnerRecord[];
};

const loadAttendanceSnapshot = async (courseRunId: string, editorId: string | null): Promise<AttendanceSnapshot | null> => {
  const courseRun = await prisma.courseRun.findFirst({
    where: { id: courseRunId, deletedAt: null },
    include: {
      course: {
        select: {
          duration: true,
          durationType: true,
        },
      },
    },
  });

  if (!courseRun) {
    return null;
  }

  const baseDayCount = calculateCourseRunDayCount(courseRun);

  const enrollments = await prisma.courseRunLearner.findMany({
    where: {
      courseRunId,
      deletedAt: null,
      enrollmentStatus: 'ENROLLED',
    },
    include: {
      learner: {
        select: {
          id: true,
          fullname: true,
          email: true,
          contact: true,
          departmentName: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const activeLearnerIds = enrollments.map((enrollment) => enrollment.learnerId);

  if (activeLearnerIds.length > 0) {
    await prisma.courseRunLearnerAttendance.updateMany({
      where: {
        courseRunId,
        deletedAt: null,
        learnerId: {
          notIn: activeLearnerIds,
        },
      },
      data: {
        deletedAt: new Date(),
        editedBy: editorId ?? null,
      },
    });
  } else {
    await prisma.courseRunLearnerAttendance.updateMany({
      where: { courseRunId, deletedAt: null },
      data: {
        deletedAt: new Date(),
        editedBy: editorId ?? null,
      },
    });
  }

  const attendanceRecords = await prisma.courseRunLearnerAttendance.findMany({
    where: {
      courseRunId,
      deletedAt: null,
    },
  });

  const recordedMaxDay = attendanceRecords.reduce((max, record) => Math.max(max, record.day), 0);
  const totalDays = Math.max(baseDayCount, recordedMaxDay, 1);

  const attendanceMap = new Map<string, typeof attendanceRecords[number]>();
  for (const record of attendanceRecords) {
    attendanceMap.set(`${record.learnerId}-${record.day}`, record);
  }

  const learners: AttendanceLearnerRecord[] = enrollments.map((enrollment) => {
    const learner = enrollment.learner;
    const attendance: AttendanceDayRecord[] = [];

    for (let day = 1; day <= totalDays; day += 1) {
      const key = `${enrollment.learnerId}-${day}`;
      const record = attendanceMap.get(key);
      attendance.push({
        day,
        attendAM: record?.attendAM ?? false,
        attendPM: record?.attendPM ?? false,
        updatedAt: record?.updatedAt ? record.updatedAt.toISOString() : null,
        editedBy: record?.editedBy ?? null,
        attendanceId: record?.id ?? null,
      });
    }

    return {
      courseRunLearnerId: enrollment.id,
      learnerId: enrollment.learnerId,
      fullName: learner?.fullname ?? 'Unknown Learner',
      email: learner?.email ?? null,
      contactNumber: learner?.contact ?? null,
      departmentName: enrollment.departmentName ?? learner?.departmentName ?? null,
      attendanceStatus: enrollment.attendanceStatus ?? null,
      attendance,
    };
  });

  const days = Array.from({ length: totalDays }, (_, index) => ({
    day: index + 1,
    label: `Day ${index + 1}`,
  }));

  return {
    courseRunId,
    totalDays,
    days,
    learners,
  };
};

// Validation schemas
const getCourseRunsSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['startDatetime', 'updatedAt']).optional().default('startDatetime'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

const createCourseRunSchema = z.object({
  serialNumber: z.string().optional().nullable(),
  courseRunType: z.enum(['OPEN', 'DEDICATED', 'TALKS', 'CUSTOMIZED']).optional().nullable(),
  courseId: z.string().optional(),
  startDatetime: z.string().nullable().optional(),
  endDatetime: z.string().nullable().optional(),
  venueId: z.string().nullable().optional(),
  venueType: z.enum(['HOTEL', 'ON_PREMISE', 'CLIENT_FACILITY']).nullable().optional(),
  specifiedLocation: z.string().nullable().optional(),
  minClassSize: z.number().nullable().optional(),
  maxClassSize: z.number().nullable().optional(),
  individualRegistrationRequired: z.boolean().nullable().optional(),
  remarks: z.string().nullable().optional(),
  baseCourseFee: z.number().nullable().optional(),
  courseRunFeeType: z.enum(['PER_RUN', 'PER_HEAD']).nullable().optional(),
  venueFee: z.number().nullable().optional(),
  venueMaxParticipant: z.number().int().min(1).nullable().optional(),
  perHeadFeeIfMaxExceed: z.number().nullable().optional(),
  venuePerHeadIfExceed: z.number().nullable().optional(),
  contractFees: z.number().nullable().optional(),
  otherFee: z.number().nullable().optional(),
  adminFee: z.number().nullable().optional(),
  contingencyFee: z.number().nullable().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'CONFIRMED_PENDING_TA_APPROVAL', 'ACTIVE', 'CONFIRMED', 'CONFIRMED_PENDING_CONFIRMATION_EMAILS', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ARCHIVED', 'PUBLISHED', 'ONGOING']).optional().nullable(),
  billingReportId: z.string().nullable().optional(),
  clientOrganizationId: z.string().nullable().optional(),
  trainers: z
    .array(
      z.object({
        trainerId: z.string(),
        trainerBaseAmount: z.number().nullable().optional(),
        additionalCost: z.number().nullable().optional(),
      })
    )
    .optional()
    .nullable(),
});

const cancelCourseRunSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(5, 'Please provide a short reason (min 5 characters).')
      .max(2000, 'Reason cannot exceed 2000 characters.')
      .optional(),
  })
  .optional();

const workflowActionSchema = z.object({
  action: z.string().min(1, 'Action is required.'),
  sendEmails: z.boolean().optional(),
});

const saveAttendanceSchema = z.object({
  day: z.coerce.number().int().min(1),
  records: z
    .array(
      z.object({
        learnerId: z.string().min(1),
        attendAM: z.boolean().optional(),
        attendPM: z.boolean().optional(),
      })
    )
    .min(1, 'At least one participant attendance record is required'),
});

export const courseRunController = {
  // Get all course runs with pagination, search, and filters
  async getAll(req: Request, res: Response) {
    try {
  const { page, limit, search, status, startDate, endDate, sortBy, sortOrder } = getCourseRunsSchema.parse(req.query);
      const skip = (page - 1) * limit;

      // Build where clause for filtering
      const where: any = {
        deletedAt: null, // Only get non-deleted course runs
      };

      // Add search functionality across serial number, course details, and venue metadata
      const searchTerm = typeof search === 'string' ? search.trim() : '';
      if (searchTerm) {
        where.OR = [
          {
            serialNumber: {
              contains: searchTerm,
            },
          },
          {
            course: {
              is: {
                title: {
                  contains: searchTerm,
                },
              },
            },
          },
          {
            course: {
              is: {
                courseCode: {
                  contains: searchTerm,
                },
              },
            },
          },
          {
            course: {
              is: {
                category: {
                  contains: searchTerm,
                },
              },
            },
          },
          {
            venue: {
              is: {
                name: {
                  contains: searchTerm,
                },
              },
            },
          },
          {
            venue: {
              is: {
                address: {
                  contains: searchTerm,
                },
              },
            },
          },
        ];
      }

      // Check if user is POLWEL ops user (has course-runs-operations permission but limited access)
      // POLWEL ops users should only see IN_PROGRESS courses and only their own learners
      let hasOpsPermission = false;
      if (req.user && req.user.role === 'POLWEL' && req.user.permissions) {
        const userPerms = req.user.permissions instanceof Set 
          ? Array.from(req.user.permissions) 
          : Array.isArray(req.user.permissions) 
            ? req.user.permissions 
            : [];
        // Check if user has course-runs-operations permission (but not full POLWEL access)
        // This indicates they are ops users with limited access
        const permStrings = userPerms.map((p: any) => 
          typeof p === 'string' ? p.toLowerCase() : (p?.permissionName || '').toLowerCase()
        );
        hasOpsPermission = permStrings.some((p: string) => 
          p.includes('course-runs-operations') || p.includes('course.run')
        ) && !permStrings.some((p: string) => p === 'course-run.view' || p === 'course.run.view');
      }

      // Add status filter
      const normalizedStatus = status && typeof status === 'string' ? status.toUpperCase() : undefined;
      
      console.log('[CourseRuns] Received status param:', status);
      console.log('[CourseRuns] Normalized status:', normalizedStatus);
      console.log('[CourseRuns] Is POLWEL ops user:', hasOpsPermission);
      
      // For POLWEL ops users, force IN_PROGRESS status only
      if (hasOpsPermission) {
        where.status = CourseStatus.IN_PROGRESS;
      } else if (normalizedStatus) {
        // Check if status is comma-separated (multiple statuses)
        if (normalizedStatus.includes(',')) {
          const statusArray = normalizedStatus.split(',').map(s => s.trim()).filter(s => 
            ALLOWED_COURSE_STATUSES.includes(s as CourseStatus)
          );
          
          console.log('[CourseRuns] Parsed status array:', statusArray);
          
          if (statusArray.length > 0) {
            where.status = {
              in: statusArray as CourseStatus[],
            };
          } else {
            // Invalid statuses provided, default to exclude PENDING_BILLING, COMPLETED, INCOMPLETED, and CANCELLED
            where.status = {
              notIn: [CourseStatus.PENDING_BILLING, CourseStatus.COMPLETED, CourseStatus.INCOMPLETED, CourseStatus.CANCELLED],
            };
          }
        } else if (ALLOWED_COURSE_STATUSES.includes(normalizedStatus as CourseStatus)) {
          // Single status filter
          where.status = normalizedStatus as CourseStatus;
        } else {
          // Invalid single status, default to exclude PENDING_BILLING, COMPLETED, INCOMPLETED, and CANCELLED
          where.status = {
            notIn: [CourseStatus.PENDING_BILLING, CourseStatus.COMPLETED, CourseStatus.INCOMPLETED, CourseStatus.CANCELLED],
            };
        }
      } else {
        // When no specific status filter is provided, exclude PENDING_BILLING, COMPLETED, INCOMPLETED, and CANCELLED
        // These are shown in separate views, not in the main course runs list
        where.status = {
          notIn: [CourseStatus.PENDING_BILLING, CourseStatus.COMPLETED, CourseStatus.INCOMPLETED, CourseStatus.CANCELLED],
        };
      }
      
      console.log('[CourseRuns] Final where.status:', JSON.stringify(where.status));

      // Add date range filters
      if (startDate) {
        where.startDatetime = {
          ...where.startDatetime,
          gte: new Date(startDate),
        };
      }
      if (endDate) {
        where.endDatetime = {
          ...where.endDatetime,
          lte: new Date(endDate),
        };
      }

      // When sorting by startDatetime ascending (Upcoming), only show future course runs
      if (sortBy === 'startDatetime' && sortOrder === 'asc') {
        const now = new Date();
        where.startDatetime = {
          ...where.startDatetime,
          gte: now,
        };
      }

      // Get course runs with related data. Prisma's count() has trouble with some relation filters
      // that include case-insensitive `mode`, so derive the total by selecting matching IDs instead.
      const [courseRuns, matchingIds] = await Promise.all([
        prisma.courseRun.findMany({
          where,
          include: {
            course: {
              select: {
                id: true,
                title: true,
                courseCode: true,
                category: true,
              },
            },
            venue: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
            courseRunLearners: {
              where: {
                enrollmentStatus: 'ENROLLED',
                deletedAt: null,
              },
              select: {
                id: true,
              },
            },
            _count: {
              select: {
                courseRunLearners: {
                  where: {
                    enrollmentStatus: 'ENROLLED',
                    deletedAt: null,
                  },
                },
              },
            },
          },
          orderBy: {
            [sortBy]: sortOrder,
          },
          skip,
          take: limit,
        }),
        prisma.courseRun.findMany({
          where,
          select: { id: true },
        }),
      ]);

      const total = matchingIds.length;

      // Check which TALKS course runs have trainer assignment emails sent
      const talksCourseRunIds = courseRuns
        .filter(run => run.courseRunType === 'TALKS')
        .map(run => run.id);

      let talksWithTrainerEmails = new Set<string>();
      if (talksCourseRunIds.length > 0) {
        const trainerEmailHistory = await prisma.trainerAssignmentEmailHistory.findMany({
          where: {
            courseRunId: { in: talksCourseRunIds },
            deletedAt: null,
          },
          select: {
            courseRunId: true,
          },
          distinct: ['courseRunId'],
        });

        talksWithTrainerEmails = new Set(
          trainerEmailHistory.map(history => history.courseRunId)
        );
      }

      // Format the response
      const formattedCourseRuns = courseRuns.map(run => {
        const course = run.course || { id: null, title: 'Untitled Course', courseCode: null, category: null };
        const venue = run.venue || null;
        const currentParticipants = (run as any)._count && (run as any)._count.courseRunLearners ? (run as any)._count.courseRunLearners : 0;
        const availableActions = courseRunWorkflowService.getAvailableActions({
          status: run.status,
          learnerEmailStatus: (run.learnerEmailStatus || LearnerEmailStatus.PENDING) as LearnerEmailStatus,
          startDatetime: run.startDatetime,
          endDatetime: run.endDatetime,
          deletedAt: run.deletedAt,
        });

        return {
          id: run.id,
          serialNumber: run.serialNumber,
          courseRunType: run.courseRunType,
          course: {
            id: course.id,
            title: course.title,
            courseCode: course.courseCode,
            category: course.category,
          },
          startDatetime: run.startDatetime,
          endDatetime: run.endDatetime,
          venue: venue ? {
            id: venue.id,
            name: venue.name,
            address: venue.address,
          } : null,
          venueType: run.venueType,
          specifiedLocation: run.specifiedLocation,
          minClassSize: run.minClassSize,
          maxClassSize: run.maxClassSize,
          currentParticipants,
          status: run.status,
          learnerEmailStatus: run.learnerEmailStatus,
          cancelReason: run.cancelReason,
          cancelledAt: run.cancelledAt,
          statusLastEvaluatedAt: run.statusLastEvaluatedAt,
          createdAt: run.createdAt,
          updatedAt: run.updatedAt,
          baseCourseFee: run.baseCourseFee,
          courseRunFeeType: run.courseRunFeeType,
          // Only set hasTrainerAssignmentEmailSent for TALKS course runs
          hasTrainerAssignmentEmailSent: run.courseRunType === 'TALKS' 
            ? talksWithTrainerEmails.has(run.id) 
            : undefined,
          workflow: {
            availableActions,
          },
        };
      });

      const totalPages = Math.ceil(total / limit);

      // Convert Decimal fields to numbers for JSON serialization
      const convertedCourseRuns = convertDecimalsToNumbers(formattedCourseRuns);

      res.setHeader('Content-Type', 'application/json');
      res.json({
        success: true,
        courseRuns: JSON.parse(JSON.stringify(convertedCourseRuns)),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error('Error fetching course runs:', error);
      res.status(500).json(buildErrorResponse('courseRunController.getAll', 'Failed to fetch course runs', error));
    }
  },

  // Get single course run by ID
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      const courseRun = await prisma.courseRun.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        include: {
          course: true,
          venue: true,
          clientOrganization: {
            select: {
              id: true,
              name: true,
              buNumber: true,
            },
          },
          courseRunTrainers: {
            include: {
              trainer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          courseRunPartners: {
            include: {
              partner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          courseRunLearners: {
            where: {
              deletedAt: null,
            },
            include: {
              learner: {
                select: {
                  id: true,
                  fullname: true,
                  email: true,
                  designation: true,
                  contact: true,
                  departmentName: true,
                  clientOrganizationId: true,
                  trainingCoordinatorId: true,
                  clientOrganization: {
                    select: {
                      id: true,
                      name: true,
                      buNumber: true,
                    },
                  },
                  trainingCoordinator: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      contactNumber: true,
                    },
                  },
                },
              },
            },
          },
          courseRunBilling: {
            include: {
              courseRunBillingEntries: {
                include: {
                  courseRunLearners: {
                    where: {
                      deletedAt: null,
                    },
                    include: {
                      learner: {
                        select: {
                          id: true,
                          fullname: true,
                          email: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!courseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      const availableActions = courseRunWorkflowService.getAvailableActions({
        status: courseRun.status,
        learnerEmailStatus: courseRun.learnerEmailStatus,
        startDatetime: courseRun.startDatetime,
        endDatetime: courseRun.endDatetime,
        deletedAt: courseRun.deletedAt,
      });

      const transformedCourseRun = {
        ...courseRun,
        courseRunLearners: courseRun.courseRunLearners?.map((enrollment: any) => {
          const learner = enrollment.learner;
          const clientOrganization = learner?.clientOrganization || null;
          const coordinator = learner?.trainingCoordinator || null;

          return {
            ...enrollment,
            departmentName: enrollment.departmentName ?? learner?.departmentName ?? null,
            learner: learner
              ? {
                  ...learner,
                  contactNumber: learner.contact || null,
                  contact: learner.contact || null,
                  departmentName: learner.departmentName ?? enrollment.departmentName ?? null,
                  clientOrganizationId: learner.clientOrganizationId || null,
                  clientOrganization,
                  clientOrganizationName: clientOrganization?.name || null,
                  clientOrganizationBuNumber: clientOrganization?.buNumber || null,
                  paymentMode: enrollment.paymentMode || null,
                  trainingCoordinatorId: learner.trainingCoordinatorId || null,
                  trainingCoordinator: coordinator
                    ? {
                        ...coordinator,
                        contactNumber: coordinator.contactNumber || null,
                      }
                    : null,
                }
              : null,
          };
        }),
        workflow: {
          availableActions,
          learnerEmailStatus: courseRun.learnerEmailStatus,
          statusLastEvaluatedAt: courseRun.statusLastEvaluatedAt,
        },
      };

      // Convert Decimal fields to numbers for JSON serialization
      const finalCourseRun = convertDecimalsToNumbers(transformedCourseRun);

      // Send response with proper JSON serialization
      res.setHeader('Content-Type', 'application/json');
      res.json({
        success: true,
        courseRun: JSON.parse(JSON.stringify(finalCourseRun)),
      });
    } catch (error) {
      console.error('Error fetching course run:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';
      console.error('Error stack:', errorStack);
      res.status(500).json(buildErrorResponse('courseRunController.getById', 'Failed to fetch course run', error));
    }
  },

  // Create new course run
  async create(req: Request, res: Response) {
    try {
      const data = createCourseRunSchema.parse(req.body);

      // Extract trainers array before creating course run
      const trainers = data.trainers || [];
      delete (data as any).trainers; // Remove from data to avoid Prisma error

      // Convert date strings to Date objects if provided
      const courseRunData: any = {
        ...data,
        startDatetime: data.startDatetime ? new Date(data.startDatetime) : null,
        endDatetime: data.endDatetime ? new Date(data.endDatetime) : null,
      };

      if (!courseRunData.status) {
        courseRunData.status = courseRunWorkflowService.determineDefaultStatus(
          (courseRunData.courseRunType as CourseRunType | undefined) ?? null
        );
      }

      if (!courseRunData.learnerEmailStatus) {
        courseRunData.learnerEmailStatus = LearnerEmailStatus.PENDING;
      }

      courseRunData.statusLastEvaluatedAt = new Date();
      courseRunData.learnerEmailStatusUpdatedAt = new Date();

      const courseRun = await prisma.courseRun.create({
        data: courseRunData,
        include: {
          course: {
            select: {
              id: true,
              title: true,
              courseCode: true,
            },
          },
          venue: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Create trainer assignments if provided
      if (trainers.length > 0) {
        await prisma.courseRunTrainer.createMany({
          data: trainers.map((t: any) => ({
            courseRunId: courseRun.id,
            trainerId: t.trainerId,
            trainerBaseAmount: t.trainerBaseAmount ?? null,
            additionalCost: t.additionalCost ?? null,
          })),
        });
      }

      // Venue final fee is calculated on-demand and not persisted

      // Convert Decimal fields to numbers for JSON serialization
      const convertedCourseRun = convertDecimalsToNumbers(courseRun);

      res.status(201).setHeader('Content-Type', 'application/json').json({
        success: true,
        courseRun: JSON.parse(JSON.stringify(convertedCourseRun)),
        message: 'Course run created successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error creating course run:', errorMessage);
      if (error instanceof Error && error.stack) {
        console.error('Stack trace:', error.stack);
      }
      res.status(500).json(buildErrorResponse('courseRunController.create', 'Failed to create course run', error));
    }
  },

  // Update course run
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      // Check if course run exists
      const existingCourseRun = await prisma.courseRun.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!existingCourseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      const data = createCourseRunSchema.partial().parse(req.body);

      // Convert date strings to Date objects if provided
      const courseRunData: any = {
        ...data,
        startDatetime: data.startDatetime ? new Date(data.startDatetime) : undefined,
        endDatetime: data.endDatetime ? new Date(data.endDatetime) : undefined,
      };

      const courseRun = await prisma.courseRun.update({
        where: { id: id },
        data: courseRunData,
        include: {
          course: {
            select: {
              id: true,
              title: true,
              courseCode: true,
            },
          },
          venue: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Venue final fee is calculated on-demand and not persisted

      const convertedCourseRun = convertDecimalsToNumbers(courseRun);

      res.setHeader('Content-Type', 'application/json').json({
        success: true,
        courseRun: JSON.parse(JSON.stringify(convertedCourseRun)),
        message: 'Course run updated successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error updating course run:', errorMessage);
      if (error instanceof Error && error.stack) {
        console.error('Stack trace:', error.stack);
      }
      res.status(500).json(buildErrorResponse('courseRunController.update', 'Failed to update course run', error));
    }
  },

  async performWorkflowAction(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      if (!req.user?.userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required to perform workflow actions',
        });
        return;
      }

      const payload = workflowActionSchema.parse(req.body ?? {});
      const normalizedAction = payload.action.trim().toUpperCase() as CourseRunWorkflowAction;

      const actionPayload: Parameters<typeof courseRunWorkflowService.performAction>[1] = {
        courseRunId: id,
        action: normalizedAction,
        actorId: req.user.userId,
      };

      if (typeof payload.sendEmails === 'boolean') {
        actionPayload.sendEmails = payload.sendEmails;
      }

      const result = await courseRunWorkflowService.performAction(prisma, actionPayload);

      const workflow = {
        availableActions: courseRunWorkflowService.getAvailableActions({
          status: result.courseRun.status,
          learnerEmailStatus: result.courseRun.learnerEmailStatus,
          startDatetime: result.courseRun.startDatetime,
          endDatetime: result.courseRun.endDatetime,
          deletedAt: result.courseRun.deletedAt,
        }),
        learnerEmailStatus: result.courseRun.learnerEmailStatus,
        statusLastEvaluatedAt: result.courseRun.statusLastEvaluatedAt,
      };

      const convertedResult = convertDecimalsToNumbers({
        ...result.courseRun,
        workflow,
      });

      res.setHeader('Content-Type', 'application/json').json({
        success: true,
        courseRun: JSON.parse(JSON.stringify(convertedResult)),
        action: result.action,
        emailReport: result.emailReport,
        message: `${result.action.label} completed successfully`,
      });
    } catch (error) {
      if (error instanceof CourseRunWorkflowError) {
        res.status(409).json({
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
        });
        return;
      }

      console.error('Error performing course run workflow action:', error);
      res
        .status(500)
        .json(buildErrorResponse('courseRunController.performWorkflowAction', 'Failed to perform workflow action', error));
    }
  },

  async getWorkflowState(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      const courseRun = await prisma.courseRun.findFirst({
        where: { id, deletedAt: null },
        select: {
          id: true,
          status: true,
          learnerEmailStatus: true,
          startDatetime: true,
          endDatetime: true,
          deletedAt: true,
          statusLastEvaluatedAt: true,
        },
      });

      if (!courseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      res.json({
        success: true,
        workflow: {
          status: courseRun.status,
          learnerEmailStatus: courseRun.learnerEmailStatus,
          statusLastEvaluatedAt: courseRun.statusLastEvaluatedAt,
          availableActions: courseRunWorkflowService.getAvailableActions(courseRun),
        },
      });
    } catch (error) {
      console.error('Error fetching workflow state:', error);
      res
        .status(500)
        .json(buildErrorResponse('courseRunController.getWorkflowState', 'Failed to load workflow state', error));
    }
  },

  // Cancel course run (soft delete)
  async cancel(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      // Check if course run exists
      const existingCourseRun = await prisma.courseRun.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!existingCourseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      const payload = cancelCourseRunSchema?.parse(req.body) ?? {};
      const reason = payload?.reason?.trim() || null;
      const actorId = req.user?.userId ?? null;

      // Update status to CANCELLED
      const courseRun = await prisma.courseRun.update({
        where: { id: id },
        data: {
          status: 'CANCELLED',
          cancelReason: reason,
          cancelledById: actorId,
          cancelledAt: new Date(),
          learnerEmailStatus: LearnerEmailStatus.NOT_REQUIRED,
          learnerEmailStatusUpdatedAt: new Date(),
          statusLastEvaluatedAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              courseCode: true,
            },
          },
          venue: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const availableActions = courseRunWorkflowService.getAvailableActions({
        status: courseRun.status,
        learnerEmailStatus: courseRun.learnerEmailStatus,
        startDatetime: courseRun.startDatetime,
        endDatetime: courseRun.endDatetime,
        deletedAt: courseRun.deletedAt,
      });

      // Send cancellation emails to learners and trainers
      try {
        // Fetch enrolled learners
        const enrollments = await prisma.courseRunLearner.findMany({
          where: {
            courseRunId: id,
            enrollmentStatus: { not: 'WITHDRAWN' },
          },
          include: {
            learner: {
              select: {
                id: true,
                fullname: true,
                email: true,
              },
            },
          },
        });

        // Fetch assigned trainers
        const trainers = await prisma.courseRunTrainer.findMany({
          where: { courseRunId: id },
          include: {
            trainer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        // Send emails to learners
        const learnerEmailPromises = enrollments.map((enrollment) => {
          const emailParams: any = {
            email: enrollment.learner.email ?? '',
            learnerName: enrollment.learner.fullname,
            courseTitle: courseRun.course?.title || 'Course',
            cancellationReason: reason || 'unforeseen circumstances',
          };
          if (courseRun.course?.courseCode) emailParams.courseCode = courseRun.course.courseCode;
          if (courseRun.serialNumber) emailParams.serialNumber = courseRun.serialNumber;
          if (courseRun.startDatetime) emailParams.startDate = new Date(courseRun.startDatetime);
          if (courseRun.endDatetime) emailParams.endDate = new Date(courseRun.endDatetime);
          if (courseRun.venue?.name) emailParams.venueName = courseRun.venue.name;
          
          return EmailService.sendCourseCancellationEmail(emailParams).catch((err) => {
            console.error(`Failed to send cancellation email to learner ${enrollment.learner.email}:`, err);
            return false;
          });
        });

        // Send emails to trainers
        const trainerEmailPromises = trainers.map((trainerAssignment) => {
          const emailParams: any = {
            email: trainerAssignment.trainer.email ?? '',
            learnerName: trainerAssignment.trainer.name ?? 'Trainer',
            courseTitle: courseRun.course?.title || 'Course',
            cancellationReason: reason || 'unforeseen circumstances',
          };
          if (courseRun.course?.courseCode) emailParams.courseCode = courseRun.course.courseCode;
          if (courseRun.serialNumber) emailParams.serialNumber = courseRun.serialNumber;
          if (courseRun.startDatetime) emailParams.startDate = new Date(courseRun.startDatetime);
          if (courseRun.endDatetime) emailParams.endDate = new Date(courseRun.endDatetime);
          if (courseRun.venue?.name) emailParams.venueName = courseRun.venue.name;
          
          return EmailService.sendCourseCancellationEmail(emailParams).catch((err) => {
            console.error(`Failed to send cancellation email to trainer ${trainerAssignment.trainer.email}:`, err);
            return false;
          });
        });

        await Promise.all([...learnerEmailPromises, ...trainerEmailPromises]);
        console.log(`Sent cancellation emails to ${enrollments.length} learners and ${trainers.length} trainers`);
      } catch (emailError) {
        console.error('Error sending cancellation emails:', emailError);
        // Don't fail the cancellation if emails fail
      }

      res.json({
        success: true,
        courseRun: {
          ...courseRun,
          workflow: {
            availableActions,
            learnerEmailStatus: courseRun.learnerEmailStatus,
            statusLastEvaluatedAt: courseRun.statusLastEvaluatedAt,
          },
        },
        message: 'Course run cancelled successfully',
      });
    } catch (error) {
      console.error('Error cancelling course run:', error);
      res.status(500).json(buildErrorResponse('courseRunController.cancel', 'Failed to cancel course run', error));
    }
  },

  // Delete course run (soft delete)
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      // Check if course run exists
      const existingCourseRun = await prisma.courseRun.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!existingCourseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      // Soft delete
      const courseRun = await prisma.courseRun.update({
        where: { id: id },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Course run deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting course run:', error);
      res.status(500).json(buildErrorResponse('courseRunController.delete', 'Failed to delete course run', error));
    }
  },

  // Get status options for filters
  async getStatusOptions(req: Request, res: Response) {
    try {
      const statusOptions = ALLOWED_COURSE_STATUSES;

      res.json({
        success: true,
        statusOptions,
      });
    } catch (error) {
      console.error('Error fetching status options:', error);
      res.status(500).json(buildErrorResponse('courseRunController.getStatusOptions', 'Failed to fetch status options', error));
    }
  },

  // Enroll single learner
  async enrollLearner(req: Request, res: Response): Promise<void> {
    try {
      // Support either :courseRunId or legacy :id param
      const courseRunId = (req.params as any).courseRunId || (req.params as any).id;
      const { mode, data } = req.body;

      if (!courseRunId) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      if (mode !== 'single') {
        res.status(400).json({
          success: false,
          error: 'Invalid enrollment mode',
        });
        return;
      }

      // Create or find learner
      let learner;
      if (data.selectedLearnerId) {
        learner = await prisma.learner.findUnique({
          where: { id: data.selectedLearnerId },
        });
      } else {
        // Check if learner with same email already exists
        const existingLearner = await prisma.learner.findFirst({
          where: { 
            email: data.email,
            deletedAt: null
          },
        });

        if (existingLearner) {
          res.status(400).json({
            success: false,
            error: `A learner with email ${data.email} already exists. Please select the existing learner or use a different email.`,
          });
          return;
        }

        // Create new learner
        const coordinatorId = data.trainingCoordinatorId && typeof data.trainingCoordinatorId === 'string' && data.trainingCoordinatorId.trim() 
          ? data.trainingCoordinatorId 
          : null;
        
        console.log(`[enrollLearner] Creating learner with trainingCoordinatorId: ${coordinatorId === null ? 'NULL' : coordinatorId}`);
        
        learner = await prisma.learner.create({
          data: {
            fullname: data.fullName,
            designation: data.designation,
            email: data.email,
            contact: data.contactNumber,
            clientOrganizationId: data.division,
            departmentName: data.departmentName,
            trainingCoordinatorId: coordinatorId,
          },
        });
        
        console.log(`[enrollLearner] Learner created with ID: ${learner.id}`);
      }

      if (!learner) {
        res.status(404).json({
          success: false,
          error: 'Learner not found',
        });
        return;
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.courseRunLearner.findUnique({
        where: {
          courseRunId_learnerId: {
            courseRunId,
            learnerId: learner.id,
          },
        },
      });

      if (existingEnrollment) {
        res.status(400).json({
          success: false,
          error: 'Learner is already enrolled in this course run',
        });
        return;
      }

      // Create enrollment
      const enrollment = await prisma.courseRunLearner.create({
        data: {
          courseRunId,
          learnerId: learner.id,
          paymentMode: data.paymentMode && data.paymentMode.trim() ? data.paymentMode : null,
          currentDefaultCourseFee: data.currentDefaultCourseFee,
          discountId: data.discountId,
          discountPercentage: data.discountPercentage,
          discountAmount: data.currentDefaultCourseFee * (data.discountPercentage / 100),
          totalFees: data.totalFees,
          feesRemarks: data.feesRemarks && data.feesRemarks.trim() ? data.feesRemarks : null,
          invoiceNumber: data.invoiceNumber && data.invoiceNumber.trim() ? data.invoiceNumber : null,
          remarks: data.remarks && data.remarks.trim() ? data.remarks : null,
          departmentName: data.departmentName && data.departmentName.trim() ? data.departmentName : (learner.departmentName || null),
          enrollmentStatus: 'ENROLLED',
        },
      });

      // Recalculate and update venue final fee
      // Venue final fee is calculated on-demand and not persisted

      res.json({
        success: true,
        message: 'Learner enrolled successfully',
        enrollment,
        learner,
      });
    } catch (error) {
      console.error('Error enrolling learner:', error);
      res.status(500).json(buildErrorResponse('courseRunController.enrollLearner', 'Failed to enroll learner', error));
    }
  },

  // Enroll multiple learners (group)
  async enrollLearners(req: Request, res: Response): Promise<void> {
    try {
      const courseRunId = (req.params as any).courseRunId || (req.params as any).id;
      const { mode, data } = req.body;

      if (!courseRunId) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      if (mode !== 'group') {
        res.status(400).json({
          success: false,
          error: 'Invalid enrollment mode',
        });
        return;
      }

      const enrollments = [];
      const createdLearners = [];
      const errors = [];

      for (const learnerData of data.learners) {
        // Create or find learner
        let learner;
        if (learnerData.selectedLearnerId) {
          learner = await prisma.learner.findUnique({
            where: { id: learnerData.selectedLearnerId },
          });
        } else {
          // Check if learner with same email already exists
          const existingLearner = await prisma.learner.findFirst({
            where: { 
              email: learnerData.email,
              deletedAt: null
            },
          });

          if (existingLearner) {
            errors.push({
              email: learnerData.email,
              name: learnerData.fullName,
              reason: `A learner with this email already exists`
            });
            continue;
          }

          // Create new learner
          const coordinatorId = data.trainingCoordinatorId && typeof data.trainingCoordinatorId === 'string' && data.trainingCoordinatorId.trim() 
            ? data.trainingCoordinatorId 
            : null;
          
          console.log(`[enrollLearners] Creating learner ${learnerData.email} with trainingCoordinatorId: ${coordinatorId === null ? 'NULL' : coordinatorId}`);
          
          learner = await prisma.learner.create({
            data: {
              fullname: learnerData.fullName,
              designation: learnerData.designation,
              email: learnerData.email,
              contact: learnerData.contactNumber,
              clientOrganizationId: data.division,
              departmentName: data.departmentName,
              trainingCoordinatorId: coordinatorId,
            },
          });
          createdLearners.push(learner);
        }

        if (!learner) {
          continue; // Skip if learner not found/created
        }

        // Check if already enrolled
        const existingEnrollment = await prisma.courseRunLearner.findUnique({
          where: {
            courseRunId_learnerId: {
              courseRunId,
              learnerId: learner.id,
            },
          },
        });

        if (existingEnrollment) {
          continue; // Skip if already enrolled
        }

        // Create enrollment
        const enrollment = await prisma.courseRunLearner.create({
          data: {
            courseRunId,
            learnerId: learner.id,
            paymentMode: (learnerData.paymentMode && learnerData.paymentMode.trim()) || (data.paymentMode && data.paymentMode.trim()) ? (learnerData.paymentMode && learnerData.paymentMode.trim()) ? learnerData.paymentMode : data.paymentMode : null,
            currentDefaultCourseFee: learnerData.currentDefaultCourseFee,
            discountId: learnerData.discountId,
            discountPercentage: learnerData.discountPercentage,
            discountAmount: learnerData.currentDefaultCourseFee * (learnerData.discountPercentage / 100),
            totalFees: learnerData.totalFees,
            feesRemarks: learnerData.feesRemarks && learnerData.feesRemarks.trim() ? learnerData.feesRemarks : null,
            invoiceNumber: learnerData.invoiceNumber && learnerData.invoiceNumber.trim() ? learnerData.invoiceNumber : null,
            remarks: data.remarks && data.remarks.trim() ? data.remarks : null,
            departmentName: learnerData.departmentName && learnerData.departmentName.trim() ? learnerData.departmentName : (data.departmentName && data.departmentName.trim() ? data.departmentName : (learner.departmentName || null)),
            enrollmentStatus: 'ENROLLED',
          },
        });

        enrollments.push(enrollment);
      }

      res.json({
        success: true,
        message: errors.length > 0 
          ? `${enrollments.length} learners enrolled successfully, ${errors.length} failed`
          : `${enrollments.length} learners enrolled successfully`,
        enrollments,
        createdLearners,
        errors: errors.length > 0 ? errors : undefined,
      });

      // Recalculate venue final fee after enrollments
      try {
        const venueFinal = await calculateVenueFinalFee(courseRunId);
        await prisma.courseRun.update({ where: { id: courseRunId }, data: { venueFinalFee: venueFinal } });
      } catch (err) {
        console.warn('Failed to calculate venue final fee after enrollLearners:', err);
      }
    } catch (error) {
      console.error('Error enrolling learners:', error);
      res.status(500).json(buildErrorResponse('courseRunController.enrollLearners', 'Failed to enroll learners', error));
    }
  },

  async importLearners(req: Request, res: Response): Promise<void> {
    try {
      const courseRunId = (req.params as any).courseRunId || (req.params as any).id;
      const { rows } = req.body ?? {};

      if (!courseRunId) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      if (!Array.isArray(rows) || rows.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No learner rows were provided for import',
        });
        return;
      }

      const courseRun = await prisma.courseRun.findUnique({
        where: { id: courseRunId },
        include: {
          course: true,
        },
      });

      if (!courseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      const course = courseRun.course;
      const baseCourseFee = courseRun.baseCourseFee !== null && courseRun.baseCourseFee !== undefined
        ? Number(courseRun.baseCourseFee)
        : course?.defaultCourseFee ?? 0;

      const discountMap = new Map<string, { id: string | null; percentage: number }>();
      if (course?.discounts) {
        let discountSource: unknown = course.discounts;
        if (typeof discountSource === 'string') {
          try {
            discountSource = JSON.parse(discountSource);
          } catch (error) {
            console.warn('Failed to parse course discounts JSON:', error);
          }
        }

        if (Array.isArray(discountSource)) {
          for (const discount of discountSource) {
            if (!discount) continue;
            const name = typeof discount.name === 'string' ? discount.name.trim() : '';
            if (!name) continue;
            const key = name.toLowerCase();
            const percentage = typeof discount.percentage === 'number'
              ? discount.percentage
              : typeof discount.discountPercentage === 'number'
                ? discount.discountPercentage
                : 0;
            const id = typeof discount.id === 'string' ? discount.id : null;
            discountMap.set(key, { id, percentage });
          }
        }
      }

  const organizationCache = new Map<string, Organization>();
  const coordinatorCache = new Map<string, User>();
  const learnerCache = new Map<string, Learner>();
      const newlyEnrolledLearnerIds = new Set<string>();

      const successes: Array<{ row: number; learnerId: string; learnerName: string }> = [];
      const errors: Array<{ row: number; email?: string; name?: string; reason: string }> = [];

      const getOrganizationByName = async (name: string, organizationType?: string) => {
        const normalized = name.toLowerCase();
        const cacheKey = organizationType ? `${normalized}:${organizationType}` : normalized;
        if (organizationCache.has(cacheKey)) {
          return organizationCache.get(cacheKey)!;
        }

        const where: any = {
          name: {
            equals: name,
          },
        };

        if (organizationType) {
          where.organizationType = organizationType;
        }

        const organization = await prisma.organization.findFirst({
          where,
        });

        if (organization) {
          organizationCache.set(cacheKey, organization);
        }

        return organization ?? null;
      };

      const getCoordinatorByEmail = async (email: string) => {
        const normalized = email.toLowerCase();
        if (coordinatorCache.has(normalized)) {
          return coordinatorCache.get(normalized)!;
        }

        const coordinator = await prisma.user.findFirst({
          where: {
            role: UserRole.TRAINING_COORDINATOR,
            email: {
              equals: email,
            },
          },
        });

        if (coordinator) {
          coordinatorCache.set(normalized, coordinator);
        }

        return coordinator ?? null;
      };

      const getLearnerByEmail = async (email: string) => {
        const normalized = email.toLowerCase();
        if (learnerCache.has(normalized)) {
          return learnerCache.get(normalized)!;
        }

        const learner = await prisma.learner.findFirst({
          where: {
            email: {
              equals: email,
            },
          },
        });

        if (learner) {
          learnerCache.set(normalized, learner);
        }

        return learner ?? null;
      };

      const normalizeString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

      // Check for duplicate emails within the CSV file BEFORE processing
      const emailCountMap = new Map<string, number[]>();
      for (let i = 0; i < rows.length; i += 1) {
        const rawRow = rows[i] ?? {};
        const email = normalizeString(rawRow.email ?? rawRow.Email);
        if (email) {
          const normalizedEmail = email.toLowerCase();
          if (!emailCountMap.has(normalizedEmail)) {
            emailCountMap.set(normalizedEmail, []);
          }
          emailCountMap.get(normalizedEmail)!.push(i + 1); // Store row numbers (1-indexed)
        }
      }

      // Add errors for duplicate emails in CSV
      for (const [email, rowNumbers] of emailCountMap.entries()) {
        if (rowNumbers.length > 1 && rowNumbers[0] !== undefined) {
          const firstRowNumber = rowNumbers[0];
          const firstRow = rows[firstRowNumber - 1] ?? {};
          const rowName = normalizeString(firstRow.name ?? firstRow.Name);
          errors.push({
            row: firstRowNumber,
            name: rowName,
            email: email,
            reason: `Duplicate email "${email}" found in rows ${rowNumbers.join(', ')}. Each participant must have a unique email address.`,
          });
          // Mark all duplicate rows (except first) as errors
          for (let i = 1; i < rowNumbers.length; i += 1) {
            const dupRowNumber = rowNumbers[i];
            if (dupRowNumber !== undefined) {
              const dupRow = rows[dupRowNumber - 1] ?? {};
              const dupRowName = normalizeString(dupRow.name ?? dupRow.Name);
              errors.push({
                row: dupRowNumber,
                name: dupRowName,
                email: email,
                reason: `Duplicate email "${email}" (also found in row ${firstRowNumber}). Each participant must have a unique email address.`,
              });
            }
          }
        }
      }

      // Skip processing rows that have duplicate email errors
      const errorRows = new Set(errors.map(e => e.row));

      // Payment mode mapping from display labels to enum values
      const paymentModeMapping: Record<string, string> = {
        'Self-Payment': 'SELF_SPONSORED',
        'Transition Dollar (TS)': 'TRANSITION_DOLLARS',
        'Unit Local Training Fund (ULTF)': 'ULTF',
        'Company-Sponsored (Non-Home Team)': 'COMPANY_BILLING',
        'Polwel Training Subsidy': 'GOVERNMENT_FUNDING',
      };

      for (let index = 0; index < rows.length; index += 1) {
        // Skip rows that already have errors (like duplicate emails)
        if (errorRows.has(index + 1)) {
          continue;
        }
        try {
          const rawRow = rows[index] ?? {};
          const name = normalizeString(rawRow.name ?? rawRow.Name);
          const email = normalizeString(rawRow.email ?? rawRow.Email);
          const contact = normalizeString(rawRow.contact ?? rawRow.Contact);
          const designation = normalizeString(rawRow.designation ?? rawRow.Designation);
          const organizationType = normalizeString(rawRow.organizationType ?? rawRow['Organization Type'] ?? rawRow['Organisation Type']);
          const organizationName = normalizeString(rawRow.clientOrganizationName ?? rawRow['Client Organization Name'] ?? rawRow['Client Organisation Name'] ?? rawRow.Division);
          const department = normalizeString(rawRow.department ?? rawRow.Department);
          const buNumber = normalizeString(rawRow.buNumber ?? rawRow['BU Number'] ?? rawRow.BU);
          const paymentMethodLabel = normalizeString(rawRow.paymentMethod ?? rawRow['Payment Method'] ?? rawRow['Payment Mode'] ?? rawRow.paymentMode);
          // Map display label to enum value
          const paymentMethod = paymentMethodLabel ? paymentModeMapping[paymentMethodLabel] || paymentMethodLabel : null;
          const coordinatorEmail = normalizeString(rawRow.trainingCoordinatorEmail ?? rawRow['Training Coordinator Email'] ?? rawRow.coordinatorEmail ?? rawRow['Coordinator Email']);
          const coordinatorName = normalizeString(rawRow.trainingCoordinatorName ?? rawRow['Training Coordinator Name'] ?? rawRow['Coordinator Name']);
          const coordinatorContact = normalizeString(rawRow.trainingCoordinatorContact ?? rawRow['Training Coordinator Contact'] ?? rawRow['Coordinator Contact'] ?? rawRow['Coordinator Phone']);
          const discountName = normalizeString(rawRow.discountName ?? rawRow['discount name'] ?? rawRow['Discount Name']);
          const feesRemarks = normalizeString(rawRow.feesRemarks ?? rawRow['fees remarks'] ?? rawRow['Fees Remarks']);
          const invoiceNumber = normalizeString(rawRow.invoiceNumber ?? rawRow['Invoice Number'] ?? rawRow.invoiceRemarks ?? rawRow['Invoice Remarks']);
          const remarks = normalizeString(rawRow.remarks ?? rawRow.Remarks);

          if (!name) {
            errors.push({ row: index + 1, reason: 'Learner name is required' });
            continue;
          }

          if (!email) {
            errors.push({ row: index + 1, name, reason: 'Email is required' });
            continue;
          }

        if (!organizationName) {
          errors.push({ row: index + 1, name, email, reason: 'Client organization name is required' });
          continue;
        }

        if (!organizationType) {
          errors.push({ row: index + 1, name, email, reason: 'Organization type is required' });
          continue;
        }

        const organization = await getOrganizationByName(organizationName, organizationType);
        if (!organization) {
          errors.push({ row: index + 1, name, email, reason: `Client organization "${organizationName}" with type "${organizationType}" was not found` });
          continue;
        }

        if (!coordinatorEmail) {
          errors.push({ row: index + 1, name, email, reason: 'Training Coordinator Email is required' });
          continue;
        }

        let coordinatorId: string | null = null;
        if (coordinatorEmail) {
          let coordinator = await getCoordinatorByEmail(coordinatorEmail);
          
          // If coordinator doesn't exist, create one automatically
          if (!coordinator) {
            try {
              // Use provided name or extract from email or use a default
              const finalCoordinatorName = coordinatorName || coordinatorEmail.split('@')[0] || 'Training Coordinator';
              
              coordinator = await prisma.user.create({
                data: {
                  email: coordinatorEmail,
                  name: finalCoordinatorName,
                  role: UserRole.TRAINING_COORDINATOR,
                  status: 'ACTIVE',
                  password: '', // Will need to be set by the coordinator
                  organizationId: organization.id,
                  contactNumber: coordinatorContact || null,
                  designation: 'Training Coordinator',
                },
              });
              coordinatorCache.set(coordinatorEmail.toLowerCase(), coordinator);
            } catch (createError) {
              // If creation fails, skip this row with error message
              const createErrorMsg = createError instanceof Error ? createError.message : 'Failed to create coordinator';
              errors.push({ 
                row: index + 1, 
                name, 
                email, 
                reason: `Unable to create or find training coordinator with email "${coordinatorEmail}": ${createErrorMsg}` 
              });
              continue;
            }
          }
          coordinatorId = coordinator.id;
        }

        let discountId: string | null = null;
        let discountPercentage = 0;
        if (discountName) {
          const discount = discountMap.get(discountName.toLowerCase());
          if (!discount) {
            errors.push({ row: index + 1, name, email, reason: `Discount "${discountName}" was not found for this course` });
            continue;
          }
          discountId = discount.id ?? null;
          discountPercentage = discount.percentage ?? 0;
        }

        const resolvedBaseFee = Number.isFinite(baseCourseFee) ? baseCourseFee : 0;
        const discountAmount = resolvedBaseFee * (discountPercentage / 100);
        const totalFees = Math.max(resolvedBaseFee - discountAmount, 0);

        let learner = await getLearnerByEmail(email);

        if (!learner) {
          learner = await prisma.learner.create({
            data: {
              fullname: name,
              email,
              contact: contact || null,
              designation: designation || null,
              clientOrganizationId: organization.id,
              departmentName: department || null,
              trainingCoordinatorId: coordinatorId,
            },
          });
          learnerCache.set(email.toLowerCase(), learner);
        } else {
          const updateData: any = {};
          if (name && name !== learner.fullname) updateData.fullname = name;
          if (designation) updateData.designation = designation;
          if (contact) updateData.contact = contact;
          updateData.clientOrganizationId = organization.id;
          if (department) updateData.departmentName = department;
          if (coordinatorId) updateData.trainingCoordinatorId = coordinatorId;

          if (Object.keys(updateData).length > 0) {
            learner = await prisma.learner.update({
              where: { id: learner.id },
              data: updateData,
            });
            learnerCache.set(email.toLowerCase(), learner);
          }
        }

        if (newlyEnrolledLearnerIds.has(learner.id)) {
          errors.push({ 
            row: index + 1, 
            name, 
            email, 
            reason: `Duplicate email "${email}" found in import file. This participant appears multiple times in your CSV.` 
          });
          continue;
        }

        const existingEnrollment = await prisma.courseRunLearner.findUnique({
          where: {
            courseRunId_learnerId: {
              courseRunId,
              learnerId: learner.id,
            },
          },
        });

        if (existingEnrollment) {
          errors.push({ row: index + 1, name, email, reason: 'Learner is already enrolled in this course run' });
          continue;
        }

        const enrollment = await prisma.courseRunLearner.create({
          data: {
            courseRunId,
            learnerId: learner.id,
            paymentMode: (paymentMethod as any) || null,
            currentDefaultCourseFee: resolvedBaseFee,
            discountId,
            discountPercentage,
            discountAmount,
            totalFees,
            feesRemarks: feesRemarks || null,
            invoiceNumber: invoiceNumber || null,
            remarks: remarks || null,
            departmentName: department || learner.departmentName || null,
            enrollmentStatus: 'ENROLLED',
          },
        });

        newlyEnrolledLearnerIds.add(learner.id);
        successes.push({ row: index + 1, learnerId: learner.id, learnerName: learner.fullname ?? name });
        } catch (rowError) {
          // Capture row-specific errors and continue processing remaining rows
          const rowName = rows[index]?.name || rows[index]?.Name || '';
          const rowEmail = rows[index]?.email || rows[index]?.Email || '';
          const errorMessage = rowError instanceof Error ? rowError.message : 'Unknown error occurred';
          console.error(`Error processing row ${index + 1}:`, errorMessage);
          errors.push({
            row: index + 1,
            name: rowName,
            email: rowEmail,
            reason: errorMessage || 'Failed to process this row. Please check your data and try again.',
          });
        }
      }

      res.json({
        success: true,
        imported: successes.length,
        failed: errors.length,
        baseCourseFee: baseCourseFee,
        results: {
          successes,
          errors,
        },
      });
      // Recalculate venue final fee after import enrollments
      try {
        const venueFinal = await calculateVenueFinalFee(courseRunId);
        await prisma.courseRun.update({ where: { id: courseRunId }, data: { venueFinalFee: venueFinal } });
      } catch (err) {
        console.warn('Failed to calculate venue final fee after importLearners:', err);
      }
    } catch (error) {
      console.error('Error importing learners:', error);
      res.status(500).json(buildErrorResponse('courseRunController.importLearners', 'Failed to import learners', error));
    }
  },

  // Get enrolled learners for a course run
  async getLearners(req: Request, res: Response): Promise<void> {
    try {
      const courseRunId = (req.params as any).courseRunId || (req.params as any).id;
      const coordinatorId = (req.query as any).coordinatorId; // Optional filter by training coordinator

      if (!courseRunId) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      const where: any = {
        courseRunId,
        deletedAt: null,
      };

      // If coordinatorId is provided, filter learners by that training coordinator
      // Only show learners assigned to this specific coordinator
      if (coordinatorId) {
        where.learner = {
          trainingCoordinatorId: coordinatorId,
        };
      }

      const enrollments = await prisma.courseRunLearner.findMany({
        where,
        include: {
          learner: {
            select: {
              id: true,
              fullname: true,
              email: true,
              designation: true,
              contact: true,
              departmentName: true,
              clientOrganizationId: true,
              trainingCoordinatorId: true,
              clientOrganization: {
                select: {
                  id: true,
                  name: true,
                  buNumber: true,
                },
              },
              trainingCoordinator: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  contactNumber: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      const normalizedEnrollments = enrollments.map((enrollment) => {
        const learner = enrollment.learner;
        const clientOrganization = learner?.clientOrganization || null;
        const coordinator = learner?.trainingCoordinator || null;

        return {
          ...enrollment,
          departmentName: enrollment.departmentName ?? learner?.departmentName ?? null,
          learner: learner
            ? {
                ...learner,
                contactNumber: learner.contact || null,
                contact: learner.contact || null,
                departmentName: learner.departmentName ?? enrollment.departmentName ?? null,
                clientOrganizationId: learner.clientOrganizationId || null,
                clientOrganization,
                clientOrganizationName: clientOrganization?.name || null,
                clientOrganizationBuNumber: clientOrganization?.buNumber || null,
                paymentMode: enrollment.paymentMode || null,
                trainingCoordinatorId: learner.trainingCoordinatorId || null,
                trainingCoordinator: coordinator
                  ? {
                      ...coordinator,
                      contactNumber: coordinator.contactNumber || null,
                    }
                  : null,
              }
            : null,
        };
      });

      res.json({
        success: true,
        learners: normalizedEnrollments,
      });
    } catch (error) {
      console.error('Error fetching course run learners:', error);
      res.status(500).json(buildErrorResponse('courseRunController.getLearners', 'Failed to fetch learners', error));
    }
  },

  // Update learner + enrollment
  async updateEnrollment(req: Request, res: Response): Promise<void> {
    try {
      const courseRunId = (req.params as any).courseRunId || (req.params as any).id;
      const { learnerId } = req.params as any;
      const { learnerData, enrollmentData } = req.body || {};

      if (!courseRunId || !learnerId) {
        res.status(400).json({ success: false, error: 'Course run ID and learner ID are required' });
        return;
      }

      // Verify enrollment exists
      const existing = await prisma.courseRunLearner.findUnique({
        where: { courseRunId_learnerId: { courseRunId, learnerId } },
        include: { learner: true },
      });
      if (!existing) {
        res.status(404).json({ success: false, error: 'Enrollment not found' });
        return;
      }

      // Update learner (partial)
      if (learnerData && Object.keys(learnerData).length) {
        const updateData: any = {
          fullname: learnerData.fullName ?? existing.learner.fullname,
          designation: learnerData.designation ?? existing.learner.designation,
          email: learnerData.email ?? existing.learner.email,
          contact: learnerData.contactNumber ?? existing.learner.contact,
          departmentName: learnerData.departmentName ?? existing.learner.departmentName,
          clientOrganizationId: learnerData.division || existing.learner.clientOrganizationId,
        };
        
        // Handle training coordinator explicitly - if it's in the payload (even as null), update it
        if ('trainingCoordinatorId' in learnerData) {
          const coordinatorId = learnerData.trainingCoordinatorId && typeof learnerData.trainingCoordinatorId === 'string' && learnerData.trainingCoordinatorId.trim() 
            ? learnerData.trainingCoordinatorId 
            : null;
          updateData.trainingCoordinatorId = coordinatorId;
          console.log(`[updateEnrollment] Setting trainingCoordinatorId to: ${coordinatorId === null ? 'NULL' : coordinatorId}`);
        }
        
        console.log(`[updateEnrollment] Updating learner ${learnerId} with data:`, JSON.stringify(updateData, null, 2));
        
        await prisma.learner.update({
          where: { id: learnerId },
          data: updateData,
        });
        
        console.log(`[updateEnrollment] Learner ${learnerId} updated successfully`);
      }

      // Update enrollment (partial)
      if (enrollmentData && Object.keys(enrollmentData).length) {
        await prisma.courseRunLearner.update({
          where: { courseRunId_learnerId: { courseRunId, learnerId } },
          data: {
            discountId: enrollmentData.discountId ?? existing.discountId,
            discountPercentage: typeof enrollmentData.discountPercentage === 'number' ? enrollmentData.discountPercentage : existing.discountPercentage,
            currentDefaultCourseFee: typeof enrollmentData.currentDefaultCourseFee === 'number' ? enrollmentData.currentDefaultCourseFee : existing.currentDefaultCourseFee,
            totalFees: typeof enrollmentData.totalFees === 'number' ? enrollmentData.totalFees : existing.totalFees,
            feesRemarks: enrollmentData.feesRemarks && enrollmentData.feesRemarks.trim() ? enrollmentData.feesRemarks : (enrollmentData.feesRemarks === "" ? null : existing.feesRemarks),
            invoiceNumber: enrollmentData.invoiceNumber && enrollmentData.invoiceNumber.trim() ? enrollmentData.invoiceNumber : (enrollmentData.invoiceNumber === "" ? null : existing.invoiceNumber),
            remarks: enrollmentData.remarks && enrollmentData.remarks.trim() ? enrollmentData.remarks : (enrollmentData.remarks === "" ? null : existing.remarks),
            paymentMode: enrollmentData.paymentMode && enrollmentData.paymentMode.trim() ? enrollmentData.paymentMode : (enrollmentData.paymentMode === "" ? null : existing.paymentMode),
            departmentName:
              (learnerData && learnerData.departmentName !== undefined ? (learnerData.departmentName && learnerData.departmentName.trim() ? learnerData.departmentName : null) : undefined) ??
              (enrollmentData && enrollmentData.departmentName !== undefined ? (enrollmentData.departmentName && enrollmentData.departmentName.trim() ? enrollmentData.departmentName : null) : undefined) ??
              existing.departmentName,
          },
        });
      }

      const updated = await prisma.courseRunLearner.findUnique({
        where: { courseRunId_learnerId: { courseRunId, learnerId } },
        include: { learner: true },
      });

      res.json({ success: true, message: 'Enrollment updated', enrollment: updated });
    } catch (error) {
      console.error('Error updating enrollment:', error);
      res.status(500).json(buildErrorResponse('courseRunController.updateEnrollment', 'Failed to update enrollment', error));
    }
  },

  // Remove learner from course run (soft delete)
  async removeEnrollment(req: Request, res: Response): Promise<void> {
    try {
      const courseRunId = (req.params as any).courseRunId || (req.params as any).id;
      const { learnerId } = req.params as any;

      if (!courseRunId || !learnerId) {
        res.status(400).json({ success: false, error: 'Course run ID and learner ID are required' });
        return;
      }

      // Verify enrollment exists
      const existing = await prisma.courseRunLearner.findUnique({
        where: { courseRunId_learnerId: { courseRunId, learnerId } },
      });

      if (!existing) {
        res.status(404).json({ success: false, error: 'Enrollment not found' });
        return;
      }

      if (existing.deletedAt) {
        res.status(400).json({ success: false, error: 'Enrollment already removed' });
        return;
      }

      // Soft delete by setting deletedAt and updating enrollment status
      await prisma.courseRunLearner.update({
        where: { courseRunId_learnerId: { courseRunId, learnerId } },
        data: {
          deletedAt: new Date(),
          enrollmentStatus: 'WITHDRAWN',
        },
      });

      res.json({ success: true, message: 'Learner removed from course run' });
    } catch (error) {
      console.error('Error removing enrollment:', error);
      res.status(500).json(buildErrorResponse('courseRunController.removeEnrollment', 'Failed to remove enrollment', error));
    }
  },

  async getAttendance(req: Request, res: Response): Promise<void> {
    try {
      const courseRunId = (req.params as any).courseRunId || (req.params as any).id;

      if (!courseRunId) {
        res.status(400).json({ success: false, error: 'Course run ID is required' });
        return;
      }

      const userId = (req as any)?.user?.userId ?? null;
      const snapshot = await loadAttendanceSnapshot(courseRunId, userId);

      if (!snapshot) {
        res.status(404).json({ success: false, error: 'Course run not found' });
        return;
      }

      res.json({
        success: true,
        attendance: snapshot,
      });
    } catch (error) {
      console.error('Error fetching course run attendance:', error);
      res.status(500).json(buildErrorResponse('courseRunController.getAttendance', 'Failed to fetch attendance', error));
    }
  },

  async saveAttendance(req: Request, res: Response): Promise<void> {
    try {
      const courseRunId = (req.params as any).courseRunId || (req.params as any).id;

      if (!courseRunId) {
        res.status(400).json({ success: false, error: 'Course run ID is required' });
        return;
      }

      const parseResult = saveAttendanceSchema.safeParse(req.body ?? {});

      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid attendance payload',
          details: parseResult.error.flatten(),
        });
        return;
      }

      const { day, records } = parseResult.data;
      const recordMap = new Map<string, { attendAM: boolean; attendPM: boolean }>();
      records.forEach((record) => {
        recordMap.set(record.learnerId, {
          attendAM: !!record.attendAM,
          attendPM: !!record.attendPM,
        });
      });

      if (recordMap.size === 0) {
        res.status(400).json({ success: false, error: 'No attendance records provided' });
        return;
      }

      const learnerIds = Array.from(recordMap.keys());

      const courseRun = await prisma.courseRun.findFirst({
        where: { id: courseRunId, deletedAt: null },
        include: {
          course: {
            select: {
              duration: true,
              durationType: true,
            },
          },
        },
      });

      if (!courseRun) {
        res.status(404).json({ success: false, error: 'Course run not found' });
        return;
      }

      // Check if course has started (on or after start date)
      // Attendance (including Absent) should only be allowed from the course start date onwards
      if (courseRun.startDatetime) {
        const courseStartDate = new Date(courseRun.startDatetime);
        const today = new Date();
        // Reset to midnight for date-only comparison (ignore time)
        today.setHours(0, 0, 0, 0);
        courseStartDate.setHours(0, 0, 0, 0);
        
        if (today < courseStartDate) {
          res.status(400).json({
            success: false,
            error: 'Cannot mark attendance before the course start date. Please use withdrawal if needed.',
          });
          return;
        }
      }

      const totalDays = calculateCourseRunDayCount(courseRun);
      const effectiveDayBoundary = Math.max(totalDays, day);
      const userId = (req as any)?.user?.userId ?? null;

      try {
        await prisma.$transaction(async (tx) => {
          const enrollments = await tx.courseRunLearner.findMany({
            where: {
              courseRunId,
              learnerId: { in: learnerIds },
              deletedAt: null,
              enrollmentStatus: 'ENROLLED',
            },
            select: { learnerId: true },
          });

          const validLearnerIds = new Set(enrollments.map((enrollment) => enrollment.learnerId));
          const missingLearners = learnerIds.filter((id) => !validLearnerIds.has(id));

          if (missingLearners.length > 0) {
            const errorDetails = new Error('One or more learners are not enrolled in this course run');
            (errorDetails as any).meta = { missingLearners };
            throw errorDetails;
          }

          for (const [learnerId, attendance] of recordMap.entries()) {
            await tx.courseRunLearnerAttendance.upsert({
              where: {
                courseRunId_learnerId_day: {
                  courseRunId,
                  learnerId,
                  day,
                },
              },
              update: {
                attendAM: attendance.attendAM,
                attendPM: attendance.attendPM,
                editedBy: userId ?? null,
                deletedAt: null,
              },
              create: {
                courseRunId,
                learnerId,
                day,
                attendAM: attendance.attendAM,
                attendPM: attendance.attendPM,
                editedBy: userId ?? null,
              },
            });
          }

          const allActiveEnrollments = await tx.courseRunLearner.findMany({
            where: {
              courseRunId,
              deletedAt: null,
              enrollmentStatus: 'ENROLLED',
            },
            select: { learnerId: true },
          });

          const allActiveLearnerIds = allActiveEnrollments.map((enrollment) => enrollment.learnerId);

          const learnerAttendance = await tx.courseRunLearnerAttendance.findMany({
            where: {
              courseRunId,
              learnerId: { in: allActiveLearnerIds },
              deletedAt: null,
            },
          });

          const attendanceByLearner = new Map<string, typeof learnerAttendance[number][]>();
          for (const record of learnerAttendance) {
            const existing = attendanceByLearner.get(record.learnerId);
            if (existing) {
              existing.push(record);
            } else {
              attendanceByLearner.set(record.learnerId, [record]);
            }
          }

          const maxRecordedDay = learnerAttendance.reduce((max, record) => Math.max(max, record.day), effectiveDayBoundary);
          const evaluationDayLimit = Math.max(effectiveDayBoundary, maxRecordedDay, 1);

          for (const learnerId of allActiveLearnerIds) {
            const recordsForLearner = attendanceByLearner.get(learnerId) ?? [];
            const attendanceMapForLearner = new Map<number, boolean>();
            for (const record of recordsForLearner) {
              attendanceMapForLearner.set(record.day, (record.attendAM ?? false) || (record.attendPM ?? false));
            }

            let isPresentEveryDay = true;
            for (let currentDay = 1; currentDay <= evaluationDayLimit; currentDay += 1) {
              const attended = attendanceMapForLearner.get(currentDay) ?? false;
              if (!attended) {
                isPresentEveryDay = false;
                break;
              }
            }

            await tx.courseRunLearner.update({
              where: {
                courseRunId_learnerId: {
                  courseRunId,
                  learnerId,
                },
              },
              data: {
                attendanceStatus: isPresentEveryDay ? 'PRESENT' : 'ABSENT',
              },
            });
          }
        });
      } catch (transactionError) {
        if ((transactionError as any)?.meta?.missingLearners) {
          res.status(400).json({
            success: false,
            error: 'Some learners are no longer enrolled in this course run',
            details: {
              missingLearnerIds: (transactionError as any).meta.missingLearners,
            },
          });
          return;
        }

        throw transactionError;
      }

      const snapshot = await loadAttendanceSnapshot(courseRunId, userId);

      res.json({
        success: true,
        message: 'Attendance saved successfully',
        attendance: snapshot,
      });
    } catch (error) {
      console.error('Error saving course run attendance:', error);
      res.status(500).json(buildErrorResponse('courseRunController.saveAttendance', 'Failed to save attendance', error));
    }
  },

  // Update trainer assignments for a course run
  async updateTrainerAssignments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { trainers } = req.body;
      const userId = (req as any).user?.id;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      if (!Array.isArray(trainers)) {
        res.status(400).json({
          success: false,
          error: 'Trainers must be an array',
        });
        return;
      }

      // Verify course run exists
      const courseRun = await prisma.courseRun.findUnique({
        where: { id: id },
        include: { course: true },
      });

      if (!courseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      // Check trainer availability if dates are set
      if (trainers.length > 0 && courseRun.startDatetime && courseRun.endDatetime) {
        const trainerIds = trainers.map((t: any) => t.trainerId);
        const availabilityCheck = await checkTrainerAvailability(
          trainerIds,
          courseRun.startDatetime,
          courseRun.endDatetime,
          id // Exclude current course run
        );

        if (!availabilityCheck.available) {
          res.status(400).json({
            success: false,
            error: 'One or more trainers have schedule conflicts',
            conflicts: availabilityCheck.conflicts,
          });
          return;
        }
      }

      // Delete existing trainer assignments and create new ones
      await prisma.$transaction(async (tx) => {
        // Delete all existing trainer assignments
        await tx.courseRunTrainer.deleteMany({
          where: { courseRunId: id },
        });

        // Create new trainer assignments
        if (trainers.length > 0) {
          await tx.courseRunTrainer.createMany({
            data: trainers.map((t: any) => ({
              courseRunId: id,
              trainerId: t.trainerId,
              trainerBaseAmount: t.trainerBaseAmount || 0,
              additionalCost: t.additionalCost || 0,
              additionalCostUnit: t.additionalCostUnit || 'PER_CLASS',
              remarks: t.remarks || null,
            })),
          });
        }
      });

      // Fetch updated course run with trainers
      const updated = await prisma.courseRun.findUnique({
        where: { id: id },
        include: {
          courseRunTrainers: {
            include: {
              trainer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  partnerOrganization: true,
                },
              },
            },
          },
        },
      });

      res.json({
        success: true,
        message: 'Trainer assignments updated successfully',
        courseRun: updated,
      });
    } catch (error) {
      console.error('Error updating trainer assignments:', error);
      res.status(500).json(buildErrorResponse('courseRunController.updateTrainerAssignments', 'Failed to update trainer assignments', error));
    }
  },

  // Update partner assignments for a course run
  async updatePartnerAssignments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { partners } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      if (!Array.isArray(partners)) {
        res.status(400).json({
          success: false,
          error: 'Partners must be an array',
        });
        return;
      }

      // Verify course run exists
      const courseRun = await prisma.courseRun.findUnique({
        where: { id: id },
      });

      if (!courseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      // Delete existing partner assignments and create new ones
      await prisma.$transaction(async (tx) => {
        // Delete all existing partner assignments
        await tx.courseRunPartner.deleteMany({
          where: { courseRunId: id },
        });

        // Create new partner assignments
        if (partners.length > 0) {
          await tx.courseRunPartner.createMany({
            data: partners.map((p: any) => ({
              courseRunId: id,
              partnerId: p.partnerId,
              selectedTrainerIds: Array.isArray(p.selectedTrainerIds) ? p.selectedTrainerIds : null,
            })),
          });
        }
      });

      // Fetch updated course run with partners
      const updated = await prisma.courseRun.findUnique({
        where: { id: id },
        include: {
          courseRunPartners: {
            include: {
              partner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      res.json({
        success: true,
        message: 'Partner assignments updated successfully',
        courseRun: updated,
      });
    } catch (error) {
      console.error('Error updating partner assignments:', error);
      res.status(500).json(buildErrorResponse('courseRunController.updatePartnerAssignments', 'Failed to update partner assignments', error));
    }
  },

  // Send trainer assignment email
  async sendTrainerAssignmentEmail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { ccEmails, additionalBody, attachmentIds } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      // Validate attachments if provided
      const attachments: any[] = [];
      if (attachmentIds && Array.isArray(attachmentIds) && attachmentIds.length > 0) {
        const fetchedAttachments = await prisma.media.findMany({
          where: {
            id: { in: attachmentIds },
            deletedAt: null,
          },
        });

        if (fetchedAttachments.length !== attachmentIds.length) {
          res.status(404).json({
            success: false,
            error: 'One or more attachments not found',
          });
          return;
        }

        attachments.push(...fetchedAttachments);
      }

      // Fetch course run with all necessary details
      const courseRun = await prisma.courseRun.findUnique({
        where: { id: id },
        include: {
          course: {
            select: {
              title: true,
              courseCode: true,
            },
          },
          venue: {
            select: {
              name: true,
              address: true,
            },
          },
          courseRunTrainers: {
            include: {
              trainer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  partnerOrganization: true,
                },
              },
            },
          },
          courseRunPartners: {
            include: {
              partner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  pointOfContactEmail: true,
                },
              },
            },
          },
        },
      });

      if (!courseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      if (!courseRun.courseRunTrainers || courseRun.courseRunTrainers.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No trainers assigned to this course run',
        });
        return;
      }

      const ccList = normalizeEmailList(ccEmails);

      const emailTasks = courseRun.courseRunTrainers.map(async (assignment) => {
        const trainerEmail = assignment.trainer?.email?.trim();
        const trainerName = assignment.trainer?.name || 'Trainer';

        if (!trainerEmail) {
          await prisma.courseRunTrainer.update({
            where: { id: assignment.id },
            data: {
              emailStatus: 'FAILED',
              trainerAssignmentEmailStatus: 'FAILED',
            },
          });

          return { success: false, error: 'Trainer email address is missing' };
        }

        const baseFee = Number(assignment.trainerBaseAmount || 0);
        const additional = Number(assignment.additionalCost || 0);

        const courseDetails: Parameters<typeof EmailService.sendTrainerAssignmentEmail>[2] = {};
        if (courseRun.course?.title) {
          courseDetails.course = courseRun.course.title;
        }
        if (courseRun.serialNumber) {
          courseDetails.serialNumber = courseRun.serialNumber;
        }
        courseDetails.startDate = courseRun.startDatetime ? courseRun.startDatetime.toISOString() : null;
        courseDetails.endDate = courseRun.endDatetime ? courseRun.endDatetime.toISOString() : null;
        courseDetails.venue = courseRun.venue?.name || courseRun.specifiedLocation || null;
        courseDetails.venueAddress = courseRun.venue?.address || null;

        const result = await EmailService.sendTrainerAssignmentEmail(
          trainerEmail,
          trainerName,
          courseDetails,
          baseFee,
          additional,
          ccList.length > 0 ? ccList : null,
          additionalBody || null,
          attachments.length > 0 ? attachments : null
        );

        // create history record with attachments - ONLY if email was sent successfully
        if (result.success) {
          try {
            const emailHistory = await prisma.trainerAssignmentEmailHistory.create({
              data: {
                courseRunId: id,
                trainerId: assignment.trainer.id,
                cc: ccList.length > 0 ? ccList.join(', ') : null,
                additionalBodyContent: additionalBody || null,
              },
            });

            // Create attachment relationships if attachments provided
            if (attachmentIds && Array.isArray(attachmentIds) && attachmentIds.length > 0) {
              await prisma.trainerEmailAttachment.createMany({
                data: attachmentIds.map((mediaId: string) => ({
                  emailHistoryId: emailHistory.id,
                  mediaId: mediaId,
                })),
              });
            }
          } catch (histErr) {
            console.warn('Failed to create trainerAssignmentEmailHistory record:', (histErr as any)?.message || histErr);
          }
        }

        // update assignment status
        try {
          await prisma.courseRunTrainer.update({
            where: { id: assignment.id },
            data: {
              emailStatus: result.success ? 'SENT' : 'FAILED',
              trainerAssignmentEmailStatus: result.success ? 'SENT' : 'FAILED',
            },
          });
        } catch (updateErr) {
          console.warn('Failed to update courseRunTrainer status:', (updateErr as any)?.message || updateErr);
        }

        return result;
      });

      await Promise.all(emailTasks);

      // Send emails to partners using their TC Email (pointOfContactEmail)
      const partnerEmailTasks = (courseRun.courseRunPartners || []).map(async (partnerAssignment) => {
        const partner = partnerAssignment.partner;
        const partnerEmail = partner?.pointOfContactEmail?.trim() || partner?.email?.trim();
        const partnerName = partner?.name || 'Training Partner';

        if (!partnerEmail) {
          console.warn(`Partner ${partner?.name} (${partner?.id}) has no TC Email or email address. Skipping email.`);
          return { success: false, error: 'Partner email address is missing' };
        }

        const courseDetails: Parameters<typeof EmailService.sendTrainerAssignmentEmail>[2] = {};
        if (courseRun.course?.title) {
          courseDetails.course = courseRun.course.title;
        }
        if (courseRun.serialNumber) {
          courseDetails.serialNumber = courseRun.serialNumber;
        }
        courseDetails.startDate = courseRun.startDatetime ? courseRun.startDatetime.toISOString() : null;
        courseDetails.endDate = courseRun.endDatetime ? courseRun.endDatetime.toISOString() : null;
        courseDetails.venue = courseRun.venue?.name || courseRun.specifiedLocation || null;
        courseDetails.venueAddress = courseRun.venue?.address || null;
        courseDetails.specifiedLocation = courseRun.specifiedLocation || null;

        const result = await EmailService.sendTrainerAssignmentEmail(
          partnerEmail,
          partnerName,
          courseDetails,
          0, // No base fee for partners
          0, // No additional cost for partners
          ccList.length > 0 ? ccList : null,
          additionalBody || null,
          attachments.length > 0 ? attachments : null
        );

        return result;
      });

      await Promise.all(partnerEmailTasks);

      // Check if confirmation emails have already been sent
      // If yes and we just sent trainer emails, update status to CONFIRMED
      const confirmationEmailsSent = await prisma.confirmationEmailHistory.count({
        where: {
          courseRunId: id,
          deletedAt: null,
        },
      });

      const hasLearners = await prisma.courseRunLearner.count({
        where: {
          courseRunId: id,
          deletedAt: null,
          enrollmentStatus: 'ENROLLED',
        },
      });

      // If we have learners and confirmation emails have been sent
      // AND trainer emails have been sent (we just sent them)
      // Then update status to CONFIRMED
      if (hasLearners > 0 && confirmationEmailsSent >= hasLearners) {
        await prisma.courseRun.update({
          where: { id },
          data: {
            status: 'CONFIRMED',
            statusLastEvaluatedAt: new Date(),
          },
        });
        console.log(`Course run ${id} status updated to CONFIRMED after both trainer and confirmation emails sent.`);
      } else {
        console.log(`Trainer assignment emails sent for course run ${id}. Waiting for confirmation emails before moving to CONFIRMED status.`);
      }

      res.json({
        success: true,
        message: 'Trainer assignment emails sent successfully',
        emailsSent: courseRun.courseRunTrainers.length,
      });
    } catch (error) {
      console.error('Error sending trainer assignment emails:', error);
      res.status(500).json(buildErrorResponse('courseRunController.sendTrainerAssignmentEmail', 'Failed to send trainer assignment emails', error));
    }
  },

  // Mark course run as confirmed (PENDING → CONFIRMED_PENDING_TA_APPROVAL)
  async markAsConfirmed(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      const courseRun = await prisma.courseRun.findFirst({
        where: { id, deletedAt: null },
        include: {
          course: true,
        },
      });

      if (!courseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      if (courseRun.status !== 'PENDING') {
        res.status(400).json({
          success: false,
          error: `Cannot mark as confirmed. Current status is ${courseRun.status}`,
        });
        return;
      }

      const updated = await prisma.courseRun.update({
        where: { id: id },
        data: {
          status: 'CONFIRMED_PENDING_TA_APPROVAL',
          statusLastEvaluatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Course run marked as confirmed, pending trainer approval',
        courseRun: updated,
      });
    } catch (error) {
      console.error('Error marking course run as confirmed:', error);
      res.status(500).json(buildErrorResponse('courseRunController.markAsConfirmed', 'Failed to mark course run as confirmed', error));
    }
  },

  // Approve trainer assignment (CONFIRMED_PENDING_TA_APPROVAL → CONFIRMED_PENDING_CONFIRMATION_EMAILS)
  async approveTrainerAssignment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      const courseRun = await prisma.courseRun.findFirst({
        where: { id, deletedAt: null },
        include: {
          course: true,
          courseRunTrainers: {
            include: {
              trainer: true,
            },
          },
        },
      });

      if (!courseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      if (courseRun.status !== 'CONFIRMED_PENDING_TA_APPROVAL') {
        res.status(400).json({
          success: false,
          error: `Cannot approve trainer assignment. Current status is ${courseRun.status}`,
        });
        return;
      }

      const updated = await prisma.courseRun.update({
        where: { id: id },
        data: {
          status: 'CONFIRMED_PENDING_CONFIRMATION_EMAILS',
          statusLastEvaluatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Trainer assignment approved',
        courseRun: updated,
      });
    } catch (error) {
      console.error('Error approving trainer assignment:', error);
      res.status(500).json(buildErrorResponse('courseRunController.approveTrainerAssignment', 'Failed to approve trainer assignment', error));
    }
  },

  // Reject trainer assignment (stays at CONFIRMED_PENDING_TA_APPROVAL)
  async rejectTrainerAssignment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      const courseRun = await prisma.courseRun.findFirst({
        where: { id, deletedAt: null },
      });

      if (!courseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      if (courseRun.status !== 'CONFIRMED_PENDING_TA_APPROVAL') {
        res.status(400).json({
          success: false,
          error: `Cannot reject trainer assignment. Current status is ${courseRun.status}`,
        });
        return;
      }

      // Just return success - no status change
      res.json({
        success: true,
        message: 'Trainer assignment rejected',
      });
    } catch (error) {
      console.error('Error rejecting trainer assignment:', error);
      res.status(500).json(buildErrorResponse('courseRunController.rejectTrainerAssignment', 'Failed to reject trainer assignment', error));
    }
  },

  // Send course confirmation email to learners
  async sendCourseConfirmationEmail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { ccEmails, additionalBody, attachmentIds, learnerIds } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      // Validate attachments if provided
      let attachments: any[] = [];
      if (attachmentIds && Array.isArray(attachmentIds) && attachmentIds.length > 0) {
        attachments = await prisma.media.findMany({
          where: {
            id: { in: attachmentIds },
            deletedAt: null,
          },
        });

        if (attachments.length !== attachmentIds.length) {
          res.status(404).json({
            success: false,
            error: 'One or more attachments not found',
          });
          return;
        }
      }

      const courseRun = await prisma.courseRun.findFirst({
        where: { id, deletedAt: null },
        include: {
          course: true,
          venue: true,
          courseRunLearners: {
            where: { 
              deletedAt: null, 
              enrollmentStatus: 'ENROLLED',
              // Filter by learnerIds if provided
              ...(learnerIds && Array.isArray(learnerIds) && learnerIds.length > 0
                ? { id: { in: learnerIds } }
                : {}),
            },
            include: {
              learner: {
                include: {
                  trainingCoordinator: true,
                },
              },
            },
          },
        },
      });

      if (!courseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      // Remove status restriction - allow sending confirmation emails even after course is confirmed

      // For TALKS: Check if trainer assignment email has been sent
      // If yes, block sending course confirmation email
      if (courseRun.courseRunType === 'TALKS') {
        const trainerEmailsSent = await prisma.trainerAssignmentEmailHistory.count({
          where: {
            courseRunId: id,
            deletedAt: null,
          },
        });

        const hasTrainers = await prisma.courseRunTrainer.count({
          where: {
            courseRunId: id,
            deletedAt: null,
          },
        });

        if (hasTrainers > 0 && trainerEmailsSent > 0) {
          res.status(400).json({
            success: false,
            error: 'Cannot send course confirmation email for Talks after trainer assignment email has been sent.',
          });
          return;
        }
      }

      const ccList = normalizeEmailList(ccEmails);
      const additionalNotes =
        typeof additionalBody === 'string' && additionalBody.trim().length > 0
          ? additionalBody.trim()
          : undefined;

      let successCount = 0;
      let failedCount = 0;
      const trainingCoordinatorsEmailed = new Set<string>();

      for (const enrollment of courseRun.courseRunLearners) {
        const now = new Date();
        const learnerEmail = enrollment.learner?.email?.trim();
        const learnerName = enrollment.learner?.fullname || 'Learner';
        const trainingCoordinator = enrollment.learner?.trainingCoordinator;

        if (!learnerEmail) {
          failedCount += 1;
          await prisma.courseRunLearner.update({
            where: { id: enrollment.id },
            data: {
              confirmationEmailStatus: 'FAILED',
              confirmationEmailLastSentAt: now,
            },
          });

          const emailHistory = await prisma.confirmationEmailHistory.create({
            data: {
              courseRunLearnersId: enrollment.id,
              courseRunId: id,
              remarks: 'Skipped sending confirmation email. Reason: Missing learner email address.',
            },
          });

          // Create attachment records for all attachments
          if (attachmentIds && Array.isArray(attachmentIds)) {
            for (const attId of attachmentIds) {
              await prisma.confirmationEmailAttachment.create({
                data: {
                  emailHistoryId: emailHistory.id,
                  mediaId: attId,
                },
              });
            }
          }
          continue;
        }

        try {
          const emailPayload: Parameters<typeof EmailService.sendLearnerCourseConfirmationEmail>[0] = {
            email: learnerEmail,
            learnerName,
            courseTitle: courseRun.course?.title || courseRun.serialNumber || 'POLWEL Course',
          };

          if (courseRun.course?.courseCode) {
            emailPayload.courseCode = courseRun.course.courseCode;
          }

          if (courseRun.serialNumber) {
            emailPayload.serialNumber = courseRun.serialNumber;
          }

          if (courseRun.startDatetime) {
            emailPayload.startDate = new Date(courseRun.startDatetime);
          }

          if (courseRun.endDatetime) {
            emailPayload.endDate = new Date(courseRun.endDatetime);
          }

          const venueName = courseRun.venue?.name || courseRun.specifiedLocation;
          if (venueName) {
            emailPayload.venueName = venueName;
          }

          if (courseRun.venue?.address) {
            emailPayload.venueAddress = courseRun.venue.address;
          }

          if (courseRun.specifiedLocation) {
            emailPayload.specifiedLocation = courseRun.specifiedLocation;
          }

          if (additionalNotes) {
            emailPayload.additionalNotes = additionalNotes;
          }

          // Build CC list: include custom CC + training coordinator if they exist
          const emailCcList = [...ccList];
          if (trainingCoordinator?.email?.trim()) {
            const tcEmail = trainingCoordinator.email.trim();
            if (!trainingCoordinatorsEmailed.has(tcEmail) && !emailCcList.includes(tcEmail) && tcEmail !== learnerEmail) {
              emailCcList.push(tcEmail);
              trainingCoordinatorsEmailed.add(tcEmail);
            }
          }

          if (emailCcList.length > 0) {
            emailPayload.cc = emailCcList;
          }

          if (attachments && attachments.length > 0) {
            emailPayload.attachments = attachments;
          }
          console.log('emailPayload', emailPayload);
          const didSend = await EmailService.sendLearnerCourseConfirmationEmail(emailPayload);

          const status = didSend ? 'SENT' : 'FAILED';

          await prisma.courseRunLearner.update({
            where: { id: enrollment.id },
            data: {
              confirmationEmailStatus: status,
              confirmationEmailLastSentAt: now,
            },
          });

          const emailHistory2 = await prisma.confirmationEmailHistory.create({
            data: {
              courseRunLearnersId: enrollment.id,
              courseRunId: id,
              remarks: didSend
                ? `Confirmation email sent successfully to ${learnerEmail}.`
                : `Failed to send confirmation email to ${learnerEmail}.`,
            },
          });

          // Create attachment records for all attachments
          if (attachmentIds && Array.isArray(attachmentIds)) {
            for (const attId of attachmentIds) {
              await prisma.confirmationEmailAttachment.create({
                data: {
                  emailHistoryId: emailHistory2.id,
                  mediaId: attId,
                },
              });
            }
          }

          if (didSend) {
            successCount += 1;
          } else {
            failedCount += 1;
          }
        } catch (sendError) {
          failedCount += 1;

          await prisma.courseRunLearner.update({
            where: { id: enrollment.id },
            data: {
              confirmationEmailStatus: 'FAILED',
              confirmationEmailLastSentAt: now,
            },
          });

          const emailHistory3 = await prisma.confirmationEmailHistory.create({
            data: {
              courseRunLearnersId: enrollment.id,
              courseRunId: id,
              remarks: `Failed to send confirmation email to ${learnerEmail}. Error: ${
                sendError instanceof Error ? sendError.message : 'Unknown error'
              }`,
            },
          });

          // Create attachment records for all attachments
          if (attachmentIds && Array.isArray(attachmentIds)) {
            for (const attId of attachmentIds) {
              await prisma.confirmationEmailAttachment.create({
                data: {
                  emailHistoryId: emailHistory3.id,
                  mediaId: attId,
                },
              });
            }
          }
        }
      }

      // Check if BOTH trainer and confirmation emails have been sent
      // If yes, update status to CONFIRMED
      const trainerEmailsSent = await prisma.trainerAssignmentEmailHistory.count({
        where: {
          courseRunId: id,
          deletedAt: null,
        },
      });

      const hasTrainers = await prisma.courseRunTrainer.count({
        where: {
          courseRunId: id,
          deletedAt: null,
        },
      });

      // If we have trainers and trainer emails have been sent (at least one history record per trainer)
      // AND confirmation emails have been sent (we just sent them)
      // Then update status to CONFIRMED
      if (hasTrainers > 0 && trainerEmailsSent >= hasTrainers) {
        await prisma.courseRun.update({
          where: { id },
          data: {
            status: 'CONFIRMED',
            statusLastEvaluatedAt: new Date(),
          },
        });
        console.log(`Course run ${id} status updated to CONFIRMED after both trainer and confirmation emails sent.`);
      }

      res.json({
        success: true,
        message: `Course confirmation emails processed. Success: ${successCount}, Failed: ${failedCount}`,
        emailsSent: successCount,
        failures: failedCount,
      });
    } catch (error) {
      console.error('Error sending course confirmation emails:', error);
      res
        .status(500)
        .json(
          buildErrorResponse(
            'courseRunController.sendCourseConfirmationEmail',
            'Failed to send course confirmation emails',
            error,
          ),
        );
    }
  },

  // Send training assignment email to learners
  async sendTrainingAssignmentEmailToLearners(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      const courseRun = await prisma.courseRun.findFirst({
        where: { id, deletedAt: null },
        include: {
          course: true,
          venue: true,
          courseRunLearners: {
            where: { deletedAt: null },
            include: {
              learner: {
                include: {
                },
              },
            },
          },
          courseRunTrainers: {
            where: { deletedAt: null },
            include: {
              trainer: true,
            },
          },
          courseRunPartners: {
            include: {
              partner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  pointOfContactEmail: true,
                },
              },
            },
          },
        },
      });

      if (!courseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      // Remove status restriction - allow sending training assignment emails even after course is confirmed

      let learnerSuccess = 0;
      let learnerFailed = 0;

      for (const enrollment of courseRun.courseRunLearners) {
        const now = new Date();
        const learnerEmail = enrollment.learner?.email?.trim();
        const learnerName = enrollment.learner?.fullname || 'Learner';

        if (!learnerEmail) {
          learnerFailed += 1;
          await prisma.courseRunLearner.update({
            where: { id: enrollment.id },
            data: {
              confirmationEmailStatus: 'FAILED',
              confirmationEmailLastSentAt: now,
            },
          });
          continue;
        }

        try {
          const emailPayload: Parameters<typeof EmailService.sendLearnerCourseConfirmationEmail>[0] = {
            email: learnerEmail,
            learnerName,
            courseTitle: courseRun.course?.title || courseRun.serialNumber || 'POLWEL Course',
          };

          if (courseRun.course?.courseCode) {
            emailPayload.courseCode = courseRun.course.courseCode;
          }

          if (courseRun.serialNumber) {
            emailPayload.serialNumber = courseRun.serialNumber;
          }

          if (courseRun.startDatetime) {
            emailPayload.startDate = new Date(courseRun.startDatetime);
          }

          if (courseRun.endDatetime) {
            emailPayload.endDate = new Date(courseRun.endDatetime);
          }

          const venueName = courseRun.venue?.name || courseRun.specifiedLocation;
          if (venueName) {
            emailPayload.venueName = venueName;
          }

          if (courseRun.venue?.address) {
            emailPayload.venueAddress = courseRun.venue.address;
          }

          const didSend = await EmailService.sendLearnerCourseConfirmationEmail(emailPayload);

          const status = didSend ? 'SENT' : 'FAILED';

          await prisma.courseRunLearner.update({
            where: { id: enrollment.id },
            data: {
              confirmationEmailStatus: status,
              confirmationEmailLastSentAt: now,
            },
          });

          if (didSend) {
            learnerSuccess += 1;
          } else {
            learnerFailed += 1;
          }
        } catch (err) {
          learnerFailed += 1;
          await prisma.courseRunLearner.update({
            where: { id: enrollment.id },
            data: {
              confirmationEmailStatus: 'FAILED',
              confirmationEmailLastSentAt: now,
            },
          });
          console.error(`Failed to send email to learner ${enrollment.learnerId}:`, err);
        }
      }

      let trainerSuccess = 0;
      let trainerFailed = 0;

      for (const assignment of courseRun.courseRunTrainers) {
        const trainerEmail = assignment.trainer?.email?.trim();
        const trainerName = assignment.trainer?.name || 'Trainer';

        if (!trainerEmail) {
          trainerFailed += 1;
          await prisma.courseRunTrainer.update({
            where: { id: assignment.id },
            data: {
              emailStatus: 'FAILED',
              trainerAssignmentEmailStatus: 'FAILED',
            },
          });
          continue;
        }

        try {
          const trainerCourseDetails: Parameters<typeof EmailService.sendTrainerAssignmentEmail>[2] = {};
          if (courseRun.course?.title) {
            trainerCourseDetails.course = courseRun.course.title;
          }
          if (courseRun.serialNumber) {
            trainerCourseDetails.serialNumber = courseRun.serialNumber;
          }
          trainerCourseDetails.startDate = courseRun.startDatetime ? courseRun.startDatetime.toISOString() : null;
          trainerCourseDetails.endDate = courseRun.endDatetime ? courseRun.endDatetime.toISOString() : null;
          trainerCourseDetails.venue = courseRun.venue?.name || courseRun.specifiedLocation || null;
          trainerCourseDetails.venueAddress = courseRun.venue?.address || null;
          trainerCourseDetails.specifiedLocation = courseRun.specifiedLocation || null;

          const result = await EmailService.sendTrainerAssignmentEmail(
            trainerEmail,
            trainerName,
            trainerCourseDetails,
            Number(assignment.trainerBaseAmount || 0),
            Number(assignment.additionalCost || 0),
            null,
            null,
          );

          await prisma.courseRunTrainer.update({
            where: { id: assignment.id },
            data: {
              emailStatus: result.success ? 'SENT' : 'FAILED',
              trainerAssignmentEmailStatus: result.success ? 'SENT' : 'FAILED',
            },
          });

          // Create history record - ONLY if email was sent successfully
          if (result.success) {
            try {
              await prisma.trainerAssignmentEmailHistory.create({
                data: {
                  courseRunId: id,
                  trainerId: assignment.trainer.id,
                  cc: null,
                  additionalBodyContent: null,
                },
              });
            } catch (histErr) {
              console.warn('Failed to create trainerAssignmentEmailHistory record:', (histErr as any)?.message || histErr);
            }
          }

          if (result.success) {
            trainerSuccess += 1;
          } else {
            trainerFailed += 1;
          }
        } catch (err) {
          trainerFailed += 1;
          await prisma.courseRunTrainer.update({
            where: { id: assignment.id },
            data: {
              emailStatus: 'FAILED',
              trainerAssignmentEmailStatus: 'FAILED',
            },
          });
          console.error(`Failed to send email to trainer ${assignment.trainerId}:`, err);
        }
      }

      // Send emails to partners using their TC Email (pointOfContactEmail)
      let partnerSuccess = 0;
      let partnerFailed = 0;

      for (const partnerAssignment of courseRun.courseRunPartners || []) {
        const partner = partnerAssignment.partner;
        const partnerEmail = partner?.pointOfContactEmail?.trim() || partner?.email?.trim();
        const partnerName = partner?.name || 'Training Partner';

        if (!partnerEmail) {
          partnerFailed += 1;
          console.warn(`Partner ${partner?.name} (${partner?.id}) has no TC Email or email address. Skipping email.`);
          continue;
        }

        try {
          const partnerCourseDetails: Parameters<typeof EmailService.sendTrainerAssignmentEmail>[2] = {};
          if (courseRun.course?.title) {
            partnerCourseDetails.course = courseRun.course.title;
          }
          if (courseRun.serialNumber) {
            partnerCourseDetails.serialNumber = courseRun.serialNumber;
          }
          partnerCourseDetails.startDate = courseRun.startDatetime ? courseRun.startDatetime.toISOString() : null;
          partnerCourseDetails.endDate = courseRun.endDatetime ? courseRun.endDatetime.toISOString() : null;
          partnerCourseDetails.venue = courseRun.venue?.name || courseRun.specifiedLocation || null;
          partnerCourseDetails.venueAddress = courseRun.venue?.address || null;
          partnerCourseDetails.specifiedLocation = courseRun.specifiedLocation || null;

          const result = await EmailService.sendTrainerAssignmentEmail(
            partnerEmail,
            partnerName,
            partnerCourseDetails,
            0, // No base fee for partners
            0, // No additional cost for partners
            null,
            null,
          );

          if (result.success) {
            partnerSuccess += 1;
          } else {
            partnerFailed += 1;
          }
        } catch (err) {
          partnerFailed += 1;
          console.error(`Failed to send email to partner ${partnerAssignment.partnerId}:`, err);
        }
      }

      // Update course run status to CONFIRMED after all emails sent
      await prisma.courseRun.update({
        where: { id: id },
        data: {
          status: 'CONFIRMED',
          statusLastEvaluatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Training assignment emails processed',
        emailsSent: {
          learners: learnerSuccess,
          trainers: trainerSuccess,
          partners: partnerSuccess,
        },
        failures: {
          learners: learnerFailed,
          trainers: trainerFailed,
          partners: partnerFailed,
        },
      });
    } catch (error) {
      console.error('Error sending training assignment emails:', error);
      res.status(500).json(buildErrorResponse('courseRunController.sendTrainingAssignmentEmailToLearners', 'Failed to send training assignment emails', error));
    }
  },

  // Withdraw a learner from a course run
  async withdrawLearner(req: Request, res: Response): Promise<void> {
    try {
      const { courseRunId, learnerId } = req.params;
      const { reason, supportingDocument } = req.body;
      const actorId = (req as any).user?.id;

      if (!courseRunId || !learnerId) {
        res.status(400).json({
          success: false,
          error: 'Course run ID and learner ID are required',
        });
        return;
      }

      if (!reason) {
        res.status(400).json({
          success: false,
          error: 'Withdrawal reason is required',
        });
        return;
      }

      // Find the enrollment
      const enrollment = await prisma.courseRunLearner.findFirst({
        where: {
          courseRunId,
          deletedAt: null,
          OR: [
            { id: learnerId },
            { learnerId },
          ],
        },
        include: {
          learner: true,
          courseRun: {
            include: {
              course: true,
            },
          },
        },
      });

      if (!enrollment) {
        res.status(404).json({
          success: false,
          error: 'Learner enrollment not found',
        });
        return;
      }

      if (enrollment.enrollmentStatus === 'WITHDRAWN') {
        res.status(400).json({
          success: false,
          error: 'Learner is already withdrawn',
        });
        return;
      }

      // Check if course has started (on or after start date)
      // Withdrawal should be disabled from the course start date onwards
      if (enrollment.courseRun.startDatetime) {
        const courseStartDate = new Date(enrollment.courseRun.startDatetime);
        const today = new Date();
        // Reset to midnight for date-only comparison (ignore time)
        today.setHours(0, 0, 0, 0);
        courseStartDate.setHours(0, 0, 0, 0);
        
        if (today >= courseStartDate) {
          res.status(400).json({
            success: false,
            error: 'Cannot withdraw participant on or after the course start date. Please mark as Absent instead.',
          });
          return;
        }
      }

      // Handle supporting document upload if provided
      let documentId = null;
      if (supportingDocument) {
        try {
          let storedPath = supportingDocument.filepath || supportingDocument.path || null;
          let filename = supportingDocument.filename || supportingDocument.originalname || 'withdrawal-document';
          const mimeType = supportingDocument.mimetype || supportingDocument.mimeType || 'application/octet-stream';
          let size = supportingDocument.size || 0;

          if (supportingDocument.base64) {
            const uploadsDir = path.join(process.cwd(), 'uploads', 'withdrawal-documents');
            await fs.mkdir(uploadsDir, { recursive: true });

            const safeName = `${Date.now()}-${filename}`.replace(/[^a-zA-Z0-9._-]/g, '_');
            const filePath = path.join(uploadsDir, safeName);
            const buffer = Buffer.from(supportingDocument.base64, 'base64');

            await fs.writeFile(filePath, buffer);

            storedPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
            filename = safeName;
            size = supportingDocument.size || buffer.length;
          }

          const media = await prisma.media.create({
            data: {
              filename,
              originalName: supportingDocument.originalname || supportingDocument.filename || filename,
              mimeType,
              size,
              path: storedPath || `/uploads/withdrawal-documents/${filename}`,
            },
          });
          documentId = media.id;
        } catch (fileError) {
          console.error('Failed to store supporting document for withdrawal:', fileError);
        }
      }

      // Update enrollment to withdrawn status
      const updatedEnrollment = await prisma.courseRunLearner.update({
        where: {
          id: enrollment.id,
        },
        data: {
          enrollmentStatus: 'WITHDRAWN',
          withdrawnReason: reason,
          withdrawnAt: new Date(),
          withdrawnBy: actorId,
          supportingDocumentWithdrawnId: documentId,
        },
        include: {
          learner: true,
          supportingDocumentWithdrawn: true,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          ...(actorId && { userId: actorId }),
          action: 'Learner Withdrawn',
          actionType: 'UPDATE',
          ...(enrollment.id && { tableName: 'course_run_learners', recordId: enrollment.id }),
          ...(enrollment.learner?.fullname && enrollment.courseRun?.course?.title && {
            details: `Learner ${enrollment.learner.fullname} withdrawn from ${enrollment.courseRun.course.title}. Reason: ${reason}`
          }),
          ...((req as any).user?.email && { performedBy: (req as any).user.email }),
          ...(req.ip && { ipAddress: req.ip }),
        },
      });

      // Recalculate venue final fee after withdrawal
      try {
        const venueFinal = await calculateVenueFinalFee(courseRunId);
        await prisma.courseRun.update({ where: { id: courseRunId }, data: { venueFinalFee: venueFinal } });
      } catch (err) {
        console.warn('Failed to calculate venue final fee after withdrawLearner:', err);
      }

      res.json({
        success: true,
        message: 'Learner withdrawn successfully',
        enrollment: updatedEnrollment,
      });
    } catch (error) {
      console.error('Error withdrawing learner:', error);
      res.status(500).json(buildErrorResponse('courseRunController.withdrawLearner', 'Failed to withdraw learner', error));
    }
  },

  // Resend confirmation email to a learner
  async resendConfirmationEmail(req: Request, res: Response): Promise<void> {
    try {
      const { courseRunId, learnerId } = req.params;

      if (!courseRunId || !learnerId) {
        res.status(400).json({
          success: false,
          error: 'Course run ID and learner ID are required',
        });
        return;
      }

      // Find the enrollment
      const enrollment = await prisma.courseRunLearner.findFirst({
        where: {
          courseRunId,
          deletedAt: null,
          OR: [
            { id: learnerId },
            { learnerId },
          ],
        },
        include: {
          learner: true,
          courseRun: {
            include: {
              course: true,
              venue: true,
            },
          },
        },
      });

      if (!enrollment) {
        res.status(404).json({
          success: false,
          error: 'Learner enrollment not found',
        });
        return;
      }

      if (enrollment.enrollmentStatus === 'WITHDRAWN') {
        res.status(400).json({
          success: false,
          error: 'Cannot send confirmation email to withdrawn learner',
        });
        return;
      }

      if (!enrollment.learner.email) {
        res.status(400).json({
          success: false,
          error: 'Learner does not have an email address',
        });
        return;
      }

      try {
        const emailPayload: Parameters<typeof EmailService.sendLearnerCourseConfirmationEmail>[0] = {
          email: enrollment.learner.email,
          learnerName: enrollment.learner.fullname || 'Learner',
          courseTitle:
            enrollment.courseRun?.course?.title ||
            enrollment.courseRun?.serialNumber ||
            'POLWEL Course',
        };

        if (enrollment.courseRun?.course?.courseCode) {
          emailPayload.courseCode = enrollment.courseRun.course.courseCode;
        }

        if (enrollment.courseRun?.serialNumber) {
          emailPayload.serialNumber = enrollment.courseRun.serialNumber;
        }

        if (enrollment.courseRun?.startDatetime) {
          emailPayload.startDate = new Date(enrollment.courseRun.startDatetime);
        }

        if (enrollment.courseRun?.endDatetime) {
          emailPayload.endDate = new Date(enrollment.courseRun.endDatetime);
        }

        const venueName = enrollment.courseRun?.venue?.name || enrollment.courseRun?.specifiedLocation;
        if (venueName) {
          emailPayload.venueName = venueName;
        }

        if (enrollment.courseRun?.venue?.address) {
          emailPayload.venueAddress = enrollment.courseRun.venue.address;
        }

        const didSend = await EmailService.sendLearnerCourseConfirmationEmail(emailPayload);

        const status = didSend ? 'SENT' : 'FAILED';
        const now = new Date();

        await prisma.courseRunLearner.update({
          where: {
            id: enrollment.id,
          },
          data: {
            confirmationEmailStatus: status,
            confirmationEmailLastSentAt: now,
          },
        });

        await prisma.confirmationEmailHistory.create({
          data: {
            courseRunLearnersId: enrollment.id,
            courseRunId: courseRunId,
            remarks: didSend
              ? `Confirmation email sent successfully to ${enrollment.learner.email}`
              : `Failed to send confirmation email to ${enrollment.learner.email}.` ,
          },
        });

        if (!didSend) {
          res.status(500).json({
            success: false,
            error: 'Failed to send confirmation email',
          });
          return;
        }

        res.json({
          success: true,
          message: 'Confirmation email sent successfully',
          sentTo: enrollment.learner.email,
        });
      } catch (emailError) {
        const now = new Date();

        await prisma.courseRunLearner.update({
          where: {
            id: enrollment.id,
          },
          data: {
            confirmationEmailStatus: 'FAILED',
            confirmationEmailLastSentAt: now,
          },
        });

        await prisma.confirmationEmailHistory.create({
          data: {
            courseRunLearnersId: enrollment.id,
            courseRunId: courseRunId,
            remarks: `Failed to send confirmation email to ${enrollment.learner.email}. Error: ${
              emailError instanceof Error ? emailError.message : 'Unknown error'
            }`,
          },
        });

        throw emailError;
      }
    } catch (error) {
      console.error('Error resending confirmation email:', error);
      res.status(500).json(buildErrorResponse('courseRunController.resendConfirmationEmail', 'Failed to resend confirmation email', error));
    }
  },

  saveBilling: async (req: Request, res: Response) => {
    try {
      const {
        courseRunId,
        valueOfWorkDone,
        contractFeePBMSBENumber,
        contractPBMSInvoiceDate,
        contractInvoiceAmount,
        venuePBMSBENumber,
        venuePBMSInvoiceDate,
        venueInvoiceAmount,
        finalRemarks,
        entries,
      } = req.body;

      if (!courseRunId) {
        res.status(400).json({
          success: false,
          error: 'Course Run ID is required',
        });
        return;
      }

      // Verify course run exists and is in PENDING_BILLING status
      const courseRun = await prisma.courseRun.findUnique({
        where: { id: courseRunId },
      });

      if (!courseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      // Auto-connect to billing report based on course run end date
      let billingReportId: string | null = null;
      if (courseRun.endDatetime) {
        const billingMonthString = getBillingMonthString(courseRun.endDatetime);
        billingReportId = await findOrCreateBillingReport(billingMonthString);
      }

      // Create or update billing record
      const billing = await prisma.courseRunBilling.upsert({
        where: { courseRunId },
        create: {
          courseRunId,
          billingReportId,
          valueOfWorkDone: valueOfWorkDone ? parseInt(valueOfWorkDone) : null,
          contractFeePBMSBENumber: contractFeePBMSBENumber || null,
          contractPBMSInvoiceDate: contractPBMSInvoiceDate ? new Date(contractPBMSInvoiceDate) : null,
          contractInvoiceAmount: contractInvoiceAmount ? parseFloat(contractInvoiceAmount) : null,
          venuePBMSBENumber: venuePBMSBENumber || null,
          venuePBMSInvoiceDate: venuePBMSInvoiceDate ? new Date(venuePBMSInvoiceDate) : null,
          venueInvoiceAmount: venueInvoiceAmount ? parseFloat(venueInvoiceAmount) : null,
          finalRemarks: finalRemarks || null,
        },
        update: {
          billingReportId,
          valueOfWorkDone: valueOfWorkDone ? parseInt(valueOfWorkDone) : null,
          contractFeePBMSBENumber: contractFeePBMSBENumber || null,
          contractPBMSInvoiceDate: contractPBMSInvoiceDate ? new Date(contractPBMSInvoiceDate) : null,
          contractInvoiceAmount: contractInvoiceAmount ? parseFloat(contractInvoiceAmount) : null,
          venuePBMSBENumber: venuePBMSBENumber || null,
          venuePBMSInvoiceDate: venuePBMSInvoiceDate ? new Date(venuePBMSInvoiceDate) : null,
          venueInvoiceAmount: venueInvoiceAmount ? parseFloat(venueInvoiceAmount) : null,
          finalRemarks: finalRemarks || null,
        },
      });

      // Basic validation: each learner can only appear in one billing entry
      if (entries && Array.isArray(entries)) {
        const learnerIdToEntryIndex = new Map<string, number>();
        for (let i = 0; i < entries.length; i++) {
          const e = entries[i];
          const ids: string[] = Array.isArray(e?.learnerIds) ? e.learnerIds : [];
          for (const lid of ids) {
            if (learnerIdToEntryIndex.has(lid)) {
              const firstIndex = learnerIdToEntryIndex.get(lid)!;
              res.status(400).json({
                success: false,
                message: `Learner appears in multiple entries (entries ${firstIndex + 1} and ${i + 1}). Each learner can only belong to one entry.`,
              });
              return;
            }
            learnerIdToEntryIndex.set(lid, i);
          }
        }
      }

      // Delete existing entries and create new ones
      // First, clear all courseRunBillingEntryId references from learners
      await prisma.courseRunLearner.updateMany({
        where: {
          courseRunId: courseRunId,
          courseRunBillingEntryId: { not: null },
        },
        data: {
          courseRunBillingEntryId: null,
        },
      });

      await prisma.courseRunBillingEntry.deleteMany({
        where: { courseRunBillingId: billing.id },
      });

      if (entries && Array.isArray(entries)) {
        for (const entry of entries) {
          // Create the billing entry
          const createdEntry = await prisma.courseRunBillingEntry.create({
            data: {
              courseRunBillingId: billing.id,
              pbmsInvoiceNumber: entry.pbmsInvoiceNumber || null,
              pbmsInvoiceDate: entry.pbmsInvoiceDate || null,
              invoiceAmount: entry.invoiceAmount ? parseFloat(entry.invoiceAmount) : null,
              remarks: entry.remarks || null,
            },
          });

          // Update learners to associate them with this billing entry
          if (Array.isArray(entry.learnerIds) && entry.learnerIds.length > 0) {
            await prisma.courseRunLearner.updateMany({
              where: {
                courseRunId: courseRunId,
                learnerId: { in: entry.learnerIds },
              },
              data: {
                courseRunBillingEntryId: createdEntry.id,
              },
            });
          }
        }
      }

      // Determine completeness: a course run is considered COMPLETED only when
      // all learners have been associated with a billing entry. If one or more
      // learners are not present in any billing entry, mark as INCOMPLETED.
      const unassignedLearnersCount = await prisma.courseRunLearner.count({
        where: {
          courseRunId: courseRunId,
          deletedAt: null,
          courseRunBillingEntryId: null,
        },
      });

      const newStatus = unassignedLearnersCount > 0 ? 'INCOMPLETED' : 'COMPLETED';

      await prisma.courseRun.update({
        where: { id: courseRunId },
        data: { status: newStatus },
      });

      // Calculate and update billing report status based on course run statuses if connected
      if (billingReportId) {
        const calculatedStatus = await calculateBillingReportStatus(billingReportId);

        await prisma.billingReport.update({
          where: { id: billingReportId },
          data: {
            status: calculatedStatus,
          },
        });
      }

      res.json({
        success: true,
        message: 'Billing information saved successfully',
        billing,
      });
    } catch (error) {
      console.error('Error saving billing:', error);
      res.status(500).json(buildErrorResponse('courseRunController.saveBilling', 'Failed to save billing information', error));
    }
  },

  // Generate billing XLSX export
  generateBillingExport: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      // Fetch course run with all related data
      const courseRun = await prisma.courseRun.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              courseCode: true,
              defaultCourseFee: true,
              discounts: true,
            },
          },
          venue: true,
          courseRunBilling: {
            include: {
              courseRunBillingEntries: {
                include: {
                  courseRunLearners: {
                    where: {
                      deletedAt: null,
                    },
                    include: {
                      learner: {
                        select: {
                          id: true,
                          fullname: true,
                          email: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          courseRunLearners: {
            where: {
              deletedAt: null,
            },
            include: {
              learner: {
                select: {
                  id: true,
                  fullname: true,
                  email: true,
                },
              },
            },
          },
          courseRunTrainers: {
            include: {
              trainer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!courseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          courseRun,
          // Include formatted data for XLSX generation
          exportData: {
            title: courseRun.course?.title || '',
            courseCode: courseRun.course?.courseCode || '',
            serialNumber: courseRun.serialNumber || '',
            startDate: courseRun.startDatetime,
            endDate: courseRun.endDatetime,
            venue: courseRun.venue?.name || courseRun.specifiedLocation || '',
            billingRate: courseRun.course?.defaultCourseFee || 0,
            participantCount: courseRun.courseRunLearners.length,
            billing: courseRun.courseRunBilling,
          },
        },
      });
    } catch (error) {
      console.error('Error generating billing export:', error);
      res.status(500).json(buildErrorResponse('courseRunController.generateBillingExport', 'Failed to generate billing export', error));
    }
  },

  // Export participants with attendance data to XLSX
  exportParticipantsXLSX: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ success: false, error: 'Course run ID is required' });
        return;
      }

      const courseRun = await prisma.courseRun.findUnique({
        where: { id },
        include: {
          course: { select: { title: true } },
          venue: { select: { name: true } },
          courseRunTrainers: {
            where: { deletedAt: null },
            include: { trainer: { select: { name: true } } },
          },
          courseRunLearners: {
            where: { enrollmentStatus: 'ENROLLED', deletedAt: null },
            include: {
              learner: { 
                select: { 
                  fullname: true, 
                  departmentName: true, 
                  email: true, 
                  contact: true, 
                  designation: true,
                  clientOrganization: { 
                    select: { buNumber: true } 
                  } 
                } 
              },
            },
          },
        },
      });

      if (!courseRun) {
        res.status(404).json({ success: false, error: 'Course run not found' });
        return;
      }

      // Fetch attendance data separately
      const attendanceRecords = await prisma.courseRunLearnerAttendance.findMany({
        where: { courseRunId: id },
        select: { learnerId: true, day: true, attendAM: true, attendPM: true },
      });

      if (!courseRun) {
        res.status(404).json({ success: false, error: 'Course run not found' });
        return;
      }

      // Create workbook
      const workbook = new (require('exceljs')).Workbook();
      const sheet = workbook.addWorksheet('Participants');

      // Add course run header info
      const startDate = courseRun.startDatetime ? new Date(courseRun.startDatetime).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
      const endDate = courseRun.endDatetime ? new Date(courseRun.endDatetime).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
      const startTime = courseRun.startDatetime ? new Date(courseRun.startDatetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
      const endTime = courseRun.endDatetime ? new Date(courseRun.endDatetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
      const trainers = courseRun.courseRunTrainers.map((t: any) => t.trainer?.name || '').filter(Boolean).join(', ') || '-';

      sheet.addRow([`Course: ${courseRun.course?.title || ''}`]);
      sheet.addRow([`Start Date: ${startDate}`]);
      sheet.addRow([`End Date: ${endDate}`]);
      sheet.addRow([`Time: ${startTime} - ${endTime}`]);
      sheet.addRow([`Venue: ${courseRun.venue?.name || ''}`]);
      sheet.addRow([`Trainer: ${trainers}`]);
      sheet.addRow([]); // Blank row

      // Add participant table headers
      const headers = ['Name', 'Department', 'BU Number', 'Designation', 'Contact Number', 'Attendance Status'];
      
      headers.push();
      sheet.addRow(headers);

      // Style header row
      const headerRow = sheet.getRow(8);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

      // Add participant rows
      courseRun.courseRunLearners.forEach((enrollment: any) => {
        // Calculate attendance status for this learner
        const learnerAttendance = attendanceRecords.filter((att: any) => att.learnerId === enrollment.learnerId);
        const attendanceStatus = learnerAttendance.length > 0 ? 'Attended' : 'Not Attended';

        const row: any[] = [
          enrollment.learner?.fullname || '',
          enrollment.learner?.departmentName || '',
          enrollment.learner?.clientOrganization?.buNumber || '-',
          enrollment.learner?.designation || '',
          enrollment.learner?.contact || '',
          attendanceStatus,
        ];

        sheet.addRow(row);
      });

      // Set column widths
      const colWidths = [25, 20, 15, 20, 18, 18];
      sheet.columns.forEach((col: any, i: number) => {
        col.width = colWidths[i] || 15;
      });

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="participants-${courseRun.id}.xlsx"`);
      res.send(buffer);
    } catch (error) {
      console.error('Error exporting participants:', error);
      res.status(500).json(buildErrorResponse('courseRunController.exportParticipantsXLSX', 'Failed to export participants', error));
    }
  },

  // Generate certificates for learners
  generateCertificates: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      // Fetch course run with learners
      const courseRun = await prisma.courseRun.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        include: {
          course: true,
          venue: true,
          courseRunLearners: {
            where: {
              deletedAt: null,
            },
            include: {
              learner: {
                select: {
                  id: true,
                  fullname: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!courseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      // Fetch all attendance records for this course run
      const attendanceRecords = await prisma.courseRunLearnerAttendance.findMany({
        where: {
          courseRunId: id,
          deletedAt: null,
        },
      });

      // Calculate attendance status for each learner
      const learnersWithAttendance = courseRun.courseRunLearners.map((enrollment) => {
        const learnerAttendance = attendanceRecords.filter(
          (record) => record.learnerId === enrollment.learnerId
        );
        const totalDays = learnerAttendance.length;
        const presentCount = learnerAttendance.filter(
          (record) => record.attendAM || record.attendPM
        ).length;

        // Check BOTH the stored attendanceStatus AND calculated from attendance records
        // If attendanceStatus is set to PRESENT, use that; otherwise calculate from records
        const isPresent = enrollment.attendanceStatus === 'PRESENT' || presentCount > 0;

        return {
          id: enrollment.id,
          learnerId: enrollment.learnerId,
          learnerName: enrollment.learner?.fullname || '',
          learnerEmail: enrollment.learner?.email || '',
          isPresent,
          totalDays,
          presentDays: presentCount,
          waiverReason: enrollment.waiverReason,
          waiverSupportingDocumentId: enrollment.waiverSupportingDocumentId,
          waiverSubmittedAt: enrollment.waiverSubmittedAt,
        };
      });

      res.json({
        success: true,
        data: {
          courseRun: {
            id: courseRun.id,
            serialNumber: courseRun.serialNumber,
            courseName: courseRun.course?.title || '',
            courseCode: courseRun.course?.courseCode || '',
            duration: courseRun.course?.duration || 0,
            durationType: courseRun.course?.durationType || 'days',
            startDate: courseRun.startDatetime,
            endDate: courseRun.endDatetime,
            venue: courseRun.venue?.name || courseRun.specifiedLocation || '',
          },
          learners: learnersWithAttendance,
          summary: {
            total: learnersWithAttendance.length,
            present: learnersWithAttendance.filter((l) => l.isPresent).length,
            absent: learnersWithAttendance.filter((l) => !l.isPresent).length,
          },
        },
      });
    } catch (error) {
      console.error('Error generating certificates:', error);
      res.status(500).json(buildErrorResponse('courseRunController.generateCertificates', 'Failed to generate certificates', error));
    }
  },

  // Submit waiver form for absent learner
  submitWaiverForm: async (req: Request, res: Response) => {
    try {
      const { id, enrollmentId } = req.params;
      const { waiverReason, waiverDocument } = req.body;
      const userId = req.user?.userId;

      if (!id || !enrollmentId) {
        res.status(400).json({
          success: false,
          error: 'Course run ID and enrollment ID are required',
        });
        return;
      }

      if (!waiverReason) {
        res.status(400).json({
          success: false,
          error: 'Waiver reason is required',
        });
        return;
      }

      let waiverDocumentId: string | null = null;

      // If there's a document, store it in Media table
      if (waiverDocument && waiverDocument.base64) {
        try {
          // Remove data URL prefix if present
          const base64Data = waiverDocument.base64.replace(/^data:[^;]+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');

          const uploadsDir = path.join(process.cwd(), 'uploads', 'waiver-documents');
          await fs.mkdir(uploadsDir, { recursive: true });

          const safeFileName = `${Date.now()}-${waiverDocument.filename || 'waiver_document'}`.replace(/[^a-zA-Z0-9._-]/g, '_');
          const absolutePath = path.join(uploadsDir, safeFileName);
          await fs.writeFile(absolutePath, buffer);

          const relativePath = path.relative(process.cwd(), absolutePath).replace(/\\/g, '/');

          const media = await prisma.media.create({
            data: {
              filename: safeFileName,
              originalName: waiverDocument.filename || safeFileName,
              mimeType: waiverDocument.mimetype || 'application/pdf',
              size: waiverDocument.size || buffer.length,
              path: relativePath,
              url: `/${relativePath}`,
            },
          });

          waiverDocumentId = media.id;
        } catch (mediaError) {
          console.error('Error saving waiver document:', mediaError);
          // Continue without document if upload fails
        }
      }

      // Update enrollment with waiver information
      const enrollment = await prisma.courseRunLearner.update({
        where: {
          id: enrollmentId,
        },
        data: {
          waiverReason,
          waiverSupportingDocumentId: waiverDocumentId,
          waiverSubmittedAt: new Date(),
          waiverStatus: 'PENDING',
        },
        include: {
          learner: {
            select: {
              id: true,
              fullname: true,
              email: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: 'Waiver form submitted successfully',
        enrollment,
      });
    } catch (error) {
      console.error('Error submitting waiver form:', error);
      res.status(500).json(buildErrorResponse('courseRunController.submitWaiverForm', 'Failed to submit waiver form', error));
    }
  },

  generateCertificatePDF: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, learnerId: enrollmentId } = req.params;
      const userId = req.user?.userId;

      if (!id || !enrollmentId) {
        res.status(400).json(buildErrorResponse('courseRunController.generateCertificatePDF', 'Course run ID and learner ID are required', new Error('Missing IDs')));
        return;
      }

      if (!userId) {
        res.status(401).json(buildErrorResponse('courseRunController.generateCertificatePDF', 'User not authenticated', new Error('No user ID')));
        return;
      }

      // Fetch enrollment with related data
      const enrollment = await prisma.courseRunLearner.findFirst({
        where: {
          id: enrollmentId,
          courseRunId: id,
          deletedAt: null,
        },
        include: {
          learner: true,
          courseRun: {
            include: {
              course: true,
            },
          },
        },
      });

      if (!enrollment) {
        res.status(404).json(buildErrorResponse('courseRunController.generateCertificatePDF', 'Enrollment not found', new Error('Not found')));
        return;
      }

      const courseInfo = (enrollment.courseRun as any)?.course;
      const certificateData = {
        learnerName: (enrollment.learner as any)?.fullname || 'Participant',
        courseName: courseInfo?.title || 'Course',
        duration: Number(courseInfo?.duration) || 0,
        durationType: courseInfo?.durationType || 'days',
        endDate: new Date((enrollment.courseRun as any).endDatetime),
        courseCode: courseInfo?.courseCode || undefined,
      };

      const pdfBuffer = await buildCertificatePDFBuffer(certificateData);

      const safeLearnerName = certificateData.learnerName?.replace(/[^a-z0-9]+/gi, '_') || 'Learner';
      const safeCourseCode = certificateData.courseCode?.replace(/[^a-z0-9]+/gi, '_');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=Certificate_${safeLearnerName}${safeCourseCode ? `_${safeCourseCode}` : ''}.pdf`
      );

      res.status(200).send(pdfBuffer);
    } catch (error) {
      console.error('Error generating certificate PDF:', error);
      if (!res.headersSent) {
        res.status(500).json(buildErrorResponse('courseRunController.generateCertificatePDF', 'Failed to generate certificate PDF', error));
      }
    }
  },

  generateCertificatesZIP: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { learnerIds } = req.body;
      const userId = req.user?.userId;

      if (!id) {
        res.status(400).json(buildErrorResponse('courseRunController.generateCertificatesZIP', 'Course run ID is required', new Error('Missing ID')));
        return;
      }

      if (!userId) {
        res.status(401).json(buildErrorResponse('courseRunController.generateCertificatesZIP', 'User not authenticated', new Error('No user ID')));
        return;
      }

      if (!learnerIds || !Array.isArray(learnerIds) || learnerIds.length === 0) {
        res.status(400).json(buildErrorResponse('courseRunController.generateCertificatesZIP', 'Please provide learner IDs', new Error('Invalid learner IDs')));
        return;
      }

      // Fetch all enrollments
      const enrollments = await prisma.courseRunLearner.findMany({
        where: {
          courseRunId: id,
          id: {
            in: learnerIds,
          },
          deletedAt: null,
        },
        include: {
          learner: true,
          courseRun: {
            include: {
              course: true,
            },
          },
        },
      });

      if (enrollments.length === 0) {
        res.status(404).json(buildErrorResponse('courseRunController.generateCertificatesZIP', 'No enrollments found', new Error('Not found')));
        return;
      }

      const certificatesData = enrollments.map((enrollment) => {
        const courseInfo = (enrollment.courseRun as any)?.course;
        return {
          learnerName: (enrollment.learner as any)?.fullname || 'Participant',
          courseName: courseInfo?.title || 'Course',
          duration: Number(courseInfo?.duration) || 0,
          durationType: courseInfo?.durationType || 'days',
          endDate: new Date((enrollment.courseRun as any).endDatetime),
          courseCode: courseInfo?.courseCode || undefined,
        };
      });

      const zipBuffer = await buildCertificatesZipBuffer(certificatesData);

      const zipFileName = `Certificates_${new Date().toISOString().split('T')[0]}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${zipFileName}`);
      res.setHeader('Content-Length', zipBuffer.length.toString());
      res.status(200).send(zipBuffer);
    } catch (error) {
      console.error('Error generating certificates ZIP:', error);
      if (!res.headersSent) {
        res.status(500).json(buildErrorResponse('courseRunController.generateCertificatesZIP', 'Failed to generate certificates ZIP', error));
      }
    }
  },

  sendCertificatesToLearners: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { learnerIds } = req.body;
      const userId = req.user?.userId;

      if (!id) {
        res.status(400).json(buildErrorResponse('courseRunController.sendCertificatesToLearners', 'Course run ID is required', new Error('Missing ID')));
        return;
      }

      if (!userId) {
        res.status(401).json(buildErrorResponse('courseRunController.sendCertificatesToLearners', 'User not authenticated', new Error('No user ID')));
        return;
      }

      if (!learnerIds || !Array.isArray(learnerIds) || learnerIds.length === 0) {
        res.status(400).json(buildErrorResponse('courseRunController.sendCertificatesToLearners', 'Please provide learner IDs', new Error('Invalid learner IDs')));
        return;
      }

      // Fetch course run with enrollments
      const courseRun = await prisma.courseRun.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        include: {
          course: true,
          courseRunTrainers: {
            include: {
              trainer: {
                select: {
                  name: true,
                },
              },
            },
          },
          courseRunLearners: {
            where: {
              id: {
                in: learnerIds,
              },
              deletedAt: null,
            },
            include: {
              learner: {
                select: {
                  id: true,
                  fullname: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!courseRun) {
        res.status(404).json(buildErrorResponse('courseRunController.sendCertificatesToLearners', 'Course run not found', new Error('Not found')));
        return;
      }

      if (courseRun.courseRunLearners.length === 0) {
        res.status(404).json(buildErrorResponse('courseRunController.sendCertificatesToLearners', 'No enrollments found', new Error('No enrollments')));
        return;
      }

      const baseUrl = process.env.FRONTEND_URL || 'https://tms.polwel.org';
      const trainerNames = courseRun.courseRunTrainers
        .map((ct: any) => ct.trainer?.name)
        .filter(Boolean)
        .join(', ');

      let successCount = 0;
      let failedCount = 0;
      const results: Array<{ learnerId: string; learnerName: string; success: boolean; error?: string }> = [];

      // Send certificate email to each selected learner
      for (const enrollment of courseRun.courseRunLearners) {
        const learner = enrollment.learner;
        const email = learner?.email?.trim();

        if (!email) {
          failedCount += 1;
          results.push({
            learnerId: learner?.id || '',
            learnerName: learner?.fullname || 'Unknown',
            success: false,
            error: 'No email address',
          });
          continue;
        }

        try {
          const certificateDownloadUrl = `${baseUrl}/api/course-runs/certificates/download/${learner?.id}/${id}`;

          const emailParams: any = {
            email,
            learnerName: learner?.fullname || 'Learner',
            courseTitle: courseRun.course?.title || 'POLWEL Course',
            certificateDownloadUrl,
          };

          if (courseRun.course?.courseCode) emailParams.courseCode = courseRun.course.courseCode;
          if (courseRun.startDatetime) emailParams.startDate = new Date(courseRun.startDatetime);
          if (courseRun.endDatetime) emailParams.endDate = new Date(courseRun.endDatetime);
          if (trainerNames) emailParams.trainerName = trainerNames;
          if (courseRun.endDatetime) emailParams.completionDate = new Date(courseRun.endDatetime);

          const didSend = await EmailService.sendCourseCompletionEmail(emailParams);

          if (didSend) {
            successCount += 1;
            results.push({
              learnerId: learner?.id || '',
              learnerName: learner?.fullname || 'Unknown',
              success: true,
            });
          } else {
            failedCount += 1;
            results.push({
              learnerId: learner?.id || '',
              learnerName: learner?.fullname || 'Unknown',
              success: false,
              error: 'Email service failed',
            });
          }
        } catch (error: any) {
          console.error(`Failed to send certificate email to ${email}:`, error);
          failedCount += 1;
          results.push({
            learnerId: learner?.id || '',
            learnerName: learner?.fullname || 'Unknown',
            success: false,
            error: error?.message || 'Unknown error',
          });
        }
      }

      res.json({
        success: true,
        message: `Sent ${successCount} certificate email(s) successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
        data: {
          total: courseRun.courseRunLearners.length,
          success: successCount,
          failed: failedCount,
          results,
        },
      });
    } catch (error) {
      console.error('Error sending certificates to learners:', error);
      res.status(500).json(buildErrorResponse('courseRunController.sendCertificatesToLearners', 'Failed to send certificates', error));
    }
  },

  downloadCertificatePublic: async (req: Request, res: Response): Promise<void> => {
    try {
      const { learnerId, courseRunId } = req.params;

      if (!learnerId || !courseRunId) {
        res.status(400).json(buildErrorResponse('courseRunController.downloadCertificatePublic', 'Learner ID and course run ID are required', new Error('Missing IDs')));
        return;
      }

      // Find the enrollment
      const enrollment = await prisma.courseRunLearner.findFirst({
        where: {
          learnerId,
          courseRunId,
          enrollmentStatus: 'ENROLLED',
          deletedAt: null,
        },
        include: {
          learner: {
            select: {
              fullname: true,
            },
          },
          courseRun: {
            include: {
              course: {
                select: {
                  title: true,
                  courseCode: true,
                  duration: true,
                  durationType: true,
                },
              },
            },
          },
        },
      });

      if (!enrollment) {
        res.status(404).json(buildErrorResponse('courseRunController.downloadCertificatePublic', 'Certificate not found', new Error('Enrollment not found')));
        return;
      }

      // Check if course run is completed
      if (enrollment.courseRun.status !== 'COMPLETED') {
        res.status(400).json(buildErrorResponse('courseRunController.downloadCertificatePublic', 'Certificate not available yet', new Error('Course not completed')));
        return;
      }

      const certificateData = {
        learnerName: enrollment.learner.fullname,
        courseName: enrollment.courseRun.course.title,
        duration: Number(enrollment.courseRun.course.duration) || 0,
        durationType: enrollment.courseRun.course.durationType || 'hours',
        endDate: enrollment.courseRun.endDatetime ? new Date(enrollment.courseRun.endDatetime) : new Date(),
        courseCode: enrollment.courseRun.course.courseCode ?? '',
      };

      const pdfBuffer = await buildCertificatePDFBuffer(certificateData);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Certificate_${certificateData.learnerName.replace(/[^a-z0-9]+/gi, '_')}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error in downloadCertificatePublic:', error);
      res.status(500).json(buildErrorResponse('courseRunController.downloadCertificatePublic', 'Failed to download certificate', error));
    }
  },

  exportToCSV: async (req: Request, res: Response) => {
    try {
      // Fetch all course runs with related data
      const courseRuns = await prisma.courseRun.findMany({
        where: {
          deletedAt: null,
        },
        include: {
          course: {
            select: {
              title: true,
              courseCode: true,
              category: true,
            },
          },
          venue: {
            select: {
              name: true,
              address: true,
            },
          },
          courseRunTrainers: {
            where: {
              deletedAt: null,
            },
            include: {
              trainer: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          courseRunPartners: {
            where: {
              deletedAt: null,
            },
            include: {
              partner: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          courseRunLearners: {
            where: {
              enrollmentStatus: 'ENROLLED',
              deletedAt: null,
            },
            include: {
              learner: {
                select: {
                  fullname: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          startDatetime: 'desc',
        },
      });

      // Build CSV content
      const headers = [
        'Serial Number',
        'Course Run Type',
        'Course Code',
        'Course Title',
        'Category',
        'Start Date',
        'End Date',
        'Venue',
        'Location',
        'Min Size',
        'Max Size',
        'Enrolled',
        'Status',
        'Fee Type',
        'Base Course Fee',
        'Venue Fee',
        'Other Fee',
        'Admin Fee',
        'Contingency Fee',
      ];

      const rows = courseRuns.map((run) => {
        const startDate = run.startDatetime
          ? new Date(run.startDatetime).toLocaleDateString('en-GB')
          : '';
        
        const endDate = run.endDatetime
          ? new Date(run.endDatetime).toLocaleDateString('en-GB')
          : '';

        // Determine fee type (Default/Standard/Premium or custom description)
        const feeType = run.feeType || 'Standard';

        return [
          run.serialNumber || '',
          run.courseRunType || '',
          run.course?.courseCode || '',
          run.course?.title || '',
          run.course?.category || '',
          startDate,
          endDate,
          run.venue?.name || '',
          run.venue?.address || run.specifiedLocation || '',
          run.minClassSize?.toString() || '',
          run.maxClassSize?.toString() || '',
          run.courseRunLearners.length.toString(),
          run.status,
          feeType,
          run.baseCourseFee?.toString() || '',
          run.venueFee?.toString() || '',
          run.otherFee?.toString() || '',
          run.adminFee?.toString() || '',
          run.contingencyFee?.toString() || '',
        ];
      });

      // Escape CSV fields
      const escapeCsvField = (field: string) => {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      };

      const csvContent = [
        headers.map(escapeCsvField).join(','),
        ...rows.map(row => row.map(escapeCsvField).join(',')),
      ].join('\n');

      res.status(200).json({
        success: true,
        data: csvContent,
      });
    } catch (error) {
      console.error('Export learners attendance error:', error);
      res.status(500).json(buildErrorResponse('exportLearnersAttendance', 'Failed to export learners attendance', error));
    }
  },

  // NEW: Dedicated endpoint for Post Run Management page
  // Returns PENDING_BILLING, IN_PROGRESS, COMPLETED, CANCELLED runs without caching
  getPostCourseRuns: async (req: Request, res: Response) => {
    try {
      const { statuses, search, page = 1, limit = 1000 } = req.query;
      
      console.log('[PostCourseRuns] Request params:', { statuses, search, page, limit });
      
      // Parse statuses - expect comma-separated string
      let statusArray: CourseStatus[] = [];
      if (typeof statuses === 'string' && statuses.trim()) {
        statusArray = statuses.split(',').map(s => s.trim().toUpperCase()) as CourseStatus[];
      }
      
      console.log('[PostCourseRuns] Status array:', statusArray);
      
      // Build where clause
      const where: any = {
        deletedAt: null,
      };
      
      if (statusArray.length > 0) {
        where.status = {
          in: statusArray,
        };
      }
      
      // Add search if provided - search across multiple fields
      // MySQL string comparisons are case-insensitive by default with utf8_general_ci collation
      if (typeof search === 'string' && search.trim()) {
        const searchTerm = search.trim();
        where.OR = [
          { serialNumber: { contains: searchTerm } },
          { course: { title: { contains: searchTerm } } },
          { course: { courseCode: { contains: searchTerm } } },
          { venue: { name: { contains: searchTerm } } },
        ];
      }
      
      console.log('[PostCourseRuns] Where clause:', JSON.stringify(where, null, 2));
      
      // Get course runs with all necessary relations
      const courseRuns = await prisma.courseRun.findMany({
        where,
        include: {
          course: {
            select: {
              id: true,
              title: true,
              courseCode: true,
              category: true,
            },
          },
          venue: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          _count: {
            select: {
              courseRunLearners: {
                where: {
                  enrollmentStatus: 'ENROLLED',
                  deletedAt: null,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: Number(limit),
      });
      
      console.log('[PostCourseRuns] Found', courseRuns.length, 'runs');
      
      // Format response
      const formattedRuns = courseRuns.map(run => ({
        id: run.id,
        serialNumber: run.serialNumber,
        courseRunType: run.courseRunType,
        course: run.course ? {
          id: run.course.id,
          title: run.course.title,
          courseCode: run.course.courseCode,
          category: run.course.category,
        } : null,
        startDatetime: run.startDatetime,
        endDatetime: run.endDatetime,
        venue: run.venue ? {
          id: run.venue.id,
          name: run.venue.name,
          address: run.venue.address,
        } : null,
        specifiedLocation: run.specifiedLocation,
        minClassSize: run.minClassSize,
        maxClassSize: run.maxClassSize,
        currentParticipants: (run as any)._count?.courseRunLearners || 0,
        status: run.status,
        cancelReason: run.cancelReason,
        cancelledAt: run.cancelledAt,
        baseCourseFee: run.baseCourseFee,
        courseRunFeeType: run.courseRunFeeType,
      }));
      
      // Set no-cache headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      
      res.status(200).json({
        success: true,
        courseRuns: formattedRuns,
        total: formattedRuns.length,
      });
    } catch (error) {
      console.error('[PostCourseRuns] Error:', error);
      res.status(500).json(buildErrorResponse('getPostCourseRuns', 'Failed to get post course runs', error));
    }
  },

  // Duplicate a course run from a past/post run
  duplicateCourseRun: async (req: Request, res: Response) => {
    try {
      const { courseRunId, startDatetime, endDatetime } = req.body;

      console.log('[DuplicateCourseRun] Request:', { courseRunId, startDatetime, endDatetime });

      // Validation
      if (!courseRunId || !startDatetime || !endDatetime) {
        res.status(400).json({
          success: false,
          error: 'Course run ID, start date, and end date are required',
        });
        return;
      }

      // Validate dates
      const startDate = new Date(startDatetime);
      const endDate = new Date(endDatetime);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid date format',
        });
        return;
      }

      if (startDate >= endDate) {
        res.status(400).json({
          success: false,
          error: 'End date must be after start date',
        });
        return;
      }

      // Fetch the original course run with all its relations
      const originalRun = await prisma.courseRun.findUnique({
        where: { id: courseRunId },
        include: {
          course: true,
          venue: true,
          courseRunTrainers: {
            where: { deletedAt: null },
            include: {
              trainer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          courseRunPartners: {
            where: { deletedAt: null },
            include: {
              partner: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          courseRunLearners: {
            where: { 
              deletedAt: null,
              enrollmentStatus: 'ENROLLED',
            },
            include: {
              learner: true,
            },
          },
        },
      });

      if (!originalRun) {
        res.status(404).json({
          success: false,
          error: 'Original course run not found',
        });
        return;
      }

      console.log('[DuplicateCourseRun] Original run found:', originalRun.id, originalRun.serialNumber);

      // Generate new serial number based on new start date
      const newSerialNumber = originalRun.course?.courseCode
        ? `${originalRun.course.courseCode}-${startDate.getDate().toString().padStart(2, '0')}${(startDate.getMonth() + 1).toString().padStart(2, '0')}${startDate.getFullYear().toString().slice(-2)}`
        : undefined;

      console.log('[DuplicateCourseRun] New serial number:', newSerialNumber);

      // Get updated course fees from the course
      const course = await prisma.course.findUnique({
        where: { id: originalRun.courseId },
        select: {
          defaultCourseFee: true,
        },
      });

      // Get updated trainer fees from course_trainers
      const courseTrainers = await prisma.courseTrainer.findMany({
        where: {
          courseId: originalRun.courseId,
        },
        select: {
          trainerId: true,
          feePerRun: true,
        },
      });

      const trainerFeeMap = new Map(
        courseTrainers.map(ct => [ct.trainerId, ct.feePerRun])
      );

      console.log('[DuplicateCourseRun] Updated fees - course:', course?.defaultCourseFee, 'trainers:', trainerFeeMap.size);

      // Create the new course run
      const newCourseRun = await prisma.courseRun.create({
        data: {
          courseId: originalRun.courseId,
          serialNumber: newSerialNumber ?? null,
          courseRunType: originalRun.courseRunType,
          startDatetime: startDate,
          endDatetime: endDate,
          venueId: originalRun.venueId,
          venueType: originalRun.venueType,
          specifiedLocation: originalRun.specifiedLocation,
          minClassSize: originalRun.minClassSize,
          maxClassSize: originalRun.maxClassSize,
          individualRegistrationRequired: originalRun.individualRegistrationRequired,
          remarks: originalRun.remarks,
          // Use updated fees from course
          baseCourseFee: course?.defaultCourseFee || originalRun.baseCourseFee,
          courseRunFeeType: originalRun.courseRunFeeType,
          // Copy venue fees
          venueFee: originalRun.venueFee,
          venueFinalFee: originalRun.venueFinalFee,
          venueMaxParticipant: originalRun.venueMaxParticipant,
          perHeadFeeIfMaxExceed: originalRun.perHeadFeeIfMaxExceed,
          venuePerHeadIfExceed: originalRun.venuePerHeadIfExceed,
          // Copy other fees
          otherFee: originalRun.otherFee,
          adminFee: originalRun.adminFee,
          contingencyFee: originalRun.contingencyFee,
          contractFees: originalRun.contractFees,
          additionalCostExceedingCapacity: originalRun.additionalCostExceedingCapacity,
          // New run starts as DRAFT
          status: CourseStatus.DRAFT,
          learnerEmailStatus: LearnerEmailStatus.PENDING,
          clientOrganizationId: originalRun.clientOrganizationId,
        },
      });

      console.log('[DuplicateCourseRun] New course run created:', newCourseRun.id);

      // Duplicate course run trainers with updated fees
      if (originalRun.courseRunTrainers.length > 0) {
        const trainerData = originalRun.courseRunTrainers.map(crt => ({
          courseRunId: newCourseRun.id,
          trainerId: crt.trainerId,
          // Use updated trainer fee from course_trainers or fall back to original
          trainerBaseAmount: trainerFeeMap.get(crt.trainerId) || crt.trainerBaseAmount,
          additionalCost: crt.additionalCost,
          remarks: crt.remarks,
          emailStatus: 'PENDING',
        }));

        await prisma.courseRunTrainer.createMany({
          data: trainerData,
        });

        console.log('[DuplicateCourseRun] Duplicated', trainerData.length, 'trainers');
      }

      // Duplicate course run partners
      if (originalRun.courseRunPartners.length > 0) {
        const partnerData = originalRun.courseRunPartners.map(crp => ({
          courseRunId: newCourseRun.id,
          partnerId: crp.partnerId,
        }));

        await prisma.courseRunPartner.createMany({
          data: partnerData,
        });

        console.log('[DuplicateCourseRun] Duplicated', partnerData.length, 'partners');
      }

      // Duplicate learners and their enrollments
      if (originalRun.courseRunLearners.length > 0) {
        // Create learner enrollments with updated course fee
        const updatedCourseFee = course?.defaultCourseFee || originalRun.baseCourseFee;
        
        const learnerEnrollmentData = originalRun.courseRunLearners.map(crl => ({
          courseRunId: newCourseRun.id,
          learnerId: crl.learnerId,
          currentDefaultCourseFee: updatedCourseFee,
          discountPercentage: crl.discountPercentage,
          discountAmount: crl.discountAmount,
          totalFees: crl.totalFees,
          feesRemarks: crl.feesRemarks,
          remarks: crl.remarks,
          attendanceStatus: 'PENDING' as const,
          enrollmentStatus: 'ENROLLED' as const,
          departmentName: crl.departmentName,
          paymentMode: crl.paymentMode,
          confirmationEmailStatus: 'PENDING' as const,
        }));

        await prisma.courseRunLearner.createMany({
          data: learnerEnrollmentData,
        });

        console.log('[DuplicateCourseRun] Duplicated', learnerEnrollmentData.length, 'learner enrollments');

        // Note: We don't duplicate attendance records as this is a new course run
        // Attendance will be recorded fresh for the new run
      }

      // Fetch the newly created course run with all relations for response
      const duplicatedRun = await prisma.courseRun.findUnique({
        where: { id: newCourseRun.id },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              courseCode: true,
              category: true,
            },
          },
          venue: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          courseRunTrainers: {
            where: { deletedAt: null },
            include: {
              trainer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          courseRunPartners: {
            where: { deletedAt: null },
            include: {
              partner: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          courseRunLearners: {
            where: { deletedAt: null },
            include: {
              learner: {
                select: {
                  id: true,
                  fullname: true,
                  email: true,
                  contact: true,
                  designation: true,
                  departmentName: true,
                },
              },
            },
          },
          _count: {
            select: {
              courseRunLearners: {
                where: {
                  enrollmentStatus: 'ENROLLED',
                  deletedAt: null,
                },
              },
            },
          },
        },
      });

      console.log('[DuplicateCourseRun] Successfully duplicated course run');

      res.status(201).json({
        success: true,
        message: 'Course run duplicated successfully',
        courseRun: duplicatedRun,
      });
    } catch (error) {
      console.error('[DuplicateCourseRun] Error:', error);
      res.status(500).json(buildErrorResponse('duplicateCourseRun', 'Failed to duplicate course run', error));
    }
  },
};
