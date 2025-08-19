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
      contactPerson,
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
        ...(contactPerson !== undefined && { contactPerson }),
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

// ============ TRAINING COORDINATORS MANAGEMENT ============

// Get training coordinators for an organization
export const getOrganizationCoordinators = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { page = 1, limit = 10, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required'
      });
    }

    // Build where clause
    const where: any = {
      organizationId,
      role: 'TRAINING_COORDINATOR',
      status: {
        not: 'INACTIVE'
      }
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { department: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Get coordinators with pagination
    const [coordinators, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          status: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              bookingsCreated: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    const formattedCoordinators = coordinators.map(coordinator => ({
      id: coordinator.id,
      name: coordinator.name,
      email: coordinator.email,
      department: coordinator.department || 'N/A',
      status: coordinator.status,
      schedulesCount: coordinator._count.bookingsCreated,
      lastActive: coordinator.lastLogin 
        ? new Date(coordinator.lastLogin).toISOString()
        : 'Never',
      createdAt: coordinator.createdAt,
      updatedAt: coordinator.updatedAt
    }));

    return res.json({
      coordinators: formattedCoordinators,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get organization coordinators error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create training coordinator for an organization
export const createOrganizationCoordinator = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { name, email, department, password } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required'
      });
    }

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    const coordinator = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'TRAINING_COORDINATOR',
        organizationId,
        department: department || null,
        status: 'ACTIVE',
        emailVerified: true,
        createdBy: req.user?.userId || null
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return res.status(201).json({
      ...coordinator,
      schedulesCount: 0,
      lastActive: 'Never'
    });
  } catch (error) {
    console.error('Create organization coordinator error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update training coordinator
export const updateOrganizationCoordinator = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { organizationId, coordinatorId } = req.params;
    const { name, email, department, status } = req.body;

    if (!organizationId || !coordinatorId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID and Coordinator ID are required'
      });
    }

    // Check if coordinator exists and belongs to organization
    const existingCoordinator = await prisma.user.findFirst({
      where: {
        id: coordinatorId,
        organizationId,
        role: 'TRAINING_COORDINATOR'
      }
    });

    if (!existingCoordinator) {
      return res.status(404).json({
        success: false,
        message: 'Coordinator not found or does not belong to this organization'
      });
    }

    // If email is being changed, check if new email already exists
    if (email && email !== existingCoordinator.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });

      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
    }

    const updatedCoordinator = await prisma.user.update({
      where: { id: coordinatorId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(department !== undefined && { department }),
        ...(status && { status })
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        status: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            bookingsCreated: true
          }
        }
      }
    });

    return res.json({
      ...updatedCoordinator,
      schedulesCount: updatedCoordinator._count.bookingsCreated,
      lastActive: updatedCoordinator.lastLogin 
        ? new Date(updatedCoordinator.lastLogin).toISOString()
        : 'Never'
    });
  } catch (error) {
    console.error('Update organization coordinator error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete training coordinator (soft delete)
export const deleteOrganizationCoordinator = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { organizationId, coordinatorId } = req.params;

    if (!organizationId || !coordinatorId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID and Coordinator ID are required'
      });
    }

    // Check if coordinator exists and belongs to organization
    const existingCoordinator = await prisma.user.findFirst({
      where: {
        id: coordinatorId,
        organizationId,
        role: 'TRAINING_COORDINATOR'
      }
    });

    if (!existingCoordinator) {
      return res.status(404).json({
        success: false,
        message: 'Coordinator not found or does not belong to this organization'
      });
    }

    // Soft delete by setting status to INACTIVE
    await prisma.user.update({
      where: { id: coordinatorId },
      data: {
        status: 'INACTIVE'
      }
    });

    return res.json({
      success: true,
      message: 'Coordinator deleted successfully'
    });
  } catch (error) {
    console.error('Delete organization coordinator error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// ============ LEARNERS MANAGEMENT ============

// Get learners for an organization
export const getOrganizationLearners = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required'
      });
    }

    // Build where clause for learners
    const where: any = {
      organizationId,
      role: 'LEARNER'
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { department: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = status as UserStatus;
    }

    // Get learners with pagination
    const [learners, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              bookings: {
                where: {
                  status: {
                    in: ['CONFIRMED', 'COMPLETED']
                  }
                }
              }
            }
          },
          bookings: {
            where: {
              status: 'COMPLETED'
            },
            select: {
              id: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    const formattedLearners = learners.map(learner => ({
      id: learner.id,
      name: learner.name,
      email: learner.email,
      department: learner.department || 'N/A',
      status: learner.status,
      enrolledCourses: learner._count.bookings,
      completedCourses: learner.bookings.length,
      createdAt: learner.createdAt,
      updatedAt: learner.updatedAt
    }));

    return res.json({
      learners: formattedLearners,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get organization learners error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
