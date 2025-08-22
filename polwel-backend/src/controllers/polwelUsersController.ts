import { Response } from 'express';
import { UserRole, UserStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth';
import AuditService from '../services/auditService';
import EmailService from '../services/emailService';
import { UserValidationService } from '../utils/userValidation';



// Permission name mapping - converts frontend permission names to database permission names
const permissionNameMapping: Record<string, string> = {
  // User Management - POLWEL
  'user-management-polwel:view': 'users.view',
  'user-management-polwel:create': 'users.create', 
  'user-management-polwel:edit': 'users.edit',
  'user-management-polwel:update': 'users.edit',
  'user-management-polwel:delete': 'users.delete',
  
  // User Management - Trainers
  'user-management-trainers:view': 'trainers.view',
  'user-management-trainers:create': 'trainers.create',
  'user-management-trainers:edit': 'trainers.edit',
  'user-management-trainers:update': 'trainers.edit',
  'user-management-trainers:delete': 'trainers.delete',
  
  // User Management - Client Organizations
  'user-management-client-orgs:view': 'clients.view',
  'user-management-client-orgs:create': 'clients.create',
  'user-management-client-orgs:edit': 'clients.edit',
  'user-management-client-orgs:update': 'clients.edit',
  'user-management-client-orgs:delete': 'clients.delete',
  
  // Course Management
  'course-management:view': 'courses.view',
  'course-management:create': 'courses.create',
  'course-management:edit': 'courses.edit',
  'course-management:update': 'courses.edit', 
  'course-management:delete': 'courses.delete',
  
  // Course & Venue Setup
  'course-venue-setup:view': 'venues.view',
  'course-venue-setup:create': 'venues.create',
  'course-venue-setup:edit': 'venues.edit',
  'course-venue-setup:update': 'venues.edit',
  'course-venue-setup:delete': 'venues.delete',
  
  // Venue Management
  'venue-management:view': 'venues.view',
  'venue-management:create': 'venues.create',
  'venue-management:edit': 'venues.edit',
  'venue-management:update': 'venues.edit',
  'venue-management:delete': 'venues.delete',
  
  // Booking Management
  'booking-management:view': 'bookings.view',
  'booking-management:create': 'bookings.create',
  'booking-management:edit': 'bookings.edit',
  'booking-management:update': 'bookings.edit',
  'booking-management:delete': 'bookings.delete',
  
  // Training Calendar
  'training-calendar:view': 'calendar.view',
  'training-calendar:create': 'calendar.create',
  'training-calendar:edit': 'calendar.edit',
  'training-calendar:update': 'calendar.edit',
  'training-calendar:delete': 'calendar.delete',
  
  // Reports & Analytics
  'reports-analytics:view': 'reports.view',
  'reports-analytics:create': 'reports.create',
  'reports-analytics:edit': 'reports.edit',
  'reports-analytics:update': 'reports.edit',
  'reports-analytics:delete': 'reports.delete'
};

// Helper function to map frontend permission names to database permission names
const mapPermissionNames = (frontendPermissions: string[]): string[] => {
  return frontendPermissions.map(permission => {
    const mappedPermission = permissionNameMapping[permission];
    if (mappedPermission) {
      console.log(`Mapped permission: ${permission} -> ${mappedPermission}`);
      return mappedPermission;
    } else {
      console.log(`No mapping found for permission: ${permission}, using as-is`);
      return permission;
    }
  });
};

// Get available permissions
export const getAvailablePermissions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [
        { module: 'asc' },
        { action: 'asc' }
      ]
    });

    // Group permissions by module for easier frontend consumption
    const groupedPermissions = permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module]!.push(permission);
      return acc;
    }, {} as Record<string, typeof permissions>);

    return res.json({
      permissions,
      groupedPermissions
    });
  } catch (error) {
    console.error('Get available permissions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user audit trail
export const getUserAuditTrail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = '50' } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user exists and is POLWEL
    const user = await prisma.user.findFirst({
      where: {
        id: id,
        role: UserRole.POLWEL
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'POLWEL user not found'
      });
    }

    const auditTrail = await AuditService.getUserAuditTrail(id, parseInt(limit as string));

    // Transform audit trail for frontend
    const transformedAuditTrail = auditTrail.map(entry => ({
      id: entry.id,
      timestamp: entry.timestamp,
      action: entry.action,
      actionType: entry.actionType.toLowerCase(),
      performedBy: entry.performedBy || entry.user?.name || 'System',
      details: entry.details || 'No details provided',
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent
    }));

    return res.json(transformedAuditTrail);
  } catch (error) {
    console.error('Get user audit trail error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Send password reset link
export const sendPasswordResetLink = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user exists and is POLWEL
    const user = await prisma.user.findFirst({
      where: {
        id: id,
        role: UserRole.POLWEL
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'POLWEL user not found'
      });
    }

    // Generate reset token
    const resetToken = EmailService.generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now

    // Save reset token to database
    await prisma.user.update({
      where: { id: id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    // Send reset email
    if (user.email) {
      const emailSent = await EmailService.sendPasswordResetEmail(
        user.email,
        user.name,
        resetToken
      );

      if (emailSent) {
        // Log password reset request
        await AuditService.logPasswordChange(
          id,
          req.user?.userId || 'system',
          'Password reset link sent via email',
          req
        );

        return res.json({
          success: true,
          message: 'Password reset link has been sent to the user\'s email address'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to send password reset email'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'User has no email address - cannot send reset link'
      });
    }
  } catch (error) {
    console.error('Send password reset link error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get detailed user information
export const getPolwelUserDetails = async (req: AuthenticatedRequest, res: Response) => {
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
        emailVerified: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        passwordExpiry: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        permissions: {
          select: {
            id: true,
            permissionName: true,
            granted: true,
            createdAt: true
          }
        },
        createdByUser: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'POLWEL user not found'
      });
    }

    // Get recent audit trail (last 10 entries)
    const recentAuditTrail = await AuditService.getUserAuditTrail(id, 10);

    // Group permissions by module (extract module from permission name)
    const permissionsByModule = user.permissions.reduce((acc, userPerm) => {
      const permissionName = userPerm.permissionName;
      // Extract module from permission name (e.g., "users.view" -> "users")
      const parts = permissionName.split('.');
      const module = parts[0] || 'unknown';
      const action = parts[1] || 'unknown';
      
      if (!acc[module]) {
        acc[module] = [];
      }
      acc[module].push(action);
      return acc;
    }, {} as Record<string, string[]>);

    return res.json({
      ...user,
      permissionsByModule,
      recentActivity: recentAuditTrail.slice(0, 5).map(entry => ({
        action: entry.action,
        timestamp: entry.timestamp,
        details: entry.details
      })),
      securityInfo: {
        passwordExpired: user.passwordExpiry ? new Date() > user.passwordExpiry : false,
        accountLocked: user.lockedUntil ? new Date() < user.lockedUntil : false,
        failedLoginAttempts: user.failedLoginAttempts,
        mfaEnabled: user.mfaEnabled,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Get POLWEL user details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all POLWEL users with pagination and filtering
export const getPolwelUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      role: UserRole.POLWEL,
      status: { not: UserStatus.INACTIVE } // Exclude soft-deleted users
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (status) {
      // If status is explicitly specified, override the default filter
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
          createdAt: true,
          updatedAt: true,
          permissions: {
            select: {
              id: true,
              permissionName: true,
              granted: true
            }
          }
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
        createdAt: true,
        updatedAt: true,
        permissions: {
          select: {
            id: true,
            permissionName: true,
            granted: true
          }
        }
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
      permissions = []
    } = req.body;

    // Prepare data for validation (simple sanitization)
    const userData = {
      name: name?.trim(),
      email: email?.trim().toLowerCase()
    };

    // Validate user data
    const validationErrors = await UserValidationService.validatePolwelUserData(userData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Check for email conflicts
    const emailConflict = await UserValidationService.checkEmailConflict(userData.email);
    if (emailConflict.isActiveConflict) {
      const conflictMessage = UserValidationService.generateEmailConflictMessage(
        emailConflict, 
        userData.email
      );
      return res.status(409).json({
        success: false,
        message: conflictMessage
      });
    }

    // Map and process permissions for creation
    console.log('Permissions requested for creation:', permissions);
    
    const mappedPermissions = mapPermissionNames(permissions);
    console.log('Mapped permissions for creation:', mappedPermissions);
    
    // Look up the actual permission records from database
    const validPermissions = await prisma.permission.findMany({
      where: {
        name: { in: mappedPermissions }
      }
    });
    
    console.log('Valid permissions found for creation:', validPermissions.map(p => ({ id: p.id, name: p.name })));
    // if (validPermissions.length !== permissions.length) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Invalid permissions provided'
    //   });
    // }

    // Generate temporary password and setup token
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    const setupToken = crypto.randomBytes(32).toString('hex');

    // Create user with permissions in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user with PENDING status
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: UserRole.POLWEL,
          status: UserStatus.PENDING, // Set as PENDING instead of ACTIVE
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
          createdAt: true
        }
      });

      // Create user permissions with human-readable names
      console.log('Creating permissions for user:', user.id, 'Count:', mappedPermissions.length);
      if (mappedPermissions.length > 0) {
        // Store permissions with human-readable names directly
        for (const permissionName of mappedPermissions) {
          await tx.userPermission.create({
            data: {
              userId: user.id,
              permissionName: permissionName, // Store human-readable name directly
              granted: true
            }
          });
        }
        console.log('Permissions created successfully with names:', mappedPermissions);
      } else {
        console.log('No valid permissions to create');
      }

      return { user, tempPassword, setupToken };
    });

    // Send setup completion email
    try {
      if (result.user.email) {
        const setupUrl = `${process.env.FRONTEND_URL}/onboarding/${setupToken}`;
        await EmailService.sendUserSetupEmail(result.user.email, result.user.name, setupUrl);
      }
    } catch (emailError) {
      console.error('Failed to send setup email:', emailError);
      // Don't fail the user creation if email fails
    }

    // Log user creation
    await AuditService.logUserCreation(
      result.user.id, 
      req.user?.userId || 'system', 
      `POLWEL user created with email ${email} - setup email sent`,
      req
    );

    return res.status(201).json({
      user: result.user,
      message: 'User created successfully. Setup email has been sent.',
      setupEmailSent: true
    });
  } catch (error) {
    console.error('Create POLWEL user error:', error);
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return res.status(409).json({
          success: false,
          message: 'A user with this email address already exists'
        });
      }
      
      if (error.message.includes('email')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address provided'
        });
      }
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to create user. Please try again.'
    });
  }
};

