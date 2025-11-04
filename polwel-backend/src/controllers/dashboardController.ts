import { Response } from 'express';
import { CourseStatus, UserRole, UserStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

const errorResponse = (
  res: Response,
  status: number,
  message: string,
  extra: Record<string, unknown> = {}
) => {
  return res.status(status).json({
    success: false,
    message,
    ...extra,
  });
};

export const getGlobalDashboardMetrics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 401, 'Authentication required');
    }

    // Only POLWEL users can view the global metrics
    if (req.user.role !== UserRole.POLWEL) {
      return errorResponse(res, 403, 'Only POLWEL users can access global dashboard metrics');
    }

    const [totalUsers, activeTrainers, activeOrganizations, activeCourses] = await Promise.all([
      prisma.user.count({}),
      prisma.user.count({
        where: {
          role: UserRole.TRAINER,
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.organization.count({
        where: {
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.course.count({
        where: {
          status: {
            in: [
              CourseStatus.ACTIVE,
              CourseStatus.CONFIRMED,
              CourseStatus.COMPLETED,
            ],
          },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        totalUsers,
        activeTrainers,
        activeOrganizations,
        activeCourses,
      },
    });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};
