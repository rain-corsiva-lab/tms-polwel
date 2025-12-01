import { Response } from 'express';
import { CourseStatus, UserRole, UserStatus, CourseRunType } from '@prisma/client';
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

// Helper function to format date in local timezone
function formatLocalDate(value?: Date | null): string {
  if (!value) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

// New endpoint: Get dashboard action items (pending items requiring attention)
export const getDashboardActionItems = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 401, 'Authentication required');
    }

    if (req.user.role !== UserRole.POLWEL) {
      return errorResponse(res, 403, 'Only POLWEL users can access dashboard action items');
    }

    const [pendingBillingRuns, pendingWaiverRequests, pendingTrainerApproval, pendingConfirmationEmails] = await Promise.all([
      // Count course runs pending billing
      prisma.courseRun.count({
        where: {
          status: CourseStatus.PENDING_BILLING,
          deletedAt: null,
        },
      }),
      // Count course run learners with waiver request submitted (waiverSubmittedAt not null and waiverReason not null)
      prisma.courseRunLearner.count({
        where: {
          waiverSubmittedAt: { not: null },
          waiverReason: { not: null },
          deletedAt: null,
        },
      }),
      // Count course runs awaiting trainer assignment approval
      prisma.courseRun.count({
        where: {
          status: CourseStatus.CONFIRMED_PENDING_TA_APPROVAL,
          deletedAt: null,
        },
      }),
      // Count course runs pending confirmation emails
      prisma.courseRun.count({
        where: {
          status: CourseStatus.CONFIRMED_PENDING_CONFIRMATION_EMAILS,
          deletedAt: null,
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        pendingBillingRuns,
        pendingWaiverRequests,
        pendingTrainerApproval,
        pendingConfirmationEmails,
      },
    });
  } catch (error) {
    console.error('Dashboard action items error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};

// New endpoint: Get upcoming course runs with optional date filter
export const getUpcomingCourseRuns = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 401, 'Authentication required');
    }

    if (req.user.role !== UserRole.POLWEL) {
      return errorResponse(res, 403, 'Only POLWEL users can access upcoming runs');
    }

    const { date } = req.query;
    
    // If date is provided, filter for course runs where the selected date falls within start-end range
    let dateFilter: any = {};
    if (date && typeof date === 'string') {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      // Course run should include this date: startDatetime <= selectedDate < nextDay AND endDatetime >= selectedDate
      dateFilter = {
        AND: [
          {
            startDatetime: {
              lt: nextDay, // Start date must be before or on the selected date
            },
          },
          {
            endDatetime: {
              gte: targetDate, // End date must be on or after the selected date
            },
          },
        ],
      };
    } else {
      // Default: upcoming runs from today onwards (start date >= today OR end date >= today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dateFilter = {
        OR: [
          { startDatetime: { gte: today } },
          { endDatetime: { gte: today } },
        ],
      };
    }

    const upcomingRuns = await prisma.courseRun.findMany({
      where: {
        ...dateFilter,
        status: {
          in: [
            CourseStatus.PENDING,
            CourseStatus.CONFIRMED_PENDING_TA_APPROVAL,
            CourseStatus.CONFIRMED_PENDING_CONFIRMATION_EMAILS,
            CourseStatus.ACTIVE,
            CourseStatus.CONFIRMED,
            CourseStatus.IN_PROGRESS,
          ],
        },
        deletedAt: null,
      },
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
          },
        },
        courseRunLearners: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
      orderBy: {
        startDatetime: 'asc',
      },
      take: 50, // Limit results
    });

    const formattedRuns = upcomingRuns.map((run) => ({
      id: run.id,
      courseTitle: run.course.title,
      courseCode: run.course.courseCode,
      courseRunType: run.courseRunType,
      startDate: formatLocalDate(run.startDatetime),
      endDate: formatLocalDate(run.endDatetime),
      status: run.status,
      venueName: run.venue?.name || (run.venueType === 'CLIENT_FACILITY' ? 'Client Facility' : 'Virtual'),
      participantCount: run.courseRunLearners.length,
      maxParticipants: run.maxClassSize || 0,
    }));

    return res.json({
      success: true,
      data: formattedRuns,
    });
  } catch (error) {
    console.error('Upcoming course runs error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};

// New endpoint: Get completed runs by month (Year to Date)
export const getCompletedRunsYTD = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 401, 'Authentication required');
    }

    if (req.user.role !== UserRole.POLWEL) {
      return errorResponse(res, 403, 'Only POLWEL users can access this data');
    }

    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    const completedRuns = await prisma.courseRun.findMany({
      where: {
        status: CourseStatus.COMPLETED,
        deletedAt: null,
        endDatetime: {
          gte: startOfYear,
        },
      },
      select: {
        id: true,
        endDatetime: true,
        courseRunType: true,
        course: {
          select: {
            category: true,
          },
        },
      },
    });

    // Group by month
    const monthlyData: { [key: string]: number } = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize all months to 0
    monthNames.forEach((month) => {
      monthlyData[month] = 0;
    });

    completedRuns.forEach((run) => {
      if (run.endDatetime) {
        const monthIndex = run.endDatetime.getMonth();
        const month = monthNames[monthIndex];
        if (month && typeof monthlyData[month] === 'number') {
          monthlyData[month]++;
        }
      }
    });

    const chartData = monthNames.map((month) => ({
      month,
      completedRuns: monthlyData[month] ?? 0,
    }));

    return res.json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    console.error('Completed runs YTD error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};

// New endpoint: Get completed run types by month
export const getCompletedRunTypesByMonth = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 401, 'Authentication required');
    }

    if (req.user.role !== UserRole.POLWEL) {
      return errorResponse(res, 403, 'Only POLWEL users can access this data');
    }

    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    const completedRuns = await prisma.courseRun.findMany({
      where: {
        status: CourseStatus.COMPLETED,
        deletedAt: null,
        endDatetime: {
          gte: startOfYear,
        },
      },
      select: {
        id: true,
        endDatetime: true,
        courseRunType: true,
      },
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize monthly data structure
    const monthlyData: { [key: string]: { open: number; dedicated: number; talks: number; customized: number } } = {};
    monthNames.forEach((month) => {
      monthlyData[month] = { open: 0, dedicated: 0, talks: 0, customized: 0 };
    });

    completedRuns.forEach((run) => {
      if (run.endDatetime) {
        const monthIndex = run.endDatetime.getMonth();
        const month = monthNames[monthIndex];
        if (month && monthlyData[month]) {
          const type = run.courseRunType?.toLowerCase() || 'open';
          if (type === 'open') monthlyData[month].open++;
          else if (type === 'dedicated') monthlyData[month].dedicated++;
          else if (type === 'talks') monthlyData[month].talks++;
          else if (type === 'customized') monthlyData[month].customized++;
        }
      }
    });

    const chartData = monthNames.map((month) => {
      const data = monthlyData[month] || { open: 0, dedicated: 0, talks: 0, customized: 0 };
      return {
        month,
        open: data.open,
        dedicated: data.dedicated,
        talks: data.talks,
        customized: data.customized,
      };
    });

    return res.json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    console.error('Completed run types by month error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};

// New endpoint: Get completed courses by category
export const getCompletedCoursesByCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 401, 'Authentication required');
    }

    if (req.user.role !== UserRole.POLWEL) {
      return errorResponse(res, 403, 'Only POLWEL users can access this data');
    }

    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    const completedRuns = await prisma.courseRun.findMany({
      where: {
        status: CourseStatus.COMPLETED,
        deletedAt: null,
        endDatetime: {
          gte: startOfYear,
        },
      },
      select: {
        id: true,
        course: {
          select: {
            category: true,
          },
        },
      },
    });

    // Group by category
    const categoryData: { [key: string]: number } = {};
    completedRuns.forEach((run) => {
      const category = run.course.category || 'Uncategorized';
      categoryData[category] = (categoryData[category] || 0) + 1;
    });

    const total = Object.values(categoryData).reduce((sum, val) => sum + val, 0);
    
    const chartData = Object.entries(categoryData).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
    }));

    return res.json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    console.error('Completed courses by category error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};

// New endpoint: Get course completion rate by month (completed vs cancelled)
export const getCourseCompletionRateByMonth = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 401, 'Authentication required');
    }

    if (req.user.role !== UserRole.POLWEL) {
      return errorResponse(res, 403, 'Only POLWEL users can access this data');
    }

    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    const [completedRuns, cancelledRuns] = await Promise.all([
      prisma.courseRun.findMany({
        where: {
          status: CourseStatus.COMPLETED,
          deletedAt: null,
          endDatetime: {
            gte: startOfYear,
          },
        },
        select: {
          id: true,
          endDatetime: true,
        },
      }),
      prisma.courseRun.findMany({
        where: {
          status: CourseStatus.CANCELLED,
          deletedAt: null,
          cancelledAt: {
            gte: startOfYear,
          },
        },
        select: {
          id: true,
          cancelledAt: true,
        },
      }),
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize monthly data
    const monthlyData: { [key: string]: { completed: number; cancelled: number } } = {};
    monthNames.forEach((month) => {
      monthlyData[month] = { completed: 0, cancelled: 0 };
    });

    completedRuns.forEach((run) => {
      if (run.endDatetime) {
        const monthIndex = run.endDatetime.getMonth();
        const month = monthNames[monthIndex];
        if (month && monthlyData[month]) {
          monthlyData[month].completed++;
        }
      }
    });

    cancelledRuns.forEach((run) => {
      if (run.cancelledAt) {
        const monthIndex = run.cancelledAt.getMonth();
        const month = monthNames[monthIndex];
        if (month && monthlyData[month]) {
          monthlyData[month].cancelled++;
        }
      }
    });

    const chartData = monthNames.map((month) => {
      const data = monthlyData[month] || { completed: 0, cancelled: 0 };
      return {
        month,
        completed: data.completed,
        cancelled: data.cancelled,
      };
    });

    return res.json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    console.error('Course completion rate by month error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};

// New endpoint: Get open run course cancellation rates
export const getOpenRunCancellationRates = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 401, 'Authentication required');
    }

    if (req.user.role !== UserRole.POLWEL) {
      return errorResponse(res, 403, 'Only POLWEL users can access this data');
    }

    // Get all open course runs grouped by course
    const openRuns = await prisma.courseRun.groupBy({
      by: ['courseId'],
      where: {
        courseRunType: CourseRunType.OPEN,
        deletedAt: null,
      },
      _count: {
        id: true,
      },
    });

    // Get cancelled open runs grouped by course
    const cancelledRuns = await prisma.courseRun.groupBy({
      by: ['courseId'],
      where: {
        courseRunType: CourseRunType.OPEN,
        status: CourseStatus.CANCELLED,
        deletedAt: null,
      },
      _count: {
        id: true,
      },
    });

    // Get course details
    const courseIds = openRuns.map((r) => r.courseId);
    const courses = await prisma.course.findMany({
      where: {
        id: { in: courseIds },
      },
      select: {
        id: true,
        title: true,
      },
    });

    const courseMap = new Map(courses.map((c) => [c.id, c.title]));
    const cancelledMap = new Map(cancelledRuns.map((r) => [r.courseId, r._count.id]));

    const data = openRuns
      .map((run) => {
        const totalRuns = run._count.id;
        const cancelledCount = cancelledMap.get(run.courseId) || 0;
        const cancellationRate = totalRuns > 0 ? (cancelledCount / totalRuns) * 100 : 0;

        return {
          courseId: run.courseId,
          courseName: courseMap.get(run.courseId) || 'Unknown Course',
          totalRuns,
          cancelledRuns: cancelledCount,
          cancellationRate: parseFloat(cancellationRate.toFixed(2)),
        };
      })
      .filter((item) => item.cancelledRuns > 0) // Only show courses with cancellations
      .sort((a, b) => b.cancellationRate - a.cancellationRate)
      .slice(0, 10); // Top 10

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Open run cancellation rates error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};

// New endpoint: Get draft course runs
export const getDraftCourseRuns = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 401, 'Authentication required');
    }

    if (req.user.role !== UserRole.POLWEL) {
      return errorResponse(res, 403, 'Only POLWEL users can access draft runs');
    }

    const draftRuns = await prisma.courseRun.findMany({
      where: {
        status: CourseStatus.DRAFT,
        deletedAt: null,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedRuns = draftRuns.map((run) => ({
      id: run.id,
      courseTitle: run.course.title,
      courseCode: run.course.courseCode,
      startDate: formatLocalDate(run.startDatetime),
      venueName: run.venue?.name || (run.venueType === 'CLIENT_FACILITY' ? 'Client Facility' : 'Virtual'),
      venueType: run.venueType,
      status: run.status,
    }));

    return res.json({
      success: true,
      data: formattedRuns,
      count: formattedRuns.length,
    });
  } catch (error) {
    console.error('Draft course runs error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};
