import { Response } from 'express';
import { UserRole } from '@prisma/client';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

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
        trainerId: trainerId,
        startDate: {
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
        startDate: 'asc'
      }
    });

    // Calculate training statistics
    const totalSessionsCompleted = await prisma.courseRun.count({
      where: {
        trainerId: trainerId,
        status: 'COMPLETED'
      }
    });

    const totalSessionsUpcoming = await prisma.courseRun.count({
      where: {
        trainerId: trainerId,
        startDate: {
          gte: new Date()
        },
        status: {
          in: ['ACTIVE', 'PUBLISHED', 'ONGOING']
        }
      }
    });

    const totalLearnersTrained = await prisma.courseRun.aggregate({
      where: {
        trainerId: trainerId,
        status: 'COMPLETED'
      },
      _sum: {
        currentParticipants: true
      }
    });

    // Format the response
  const fees = await (prisma as any).trainerFee.findMany({
      where: { trainerId },
      include: { course: { select: { id:true, courseCode:true, title:true } } },
      orderBy: { updatedAt: 'desc' }
    });

    const dashboardData = {
      profile: trainerProfile,
      statistics: {
        totalSessionsCompleted,
        totalSessionsUpcoming,
        totalLearnersTrained: totalLearnersTrained._sum.currentParticipants || 0,
        totalBlockouts: blockouts.length
      },
      upcomingCourseRuns: courseRuns.map(run => ({
        id: run.id,
        courseName: run.course?.title || 'Unknown Course',
        courseCategory: run.course?.category || 'General',
        startDate: run.startDate,
        endDate: run.endDate,
        startTime: run.startTime,
        endTime: run.endTime,
        status: run.status,
        currentParticipants: run.currentParticipants,
        maxParticipants: run.maxParticipants,
        venue: run.venue ? {
          name: run.venue.name,
          address: run.venue.address
        } : null
      })),
      blockoutDates: blockouts.map(blockout => ({
        id: blockout.id,
        startDate: blockout.startDate,
        endDate: blockout.endDate,
        reason: blockout.reason,
        type: blockout.type,
        description: blockout.description,
        isRecurring: blockout.isRecurring
  })),
  fees: fees.map((f: any) => ({ id: f.id, feePerRun: f.feePerRun, remarks: f.remarks, course: f.course }))
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
