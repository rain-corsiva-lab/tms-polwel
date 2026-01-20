import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { Prisma, CourseStatus } from '@prisma/client';

// Helper function to get quarter from date
const getQuarter = (date: Date | null): string => {
  if (!date) return 'N/A';
  const month = date.getMonth();
  const year = date.getFullYear();
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter} ${year}`;
};

// Helper function to get period (Month Year) from date
const getPeriod = (date: Date | null): string => {
  if (!date) return 'N/A';
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
};

// Board Report - Quarterly Performance Summary
export const getBoardReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

    // Get all course runs with related data for the specified year
    const courseRuns = await prisma.courseRun.findMany({
      where: {
        deletedAt: null,
        startDatetime: {
          gte: new Date(`${targetYear}-01-01`),
          lte: new Date(`${targetYear}-12-31`),
        },
      },
      include: {
        course: true,
        venue: true,
        clientOrganization: true,
        courseRunTrainers: {
          include: {
            trainer: true,
          },
        },
        courseRunBilling: {
          include: {
            courseRunBillingEntries: true,
          },
        },
        courseRunLearners: {
          include: {
            learner: true,
          },
        },
      },
      orderBy: {
        startDatetime: 'desc',
      },
    });

    // Group by quarter with summary data
    type QuarterData = {
      quarter: string;
      year: number;
      totalRuns: number;
      completedRuns: number;
      totalLearners: number;
      averageAttendance: number;
      totalRevenue: number;
      topCourse: Record<string, number>;
    };

    const quarterlyDataMap: Record<string, QuarterData> = {};

    courseRuns.forEach((run) => {
      if (!run.startDatetime) return;
      
      const month = run.startDatetime.getMonth();
      const year = run.startDatetime.getFullYear();
      const quarter = Math.floor(month / 3) + 1;
      const quarterKey = `Q${quarter} ${year}`;
      
      if (!quarterlyDataMap[quarterKey]) {
        quarterlyDataMap[quarterKey] = {
          quarter: `Q${quarter}`,
          year: year,
          totalRuns: 0,
          completedRuns: 0,
          totalLearners: 0,
          averageAttendance: 85,
          totalRevenue: 0,
          topCourse: {},
        };
      }

      quarterlyDataMap[quarterKey].totalRuns++;

      if (run.status === CourseStatus.COMPLETED) {
        quarterlyDataMap[quarterKey].completedRuns++;
      }

      // Calculate revenue from billing
      if (run.courseRunBilling && run.courseRunBilling.courseRunBillingEntries) {
        const revenue = run.courseRunBilling.courseRunBillingEntries.reduce(
          (sum, entry) => sum + Number(entry.invoiceAmount || 0),
          0
        );
        quarterlyDataMap[quarterKey].totalRevenue += revenue;
      }

      // Count learners
      quarterlyDataMap[quarterKey].totalLearners += run.courseRunLearners?.length || 0;

      // Track top courses
      const courseName = run.course?.title || 'Unknown';
      quarterlyDataMap[quarterKey].topCourse[courseName] = 
        (quarterlyDataMap[quarterKey].topCourse[courseName] || 0) + 1;
    });

    // Convert to array and calculate top course
    const summary = Object.values(quarterlyDataMap).map((data) => ({
      quarter: data.quarter,
      year: data.year,
      totalRuns: data.totalRuns,
      completedRuns: data.completedRuns,
      totalLearners: data.totalLearners,
      averageAttendance: data.averageAttendance,
      totalRevenue: data.totalRevenue,
      topCourse: Object.entries(data.topCourse)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A',
    }));

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching board report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch board report',
    });
  }
};

// Get Board Report for All Years
export const getBoardReportAll = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get all course runs with related data
    const courseRuns = await prisma.courseRun.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        course: true,
        venue: true,
        clientOrganization: true,
        courseRunTrainers: {
          include: {
            trainer: true,
          },
        },
        courseRunBilling: {
          include: {
            courseRunBillingEntries: true,
          },
        },
        courseRunLearners: {
          include: {
            learner: true,
          },
        },
      },
      orderBy: {
        startDatetime: 'desc',
      },
    });

    // Group by quarter with summary data
    type QuarterData = {
      quarter: string;
      year: number;
      totalRuns: number;
      completedRuns: number;
      totalLearners: number;
      averageAttendance: number;
      totalRevenue: number;
      topCourse: Record<string, number>;
    };

    const quarterlyDataMap: Record<string, QuarterData> = {};

    courseRuns.forEach((run) => {
      if (!run.startDatetime) return;
      
      const month = run.startDatetime.getMonth();
      const year = run.startDatetime.getFullYear();
      const quarter = Math.floor(month / 3) + 1;
      const quarterKey = `${year}-Q${quarter}`;
      
      if (!quarterlyDataMap[quarterKey]) {
        quarterlyDataMap[quarterKey] = {
          quarter: `Q${quarter}`,
          year: year,
          totalRuns: 0,
          completedRuns: 0,
          totalLearners: 0,
          averageAttendance: 85,
          totalRevenue: 0,
          topCourse: {},
        };
      }

      quarterlyDataMap[quarterKey].totalRuns++;

      if (run.status === CourseStatus.COMPLETED) {
        quarterlyDataMap[quarterKey].completedRuns++;
      }

      // Calculate revenue from billing
      if (run.courseRunBilling && run.courseRunBilling.courseRunBillingEntries) {
        const revenue = run.courseRunBilling.courseRunBillingEntries.reduce(
          (sum, entry) => sum + Number(entry.invoiceAmount || 0),
          0
        );
        quarterlyDataMap[quarterKey].totalRevenue += revenue;
      }

      // Count learners
      quarterlyDataMap[quarterKey].totalLearners += run.courseRunLearners?.length || 0;

      // Track top courses
      const courseName = run.course?.title || 'Unknown';
      quarterlyDataMap[quarterKey].topCourse[courseName] = 
        (quarterlyDataMap[quarterKey].topCourse[courseName] || 0) + 1;
    });

    // Convert to array and calculate top course, sort by most recent quarter
    const summary = Object.keys(quarterlyDataMap)
      .sort((a, b) => {
        const [yearA, quarterA] = a.split('-');
        const [yearB, quarterB] = b.split('-');
        if (yearA && yearB && yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
        if (quarterB && quarterA) return quarterB.localeCompare(quarterA);
        return 0;
      })
      .map((key) => {
        const data = quarterlyDataMap[key];
        if (!data) return null;
        return {
          quarter: data.quarter,
          year: data.year,
          totalRuns: data.totalRuns,
          completedRuns: data.completedRuns,
          totalLearners: data.totalLearners,
          averageAttendance: data.averageAttendance,
          totalRevenue: data.totalRevenue,
          topCourse: Object.entries(data.topCourse)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A',
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching board report (all years):', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch board report',
    });
  }
};

// Get Quarter Details
export const getQuarterDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { quarter, year } = req.query;
    
    if (!quarter || !year) {
      res.status(400).json({
        success: false,
        message: 'Quarter and year are required',
      });
      return;
    }

    const quarterNum = parseInt(quarter.toString().replace('Q', ''));
    const yearNum = parseInt(year.toString());
    
    // Calculate start and end dates for the quarter
    const startMonth = (quarterNum - 1) * 3;
    const endMonth = startMonth + 2;
    
    const startDate = new Date(yearNum, startMonth, 1);
    const endDate = new Date(yearNum, endMonth + 1, 0, 23, 59, 59);

    const runs = await prisma.courseRun.findMany({
      where: {
        deletedAt: null,
        startDatetime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        course: true,
        clientOrganization: true,
        courseRunLearners: true,
        courseRunBilling: {
          include: {
            courseRunBillingEntries: true,
          },
        },
      },
      orderBy: {
        startDatetime: 'desc',
      },
    });

    const formatted = runs.map((run) => {
      const revenue = run.courseRunBilling?.courseRunBillingEntries?.reduce(
        (sum, entry) => sum + Number(entry.invoiceAmount || 0),
        0
      ) || 0;

      return {
        id: run.id,
        courseRunCode: run.serialNumber || 'N/A',
        courseName: run.course?.title || 'N/A',
        startDate: run.startDatetime,
        endDate: run.endDatetime,
        status: run.status,
        organization: run.clientOrganization?.name || 'N/A',
        learners: run.courseRunLearners?.length || 0,
        revenue,
      };
    });

    res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error('Error fetching quarter details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quarter details',
    });
  }
};

// Get Runs by Organisation
export const getRunsByOrganisation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { organizationId, status, search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.CourseRunWhereInput = {
      deletedAt: null,
    };

    if (organizationId && typeof organizationId === 'string') {
      where.clientOrganizationId = organizationId;
    }

    if (status && typeof status === 'string') {
      where.status = status as CourseStatus;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { course: { is: { title: { contains: search } } } },
        { course: { is: { courseCode: { contains: search } } } },
        { serialNumber: { contains: search } },
        { clientOrganization: { is: { name: { contains: search } } } },
      ];
    }

    const [runs, total] = await Promise.all([
      prisma.courseRun.findMany({
        where,
        include: {
          course: true,
          venue: true,
          clientOrganization: true,
          courseRunLearners: true,
          courseRunTrainers: true,
          courseRunBilling: {
            include: {
              courseRunBillingEntries: true,
            },
          },
        },
        orderBy: [
          {
            startDatetime: 'desc',
          },
        ],
        skip,
        take: limitNum,
      }),
      prisma.courseRun.count({ where }),
    ]);

    // Sort to put N/A organizations at the end, then by organization name, then by date
    const sortedRuns = runs.sort((a, b) => {
      const orgA = a.clientOrganization?.name || null;
      const orgB = b.clientOrganization?.name || null;
      
      // Both null - sort by date
      if (!orgA && !orgB) {
        return (b.startDatetime?.getTime() || 0) - (a.startDatetime?.getTime() || 0);
      }
      
      // A is null - put after B
      if (!orgA) return 1;
      
      // B is null - put after A
      if (!orgB) return -1;
      
      // Both have names - sort alphabetically, then by date
      const nameCompare = orgA.localeCompare(orgB);
      if (nameCompare !== 0) return nameCompare;
      
      return (b.startDatetime?.getTime() || 0) - (a.startDatetime?.getTime() || 0);
    });

    const formatted = sortedRuns.map((run) => {
      const revenue = run.courseRunBilling?.courseRunBillingEntries?.reduce(
        (sum, entry) => sum + Number(entry.invoiceAmount || 0),
        0
      ) || 0;

      return {
        id: run.id,
        courseRunCode: run.serialNumber || 'N/A',
        course: {
          name: run.course?.title || 'N/A',
        },
        clientOrganization: {
          organizationName: run.clientOrganization?.name || 'N/A',
        },
        startDate: run.startDatetime,
        endDate: run.endDatetime,
        status: run.status,
        learnersCount: run.courseRunLearners?.length || 0,
        revenue,
      };
    });

    res.json({
      success: true,
      data: formatted,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching runs by organisation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch runs by organisation',
    });
  }
};

// Get Runs by Trainer
export const getRunsByTrainer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { trainerId, status, search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.CourseRunWhereInput = {
      deletedAt: null,
    };

    if (trainerId && typeof trainerId === 'string') {
      where.courseRunTrainers = {
        some: {
          trainerId: trainerId,
        },
      };
    }

    if (status && typeof status === 'string') {
      where.status = status as CourseStatus;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { course: { is: { title: { contains: search } } } },
        { course: { is: { courseCode: { contains: search } } } },
        { serialNumber: { contains: search } },
        { clientOrganization: { is: { name: { contains: search } } } },
      ];
    }

    const [runs, total] = await Promise.all([
      prisma.courseRun.findMany({
        where,
        include: {
          course: true,
          venue: true,
          clientOrganization: true,
          courseRunTrainers: {
            include: {
              trainer: true,
            },
          },
          courseRunLearners: true,
        },
        orderBy: [
          {
            startDatetime: 'desc',
          },
        ],
        skip,
        take: limitNum,
      }),
      prisma.courseRun.count({ where }),
    ]);

    // Sort by first trainer name
    const sortedRuns = runs.sort((a, b) => {
      const trainerA = a.courseRunTrainers?.[0]?.trainer.name || 'ZZZ';
      const trainerB = b.courseRunTrainers?.[0]?.trainer.name || 'ZZZ';
      return trainerA.localeCompare(trainerB);
    });

    const formatted = sortedRuns.map((run) => ({
      id: run.id,
      courseRunCode: run.serialNumber || 'N/A',
      course: {
        name: run.course?.title || 'N/A',
      },
      trainers: run.courseRunTrainers?.map((t) => ({
        id: t.trainer.id,
        name: t.trainer.name,
      })) || [],
      startDate: run.startDatetime,
      endDate: run.endDatetime,
      clientOrganization: {
        organizationName: run.clientOrganization?.name || 'N/A',
      },
      venue: run.venue?.name || 'N/A',
      status: run.status,
      learnersCount: run.courseRunLearners?.length || 0,
    }));

    res.json({
      success: true,
      data: formatted,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching runs by trainer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch runs by trainer',
    });
  }
};

// Get Runs by Status
export const getRunsByStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, organizationId, trainerId, search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.CourseRunWhereInput = {
      deletedAt: null,
    };

    if (status && typeof status === 'string') {
      where.status = status as CourseStatus;
    }

    if (organizationId && typeof organizationId === 'string') {
      where.clientOrganizationId = organizationId;
    }

    if (trainerId && typeof trainerId === 'string') {
      where.courseRunTrainers = {
        some: {
          trainerId: trainerId,
        },
      };
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { course: { is: { title: { contains: search } } } },
        { course: { is: { courseCode: { contains: search } } } },
        { serialNumber: { contains: search } },
      ];
    }

    const [runs, total] = await Promise.all([
      prisma.courseRun.findMany({
        where,
        include: {
          course: true,
          venue: true,
          clientOrganization: true,
          courseRunTrainers: {
            include: {
              trainer: true,
            },
          },
          courseRunLearners: true,
        },
        orderBy: [
          {
            status: 'asc',
          },
          {
            startDatetime: 'desc',
          },
        ],
        skip,
        take: limitNum,
      }),
      prisma.courseRun.count({ where }),
    ]);

    const formatted = runs.map((run) => ({
      id: run.id,
      courseRunCode: run.serialNumber || 'N/A',
      course: {
        name: run.course?.title || 'N/A',
      },
      clientOrganization: {
        organizationName: run.clientOrganization?.name || 'N/A',
      },
      trainers: run.courseRunTrainers?.map((t) => t.trainer.name).join(', ') || 'N/A',
      startDate: run.startDatetime,
      endDate: run.endDatetime,
      status: run.status,
      learnersCount: run.courseRunLearners?.length || 0,
    }));

    res.json({
      success: true,
      data: formatted,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching runs by status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch runs by status',
    });
  }
};

// Get Runs by Period
export const getRunsByPeriod = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate, status, search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.CourseRunWhereInput = {
      deletedAt: null,
    };

    if (startDate && typeof startDate === 'string') {
      where.startDatetime = {
        gte: new Date(startDate),
      };
    }

    if (endDate && typeof endDate === 'string') {
      where.endDatetime = {
        lte: new Date(endDate),
      };
    }

    if (status && typeof status === 'string') {
      where.status = status as CourseStatus;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { course: { is: { title: { contains: search } } } },
        { course: { is: { courseCode: { contains: search } } } },
        { serialNumber: { contains: search } },
        { clientOrganization: { is: { name: { contains: search } } } },
      ];
    }

    const [runs, total] = await Promise.all([
      prisma.courseRun.findMany({
        where,
        include: {
          course: true,
          venue: true,
          clientOrganization: true,
          courseRunLearners: true,
          courseRunTrainers: {
            include: {
              trainer: true,
            },
          },
        },
        orderBy: {
          startDatetime: 'desc',
        },
        skip,
        take: limitNum,
      }),
      prisma.courseRun.count({ where }),
    ]);

    const formatted = runs.map((run) => ({
      id: run.id,
      courseRunCode: run.serialNumber || 'N/A',
      course: {
        name: run.course?.title || 'N/A',
      },
      clientOrganization: {
        organizationName: run.clientOrganization?.name || 'N/A',
      },
      period: getPeriod(run.startDatetime),
      trainers: run.courseRunTrainers?.map((t) => t.trainer.name).join(', ') || 'N/A',
      startDate: run.startDatetime,
      endDate: run.endDatetime,
      status: run.status,
      learnersCount: run.courseRunLearners?.length || 0,
    }));

    res.json({
      success: true,
      data: formatted,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching runs by period:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch runs by period',
    });
  }
};

// Get Runs by Venue
export const getRunsByVenue = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { venueId, status, search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.CourseRunWhereInput = {
      deletedAt: null,
    };

    if (venueId && typeof venueId === 'string') {
      where.venueId = venueId;
    }

    if (status && typeof status === 'string') {
      where.status = status as CourseStatus;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { course: { is: { title: { contains: search } } } },
        { course: { is: { courseCode: { contains: search } } } },
        { serialNumber: { contains: search } },
        { venue: { is: { name: { contains: search } } } },
      ];
    }

    const [runs, total] = await Promise.all([
      prisma.courseRun.findMany({
        where,
        include: {
          course: true,
          venue: true,
          clientOrganization: true,
          courseRunLearners: true,
          courseRunTrainers: {
            include: {
              trainer: true,
            },
          },
        },
        orderBy: {
          startDatetime: 'desc',
        },
        skip,
        take: limitNum,
      }),
      prisma.courseRun.count({ where }),
    ]);

    const formatted = runs.map((run) => ({
      id: run.id,
      courseRunCode: run.serialNumber || 'N/A',
      course: {
        name: run.course?.title || 'N/A',
      },
      venue: run.venue ? {
        id: run.venue.id,
        name: run.venue.name,
        location: run.venue.address || null,
        capacity: run.venue.capacity,
      } : null,
      _count: {
        learners: run.courseRunLearners?.length || 0,
      },
      startDate: run.startDatetime,
      endDate: run.endDatetime,
      status: run.status,
    }));

    res.json({
      success: true,
      data: formatted,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching runs by venue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch runs by venue',
    });
  }
};

// Get Run Details
export const getRunDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Run ID is required',
      });
    }

    const run = await prisma.courseRun.findUnique({
      where: {
        id,
      },
      include: {
        course: true,
        venue: true,
        clientOrganization: true,
        courseRunLearners: {
          include: {
            learner: true,
          },
        },
        courseRunTrainers: {
          include: {
            trainer: true,
          },
        },
        courseRunPartners: {
          include: {
            partner: true,
          },
        },
        courseRunBilling: {
          include: {
            courseRunBillingEntries: true,
          },
        },
      },
    });

    if (!run) {
      return res.status(404).json({
        success: false,
        message: 'Course run not found',
      });
    }

    // Get attendance data separately
    const attendanceData = await prisma.courseRunLearnerAttendance.findMany({
      where: {
        courseRunId: id,
      },
    });

    const formatted = {
      id: run.id,
      courseRunCode: run.serialNumber || 'N/A',
      startDate: run.startDatetime,
      endDate: run.endDatetime,
      status: run.status,
      course: {
        id: run.course?.id || '',
        code: run.course?.courseCode || 'N/A',
        name: run.course?.title || 'N/A',
      },
      venue: run.venue ? {
        id: run.venue.id,
        name: run.venue.name,
        location: run.venue.address || null,
      } : null,
      clientOrganization: run.clientOrganization ? {
        id: run.clientOrganization.id,
        organizationName: run.clientOrganization.name,
      } : null,
      trainers: run.courseRunTrainers?.map((t) => ({
        trainer: {
          id: t.trainer?.id || '',
          name: t.trainer?.name || 'Unknown',
        },
      })) || [],
      learners: run.courseRunLearners?.map((l) => {
        const learnerAttendance = attendanceData.filter((a) => a.learnerId === l.learnerId);
        return {
          learner: {
            id: l.learner?.id || '',
            name: l.learner?.fullname || 'Unknown',
            email: l.learner?.email || 'N/A',
          },
          attendance: learnerAttendance.map((att) => ({
            id: att.id,
            day: att.day,
            status: (att.attendAM || att.attendPM) ? 'PRESENT' : 'ABSENT',
          })),
        };
      }) || [],
      billing: run.courseRunBilling ? {
        id: run.courseRunBilling.id,
        totalAmount: run.courseRunBilling.courseRunBillingEntries?.reduce(
          (sum, e) => sum + Number(e.invoiceAmount || 0),
          0
        ) || 0,
        paidAmount: 0, // Field doesn't exist in schema
        balanceAmount: run.courseRunBilling.courseRunBillingEntries?.reduce(
          (sum, e) => sum + Number(e.invoiceAmount || 0),
          0
        ) || 0,
      } : null,
    };

    res.json({
      success: true,
      data: formatted,
    });
    return;
  } catch (error) {
    console.error('Error fetching run details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch run details',
    });
    return;
  }
};

// Get Filter Options
export const getFilterOptions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [organizations, trainers, venues] = await Promise.all([
      prisma.organization.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        where: {
          deletedAt: null,
          role: 'TRAINER',
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.venue.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const statuses = Object.values(CourseStatus);

    res.json({
      success: true,
      data: {
        organizations,
        trainers,
        venues,
        statuses,
      },
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch filter options',
    });
  }
};
