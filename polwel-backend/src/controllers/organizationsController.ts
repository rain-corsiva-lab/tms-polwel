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
          learners: {
            take: 10,
            select: {
              id: true,
              fullname: true,
              email: true
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
  }
};
