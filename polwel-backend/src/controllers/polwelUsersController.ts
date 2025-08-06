import { Response } from 'express';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// Get all POLWEL users with pagination and filtering
export const getPolwelUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      role: UserRole.POLWEL
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = status as UserStatus;
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          lastLogin: true,
          mfaEnabled: true,
          department: true,
          permissionLevel: true,
          createdAt: true,
          updatedAt: true
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    return res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get POLWEL users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get POLWEL user by ID
export const getPolwelUserById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: id,
        role: UserRole.POLWEL
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        lastLogin: true,
        mfaEnabled: true,
        department: true,
        permissionLevel: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'POLWEL user not found'
      });
    }

    return res.json(user);
  } catch (error) {
    console.error('Get POLWEL user by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create new POLWEL user
export const createPolwelUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      email,
      status = UserStatus.ACTIVE,
      department,
      permissionLevel
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
        message: 'User with this email already exists'
      });
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: UserRole.POLWEL,
        status,
        department: department || null,
        permissionLevel: permissionLevel || null,
        ...(req.user?.userId && { createdBy: req.user.userId })
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        department: true,
        permissionLevel: true,
        createdAt: true
      }
    });

    return res.status(201).json({
      user,
      tempPassword
    });
  } catch (error) {
    console.error('Create POLWEL user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update POLWEL user
export const updatePolwelUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, status, department, permissionLevel } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user exists and is POLWEL
    const existingUser = await prisma.user.findFirst({
      where: {
        id: id,
        role: UserRole.POLWEL
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'POLWEL user not found'
      });
    }

    // Check for email conflicts if email is being updated
    if (email && email !== existingUser.email) {
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

    const user = await prisma.user.update({
      where: { id: id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(status && { status }),
        ...(department !== undefined && { department }),
        ...(permissionLevel !== undefined && { permissionLevel })
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        department: true,
        permissionLevel: true,
        updatedAt: true
      }
    });

    return res.json(user);
  } catch (error) {
    console.error('Update POLWEL user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete POLWEL user (soft delete)
export const deletePolwelUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user exists and is POLWEL
    const existingUser = await prisma.user.findFirst({
      where: {
        id: id,
        role: UserRole.POLWEL
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'POLWEL user not found'
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
      message: 'POLWEL user deleted successfully'
    });
  } catch (error) {
    console.error('Delete POLWEL user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Reset POLWEL user password
export const resetPolwelUserPassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user exists and is POLWEL
    const existingUser = await prisma.user.findFirst({
      where: {
        id: id,
        role: UserRole.POLWEL
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'POLWEL user not found'
      });
    }

    // Generate new temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    await prisma.user.update({
      where: { id: id },
      data: {
        password: hashedPassword,
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    });

    return res.json({
      success: true,
      message: 'Password reset successfully',
      tempPassword
    });
  } catch (error) {
    console.error('Reset POLWEL user password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Toggle MFA for POLWEL user
export const togglePolwelUserMfa = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user exists and is POLWEL
    const existingUser = await prisma.user.findFirst({
      where: {
        id: id,
        role: UserRole.POLWEL
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'POLWEL user not found'
      });
    }

    const user = await prisma.user.update({
      where: { id: id },
      data: {
        mfaEnabled: enabled,
        mfaSecret: enabled ? crypto.randomBytes(32).toString('hex') : null
      },
      select: {
        id: true,
        name: true,
        email: true,
        mfaEnabled: true
      }
    });

    return res.json({
      success: true,
      message: `MFA ${enabled ? 'enabled' : 'disabled'} successfully`,
      user
    });
  } catch (error) {
    console.error('Toggle POLWEL user MFA error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