// Update POLWEL user
export const updatePolwelUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, permissions = [] } = req.body;

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

    // Process permissions if provided  
    let mappedPermissions: string[] = [];
    if (Array.isArray(permissions) && permissions.length > 0) {
      console.log('Permissions requested for update:', permissions);
      
      // Map frontend permission names to database permission names
      mappedPermissions = mapPermissionNames(permissions);
      console.log('Mapped permissions for update:', mappedPermissions);
      
      // Validate permission name format
      mappedPermissions = mappedPermissions.filter(permName => {
        const isValid = permName.includes('.');
        if (!isValid) {
          console.log(`Invalid permission format: ${permName}`);
        }
        return isValid;
      });
      
      console.log('Valid permission names for update:', mappedPermissions);
    }

    // Update user and permissions in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user
      const user = await tx.user.update({
        where: { id: id },
        data: {
          ...(name && { name }),
          ...(email && { email })
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          updatedAt: true
        }
      });

      // Update permissions - ALWAYS process if permissions array is provided, even if empty
      console.log('Processing permission update for user:', id);
      console.log('Permissions provided:', permissions);
      console.log('Mapped permission names found:', mappedPermissions.length);
      
      if (Array.isArray(permissions)) {
        // Delete existing permissions first
        const deletedCount = await tx.userPermission.deleteMany({
          where: { userId: id }
        });
        console.log('Deleted existing permissions:', deletedCount.count);

        // Only create new permissions if we have valid ones
        if (mappedPermissions.length > 0) {
          // Store permissions with human-readable names directly
          for (const permissionName of mappedPermissions) {
            await tx.userPermission.create({
              data: {
                userId: id,
                permissionName: permissionName, // Store human-readable name directly
                granted: true
              }
            });
          }
          console.log('New permissions created successfully with names:', mappedPermissions);
        } else {
          console.log('No valid permissions to create - permissions cleared');
        }
      } else {
        console.log('Permissions not provided - skipping permission changes');
      }

      return user;
    });

    // Log user update
    await AuditService.logUserUpdate(
      id,
      req.user?.userId || 'system',
      {}, // old values - could be enhanced to capture actual old values
      result,
      `POLWEL user updated: ${result.name} (${result.email})`,
      req
    );

    if (mappedPermissions.length > 0) {
      await AuditService.logPermissionChange(
        id,
        req.user?.userId || 'system',
        `Permissions updated for POLWEL user: ${result.name}`,
        req
      );
    }

    return res.json(result);
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

    if (!existingUser || !existingUser.email) {
      return res.status(404).json({
        success: false,
        message: 'POLWEL user not found or already deleted'
      });
    }

    // Soft delete by moving email to old_email and setting email to null
    const emailBeforeDeletion = existingUser.email;
    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: {
        old_email: emailBeforeDeletion, // Store original email
        email: null, // Clear email to allow reuse
        status: UserStatus.INACTIVE
      },
      select: {
        id: true,
        name: true,
        old_email: true,
        status: true
      }
    });

    // Log the deletion
    if (emailBeforeDeletion) {
      await AuditService.logUserUpdate(
        req.user?.userId || 'system',
        existingUser.id,
        { 
          email: emailBeforeDeletion,
          status: existingUser.status 
        },
        { 
          old_email: emailBeforeDeletion,
          email: null,
          status: UserStatus.INACTIVE 
        },
        'POLWEL user soft deleted - email moved to old_email',
        req
      );
    } else {
      await AuditService.logUserUpdate(
        req.user?.userId || 'system',
        existingUser.id,
        { 
          status: existingUser.status 
        },
        { 
          status: UserStatus.INACTIVE 
        },
        'POLWEL user soft deleted - already had no email',
        req
      );
    }

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

