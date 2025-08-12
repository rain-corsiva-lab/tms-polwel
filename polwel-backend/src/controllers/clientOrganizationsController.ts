import { Response } from 'express';
import { PrismaClient, UserStatus } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// Get all client organizations with pagination and filtering
export const getClientOrganizations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search, status, industry } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { displayName: { contains: search as string, mode: 'insensitive' } },
        { industry: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = status as UserStatus;
    }

    if (industry) {
      where.industry = { contains: industry as string, mode: 'insensitive' };
    }

    // Get organizations with pagination
    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        include: {
          _count: {
            select: {
              users: true,
              bookings: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.organization.count({ where })
    ]);

    return res.json({
      organizations: organizations.map(org => ({
        id: org.id,
        name: org.name,
        displayName: org.displayName,
        industry: org.industry,
        status: org.status,
        address: org.address,
        contactEmail: org.contactEmail,
        contactPhone: org.contactPhone,
        buNumber: org.buNumber,
        divisionAddress: org.divisionAddress,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
        stats: {
          totalUsers: org._count.users,
          totalBookings: org._count.bookings
        }
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get client organizations error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get client organization by ID
export const getClientOrganizationById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required'
      });
    }

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            users: true,
            bookings: true
          }
        }
      }
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    return res.json({
      ...organization,
      stats: {
        totalUsers: organization._count.users,
        totalBookings: organization._count.bookings
      }
    });
  } catch (error) {
    console.error('Get client organization by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create new client organization
export const createClientOrganization = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      displayName,
      industry,
      status = UserStatus.ACTIVE,
      address,
      contactEmail,
      contactPhone,
      buNumber,
      divisionAddress
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Organization name is required'
      });
    }

    // Check if organization already exists
    const existingOrganization = await prisma.organization.findFirst({
      where: { 
        OR: [
          { name: name },
          { displayName: displayName || name }
        ]
      }
    });

    if (existingOrganization) {
      return res.status(409).json({
        success: false,
        message: 'Organization with this name already exists'
      });
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        displayName: displayName || name,
        industry: industry || null,
        status,
        address: address || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        buNumber: buNumber || null,
        divisionAddress: divisionAddress || null
      }
    });

    return res.status(201).json(organization);
  } catch (error) {
    console.error('Create client organization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update client organization
export const updateClientOrganization = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      displayName,
      industry,
      status,
      address,
      contactEmail,
      contactPhone,
      buNumber,
      divisionAddress
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required'
      });
    }

    // Check if organization exists
    const existingOrganization = await prisma.organization.findUnique({
      where: { id }
    });

    if (!existingOrganization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(displayName !== undefined && { displayName }),
        ...(industry !== undefined && { industry }),
        ...(status && { status }),
        ...(address !== undefined && { address }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(buNumber !== undefined && { buNumber }),
        ...(divisionAddress !== undefined && { divisionAddress })
      }
    });

    return res.json(organization);
  } catch (error) {
    console.error('Update client organization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete client organization (soft delete)
export const deleteClientOrganization = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required'
      });
    }

    // Check if organization exists
    const existingOrganization = await prisma.organization.findUnique({
      where: { id }
    });

    if (!existingOrganization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Soft delete by setting status to INACTIVE
    await prisma.organization.update({
      where: { id },
      data: {
        status: UserStatus.INACTIVE
      }
    });

    return res.json({
      success: true,
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    console.error('Delete client organization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get organization statistics
export const getOrganizationStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      totalBookings
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({
        where: { status: UserStatus.ACTIVE }
      }),
      prisma.user.count({
        where: { 
          role: 'TRAINING_COORDINATOR',
          organizationId: { not: null }
        }
      }),
      prisma.booking.count()
    ]);

    return res.json({
      totalOrganizations,
      activeOrganizations,
      inactiveOrganizations: totalOrganizations - activeOrganizations,
      totalUsers,
      totalBookings
    });
  } catch (error) {
    console.error('Get organization stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all industries
export const getIndustries = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizations = await prisma.organization.findMany({
      select: {
        industry: true
      },
      where: {
        industry: { not: null }
      }
    });

    // Get unique industries
    const industries = [...new Set(organizations.map(org => org.industry).filter(Boolean))];

    return res.json({
      industries: industries.sort()
    });
  } catch (error) {
    console.error('Get industries error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
