import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { Prisma, CourseStatus } from '@prisma/client';
import ExcelJS from 'exceljs';

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
      where.courseRunLearners = {
        some: {
          clientOrganizationId: organizationId,
          deletedAt: null
        }
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
      where.courseRunLearners = {
        some: {
          clientOrganizationId: organizationId,
          deletedAt: null
        }
      };
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

// ─── Learner Report Export ────────────────────────────────────────────────────

const PAYMENT_MODE_LABELS: Record<string, string> = {
  COMPANY_BILLING: 'Company Billing',
  CREDIT_CARD: 'Credit Card',
  BANK_TRANSFER: 'Bank Transfer',
  ULTF: 'Unit Local Training Fund (ULTF)',
  TRANSITION_DOLLARS: 'Transition Dollars',
  SELF_SPONSORED: 'Self Sponsored',
  GOVERNMENT_FUNDING: 'Government Funding',
  NOT_APPLICABLE: 'Not Applicable',
};

const COURSE_RUN_TYPE_LABELS: Record<string, string> = {
  OPEN: 'Open',
  DEDICATED: 'Dedicated',
  TALKS: 'TALKS',
  CUSTOMIZED: 'Customized',
};

function formatDt(dt: Date | null): string {
  if (!dt) return '';
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * GET /api/reporting/learner-report
 * Downloads an Excel (.xlsx) report of all learner enrollments across all course runs.
 * 
 * Optional query filters:
 *   - startDate  (YYYY-MM-DD) – filter course runs starting on/after this date
 *   - endDate    (YYYY-MM-DD) – filter course runs starting on/before this date
 *   - status     – comma-separated CourseStatus values (e.g. "COMPLETED,ACTIVE")
 */
export const downloadLearnerReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, status } = req.query as Record<string, string | undefined>;

    // Build date range filter
    const dateFilter: Prisma.DateTimeNullableFilter<'CourseRun'> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    // Build status filter
    const statusFilter: Prisma.EnumCourseStatusFilter<'CourseRun'> | undefined = status
      ? { in: status.split(',').map(s => s.trim()) as CourseStatus[] }
      : undefined;

    const whereClause: Prisma.CourseRunWhereInput = {
      deletedAt: null,
      ...(Object.keys(dateFilter).length > 0 ? { startDatetime: dateFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    };

    // Fetch all course runs with all required associations
    const courseRuns = await prisma.courseRun.findMany({
      where: whereClause,
      orderBy: [{ startDatetime: 'asc' }, { course: { title: 'asc' } }],
      include: {
        course: { select: { title: true } },
        courseRunTrainers: {
          where: { deletedAt: null },
          include: { trainer: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
        courseRunBilling: {
          include: {
            billingReport: { select: { billingMonth: true } },
          },
        },
        courseRunLearners: {
          where: { deletedAt: null, enrollmentStatus: { not: 'WITHDRAWN' } },
          orderBy: [{ learner: { fullname: 'asc' } }],
          include: {
            learner: { select: { fullname: true, designation: true } },
            clientOrganization: { select: { name: true } },
          },
        },
      },
    });

    // Flatten to one row per learner per course run
    type ReportRow = {
      courseTitle: string;
      startDate: string;
      endDate: string;
      trainers: string;
      learnerName: string;
      organisation: string;
      buNumber: string;
      designation: string;
      paymentMethod: string;
      runType: string;
      billingMonth: string;
    };

    const rows: ReportRow[] = [];

    for (const run of courseRuns) {
      const courseTitle = run.course?.title ?? '';
      const startDt = formatDt(run.startDatetime);
      const endDt = formatDt(run.endDatetime);
      const trainers = run.courseRunTrainers
        .map(t => t.trainer?.name ?? '')
        .filter(Boolean)
        .join(', ');
      const runType = COURSE_RUN_TYPE_LABELS[run.courseRunType ?? ''] ?? (run.courseRunType ?? '');
      const billingMonth = run.courseRunBilling?.billingReport?.billingMonth ?? '';

      // Learner-centric: skip course runs with no enrolled learners
      if (run.courseRunLearners.length === 0) continue;

      for (const crl of run.courseRunLearners) {
        rows.push({
          courseTitle,
          startDate: startDt,
          endDate: endDt,
          trainers,
          learnerName: crl.learner?.fullname ?? '',
          organisation: crl.clientOrganization?.name ?? '',
          buNumber: crl.buNumber ?? '',
          designation: crl.learner?.designation ?? '',
          paymentMethod: PAYMENT_MODE_LABELS[crl.paymentMode ?? ''] ?? (crl.paymentMode ?? ''),
          runType,
          billingMonth,
        });
      }
    }

    // Build Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'POLWEL Training Management System';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Learner Report', {
      pageSetup: { paperSize: 9, orientation: 'landscape' },
      views: [{ state: 'frozen', ySplit: 1 }], // freeze header row
    });

    // Define columns with headers
    ws.columns = [
      { header: 'Course Run Title',       key: 'courseTitle',    },
      { header: 'Start Date',             key: 'startDate',      },
      { header: 'End Date',               key: 'endDate',        },
      { header: 'Trainer(s)',             key: 'trainers',        },
      { header: 'Learner Name',           key: 'learnerName',    },
      { header: 'Organisation',           key: 'organisation',   },
      { header: 'BU Number',              key: 'buNumber',       },
      { header: 'Designation',            key: 'designation',    },
      { header: 'Payment Method',         key: 'paymentMethod',  },
      { header: 'Run Type',               key: 'runType',        },
      { header: 'Billing Month',          key: 'billingMonth',   },
    ];

    // Style the header row
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A5F' }, // dark navy blue
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.height = 28;

    // Add data rows with alternating bands
    rows.forEach((row, idx) => {
      const dataRow = ws.addRow([
        row.courseTitle,
        row.startDate,
        row.endDate,
        row.trainers,
        row.learnerName,
        row.organisation,
        row.buNumber,
        row.designation,
        row.paymentMethod,
        row.runType,
        row.billingMonth,
      ]);

      dataRow.alignment = { vertical: 'middle', wrapText: false };

      // Light alternating row background
      if (idx % 2 === 1) {
        dataRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F4F8' },
        };
      }
    });

    // Auto-fit column widths based on content
    const colKeys = ['courseTitle','startDate','endDate','trainers','learnerName','organisation','buNumber','designation','paymentMethod','runType','billingMonth'] as const;
    const MIN_COL_WIDTH = 12;
    const MAX_COL_WIDTH = 55;

    colKeys.forEach((key, i) => {
      const col = ws.getColumn(i + 1);
      const headerLen = (col.header as string).length;
      let maxLen = headerLen;

      rows.forEach(r => {
        const val = r[key] ?? '';
        if (val.length > maxLen) maxLen = val.length;
      });

      col.width = Math.min(Math.max(maxLen + 2, MIN_COL_WIDTH), MAX_COL_WIDTH);
    });

    // Add thin borders to all cells
    const totalRows = rows.length + 1; // +1 for header
    for (let r = 1; r <= totalRows; r++) {
      for (let c = 1; c <= 11; c++) {
        const cell = ws.getCell(r, c);
        cell.border = {
          top:    { style: 'thin', color: { argb: 'FFD0D9E4' } },
          left:   { style: 'thin', color: { argb: 'FFD0D9E4' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D9E4' } },
          right:  { style: 'thin', color: { argb: 'FFD0D9E4' } },
        };
      }
    }

    // Build filename with timestamp
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const filename = `Learner_Report_${stamp}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('[downloadLearnerReport]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate learner report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
