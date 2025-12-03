import { Request, Response } from 'express';
import { PrismaClient, WaiverStatus } from '@prisma/client';

const prisma = new PrismaClient();

const buildErrorResponse = (source: string, message: string, error: unknown) => {
  return {
    success: false,
    error: message,
    source,
    details: error instanceof Error ? error.message : String(error),
  };
};

export const waiverController = {
  // Get all waiver requests with pagination and filtering
  getAll: async (req: Request, res: Response) => {
    try {
      const {
        page = '1',
        limit = '10',
        search = '',
        status,
        organizationId,
        courseId,
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10));
      const skip = (pageNum - 1) * limitNum;

      // Build where clause - only get records that have a waiver submitted
      const whereClause: any = {
        waiverSubmittedAt: { not: null },
        waiverReason: { not: null },
        deletedAt: null,
      };

      // Filter by waiver status
      if (status && status !== 'ALL') {
        whereClause.waiverStatus = status as WaiverStatus;
      }

      // Filter by organization (learner's client organization)
      if (organizationId) {
        whereClause.learner = {
          clientOrganizationId: organizationId as string,
        };
      }

      // Filter by course
      if (courseId) {
        whereClause.courseRun = {
          courseId: courseId as string,
        };
      }

      // Search filter - search by learner name, email, course title, organization name
      if (search) {
        const searchTerm = (search as string).trim();
        if (searchTerm) {
          whereClause.OR = [
            { learner: { fullname: { contains: searchTerm } } },
            { learner: { email: { contains: searchTerm } } },
            { courseRun: { course: { title: { contains: searchTerm } } } },
            { learner: { clientOrganization: { name: { contains: searchTerm } } } },
          ];
        }
      }

      // Fetch waiver requests with related data
      const [waiverRequests, total] = await Promise.all([
        prisma.courseRunLearner.findMany({
          where: whereClause,
          skip,
          take: limitNum,
          orderBy: { waiverSubmittedAt: 'desc' },
          include: {
            learner: {
              include: {
                clientOrganization: {
                  select: {
                    id: true,
                    name: true,
                    organizationType: true,
                  },
                },
                trainingCoordinator: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            courseRun: {
              include: {
                course: {
                  select: {
                    id: true,
                    title: true,
                    courseCode: true,
                    category: true,
                  },
                },
              },
            },
            waiverSupportingDocument: {
              select: {
                id: true,
                filename: true,
                originalName: true,
                mimeType: true,
                size: true,
                path: true,
                url: true,
              },
            },
            waiverReviewer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        prisma.courseRunLearner.count({ where: whereClause }),
      ]);

      // Get counts for each status
      const baseWhere = {
        waiverSubmittedAt: { not: null },
        waiverReason: { not: null },
        deletedAt: null,
      };

      const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
        prisma.courseRunLearner.count({
          where: {
            ...baseWhere,
            OR: [
              { waiverStatus: null },
              { waiverStatus: 'PENDING' },
            ],
          },
        }),
        prisma.courseRunLearner.count({
          where: { ...baseWhere, waiverStatus: 'APPROVED' },
        }),
        prisma.courseRunLearner.count({
          where: { ...baseWhere, waiverStatus: 'REJECTED' },
        }),
      ]);

      // Transform the data
      const transformedRequests = waiverRequests.map((wr) => ({
        id: wr.id,
        courseRunId: wr.courseRunId,
        learnerId: wr.learnerId,
        learnerName: wr.learner.fullname,
        learnerEmail: wr.learner.email,
        organization: wr.learner.clientOrganization ? {
          id: wr.learner.clientOrganization.id,
          name: wr.learner.clientOrganization.name,
          type: wr.learner.clientOrganization.organizationType,
        } : null,
        courseName: wr.courseRun.course.title,
        courseCode: wr.courseRun.course.courseCode,
        courseCategory: wr.courseRun.course.category,
        courseRunStartDate: wr.courseRun.startDatetime,
        courseRunEndDate: wr.courseRun.endDatetime,
        waiverReason: wr.waiverReason,
        waiverStatus: wr.waiverStatus || 'PENDING',
        waiverRejectReason: wr.waiverRejectReason,
        waiverSubmittedAt: wr.waiverSubmittedAt,
        waiverReviewedAt: wr.waiverReviewedAt,
        waiverReviewer: wr.waiverReviewer ? {
          id: wr.waiverReviewer.id,
          name: wr.waiverReviewer.name,
          email: wr.waiverReviewer.email,
        } : null,
        submittedBy: wr.learner.trainingCoordinator ? {
          id: wr.learner.trainingCoordinator.id,
          name: wr.learner.trainingCoordinator.name,
          email: wr.learner.trainingCoordinator.email,
        } : null,
        supportingDocument: wr.waiverSupportingDocument ? {
          id: wr.waiverSupportingDocument.id,
          filename: wr.waiverSupportingDocument.originalName || wr.waiverSupportingDocument.filename,
          mimeType: wr.waiverSupportingDocument.mimeType,
          size: wr.waiverSupportingDocument.size,
          url: wr.waiverSupportingDocument.url,
        } : null,
      }));

      res.json({
        success: true,
        waiverRequests: transformedRequests,
        counts: {
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('Error fetching waiver requests:', error);
      res.status(500).json(buildErrorResponse('waiverController.getAll', 'Failed to fetch waiver requests', error));
    }
  },

  // Get a single waiver request by enrollment ID
  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Waiver request ID is required',
        });
        return;
      }

      const waiverRequest = await prisma.courseRunLearner.findFirst({
        where: {
          id,
          waiverSubmittedAt: { not: null },
          deletedAt: null,
        },
        include: {
          learner: {
            include: {
              clientOrganization: {
                select: {
                  id: true,
                  name: true,
                  organizationType: true,
                  address: true,
                  contactEmail: true,
                  contactPhone: true,
                  contactPerson: true,
                },
              },
              trainingCoordinator: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  contactNumber: true,
                  designation: true,
                },
              },
            },
          },
          courseRun: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                  courseCode: true,
                  category: true,
                  description: true,
                },
              },
              venue: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                },
              },
            },
          },
          waiverSupportingDocument: {
            select: {
              id: true,
              filename: true,
              originalName: true,
              mimeType: true,
              size: true,
              path: true,
              url: true,
            },
          },
          waiverReviewer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!waiverRequest) {
        res.status(404).json({
          success: false,
          error: 'Waiver request not found',
        });
        return;
      }

      const transformed = {
        id: waiverRequest.id,
        courseRunId: waiverRequest.courseRunId,
        learnerId: waiverRequest.learnerId,
        learner: {
          id: waiverRequest.learner.id,
          fullname: waiverRequest.learner.fullname,
          email: waiverRequest.learner.email,
          designation: waiverRequest.learner.designation,
          departmentName: waiverRequest.learner.departmentName,
        },
        organization: waiverRequest.learner.clientOrganization ? {
          id: waiverRequest.learner.clientOrganization.id,
          name: waiverRequest.learner.clientOrganization.name,
          type: waiverRequest.learner.clientOrganization.organizationType,
          address: waiverRequest.learner.clientOrganization.address,
          contactEmail: waiverRequest.learner.clientOrganization.contactEmail,
          contactPhone: waiverRequest.learner.clientOrganization.contactPhone,
          contactPerson: waiverRequest.learner.clientOrganization.contactPerson,
        } : null,
        courseRun: {
          id: waiverRequest.courseRun.id,
          startDatetime: waiverRequest.courseRun.startDatetime,
          endDatetime: waiverRequest.courseRun.endDatetime,
          course: {
            id: waiverRequest.courseRun.course.id,
            title: waiverRequest.courseRun.course.title,
            courseCode: waiverRequest.courseRun.course.courseCode,
            category: waiverRequest.courseRun.course.category,
            description: waiverRequest.courseRun.course.description,
          },
          venue: waiverRequest.courseRun.venue ? {
            id: waiverRequest.courseRun.venue.id,
            name: waiverRequest.courseRun.venue.name,
            address: waiverRequest.courseRun.venue.address,
          } : null,
        },
        waiverReason: waiverRequest.waiverReason,
        waiverStatus: waiverRequest.waiverStatus || 'PENDING',
        waiverRejectReason: waiverRequest.waiverRejectReason,
        waiverSubmittedAt: waiverRequest.waiverSubmittedAt,
        waiverReviewedAt: waiverRequest.waiverReviewedAt,
        waiverReviewer: waiverRequest.waiverReviewer ? {
          id: waiverRequest.waiverReviewer.id,
          name: waiverRequest.waiverReviewer.name,
          email: waiverRequest.waiverReviewer.email,
        } : null,
        submittedBy: waiverRequest.learner.trainingCoordinator ? {
          id: waiverRequest.learner.trainingCoordinator.id,
          name: waiverRequest.learner.trainingCoordinator.name,
          email: waiverRequest.learner.trainingCoordinator.email,
          contactNumber: waiverRequest.learner.trainingCoordinator.contactNumber,
          designation: waiverRequest.learner.trainingCoordinator.designation,
        } : null,
        supportingDocument: waiverRequest.waiverSupportingDocument ? {
          id: waiverRequest.waiverSupportingDocument.id,
          filename: waiverRequest.waiverSupportingDocument.originalName || waiverRequest.waiverSupportingDocument.filename,
          mimeType: waiverRequest.waiverSupportingDocument.mimeType,
          size: waiverRequest.waiverSupportingDocument.size,
          path: waiverRequest.waiverSupportingDocument.path,
          url: waiverRequest.waiverSupportingDocument.url,
        } : null,
        attendanceStatus: waiverRequest.attendanceStatus,
        enrollmentStatus: waiverRequest.enrollmentStatus,
      };

      res.json({
        success: true,
        waiverRequest: transformed,
      });
    } catch (error) {
      console.error('Error fetching waiver request:', error);
      res.status(500).json(buildErrorResponse('waiverController.getById', 'Failed to fetch waiver request', error));
    }
  },

  // Approve a waiver request
  approve: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = (req as any).user?.userId;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Waiver request ID is required',
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      // Check if waiver exists
      const existingWaiver = await prisma.courseRunLearner.findFirst({
        where: {
          id,
          waiverSubmittedAt: { not: null },
          deletedAt: null,
        },
      });

      if (!existingWaiver) {
        res.status(404).json({
          success: false,
          error: 'Waiver request not found',
        });
        return;
      }

      // Check if already processed
      if (existingWaiver.waiverStatus === 'APPROVED' || existingWaiver.waiverStatus === 'REJECTED') {
        res.status(400).json({
          success: false,
          error: `Waiver request has already been ${existingWaiver.waiverStatus.toLowerCase()}`,
        });
        return;
      }

      // Update waiver status to approved
      const updatedWaiver = await prisma.courseRunLearner.update({
        where: { id },
        data: {
          waiverStatus: 'APPROVED',
          waiverRejectReason: reason || null, // Optional approval note
          waiverReviewedAt: new Date(),
          waiverReviewedBy: userId,
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
        message: 'Waiver request approved successfully',
        waiverRequest: {
          id: updatedWaiver.id,
          waiverStatus: updatedWaiver.waiverStatus,
          waiverReviewedAt: updatedWaiver.waiverReviewedAt,
          learnerName: updatedWaiver.learner.fullname,
        },
      });
    } catch (error) {
      console.error('Error approving waiver request:', error);
      res.status(500).json(buildErrorResponse('waiverController.approve', 'Failed to approve waiver request', error));
    }
  },

  // Reject a waiver request
  reject: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = (req as any).user?.userId;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Waiver request ID is required',
        });
        return;
      }

      if (!reason || !reason.trim()) {
        res.status(400).json({
          success: false,
          error: 'Rejection reason is required',
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      // Check if waiver exists
      const existingWaiver = await prisma.courseRunLearner.findFirst({
        where: {
          id,
          waiverSubmittedAt: { not: null },
          deletedAt: null,
        },
      });

      if (!existingWaiver) {
        res.status(404).json({
          success: false,
          error: 'Waiver request not found',
        });
        return;
      }

      // Check if already processed
      if (existingWaiver.waiverStatus === 'APPROVED' || existingWaiver.waiverStatus === 'REJECTED') {
        res.status(400).json({
          success: false,
          error: `Waiver request has already been ${existingWaiver.waiverStatus.toLowerCase()}`,
        });
        return;
      }

      // Update waiver status to rejected
      const updatedWaiver = await prisma.courseRunLearner.update({
        where: { id },
        data: {
          waiverStatus: 'REJECTED',
          waiverRejectReason: reason.trim(),
          waiverReviewedAt: new Date(),
          waiverReviewedBy: userId,
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
        message: 'Waiver request rejected',
        waiverRequest: {
          id: updatedWaiver.id,
          waiverStatus: updatedWaiver.waiverStatus,
          waiverRejectReason: updatedWaiver.waiverRejectReason,
          waiverReviewedAt: updatedWaiver.waiverReviewedAt,
          learnerName: updatedWaiver.learner.fullname,
        },
      });
    } catch (error) {
      console.error('Error rejecting waiver request:', error);
      res.status(500).json(buildErrorResponse('waiverController.reject', 'Failed to reject waiver request', error));
    }
  },

  // Download waiver supporting document
  downloadDocument: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Waiver request ID is required',
        });
        return;
      }

      const waiverRequest = await prisma.courseRunLearner.findFirst({
        where: {
          id,
          waiverSubmittedAt: { not: null },
          deletedAt: null,
        },
        include: {
          waiverSupportingDocument: true,
        },
      });

      if (!waiverRequest) {
        res.status(404).json({
          success: false,
          error: 'Waiver request not found',
        });
        return;
      }

      if (!waiverRequest.waiverSupportingDocument) {
        res.status(404).json({
          success: false,
          error: 'No supporting document found for this waiver request',
        });
        return;
      }

      const doc = waiverRequest.waiverSupportingDocument;

      res.json({
        success: true,
        document: {
          id: doc.id,
          filename: doc.originalName || doc.filename,
          mimeType: doc.mimeType,
          size: doc.size,
          path: doc.path,
          url: doc.url,
        },
      });
    } catch (error) {
      console.error('Error getting waiver document:', error);
      res.status(500).json(buildErrorResponse('waiverController.downloadDocument', 'Failed to get waiver document', error));
    }
  },
};

export default waiverController;
