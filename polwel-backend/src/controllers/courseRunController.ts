import { Request, Response } from 'express';
import { PrismaClient, CourseStatus, UserRole, Organization, User, Learner } from '@prisma/client';
import { z } from 'zod';

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
  'ARCHIVED',
  'PUBLISHED',
  'ONGOING'
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
  const courseRun = await prisma.courseRun.findUnique({
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
});

const createCourseRunSchema = z.object({
  serialNumber: z.string().optional(),
  courseRunType: z.enum(['OPEN', 'DEDICATED', 'TALKS', 'CUSTOMIZED']).optional(),
  courseId: z.string(),
  startDatetime: z.string().optional(),
  endDatetime: z.string().optional(),
  venueId: z.string().optional(),
  venueType: z.enum(['HOTEL', 'ON_PREMISE', 'CLIENT_FACILITY']).optional(),
  specifiedLocation: z.string().optional(),
  minClassSize: z.number().optional(),
  maxClassSize: z.number().optional(),
  individualRegistrationRequired: z.boolean().optional(),
  remarks: z.string().optional(),
  baseCourseFee: z.number().optional(),
  feeType: z.enum(['PER_HEAD', 'PER_VENUE', 'FIXED']).optional(),
  venueFee: z.number().optional(),
  otherFee: z.number().optional(),
  adminFee: z.number().optional(),
  contingencyFee: z.number().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'CONFIRMED_PENDING_TA_APPROVAL', 'ACTIVE', 'CONFIRMED', 'CONFIRMED_PENDING_CONFIRMATION_EMAILS', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ARCHIVED', 'PUBLISHED', 'ONGOING']).optional(),
  billingReportId: z.string().optional(),
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
    .min(1, 'At least one learner attendance record is required'),
});

