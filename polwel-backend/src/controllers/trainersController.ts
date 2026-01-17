import { Response } from 'express';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth';
import EmailService from '../services/emailService';
import { fetchTrainerCourseRuns, fetchTrainerTrainingSummary } from '../services/trainerService';
// import { logDatabaseQuery } from '../middleware/logging'; // Temporarily disabled



// Get all trainers with pagination and filtering
export const getTrainers = async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  console.log(`👨‍🏫 [TRAINERS] Get trainers request started`);
  
  try {
  const rawPage = typeof req.query.page === 'string' ? req.query.page : undefined;
  const parsedPage = rawPage ? Number(rawPage) : undefined;
  const pageNum = parsedPage && Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;

  const rawLimit = typeof req.query.limit === 'string' ? req.query.limit : undefined;
  const exportAll = req.query.export === 'true' || req.query.all === 'true' || rawLimit === 'all';
  let limitNum = 10;
  if (!exportAll && rawLimit !== undefined) {
    const parsedLimit = Number(rawLimit);
    if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
      limitNum = Math.floor(parsedLimit);
    }
  }
    const skip = exportAll ? undefined : (pageNum - 1) * limitNum;
    const take = exportAll ? undefined : limitNum;
    const { search, status } = req.query;

    // Build where clause
    const where: any = {
      role: UserRole.TRAINER,
      deletedAt: null  // Exclude soft-deleted trainers
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
        ...(skip !== undefined ? { skip } : {}),
        ...(take !== undefined ? { take } : {}),
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    return res.json({
      trainers,
      pagination: {
        page: exportAll ? 1 : pageNum,
        limit: exportAll ? total : limitNum,
        total,
        totalPages: exportAll ? 1 : Math.ceil(total / limitNum)
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
      experience,
      contactNumber,
      onboardingDate
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
        ...(experience !== undefined && { experience }),
        ...(contactNumber !== undefined && { contactNumber }),
        ...(onboardingDate !== undefined && { onboardingDate: onboardingDate ? new Date(onboardingDate) : null })
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        availabilityStatus: true,
        partnerOrganization: true,
        contactNumber: true,
        onboardingDate: true,
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

    // Soft delete by setting deletedAt timestamp
    await prisma.user.update({
      where: { id: id },
      data: {
        deletedAt: new Date(),
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
    const { startDate, endDate, remarks, description, isRecurring, recurringPattern } = req.body;

    if (!id || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID, start date and end date are required'
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
        remarks: remarks || null,
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
    const currentUser = req.user;

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

    // Allow deletion if user is admin OR if user is the trainer themselves
    // blockout.trainerId is the User.id of the trainer
    const isOwnBlockout = currentUser?.userId === blockout.trainerId;
    const isAdmin = currentUser?.role === 'POLWEL';

    if (!isOwnBlockout && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
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
  const pageParam = typeof req.query.page === 'string' ? req.query.page : undefined;
  const pageNum = pageParam ? Number(pageParam) : 1;
  const normalizedPage = Number.isFinite(pageNum) && pageNum > 0 ? Math.floor(pageNum) : 1;

  const limitParam = typeof req.query.limit === 'string' ? req.query.limit : undefined;
  const limitNum = limitParam ? Number(limitParam) : 10;
  const normalizedLimit = Number.isFinite(limitNum) && limitNum > 0 ? Math.floor(limitNum) : 10;
    const skip = (normalizedPage - 1) * normalizedLimit;

    const where: Prisma.PartnerWhereInput = {
      status: { not: UserStatus.INACTIVE }
    };

    const searchTerm = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (searchTerm) {
      where.name = {
        contains: searchTerm
      };
    }

    const [partners, total] = await Promise.all([
      prisma.partner.findMany({
        where,
        select: {
          id: true,
          name: true
        },
        skip,
        take: normalizedLimit,
        orderBy: {
          name: 'asc'
        }
      }),
      prisma.partner.count({ where })
    ]);

    const partnerOrganizations = partners
      .map(partner => partner.name?.trim())
      .filter((name): name is string => Boolean(name));

    return res.json({
      partnerOrganizations,
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
        totalPages: Math.ceil(total / normalizedLimit)
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

    const params: Parameters<typeof fetchTrainerCourseRuns>[0] = { trainerId: id };
    if (typeof startDate === 'string' && startDate.trim()) {
      params.startDate = startDate;
    }
    if (typeof endDate === 'string' && endDate.trim()) {
      params.endDate = endDate;
    }

    const runs = await fetchTrainerCourseRuns(params);

    return res.json({
      success: true,
      runs,
      message: `Found ${runs.length} course run(s) for trainer`
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

export const getTrainerTrainingSummary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, page, limit } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID is required'
      });
    }

    const params: Parameters<typeof fetchTrainerTrainingSummary>[0] = { trainerId: id };
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
      data: summary,
    });
  } catch (error) {
    console.error('Get trainer training summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get deleted trainers
export const getDeletedTrainers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawPage = typeof req.query.page === 'string' ? req.query.page : undefined;
    const parsedPage = rawPage ? Number(rawPage) : undefined;
    const pageNum = parsedPage && Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;

    const rawLimit = typeof req.query.limit === 'string' ? req.query.limit : undefined;
    const limitNum = rawLimit ? Number(rawLimit) : 10;
    const skip = (pageNum - 1) * limitNum;

    const where = {
      role: UserRole.TRAINER,
      deletedAt: { not: null }
    };

    const [trainers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          contactNumber: true,
          partnerOrganization: true,
          specializations: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true
        },
        skip,
        take: limitNum,
        orderBy: { deletedAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    const transformedTrainers = trainers.map(trainer => ({
      ...trainer,
      specializations: Array.isArray(trainer.specializations) 
        ? trainer.specializations.filter((item): item is string => typeof item === 'string')
        : []
    }));

    return res.json({
      trainers: transformedTrainers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching deleted trainers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch deleted trainers',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Restore deleted trainer
export const restoreTrainer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID is required'
      });
    }

    // Check if trainer exists and is deleted
    const existingTrainer = await prisma.user.findFirst({
      where: {
        id: id,
        role: UserRole.TRAINER,
        deletedAt: { not: null }
      }
    });

    if (!existingTrainer) {
      return res.status(404).json({
        success: false,
        message: 'Deleted trainer not found'
      });
    }

    // Restore by clearing deletedAt and setting status to ACTIVE
    await prisma.user.update({
      where: { id: id },
      data: {
        deletedAt: null,
        status: UserStatus.ACTIVE
      }
    });

    return res.json({
      success: true,
      message: 'Trainer restored successfully'
    });
  } catch (error) {
    console.error('Restore trainer error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
