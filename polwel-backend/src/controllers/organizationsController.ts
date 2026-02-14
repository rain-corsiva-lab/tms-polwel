import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const organizationsController = {
  // Get all organizations with optional filtering by type
  async getOrganizations(req: Request, res: Response): Promise<Response> {
    try {
      const { type, status = 'ACTIVE' } = req.query;

      const where: any = {
        status: status as string
      };

      // Filter by organization type if provided
      if (type && type !== 'all') {
        where.organizationType = type;
      }

      const organizations = await prisma.organization.findMany({
        where,
        orderBy: {
          name: 'asc'
        },
        select: {
          id: true,
          name: true,
          address: true,
          contactEmail: true,
          contactPhone: true,
          contactPerson: true,
          buNumber: true,
          organizationType: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return res.json({
        success: true,
        organizations,
        total: organizations.length
      });
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch organizations',
        message: error.message
      });
    }
  },

  // Get single organization by ID
  async getOrganizationById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ success: false, message: 'Organization ID is required' });
      }

      const organization = await prisma.organization.findUnique({
        where: { id },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          courseRunLearners: {
            take: 10,
            select: {
              id: true,
              learner: {
                select: {
                  id: true,
                  fullname: true,
                  email: true
                }
              }
            }
          }
        }
      });

      if (!organization) {
        return res.status(404).json({
          success: false,
          error: 'Organization not found'
        });
      }

      return res.json({
        success: true,
        organization
      });
    } catch (error: any) {
      console.error('Error fetching organization:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch organization',
        message: error.message
      });
    }
  },

  // Get all enrollments (course run learners) for an organization
  async getOrganizationEnrollments(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { page = '1', limit = '50', status, search } = req.query;

      if (!id) {
        return res.status(400).json({ success: false, message: 'Organization ID is required' });
      }

      const pageNumber = parseInt(page as string);
      const limitNumber = parseInt(limit as string);
      const skip = (pageNumber - 1) * limitNumber;

      // Build where clause
      const where: any = {
        clientOrganizationId: id
      };

      // Filter by enrollment status if provided
      if (status && status !== 'all') {
        where.status = status;
      }

      // Search in learner name or email
      if (search) {
        where.learner = {
          OR: [
            { fullname: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } }
          ]
        };
      }

      // Get total count
      const total = await prisma.courseRunLearner.count({ where });

      // Get enrollments with relations
      const enrollments = await prisma.courseRunLearner.findMany({
        where,
        skip,
        take: limitNumber,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          learner: {
            select: {
              id: true,
              fullname: true,
              email: true,
              contact: true,
              designation: true
            }
          },
          courseRun: {
            select: {
              id: true,
              startDatetime: true,
              endDatetime: true,
              venue: true,
              status: true,
              course: {
                select: {
                  id: true,
                  title: true,
                  courseCode: true
                }
              }
            }
          },
          trainingCoordinator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          clientOrganization: {
            select: {
              id: true,
              name: true,
              organizationType: true
            }
          }
        }
      });

      return res.json({
        success: true,
        enrollments,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages: Math.ceil(total / limitNumber)
        }
      });
    } catch (error: any) {
      console.error('Error fetching organization enrollments:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch organization enrollments',
        message: error.message
      });
    }
  }
};