// Resend setup email to POLWEL user
export const resendPolwelUserSetup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user exists and is POLWEL with PENDING status
    const existingUser = await prisma.user.findFirst({
      where: {
        id: id,
        role: UserRole.POLWEL,
        status: UserStatus.PENDING
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'POLWEL user not found or already activated'
      });
    }

    // Generate new setup token with 24-hour expiry
    const setupToken = EmailService.generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day

    // Update user with new setup token
    await prisma.user.update({
      where: { id: id },
      data: {
        resetToken: setupToken,
        resetTokenExpiry
      }
    });

    // Send new setup email
    if (existingUser.email) {
      const setupUrl = `${process.env.FRONTEND_URL}/onboarding/${setupToken}`;
      const emailSent = await EmailService.sendUserSetupEmail(
        existingUser.email,
        existingUser.name,
        setupUrl
      );

      if (!emailSent) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send setup email'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'User has no email address - cannot send setup email'
      });
    }

    // Log the action
    await AuditService.logUserUpdate(
      req.user?.userId || 'system',
      existingUser.id,
      {},
      { setupTokenResent: true },
      'Setup email resent to user',
      req
    );

    return res.json({
      success: true,
      message: 'Setup email sent successfully'
    });
  } catch (error) {
    console.error('Resend setup email error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
