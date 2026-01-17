import { Response } from 'express';
import { UserRole } from '@prisma/client';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { fetchTrainerCourseRuns, fetchTrainerTrainingSummary } from '../services/trainerService';

// Helper to safely extract remarks with fallback to legacy 'reason'.
function getRemarks(obj: any): string | null {
  if (!obj) return null;
  return (obj as any).remarks ?? (obj as any).reason ?? null;
}

// Get trainer dashboard data - only accessible by the trainer themselves
export const getTrainerDashboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const trainerId = req.user?.userId;

    if (!trainerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify the user is a trainer
    const trainer = await prisma.user.findFirst({
      where: {
        id: trainerId,
        role: UserRole.TRAINER
      }
    });

    if (!trainer) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Trainer role required.'
      });
    }

    // Get trainer profile data
    const trainerProfile = await prisma.user.findUnique({
      where: { id: trainerId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        partnerOrganization: true,
        bio: true,
        specializations: true,
        certifications: true,
        experience: true,
        createdAt: true,
        contactNumber: true,
        onboardingDate: true,
      }
    });

    // Get trainer's blockout dates for the next 6 months
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    const blockouts = await prisma.trainerBlockout.findMany({
      where: {
        trainerId: trainerId,
        startDate: {
          gte: new Date(),
          lte: sixMonthsFromNow
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    // Get trainer's scheduled course runs for the next 6 months
    const courseRuns = await prisma.courseRun.findMany({
      where: {
        courseRunTrainers: {
          some: {
            trainerId: trainerId
          }
        },
        startDatetime: {
          gte: new Date(),
          lte: sixMonthsFromNow
        }
      },
      include: {
        course: {
          select: {
            title: true,
            category: true
          }
        },
        venue: {
          select: {
            name: true,
            address: true
          }
        }
      },
      orderBy: {
        startDatetime: 'asc'
      }
    });

    // Calculate training statistics
    const totalSessionsCompleted = await prisma.courseRun.count({
      where: {
        courseRunTrainers: {
          some: {
            trainerId: trainerId
          }
        },
        status: 'COMPLETED'
      }
    });

    const totalSessionsUpcoming = await prisma.courseRun.count({
      where: {
        courseRunTrainers: {
          some: {
            trainerId: trainerId
          }
        },
        startDatetime: {
          gte: new Date()
        },
        status: {
          in: ['ACTIVE', 'CONFIRMED', 'CONFIRMED_PENDING_CONFIRMATION_EMAILS']
        }
      }
    });

    const totalLearnersTrained = await prisma.courseRunLearner.aggregate({
      where: {
        courseRun: {
          courseRunTrainers: {
            some: {
              trainerId: trainerId
            }
          },
          status: 'COMPLETED'
        }
      },
      _count: {
        id: true
      }
    });

    // Format the response
    const dashboardData = {
      profile: trainerProfile,
      statistics: {
        totalSessionsCompleted,
        totalSessionsUpcoming,
        totalLearnersTrained: totalLearnersTrained._count.id || 0,
        totalBlockouts: blockouts.length
      },
      upcomingCourseRuns: courseRuns.map(run => ({
        id: run.id,
        courseName: run.course?.title || 'Unknown Course',
        courseCategory: run.course?.category || 'General',
        startDate: run.startDatetime,
        endDate: run.endDatetime,
        startTime: run.startDatetime ? run.startDatetime.toTimeString().split(' ')[0] : '',
        endTime: run.endDatetime ? run.endDatetime.toTimeString().split(' ')[0] : '',
        status: run.status,
        currentParticipants: 0, // Will be calculated from courseRunLearners
        maxParticipants: run.maxClassSize,
        venue: run.venue ? {
          name: run.venue.name,
          address: run.venue.address
        } : null
      })),
      blockoutDates: blockouts.map(blockout => ({
        id: blockout.id,
        startDate: blockout.startDate,
        endDate: blockout.endDate,
        remarks: getRemarks(blockout),
        description: blockout.description,
        isRecurring: blockout.isRecurring
      }))
    };

    return res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Get trainer dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update trainer profile - only the trainer can update their own profile
export const updateTrainerProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const trainerId = req.user?.userId;
    const { name, contactNumber, bio, specializations, certifications, experience } = req.body;

    if (!trainerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify the user is a trainer
    const trainer = await prisma.user.findFirst({
      where: {
        id: trainerId,
        role: UserRole.TRAINER
      }
    });

    if (!trainer) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Trainer role required.'
      });
    }

    // Update trainer profile
    const updatedTrainer = await prisma.user.update({
      where: { id: trainerId },
      data: {
        ...(name && { name }),
        ...(contactNumber !== undefined && { contactNumber }),
        ...(bio !== undefined && { bio }),
        ...(specializations !== undefined && { specializations }),
        ...(certifications !== undefined && { certifications }),
        ...(experience !== undefined && { experience })
      },
      select: {
        id: true,
        name: true,
        email: true,
        contactNumber: true,
        bio: true,
        specializations: true,
        certifications: true,
        experience: true,
        updatedAt: true
      }
    });

    return res.json({
      success: true,
      data: updatedTrainer,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update trainer profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getTrainerCourseRunsSelf = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const trainerId = req.user?.userId;
    const role = (req.user?.role || '').toUpperCase();

    if (!trainerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (role !== UserRole.TRAINER) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Trainer role required.'
      });
    }

    const { startDate, endDate } = req.query;

    const params: Parameters<typeof fetchTrainerCourseRuns>[0] = { trainerId };
    if (typeof startDate === 'string' && startDate.trim()) {
      params.startDate = startDate;
    }
    if (typeof endDate === 'string' && endDate.trim()) {
      params.endDate = endDate;
    }

    const runs = await fetchTrainerCourseRuns(params);

    return res.json({
      success: true,
      data: runs
    });
  } catch (error) {
    console.error('Get trainer course runs (self) error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getTrainerTrainingSummarySelf = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const trainerId = req.user?.userId;
    const role = (req.user?.role || '').toUpperCase();

    if (!trainerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (role !== UserRole.TRAINER) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Trainer role required.'
      });
    }

    const { startDate, endDate, page, limit } = req.query;

    const params: Parameters<typeof fetchTrainerTrainingSummary>[0] = { trainerId };
    if (typeof startDate === 'string' && startDate.trim()) {
      params.startDate = startDate;
    }
    if (typeof endDate === 'string' && endDate.trim()) {
      params.endDate = endDate;
    }
    if (typeof page === 'string' && page.trim()) {
      params.page = page;
    }
    if (typeof limit === 'string' && limit.trim()) {
      params.limit = limit;
    }

    const summary = await fetchTrainerTrainingSummary(params);

    return res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get trainer training summary (self) error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
