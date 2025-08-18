import { Request, Response } from 'express';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// Interface for partner data (no email/password since it's not a user account)
interface PartnerData {
  partnerName: string;
  coursesAssigned?: string[];
  pointOfContact?: string;
  contactNumber?: string;
  contactDesignation?: string;
}

// Get all partners with pagination and filtering
export const getPartners = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause for partners (using TRAINER role with partnerOrganization)
    const where: any = {
      role: 'TRAINER',
      partnerOrganization: {
        not: null // Only trainers who are partners have this field set
      },
      status: {
        not: 'INACTIVE' // Filter out inactive partners
      }
    };

    // Add search filter if provided (search in partner name and contact info)
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { bio: { contains: search as string, mode: 'insensitive' } }, // point of contact
        { partnerOrganization: { contains: search as string, mode: 'insensitive' } },
        { experience: { contains: search as string, mode: 'insensitive' } } // contact number
      ];
    }

    // Add status filter if provided
    if (status && status !== '') {
      where.status = status as UserStatus;
    }

    // Get partners with pagination
    const [partners, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          status: true,
          partnerOrganization: true, // This will be the partner name
          bio: true, // Store point of contact info here
          experience: true, // Store contact number here
          specializations: true, // Store courses assigned here
          certifications: true, // Store contact designation here
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    // Transform data to match frontend expectations (no user account fields)
    const transformedPartners = partners.map(partner => ({
      id: partner.id,
      partnerName: partner.partnerOrganization || partner.name,
      status: partner.status,
      coursesAssigned: partner.specializations || [],
      pointOfContact: partner.bio || '',
      contactNumber: partner.experience || '',
      contactDesignation: partner.certifications?.[0] || '',
      createdAt: partner.createdAt,
      updatedAt: partner.updatedAt,
    }));

    return res.json({
      partners: transformedPartners,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch partners',
      details: process.env.NODE_ENV === 'development' ? error : undefined
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

    const partner = await prisma.user.findFirst({
      where: { 
        id,
        role: 'TRAINER',
        partnerOrganization: {
          not: null
        },
        status: {
          not: 'INACTIVE'
        }
      },
      select: {
        id: true,
        name: true,
        status: true,
        partnerOrganization: true,
        bio: true,
        experience: true,
        specializations: true,
        certifications: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Transform data to match frontend expectations (no user account fields)
    const transformedPartner = {
      id: partner.id,
      partnerName: partner.partnerOrganization || partner.name,
      status: partner.status,
      coursesAssigned: partner.specializations || [],
      pointOfContact: partner.bio || '',
      contactNumber: partner.experience || '',
      contactDesignation: partner.certifications?.[0] || '',
      createdAt: partner.createdAt,
      updatedAt: partner.updatedAt,
    };

    return res.json(transformedPartner);
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
    const { 
      partnerName, 
      coursesAssigned, 
      pointOfContact, 
      contactNumber, 
      contactDesignation 
    }: PartnerData = req.body;

    // Validation - only partnerName is required
    if (!partnerName) {
      return res.status(400).json({ 
        error: 'Missing required field: partnerName is required' 
      });
    }

    // Generate a unique email for database constraint (since User table requires email)
    // This is a workaround since we're using the User table for partners
    const uniqueEmail = `partner.${Date.now()}@internal.polwel.com`;

    // Create partner (as trainer with partnerOrganization)
    const partner = await prisma.user.create({
      data: {
        name: partnerName,
        email: uniqueEmail, // Auto-generated internal email
        password: '', // Empty password since partners don't login
        role: 'TRAINER',
        status: 'ACTIVE',
        partnerOrganization: partnerName, // Store partner org name
        bio: pointOfContact || '', // Store point of contact in bio
        experience: contactNumber || '', // Store contact number in experience
        specializations: coursesAssigned || [], // Store courses in specializations
        certifications: contactDesignation ? [contactDesignation] : [], // Store designation in certifications
        mfaEnabled: false,
      },
      select: {
        id: true,
        name: true,
        status: true,
        partnerOrganization: true,
        bio: true,
        experience: true,
        specializations: true,
        certifications: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Transform data to match frontend expectations (no email exposed)
    const transformedPartner = {
      id: partner.id,
      partnerName: partner.partnerOrganization || partner.name,
      status: partner.status,
      coursesAssigned: partner.specializations || [],
      pointOfContact: partner.bio || '',
      contactNumber: partner.experience || '',
      contactDesignation: partner.certifications?.[0] || '',
      createdAt: partner.createdAt,
      updatedAt: partner.updatedAt,
    };

    return res.status(201).json(transformedPartner);
  } catch (error) {
    console.error('Error creating partner:', error);
    return res.status(500).json({ 
      error: 'Failed to create partner',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// Update partner
export const updatePartner = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      partnerName, 
      coursesAssigned, 
      pointOfContact, 
      contactNumber, 
      contactDesignation,
      status 
    }: Partial<PartnerData> & { status?: UserStatus } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Partner ID is required' });
    }

    // Check if partner exists
    const existingPartner = await prisma.user.findFirst({
      where: { 
        id,
        role: 'TRAINER',
        partnerOrganization: {
          not: null
        }
      }
    });

    if (!existingPartner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Update partner (no email validation needed since partners aren't user accounts)
    const partner = await prisma.user.update({
      where: { id: existingPartner.id },
      data: {
        ...(partnerName && { name: partnerName, partnerOrganization: partnerName }),
        ...(status && { status }),
        ...(pointOfContact !== undefined && { bio: pointOfContact }),
        ...(contactNumber !== undefined && { experience: contactNumber }),
        ...(coursesAssigned !== undefined && { specializations: coursesAssigned }),
        ...(contactDesignation !== undefined && { certifications: contactDesignation ? [contactDesignation] : [] }),
      },
      select: {
        id: true,
        name: true,
        status: true,
        partnerOrganization: true,
        bio: true,
        experience: true,
        specializations: true,
        certifications: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Transform data to match frontend expectations (no email/login fields)
    const transformedPartner = {
      id: partner.id,
      partnerName: partner.partnerOrganization || partner.name,
      status: partner.status,
      coursesAssigned: partner.specializations || [],
      pointOfContact: partner.bio || '',
      contactNumber: partner.experience || '',
      contactDesignation: partner.certifications?.[0] || '',
      createdAt: partner.createdAt,
      updatedAt: partner.updatedAt,
    };

    return res.json(transformedPartner);
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
    const existingPartner = await prisma.user.findFirst({
      where: { 
        id,
        role: 'TRAINER',
        partnerOrganization: {
          not: null
        }
      }
    });

    if (!existingPartner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Soft delete by setting status to INACTIVE
    await prisma.user.update({
      where: { id: existingPartner.id },
      data: {
        status: 'INACTIVE',
        updatedAt: new Date(),
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
      prisma.user.count({
        where: { 
          role: 'TRAINER',
          partnerOrganization: { not: null },
          status: { not: 'INACTIVE' }
        }
      }),
      prisma.user.count({
        where: { 
          role: 'TRAINER',
          partnerOrganization: { not: null },
          status: 'ACTIVE'
        }
      }),
      prisma.user.count({
        where: { 
          role: 'TRAINER',
          partnerOrganization: { not: null },
          status: 'PENDING'
        }
      }),
      prisma.user.count({
        where: { 
          role: 'TRAINER',
          partnerOrganization: { not: null },
          status: 'INACTIVE'
        }
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
