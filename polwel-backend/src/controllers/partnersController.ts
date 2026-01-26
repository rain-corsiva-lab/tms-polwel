import { Response } from 'express';
import { Prisma, UserStatus } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

const toStringArray = (value: Prisma.JsonValue | null | undefined): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
};

// Interface for partner data (simplified to match trainer structure)
interface PartnerData {
  partnerName: string;
  email?: string;
  contactNumber?: string;
  onboardingDate?: string;
  status?: UserStatus;
  notes?: string;
}

type PartnerRecord = {
  id: string;
  name: string;
  status: UserStatus;
  email: string | null;
  coursesAssigned: Prisma.JsonValue | null;
  pointOfContact: string | null;
  pointOfContactDepartment: string | null;
  pointOfContactEmail: string | null;
  contactNumber: string | null;
  contactDesignation: string | null;
  onboardingDate: Date | null;
  notes: string | null;
  bio: string | null;
  experience: string | null;
  createdAt: Date;
  updatedAt: Date;
  partnerTrainers?: Array<{
    id: string;
    trainerInformation: string | null;
    trainerName: string;
    trainerWriteUp: string | null;
    trainerEmail: string;
    deletedAt: Date | null;
  }>;
};

const transformPartner = (partner: PartnerRecord) => ({
  id: partner.id,
  partnerName: partner.name,
  email: partner.email || '',
  status: partner.status,
  coursesAssigned: toStringArray(partner.coursesAssigned),
  pointOfContact: partner.pointOfContact || '',
  pointOfContactDepartment: partner.pointOfContactDepartment || '',
  pointOfContactEmail: partner.pointOfContactEmail || '',
  contactNumber: partner.contactNumber || '',
  contactDesignation: partner.contactDesignation || '',
  onboardingDate: partner.onboardingDate ? partner.onboardingDate.toISOString().split('T')[0] : undefined,
  notes: partner.notes || undefined,
  bio: partner.bio || undefined,
  experience: partner.experience || undefined,
  createdAt: partner.createdAt,
  updatedAt: partner.updatedAt,
  trainers: partner.partnerTrainers?.filter(t => !t.deletedAt).map(t => ({
    id: t.id,
    trainerInformation: t.trainerInformation || '',
    trainerName: t.trainerName,
    trainerWriteUp: t.trainerWriteUp || '',
    trainerEmail: t.trainerEmail,
  })) || [],
});

// Zod schemas for partner create/update validation
const PartnerTrainerSchema = z.object({
  id: z.string().optional(),
  trainerInformation: z.string().optional(),
  trainerName: z.string().min(1, 'Trainer name is required'),
  trainerWriteUp: z.string().optional(),
  trainerEmail: z.string().email('Valid email required'),
});

const PartnerCreateSchema = z.object({
  partnerName: z.string().min(1, 'Partner name is required'),
  email: z.string().email().optional(),
  coursesAssigned: z.array(z.string()).optional(),
  pointOfContact: z.string().optional(),
  pointOfContactDepartment: z.string().optional(),
  pointOfContactEmail: z.string().email().optional(),
  contactNumber: z.string().optional(),
  contactDesignation: z.string().optional(),
  onboardingDate: z.string().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  notes: z.string().optional(),
  bio: z.string().optional(),
  experience: z.string().optional(),
  trainers: z.array(PartnerTrainerSchema).optional(),
});

const PartnerUpdateSchema = PartnerCreateSchema.partial();

const normalizeString = (value?: string | null) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