export const courseRunController = {
  // Get all course runs with pagination, search, and filters
  async getAll(req: Request, res: Response) {
    try {
  const { page, limit, search, status } = getCourseRunsSchema.parse(req.query);
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

      // Add status filter
      const normalizedStatus = status && typeof status === 'string' ? status.toUpperCase() : undefined;
      if (normalizedStatus && ALLOWED_COURSE_STATUSES.includes(normalizedStatus as CourseStatus)) {
        where.status = normalizedStatus as CourseStatus;
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
            startDatetime: 'desc',
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

      // Format the response
      const formattedCourseRuns = courseRuns.map(run => {
        const course = run.course || { id: null, title: 'Untitled Course', courseCode: null, category: null };
        const venue = run.venue || null;
        const currentParticipants = (run as any)._count && (run as any)._count.courseRunLearners ? (run as any)._count.courseRunLearners : 0;

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
          createdAt: run.createdAt,
          updatedAt: run.updatedAt,
        };
      });

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        courseRuns: formattedCourseRuns,
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
                  paymentMode: true,
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
          courseRunBilling: true,
          billingReport: true,
        },
      });

      if (!courseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
      }

      const transformedCourseRun = {
        ...courseRun,
        courseRunLearners: courseRun.courseRunLearners.map((enrollment) => {
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
                  paymentMode: learner.paymentMode || null,
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
      };

      res.json({
        success: true,
        courseRun: transformedCourseRun,
      });
    } catch (error) {
      console.error('Error fetching course run:', error);
      res.status(500).json(buildErrorResponse('courseRunController.getById', 'Failed to fetch course run', error));
    }
  },

  // Create new course run
  async create(req: Request, res: Response) {
    try {
      const data = createCourseRunSchema.parse(req.body);

      // Convert date strings to Date objects if provided
      const courseRunData: any = {
        ...data,
        startDatetime: data.startDatetime ? new Date(data.startDatetime) : null,
        endDatetime: data.endDatetime ? new Date(data.endDatetime) : null,
      };

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

      res.status(201).json({
        success: true,
        courseRun,
        message: 'Course run created successfully',
      });
    } catch (error) {
      console.error('Error creating course run:', error);
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
        where: { id },
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

      res.json({
        success: true,
        courseRun,
        message: 'Course run updated successfully',
      });
    } catch (error) {
      console.error('Error updating course run:', error);
      res.status(500).json(buildErrorResponse('courseRunController.update', 'Failed to update course run', error));
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

      // Update status to CANCELLED
      const courseRun = await prisma.courseRun.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        courseRun,
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
        where: { id },
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
        // Create new learner
        learner = await prisma.learner.create({
          data: {
            fullname: data.fullName,
            designation: data.designation,
            email: data.email,
            contact: data.contactNumber,
            clientOrganizationId: data.division,
            departmentName: data.departmentName,
            paymentMode: data.paymentMode,
            trainingCoordinatorId: data.trainingCoordinatorId,
          },
        });
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
          currentDefaultCourseFee: data.currentDefaultCourseFee,
          discountId: data.discountId,
          discountPercentage: data.discountPercentage,
          discountAmount: data.currentDefaultCourseFee * (data.discountPercentage / 100),
          totalFees: data.totalFees,
          feesRemarks: data.feesRemarks,
          invoiceNumber: data.invoiceNumber,
          remarks: data.remarks,
          departmentName: data.departmentName || learner.departmentName || null,
          enrollmentStatus: 'ENROLLED',
        },
      });

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

      for (const learnerData of data.learners) {
        // Create or find learner
        let learner;
        if (learnerData.selectedLearnerId) {
          learner = await prisma.learner.findUnique({
            where: { id: learnerData.selectedLearnerId },
          });
        } else {
          // Create new learner
          learner = await prisma.learner.create({
            data: {
              fullname: learnerData.fullName,
              designation: learnerData.designation,
              email: learnerData.email,
              contact: learnerData.contactNumber,
              clientOrganizationId: data.division,
              departmentName: data.departmentName,
              paymentMode: data.paymentMode,
              trainingCoordinatorId: data.trainingCoordinatorId,
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
            currentDefaultCourseFee: learnerData.currentDefaultCourseFee,
            discountId: learnerData.discountId,
            discountPercentage: learnerData.discountPercentage,
            discountAmount: learnerData.currentDefaultCourseFee * (learnerData.discountPercentage / 100),
            totalFees: learnerData.totalFees,
            feesRemarks: learnerData.feesRemarks,
            invoiceNumber: learnerData.invoiceNumber,
            remarks: data.remarks,
            departmentName: learnerData.departmentName || data.departmentName || learner.departmentName || null,
            enrollmentStatus: 'ENROLLED',
          },
        });

        enrollments.push(enrollment);
      }

      res.json({
        success: true,
        message: `${enrollments.length} learners enrolled successfully`,
        enrollments,
        createdLearners,
      });
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

      const getOrganizationByName = async (name: string) => {
        const normalized = name.toLowerCase();
        if (organizationCache.has(normalized)) {
          return organizationCache.get(normalized)!;
        }

        const organization = await prisma.organization.findFirst({
          where: {
            name: {
              equals: name,
            },
          },
        });

        if (organization) {
          organizationCache.set(normalized, organization);
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

      for (let index = 0; index < rows.length; index += 1) {
        const rawRow = rows[index] ?? {};
        const name = normalizeString(rawRow.name ?? rawRow.Name);
        const email = normalizeString(rawRow.email ?? rawRow.Email);
        const contact = normalizeString(rawRow.contact ?? rawRow.Contact);
        const designation = normalizeString(rawRow.designation ?? rawRow.Designation);
        const organizationName = normalizeString(rawRow.clientOrganizationName ?? rawRow['Client Organization Name']);
        const department = normalizeString(rawRow.department ?? rawRow.Department);
        const paymentMethod = normalizeString(rawRow.paymentMethod ?? rawRow['Payment Method']);
        const coordinatorEmail = normalizeString(rawRow.coordinatorEmail ?? rawRow['Coordinator email']);
        const discountName = normalizeString(rawRow.discountName ?? rawRow['discount name'] ?? rawRow['Discount Name']);
        const feesRemarks = normalizeString(rawRow.feesRemarks ?? rawRow['fees remarks'] ?? rawRow['Fees Remarks']);
        const invoiceRemarks = normalizeString(rawRow.invoiceRemarks ?? rawRow['invoice remarks'] ?? rawRow['Invoice Remarks']);
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

        const organization = await getOrganizationByName(organizationName);
        if (!organization) {
          errors.push({ row: index + 1, name, email, reason: `Client organization "${organizationName}" was not found` });
          continue;
        }

        let coordinatorId: string | null = null;
        if (coordinatorEmail) {
          const coordinator = await getCoordinatorByEmail(coordinatorEmail);
          if (!coordinator) {
            errors.push({ row: index + 1, name, email, reason: `Training coordinator with email "${coordinatorEmail}" was not found` });
            continue;
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
              paymentMode: paymentMethod || null,
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
          if (paymentMethod) updateData.paymentMode = paymentMethod;
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
          errors.push({ row: index + 1, name, email, reason: 'Duplicate learner entry in import file' });
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
            currentDefaultCourseFee: resolvedBaseFee,
            discountId,
            discountPercentage,
            discountAmount,
            totalFees,
            feesRemarks: feesRemarks || null,
            invoiceNumber: invoiceRemarks || null,
            remarks: remarks || null,
            departmentName: department || learner.departmentName || null,
            enrollmentStatus: 'ENROLLED',
          },
        });

        newlyEnrolledLearnerIds.add(learner.id);
        successes.push({ row: index + 1, learnerId: learner.id, learnerName: learner.fullname ?? name });
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
    } catch (error) {
      console.error('Error importing learners:', error);
      res.status(500).json(buildErrorResponse('courseRunController.importLearners', 'Failed to import learners', error));
    }
  },

  // Get enrolled learners for a course run
  async getLearners(req: Request, res: Response): Promise<void> {
    try {
      const courseRunId = (req.params as any).courseRunId || (req.params as any).id;

      if (!courseRunId) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      const enrollments = await prisma.courseRunLearner.findMany({
        where: {
          courseRunId,
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
              paymentMode: true,
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
                paymentMode: learner.paymentMode || null,
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
        await prisma.learner.update({
          where: { id: learnerId },
          data: {
            fullname: learnerData.fullName ?? existing.learner.fullname,
            designation: learnerData.designation ?? existing.learner.designation,
            email: learnerData.email ?? existing.learner.email,
            contact: learnerData.contactNumber ?? existing.learner.contact,
            departmentName: learnerData.departmentName ?? existing.learner.departmentName,
            clientOrganizationId: learnerData.division || existing.learner.clientOrganizationId,
            paymentMode: learnerData.paymentMode ?? existing.learner.paymentMode,
            trainingCoordinatorId: learnerData.trainingCoordinatorId ?? existing.learner.trainingCoordinatorId,
          },
        });
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
            feesRemarks: enrollmentData.feesRemarks ?? existing.feesRemarks,
            invoiceNumber: enrollmentData.invoiceNumber ?? existing.invoiceNumber,
            remarks: enrollmentData.remarks ?? existing.remarks,
            departmentName:
              (learnerData && learnerData.departmentName !== undefined ? learnerData.departmentName : undefined) ??
              (enrollmentData && enrollmentData.departmentName !== undefined ? enrollmentData.departmentName : undefined) ??
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

      const courseRun = await prisma.courseRun.findUnique({
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
        where: { id },
        include: { course: true },
      });

      if (!courseRun) {
        res.status(404).json({
          success: false,
          error: 'Course run not found',
        });
        return;
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
              remarks: t.remarks || null,
            })),
          });
        }
      });

      // Fetch updated course run with trainers
      const updated = await prisma.courseRun.findUnique({
        where: { id },
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

  // Send trainer assignment email
  async sendTrainerAssignmentEmail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { ccEmails, additionalBody } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Course run ID is required',
        });
        return;
      }

      // Fetch course run with all necessary details
      const courseRun = await prisma.courseRun.findUnique({
        where: { id },
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

      // Format dates
      const formatDate = (date: Date | null) => {
        if (!date) return 'TBD';
        return new Intl.DateTimeFormat('en-SG', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(date);
      };

      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(amount);
      };

      // Prepare email transporter if SMTP configured
      let transporter: any = null;
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const emailFrom = process.env.EMAIL_FROM || process.env.SMTP_FROM || `no-reply@${process.env.FRONTEND_URL?.replace(/^https?:\/\//, '') || 'polwel.local'}`;

      try {
        if (smtpHost && smtpPort && smtpUser && smtpPass) {
          // Lazy require so service isn't mandatory
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const nodemailer = require('nodemailer');
          transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465, // true for 465, false for other ports
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          });
          // verify transporter
          try {
            await transporter.verify();
            console.log('SMTP transporter verified');
          } catch (verifyErr) {
            console.warn('SMTP verify failed, emails will be logged not sent:', (verifyErr as any)?.message || verifyErr);
            transporter = null;
          }
        } else {
          console.log('SMTP not fully configured; skipping actual send and logging emails instead');
        }
      } catch (err) {
        console.error('Failed to setup SMTP transporter:', err);
        transporter = null;
      }

      // Use EmailService to send trainer assignment emails
      // Lazy-import to avoid circular deps
      const EmailService = require('../services/emailService').default;

      const emailTasks = courseRun.courseRunTrainers.map(async (assignment) => {
        const baseFee = Number(assignment.trainerBaseAmount || 0);
        const additional = Number(assignment.additionalCost || 0);

        const result = await EmailService.sendTrainerAssignmentEmail(
          assignment.trainer.email,
          assignment.trainer.name,
          {
            course: courseRun.course?.title || null,
            serialNumber: courseRun.serialNumber || null,
            startDate: courseRun.startDatetime || null,
            endDate: courseRun.endDatetime || null,
            venue: courseRun.venue?.name || courseRun.specifiedLocation || null,
          },
          baseFee,
          additional,
          Array.isArray(ccEmails) ? ccEmails : null,
          additionalBody || null
        );

        // create history record
        try {
          await prisma.trainerAssignmentEmailHistory.create({
            data: {
              courseRunId: id,
              trainerId: assignment.trainer.id,
              cc: Array.isArray(ccEmails) && ccEmails.length > 0 ? ccEmails.join(', ') : null,
              additionalBodyContent: additionalBody || null,
            },
          });
        } catch (histErr) {
          console.warn('Failed to create trainerAssignmentEmailHistory record:', (histErr as any)?.message || histErr);
        }

        // update assignment status
        try {
          await prisma.courseRunTrainer.update({
            where: { id: assignment.id },
            data: {
              trainerAssignmentEmailStatus: result.success ? 'SENT' : 'FAILED',
            },
          });
        } catch (updateErr) {
          console.warn('Failed to update courseRunTrainer status:', (updateErr as any)?.message || updateErr);
        }

        return result;
      });

      await Promise.all(emailTasks);

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
};