import { Response } from 'express';
import { UserRole, UserStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth';
import EmailService from '../services/emailService';
// import { logDatabaseQuery } from '../middleware/logging'; // Temporarily disabled



// Get all trainers with pagination and filtering
export const getTrainers = async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  console.log(`👨‍🏫 [TRAINERS] Get trainers request started`);
  
  try {
  const { page = 1, limit = 10, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      role: UserRole.TRAINER
    };

    if (search) {
      where.OR = [
  { name: { contains: search as string } },
  { email: { contains: search as string } },
  { partnerOrganization: { contains: search as string } }
      ];
    }

    if (status) {
      where.status = status as UserStatus;
    }

  // availabilityStatus has been deprecated from API responses/UI; ignore if provided.

    // Get trainers with pagination
    // logDatabaseQuery('User', 'findMany', { where, skip, limit });
    const [trainers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          // availabilityStatus intentionally omitted (deprecated)
          partnerOrganization: true,
          bio: true,
          specializations: true,
          certifications: true,
          experience: true,
          contactNumber: true,
          onboardingDate: true,
          rating: true,
          createdAt: true,
          updatedAt: true
        },
        skip,
        take: Number(limit),
        orderBy: { name: 'asc' }
      }),
      prisma.user.count({ where })
    ]);

    return res.json({
      trainers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get trainers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get trainer by ID
export const getTrainerById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID is required'
      });
    }

    const trainer = await prisma.user.findFirst({
      where: {
        id: id,
        role: UserRole.TRAINER
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
    // availabilityStatus intentionally omitted (deprecated)
        partnerOrganization: true,
        bio: true,
        specializations: true,
        certifications: true,
        profileImage: true,
        experience: true,
    contactNumber: true,
    onboardingDate: true,
        rating: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    return res.json(trainer);
  } catch (error) {
    console.error('Get trainer by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create new trainer
export const createTrainer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      email,
      status = UserStatus.ACTIVE,
      partnerOrganization,
      bio,
      specializations,
      certifications,
      experience,
      contactNumber,
      onboardingDate,
    } = req.body;

    // Validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `Email ${email} is already registered as an active POLWEL User/trainer/training coordinator`
      });
    }

    // Generate temporary password and setup token
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    const setupToken = crypto.randomBytes(32).toString('hex');

    const trainer = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: UserRole.TRAINER,
        status: UserStatus.PENDING, // Set as PENDING for onboarding
  // availabilityStatus removed from create payload; kept in DB for now but not set here
        partnerOrganization: partnerOrganization || null,
        bio: bio || null,
        specializations: specializations || [],
        certifications: certifications || [],
        experience: experience || null,
  ...(contactNumber !== undefined && { contactNumber }),
  ...(onboardingDate ? { onboardingDate: new Date(onboardingDate) } : {}),
        resetToken: setupToken, // Use resetToken for account completion
        resetTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        ...(req.user?.userId && { createdBy: req.user.userId })
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
  // availabilityStatus intentionally omitted (deprecated)
        partnerOrganization: true,
        bio: true,
        specializations: true,
        certifications: true,
        experience: true,
  contactNumber: true,
  onboardingDate: true,
        createdAt: true
      }
    });

    // Send setup completion email
    try {
      if (trainer.email) {
        const setupUrl = `${process.env.FRONTEND_URL}/onboarding/${setupToken}`;
        await EmailService.sendTrainerSetupEmail(trainer.email, trainer.name, setupUrl);
      }
    } catch (emailError) {
      console.error('Failed to send trainer setup email:', emailError);
      // Don't fail the trainer creation if email fails
    }

    return res.status(201).json({
      trainer,
      tempPassword,
      setupToken
    });
  } catch (error) {
    console.error('Create trainer error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update trainer
export const updateTrainer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      email, 
      status, 
      availabilityStatus, 
      partnerOrganization, 
      bio, 
      specializations, 
      certifications, 
      experience 
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID is required'
      });
    }

    // Check if trainer exists
    const existingTrainer = await prisma.user.findFirst({
      where: {
        id: id,
        role: UserRole.TRAINER
      }
    });

    if (!existingTrainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    // Check for email conflicts if email is being updated
    if (email && email !== existingTrainer.email) {
      const emailConflict = await prisma.user.findUnique({
        where: { email }
      });

      if (emailConflict) {
        return res.status(409).json({
          success: false,
          message: 'Email already in use by another user'
        });
      }
    }

    const trainer = await prisma.user.update({
      where: { id: id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(status && { status }),
        ...(availabilityStatus && { availabilityStatus }),
        ...(partnerOrganization !== undefined && { partnerOrganization }),
        ...(bio !== undefined && { bio }),
        ...(specializations !== undefined && { specializations }),
        ...(certifications !== undefined && { certifications }),
        ...(experience !== undefined && { experience })
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        availabilityStatus: true,
        partnerOrganization: true,
        bio: true,
        specializations: true,
        certifications: true,
        experience: true,
        updatedAt: true
      }
    });

    return res.json(trainer);
  } catch (error) {
    console.error('Update trainer error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete trainer (soft delete)
export const deleteTrainer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID is required'
      });
    }

    // Check if trainer exists
    const existingTrainer = await prisma.user.findFirst({
      where: {
        id: id,
        role: UserRole.TRAINER
      }
    });

    if (!existingTrainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    // Soft delete by setting status to INACTIVE
    await prisma.user.update({
      where: { id: id },
      data: {
        status: UserStatus.INACTIVE
      }
    });

    return res.json({
      success: true,
      message: 'Trainer deleted successfully'
    });
  } catch (error) {
    console.error('Delete trainer error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get trainer blockouts
export const getTrainerBlockouts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID is required'
      });
    }

    // Build where clause
    const where: any = { trainerId: id };

    if (startDate && endDate) {
      where.OR = [
        {
          startDate: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          }
        },
        {
          endDate: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          }
        },
        {
          AND: [
            { startDate: { lte: new Date(startDate as string) } },
            { endDate: { gte: new Date(endDate as string) } }
          ]
        }
      ];
    }

    const blockouts = await prisma.trainerBlockout.findMany({
      where,
      orderBy: { startDate: 'asc' }
    });

    return res.json(blockouts);
  } catch (error) {
    console.error('Get trainer blockouts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create trainer blockout
export const createTrainerBlockout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, reason, type, description, isRecurring, recurringPattern } = req.body;

    if (!id || !startDate || !endDate || !reason || !type) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID, start date, end date, reason, and type are required'
      });
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date'
      });
    }

    // Check if trainer exists
    const trainer = await prisma.user.findFirst({
      where: {
        id: id,
        role: UserRole.TRAINER
      }
    });

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    const blockout = await prisma.trainerBlockout.create({
      data: {
        trainerId: id,
        startDate: start,
        endDate: end,
        reason,
        type,
        description: description || null,
        isRecurring: isRecurring || false,
        recurringPattern: recurringPattern || null
      }
    });

    return res.status(201).json(blockout);
  } catch (error) {
    console.error('Create trainer blockout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete trainer blockout
export const deleteTrainerBlockout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, blockoutId } = req.params;

    if (!id || !blockoutId) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID and blockout ID are required'
      });
    }

    // Check if blockout exists and belongs to trainer
    const blockout = await prisma.trainerBlockout.findFirst({
      where: {
        id: blockoutId,
        trainerId: id
      }
    });

    if (!blockout) {
      return res.status(404).json({
        success: false,
        message: 'Trainer blockout not found'
      });
    }

    await prisma.trainerBlockout.delete({
      where: { id: blockoutId }
    });

    return res.json({
      success: true,
      message: 'Trainer blockout deleted successfully'
    });
  } catch (error) {
    console.error('Delete trainer blockout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get partner organizations
export const getPartnerOrganizations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause for trainers with partner organizations
    const where: any = {
      role: 'TRAINER',
      partnerOrganization: {
        not: null
      }
    };

    if (search) {
      where.partnerOrganization = {
        contains: search as string,
        
      };
    }

    // Get unique partner organizations
    const trainers = await prisma.user.findMany({
      where,
      select: {
        partnerOrganization: true
      },
      skip,
      take: Number(limit)
    });

    // Get total count
    const total = await prisma.user.count({
      where
    });

    const partnerOrganizations = trainers
      .map(trainer => trainer.partnerOrganization)
      .filter(org => org !== null);

    return res.json({
      partnerOrganizations,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get partner organizations error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get trainer course runs
export const getTrainerCourseRuns = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID is required'
      });
    }

    let whereClause: any = {
      trainerId: id
    };

    // Add date filtering if provided
    if (startDate && endDate) {
      whereClause.startDate = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const courseRuns = await prisma.courseRun.findMany({
      where: whereClause,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true
          }
        },
        venue: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        trainer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    return res.json({
      success: true,
      runs: courseRuns,
      message: `Found ${courseRuns.length} course run(s) for trainer`
    });

  } catch (error) {
    console.error('Get trainer course runs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Resend setup email for trainer
export const resendTrainerSetup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID is required'
      });
    }

    // Find the trainer
    const trainer = await prisma.user.findFirst({
      where: {
        id: id,
        role: UserRole.TRAINER,
        status: UserStatus.PENDING
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        resetToken: true
      }
    });

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found or account already active'
      });
    }

    if (!trainer.email) {
      return res.status(400).json({
        success: false,
        message: 'Trainer email not found'
      });
    }

    // Generate new setup token
    const setupToken = EmailService.generateResetToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update trainer with new token
    await prisma.user.update({
      where: { id: trainer.id },
      data: {
        resetToken: setupToken,
        resetTokenExpiry: expiresAt
      }
    });

    // Send setup email
    try {
      const setupUrl = `${process.env.FRONTEND_URL}/onboarding/${setupToken}`;
      await EmailService.sendTrainerSetupEmail(trainer.email, trainer.name, setupUrl);
      
      console.log(`🔄 Trainer setup email resent to: ${trainer.email}`);
      
      return res.json({
        success: true,
        message: 'Setup email has been resent successfully',
        setupTokenResent: true
      });

    } catch (emailError) {
      console.error('Failed to resend trainer setup email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send setup email. Please try again.'
      });
    }

  } catch (error) {
    console.error('Resend trainer setup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