// Get all partners with pagination and filtering
export const getPartners = async (req: AuthenticatedRequest, res: Response) => {
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

    const where: Prisma.PartnerWhereInput = {};

    const statusParam = typeof req.query.status === 'string' ? req.query.status.trim().toUpperCase() : '';
    // Always exclude deleted partners
    where.deletedAt = null;
    
    // If caller explicitly requests 'ALL', do not filter by status
    if (statusParam && statusParam !== 'ALL') {
      where.status = statusParam as UserStatus;
    } else if (!statusParam) {
      // default behaviour: hide INACTIVE unless caller specified otherwise
      where.status = { not: UserStatus.INACTIVE };
    }

    const searchTerm = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm } },
        { pointOfContact: { contains: searchTerm } },
        { pointOfContactDepartment: { contains: searchTerm } },
        { pointOfContactEmail: { contains: searchTerm } },
        { contactNumber: { contains: searchTerm } },
        { contactDesignation: { contains: searchTerm } },
      ];
    }

    const [partners, total] = await Promise.all([
      prisma.partner.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          coursesAssigned: true,
          pointOfContact: true,
          pointOfContactDepartment: true,
          pointOfContactEmail: true,
          contactNumber: true,
          contactDesignation: true,
          onboardingDate: true,
          notes: true,
          bio: true,
          experience: true,
          createdAt: true,
          updatedAt: true,
          partnerTrainers: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
              trainerInformation: true,
              trainerName: true,
              trainerWriteUp: true,
              trainerEmail: true,
              deletedAt: true,
            },
          },
        },
        ...(skip !== undefined ? { skip } : {}),
        ...(take !== undefined ? { take } : {}),
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.partner.count({ where }),
    ]);

    const transformedPartners = partners.map(transformPartner);

    return res.json({
      partners: transformedPartners,
      pagination: {
        page: exportAll ? 1 : pageNum,
        limit: exportAll ? total : limitNum,
        total,
        totalPages: exportAll ? 1 : Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return res.status(500).json({
      error: 'Failed to fetch partners',
      details: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
};

// Get partner by ID
export const getPartnerById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Partner ID is required' });
    }

    const partner = await prisma.partner.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        coursesAssigned: true,
        pointOfContact: true,
        pointOfContactDepartment: true,
        pointOfContactEmail: true,
        contactNumber: true,
        contactDesignation: true,
        onboardingDate: true,
        notes: true,
        bio: true,
        experience: true,
        createdAt: true,
        updatedAt: true,
        partnerTrainers: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            trainerInformation: true,
            trainerName: true,
            trainerWriteUp: true,
            trainerEmail: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!partner || partner.status === UserStatus.INACTIVE) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    return res.json(transformPartner(partner));
  } catch (error) {
    console.error('Error fetching partner:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch partner',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// Create new partner
export const createPartner = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = PartnerCreateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
    }

    const { partnerName, email, coursesAssigned, pointOfContact, pointOfContactDepartment, pointOfContactEmail, contactNumber, contactDesignation, onboardingDate, status, notes, bio, experience, trainers } = validation.data;

    const normalizedName = partnerName.trim();

    let parsedOnboardingDate: Date | null = null;
    if (onboardingDate) {
      const parsed = new Date(onboardingDate);
      if (!Number.isNaN(parsed.getTime())) {
        parsedOnboardingDate = parsed;
      }
    }

    const partner = await prisma.partner.create({
      data: {
        name: normalizedName,
        email: normalizeString(email),
        status: status ?? UserStatus.ACTIVE,
        coursesAssigned: Array.isArray(coursesAssigned) ? coursesAssigned : [],
        pointOfContact: normalizeString(pointOfContact),
        pointOfContactDepartment: normalizeString(pointOfContactDepartment),
        pointOfContactEmail: normalizeString(pointOfContactEmail),
        contactNumber: normalizeString(contactNumber),
        contactDesignation: normalizeString(contactDesignation),
        onboardingDate: parsedOnboardingDate,
        notes: normalizeString(notes),
        bio: normalizeString(bio),
        experience: normalizeString(experience),
        ...(trainers && trainers.length > 0 ? {
          partnerTrainers: {
            create: trainers.map(t => ({
              trainerInformation: normalizeString(t.trainerInformation),
              trainerName: t.trainerName.trim(),
              trainerWriteUp: normalizeString(t.trainerWriteUp),
              trainerEmail: t.trainerEmail.trim(),
            })),
          },
        } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        coursesAssigned: true,
        pointOfContact: true,
        pointOfContactDepartment: true,
        pointOfContactEmail: true,
        contactNumber: true,
        contactDesignation: true,
        onboardingDate: true,
        notes: true,
        bio: true,
        experience: true,
        createdAt: true,
        updatedAt: true,
        partnerTrainers: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            trainerInformation: true,
            trainerName: true,
            trainerWriteUp: true,
            trainerEmail: true,
            deletedAt: true,
          },
        },
      },
    });

    return res.status(201).json(transformPartner(partner));
  } catch (error) {
    console.error('Error creating partner:', error);
    
    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        // Unique constraint violation
        const field = error.meta?.target as string[] | undefined;
        const fieldName = field && field.length > 0 ? field[0] : 'field';
        return res.status(409).json({ 
          error: 'Validation failed',
          message: `A partner with this ${fieldName} already exists.`,
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
      
      if (error.code === 'P2003') {
        // Foreign key constraint violation
        return res.status(400).json({ 
          error: 'Validation failed',
          message: 'Invalid reference to related record.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Invalid input data.',
        details: error.errors
      });
    }
    
    // Generic error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      error: 'Failed to create partner',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
};

// Update partner
export const updatePartner = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parsedBody = req.body as unknown;
    const validation = PartnerUpdateSchema.safeParse(parsedBody);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
    }

    const { partnerName, email, coursesAssigned, pointOfContact, pointOfContactDepartment, pointOfContactEmail, contactNumber, contactDesignation, onboardingDate, status, notes, bio, experience, trainers } = validation.data;

    if (!id) {
      return res.status(400).json({ error: 'Partner ID is required' });
    }

    // Check if partner exists
    const existingPartner = await prisma.partner.findUnique({
      where: { id },
      include: {
        partnerTrainers: {
          where: { deletedAt: null },
        },
      },
    });

    if (!existingPartner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    let onboardingDateUpdate: Date | null | undefined = undefined;
    if (onboardingDate !== undefined) {
      if (onboardingDate) {
        const parsed = new Date(onboardingDate);
        onboardingDateUpdate = Number.isNaN(parsed.getTime()) ? null : parsed;
      } else {
        onboardingDateUpdate = null;
      }
    }

    let normalizedName: string | undefined;
    if (partnerName !== undefined) {
      normalizedName = partnerName.trim();
      if (!normalizedName) {
        return res.status(400).json({ error: 'Partner name cannot be empty' });
      }
    }

    // Handle trainer updates
    const trainerUpdates: any = {};
    if (trainers !== undefined) {
      const existingTrainerIds = existingPartner.partnerTrainers.map(t => t.id);
      const incomingTrainerIds = trainers.filter(t => t.id).map(t => t.id);
      
      // Delete trainers not in the incoming list
      const trainersToDelete = existingTrainerIds.filter(id => !incomingTrainerIds.includes(id));
      
      // Create, update trainers
      const trainersToCreate = trainers.filter(t => !t.id);
      const trainersToUpdate = trainers.filter(t => t.id);

      trainerUpdates.partnerTrainers = {
        // Soft delete removed trainers
        updateMany: trainersToDelete.map(trainerId => ({
          where: { id: trainerId },
          data: { deletedAt: new Date() },
        })),
        // Create new trainers
        create: trainersToCreate.map(t => ({
          trainerInformation: normalizeString(t.trainerInformation),
          trainerName: t.trainerName.trim(),
          trainerWriteUp: normalizeString(t.trainerWriteUp),
          trainerEmail: t.trainerEmail.trim(),
        })),
        // Update existing trainers
        update: trainersToUpdate.map(t => ({
          where: { id: t.id },
          data: {
            trainerInformation: normalizeString(t.trainerInformation),
            trainerName: t.trainerName.trim(),
            trainerWriteUp: normalizeString(t.trainerWriteUp),
            trainerEmail: t.trainerEmail.trim(),
          },
        })),
      };
    }

    const partner = await prisma.partner.update({
      where: { id: existingPartner.id },
      data: {
        ...(normalizedName !== undefined && { name: normalizedName }),
        ...(email !== undefined && { email: normalizeString(email) }),
        ...(status && { status }),
        ...(coursesAssigned !== undefined && { coursesAssigned: Array.isArray(coursesAssigned) ? coursesAssigned : [] }),
        ...(pointOfContact !== undefined && { pointOfContact: normalizeString(pointOfContact) }),
        ...(pointOfContactDepartment !== undefined && { pointOfContactDepartment: normalizeString(pointOfContactDepartment) }),
        ...(pointOfContactEmail !== undefined && { pointOfContactEmail: normalizeString(pointOfContactEmail) }),
        ...(contactNumber !== undefined && { contactNumber: normalizeString(contactNumber) }),
        ...(contactDesignation !== undefined && { contactDesignation: normalizeString(contactDesignation) }),
        ...(onboardingDate !== undefined && { onboardingDate: onboardingDateUpdate ?? null }),
        ...(notes !== undefined && { notes: normalizeString(notes) }),
        ...(bio !== undefined && { bio: normalizeString(bio) }),
        ...(experience !== undefined && { experience: normalizeString(experience) }),
        ...trainerUpdates,
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        coursesAssigned: true,
        pointOfContact: true,
        pointOfContactDepartment: true,
        pointOfContactEmail: true,
        contactNumber: true,
        contactDesignation: true,
        onboardingDate: true,
        notes: true,
        bio: true,
        experience: true,
        createdAt: true,
        updatedAt: true,
        partnerTrainers: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            trainerInformation: true,
            trainerName: true,
            trainerWriteUp: true,
            trainerEmail: true,
            deletedAt: true,
          },
        },
      },
    });

    return res.json(transformPartner(partner));
  } catch (error) {
    console.error('Error updating partner:', error);
    return res.status(500).json({ 
      error: 'Failed to update partner',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// Delete partner (soft delete)
export const deletePartner = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Partner ID is required' });
    }

    // Check if partner exists
    const existingPartner = await prisma.partner.findUnique({
      where: { id }
    });

    if (!existingPartner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Soft delete by setting deletedAt timestamp
    await prisma.partner.update({
      where: { id: existingPartner.id },
      data: {
        deletedAt: new Date(),
        status: UserStatus.INACTIVE,
      },
    });

    return res.json({ message: 'Partner deleted successfully' });
  } catch (error) {
    console.error('Error deleting partner:', error);
    return res.status(500).json({ 
      error: 'Failed to delete partner',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// Get partner statistics
export const getPartnerStatistics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [
      totalPartners,
      activePartners,
      pendingPartners,
      inactivePartners,
    ] = await Promise.all([
      prisma.partner.count({
        where: { status: { not: UserStatus.INACTIVE }, deletedAt: null }
      }),
      prisma.partner.count({
        where: { status: UserStatus.ACTIVE, deletedAt: null }
      }),
      prisma.partner.count({
        where: { status: UserStatus.PENDING, deletedAt: null }
      }),
      prisma.partner.count({
        where: { status: UserStatus.INACTIVE, deletedAt: null }
      }),
    ]);

    return res.json({
      totalPartners,
      activePartners,
      pendingPartners,
      inactivePartners,
    });
  } catch (error) {
    console.error('Error fetching partner statistics:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch partner statistics',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// Restore deleted partner
export const restorePartner = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Partner ID is required' });
    }

    // Check if partner exists and is deleted
    const existingPartner = await prisma.partner.findUnique({
      where: { id }
    });

    if (!existingPartner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    if (!existingPartner.deletedAt) {
      return res.status(400).json({ error: 'Partner is not deleted' });
    }

    // Restore by clearing deletedAt and setting status to ACTIVE
    await prisma.partner.update({
      where: { id: existingPartner.id },
      data: {
        deletedAt: null,
        status: UserStatus.ACTIVE,
      },
    });

    return res.json({ message: 'Partner restored successfully' });
  } catch (error) {
    console.error('Error restoring partner:', error);
    return res.status(500).json({ 
      error: 'Failed to restore partner',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// Get deleted partners
export const getDeletedPartners = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const partners = await prisma.partner.findMany({
      where: {
        deletedAt: { not: null }
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        coursesAssigned: true,
        pointOfContact: true,
        pointOfContactDepartment: true,
        pointOfContactEmail: true,
        contactNumber: true,
        contactDesignation: true,
        onboardingDate: true,
        notes: true,
        bio: true,
        experience: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        partnerTrainers: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            trainerInformation: true,
            trainerName: true,
            trainerWriteUp: true,
            trainerEmail: true,
            deletedAt: true,
          },
        },
      },
      orderBy: { deletedAt: 'desc' },
    });

    const transformedPartners = partners.map(transformPartner);

    return res.json({
      partners: transformedPartners,
      total: partners.length,
    });
  } catch (error) {
    console.error('Error fetching deleted partners:', error);
    return res.status(500).json({
      error: 'Failed to fetch deleted partners',
      details: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
};

