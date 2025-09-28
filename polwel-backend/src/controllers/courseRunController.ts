import { Request, Response } from 'express';
import { PrismaClient, CourseStatus } from '@prisma/client';
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

      res.json({
        success: true,
        courseRun,
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
};