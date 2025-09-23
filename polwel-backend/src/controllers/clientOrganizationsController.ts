import { Response } from 'express';
import { UserStatus } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import EmailService from '../services/emailService';



// Get all client organisations with pagination and filtering
export const getClientOrganizations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Parse and sanitize query parameters
    const rawPage = Number(req.query.page || 1);
    const rawLimit = Number(req.query.limit || 10);
    // Cap values to prevent heavy queries
    const pageNum = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const limitNum = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(1000, Math.floor(rawLimit)) : 10;
    const skip = (pageNum - 1) * limitNum;

    const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    // Limit search length to avoid excessively long patterns
    const search = rawSearch && rawSearch.length > 0 ? rawSearch.substring(0, 500) : undefined;

  // industry field removed from schema

  const rawStatus = typeof req.query.status === 'string' ? req.query.status.trim() : undefined;
  const rawOrgType = typeof req.query.organizationType === 'string' ? req.query.organizationType.trim() : undefined;

    // Build where clause defensively
    const where: any = {};
    const orClauses: any[] = [];

    if (search) {
      orClauses.push({ name: { contains: search } });
    }

    if (orClauses.length > 0) {
      where.OR = orClauses;
    }

    if (rawStatus) {
      // Only set status if it matches allowed enum values
      if (['ACTIVE', 'INACTIVE', 'PENDING', 'LOCKED'].includes(rawStatus)) {
        where.status = rawStatus as UserStatus;
      }
    }
    if (rawOrgType) {
      if (['POLWEL', 'SPF', 'PUBLIC_SECTOR', 'PRIVATE_SECTOR'].includes(rawOrgType)) {
        where.organizationType = rawOrgType as any;
      }
    }

  // industry removed - no extra filters

    // Get organisations with pagination
    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        select: {
          id: true,
          name: true,
          status: true,
          address: true,
          contactEmail: true,
          contactPhone: true,
          buNumber: true,
          organizationType: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              users: true,
              bookings: true
            }
          },
          users: {
            select: { role: true },
          },
        },
  skip,
  take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.organization.count({ where })
    ]);

  return res.json({
      organizations: organizations.map(org => ({
        id: org.id,
        name: org.name,
        status: org.status,
        address: org.address,
        contactEmail: org.contactEmail,
        contactPhone: org.contactPhone,
        buNumber: org.buNumber,
        organizationType: org.organizationType,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
        coordinatorsCount: org.users.filter(u => u.role === 'TRAINING_COORDINATOR').length,
        learnersCount: org.users.filter(u => u.role === 'LEARNER').length,
        stats: {
          totalUsers: org._count.users,
          totalBookings: org._count.bookings
        }
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
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
      status = UserStatus.ACTIVE,
      address,
      contactEmail,
      contactPhone,
      buNumber,
      organizationType = 'POLWEL'
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
          { name: name }
        ]
      }
    });

    if (existingOrganization) {
      return res.status(409).json({
        success: false,
        message: 'Organization with this name already exists'
      });
    }

    // Validate organizationType
    const allowedTypes = ['POLWEL','SPF','PUBLIC_SECTOR','PRIVATE_SECTOR'];
    const orgType = allowedTypes.includes(organizationType) ? organizationType : 'POLWEL';

    const organization = await prisma.organization.create({
      data: {
        name,
        status,
        address: address || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        buNumber: buNumber || null,
        organizationType: orgType as any,
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
      industry,
      status,
      address,
      contactEmail,
      contactPhone,
      contactPerson,
      buNumber,
      organizationType
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
        
        ...(industry !== undefined && { industry }),
        ...(status && { status }),
        ...(address !== undefined && { address }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(contactPerson !== undefined && { contactPerson }),
        ...(buNumber !== undefined && { buNumber }),
        ...(organizationType !== undefined && { organizationType })
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
  // industry field removed from schema; return empty list
  return res.json({ industries: [] });
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
        { name: { contains: search as string } },
        { email: { contains: search as string } },
        { designation: { contains: search as string } }
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
          designation: true,
          status: true,
          isPrimaryCoordinator: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true
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
  designation: coordinator.designation || 'N/A',
  status: coordinator.status,
      isPrimaryCoordinator: coordinator.isPrimaryCoordinator,
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
  const { name, email, designation, password, isPrimary } = req.body;

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
        message: `Email ${email} is already registered as an active POLWEL User/trainer/training coordinator`
      });
    }

    // Generate temporary password and setup token
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    const setupToken = crypto.randomBytes(32).toString('hex');

    // Create coordinator, optionally setting as primary and clearing existing primary in a transaction
    const coordinator = await prisma.$transaction(async (tx) => {
      if (isPrimary === true) {
        await tx.user.updateMany({
          where: { organizationId, role: 'TRAINING_COORDINATOR', isPrimaryCoordinator: true },
          data: { isPrimaryCoordinator: false }
        });
      }

      const created = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'TRAINING_COORDINATOR',
          organizationId,
          designation: designation || null,
          status: 'PENDING',
          resetToken: setupToken,
          resetTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
          emailVerified: false,
          createdBy: req.user?.userId || null,
          isPrimaryCoordinator: isPrimary === true
        },
        select: {
          id: true,
          name: true,
          email: true,
          designation: true,
          status: true,
          isPrimaryCoordinator: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return created;
    });

    // Send setup completion email
    try {
      if (coordinator.email) {
        const setupUrl = `${process.env.FRONTEND_URL}/onboarding/${setupToken}`;
        await EmailService.sendCoordinatorSetupEmail(coordinator.email, coordinator.name, setupUrl, organization.name);
      }
    } catch (emailError) {
      console.error('Failed to send coordinator setup email:', emailError);
      // Don't fail the coordinator creation if email fails
    }

    return res.status(201).json({
      ...coordinator,
      tempPassword,
      setupToken,
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
  const { name, email, designation, status, isPrimary } = req.body;

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
          message: `Email ${email} is already registered as an active POLWEL User/trainer/training coordinator`
        });
      }
    }

    const updatedCoordinator = await prisma.$transaction(async (tx) => {
      if (isPrimary === true) {
        await tx.user.updateMany({
          where: { organizationId, role: 'TRAINING_COORDINATOR', NOT: { id: coordinatorId } },
          data: { isPrimaryCoordinator: false }
        });
      }

      const updated = await tx.user.update({
        where: { id: coordinatorId },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(designation !== undefined && { designation }),
          ...(status && { status }),
          ...(isPrimary !== undefined && { isPrimaryCoordinator: !!isPrimary })
        },
        select: {
          id: true,
          name: true,
          email: true,
          designation: true,
          status: true,
          isPrimaryCoordinator: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      return updated;
    });

    return res.json({
      ...updatedCoordinator,
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
        { name: { contains: search as string } },
        { email: { contains: search as string } },
        { department: { contains: search as string } }
      ];
    }

    if (status) {
      where.status = status as UserStatus;
    }

    // Get learners with pagination (simplified select)
    const [learners, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          designation: true,
          status: true,
          createdAt: true,
          updatedAt: true
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
      designation: learner.designation || 'N/A',
      status: learner.status,
      enrolledCourses: 0,
      completedCourses: 0,
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

// Resend setup email for training coordinator
export const resendCoordinatorSetup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { organizationId, coordinatorId } = req.params;

    if (!organizationId || !coordinatorId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID and Coordinator ID are required'
      });
    }

    // Find the coordinator and organization
    const [coordinator, organization] = await Promise.all([
      prisma.user.findFirst({
        where: {
          id: coordinatorId,
          organizationId: organizationId,
          role: 'TRAINING_COORDINATOR',
          status: 'PENDING'
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          resetToken: true
        }
      }),
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true }
      })
    ]);

    if (!coordinator) {
      return res.status(404).json({
        success: false,
        message: 'Coordinator not found or account already active'
      });
    }

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    if (!coordinator.email) {
      return res.status(400).json({
        success: false,
        message: 'Coordinator email not found'
      });
    }

    // Generate new setup token
    const setupToken = EmailService.generateResetToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update coordinator with new token
    await prisma.user.update({
      where: { id: coordinator.id },
      data: {
        resetToken: setupToken,
        resetTokenExpiry: expiresAt
      }
    });

    // Send setup email
    try {
      const setupUrl = `${process.env.FRONTEND_URL}/onboarding/${setupToken}`;
      await EmailService.sendCoordinatorSetupEmail(coordinator.email, coordinator.name, setupUrl, organization.name);
      
      console.log(`🔄 Coordinator setup email resent to: ${coordinator.email}`);
      
      return res.json({
        success: true,
        message: 'Setup email has been resent successfully',
        setupTokenResent: true
      });

    } catch (emailError) {
      console.error('Failed to resend coordinator setup email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send setup email. Please try again.'
      });
    }

  } catch (error) {
    console.error('Resend coordinator setup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
