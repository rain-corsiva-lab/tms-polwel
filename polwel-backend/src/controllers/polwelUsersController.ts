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
  // === Current frontend module keys ===
  'polwel-users:view': 'users.view',
  'polwel-users:create': 'users.create',
  'polwel-users:edit': 'users.edit',
  'polwel-users:update': 'users.edit',
  'polwel-users:delete': 'users.delete',

  'trainers-partners:view': 'trainers.view',
  'trainers-partners:create': 'trainers.create',
  'trainers-partners:edit': 'trainers.edit',
  'trainers-partners:update': 'trainers.edit',
  'trainers-partners:delete': 'trainers.delete',

  'client-organizations:view': 'clients.view',
  'client-organizations:create': 'clients.create',
  'client-organizations:edit': 'clients.edit',
  'client-organizations:update': 'clients.edit',
  'client-organizations:delete': 'clients.delete',

  'course:view': 'course-venue.view',
  'course:create': 'course-venue.create',
  'course:edit': 'course-venue.edit',
  'course:update': 'course-venue.edit',
  'course:delete': 'course-venue.delete',

  // New canonical combined Course & Venue module
  'course-venue:view': 'course-venue.view',
  'course-venue:create': 'course-venue.create',
  'course-venue:edit': 'course-venue.edit',
  'course-venue:update': 'course-venue.edit',
  'course-venue:delete': 'course-venue.delete',
  'course-venue.view': 'course-venue.view',
  'course-venue.create': 'course-venue.create',
  'course-venue.edit': 'course-venue.edit',
  'course-venue.delete': 'course-venue.delete',

  // Course-run actions: keep course-run as its own canonical namespace (including CRUD and approve)
  'course-run:view': 'course-run.view',
  'course-run:create': 'course-run.create',
  'course-run:edit': 'course-run.edit',
  'course-run:update': 'course-run.edit',
  'course-run:delete': 'course-run.delete',
  'course-run:approve': 'course-run.approve',
  'course-run.view': 'course-run.view',
  'course-run.create': 'course-run.create',
  'course-run.edit': 'course-run.edit',
  'course-run.update': 'course-run.edit',
  'course-run.delete': 'course-run.delete',
  'course-run.approve': 'course-run.approve',
  'course.run.view': 'course-run.view',
  'course.run.create': 'course-run.create',
  'course.run.edit': 'course-run.edit',
  'course.run.update': 'course-run.edit',
  'course.run.delete': 'course-run.delete',
  'course.run.approve': 'course-run.approve',

  'venue:view': 'venues.view',
  'venue:create': 'venues.create',
  'venue:edit': 'venues.edit',
  'venue:update': 'venues.edit',
  'venue:delete': 'venues.delete',

  'post-course-run:view': 'post-course-run.view',
  'post-course-run:create': 'post-course-run.create',
  'post-course-run:edit': 'post-course-run.edit',
  'post-course-run:update': 'post-course-run.edit',
  'post-course-run:delete': 'post-course-run.delete',

  'billing-reports:view': 'reports.view',
  'billing-reports:create': 'reports.create',
  'billing-reports:edit': 'reports.edit',
  'billing-reports:update': 'reports.edit',
  'billing-reports:delete': 'reports.delete',

  // Waiver module
  'waiver:view': 'waiver.view',
  'waiver:create': 'waiver.create',
  'waiver:edit': 'waiver.edit',
  'waiver:update': 'waiver.edit',
  'waiver:delete': 'waiver.delete',

  // Resource Library module
  'resource-library:view': 'resource-library.view',
  'resource-library:create': 'resource-library.create',
  'resource-library:edit': 'resource-library.edit',
  'resource-library:update': 'resource-library.edit',
  'resource-library:delete': 'resource-library.delete',

  // Optional calendar support (front may send legacy key)
  'calendar:view': 'calendar.view',
  'calendar:create': 'calendar.create',
  'calendar:edit': 'calendar.edit',
  'calendar:update': 'calendar.edit',
  'calendar:delete': 'calendar.delete',

  // === Legacy frontend keys for backward compatibility ===
  'user-management-polwel:view': 'users.view',
  'user-management-polwel:create': 'users.create',
  'user-management-polwel:edit': 'users.edit',
  'user-management-polwel:update': 'users.edit',
  'user-management-polwel:delete': 'users.delete',

  'user-management-trainers:view': 'trainers.view',
  'user-management-trainers:create': 'trainers.create',
  'user-management-trainers:edit': 'trainers.edit',
  'user-management-trainers:update': 'trainers.edit',
  'user-management-trainers:delete': 'trainers.delete',

  'user-management-client-orgs:view': 'clients.view',
  'user-management-client-orgs:create': 'clients.create',
  'user-management-client-orgs:edit': 'clients.edit',
  'user-management-client-orgs:update': 'clients.edit',
  'user-management-client-orgs:delete': 'clients.delete',

  'course-management:view': 'course-venue.view',
  'course-management:create': 'course-venue.create',
  'course-management:edit': 'course-venue.edit',
  'course-management:update': 'course-venue.edit',
  'course-management:delete': 'course-venue.delete',

  'course-runs-operations:view': 'course-run.view',
  'course-runs-operations:create': 'course-run.create',
  'course-runs-operations:edit': 'course-run.edit',
  'course-runs-operations:update': 'course-run.edit',
  'course-runs-operations:delete': 'course-run.delete',
  'course-runs-operations:approve': 'course-run.approve',

  'course-venue-setup:view': 'course-venue.view',
  'course-venue-setup:create': 'course-venue.create',
  'course-venue-setup:edit': 'course-venue.edit',
  'course-venue-setup:update': 'course-venue.edit',
  'course-venue-setup:delete': 'course-venue.delete',

  'venue-management:view': 'course-venue.view',
  'venue-management:create': 'course-venue.create',
  'venue-management:edit': 'course-venue.edit',
  'venue-management:update': 'course-venue.edit',
  'venue-management:delete': 'course-venue.delete',

  'booking-management:view': 'bookings.view',
  'booking-management:create': 'bookings.create',
  'booking-management:edit': 'bookings.edit',
  'booking-management:update': 'bookings.edit',
  'booking-management:delete': 'bookings.delete',

  'training-calendar:view': 'calendar.view',
  'training-calendar:create': 'calendar.create',
  'training-calendar:edit': 'calendar.edit',
  'training-calendar:update': 'calendar.edit',
  'training-calendar:delete': 'calendar.delete',

  'reports-analytics:view': 'reports.view',
  'reports-analytics:create': 'reports.create',
  'reports-analytics:edit': 'reports.edit',
  'reports-analytics:update': 'reports.edit',
  'reports-analytics:delete': 'reports.delete',

  'email-reporting-library:view': 'reports.view',
  'email-reporting-library:create': 'reports.create',
  'email-reporting-library:edit': 'reports.edit',
  'email-reporting-library:update': 'reports.edit',
  'email-reporting-library:delete': 'reports.delete',

  'finance-activity:view': 'bookings.view',
  'finance-activity:create': 'bookings.create',
  'finance-activity:edit': 'bookings.edit',
  'finance-activity:update': 'bookings.edit',
  'finance-activity:delete': 'bookings.delete'
};

// Helper function to map frontend permission names to database permission names
const mapPermissionNames = (frontendPermissions: string[]): string[] => {
  return frontendPermissions.map(permission => {
    // Direct mapping first
    const mappedPermission = permissionNameMapping[permission];
    if (mappedPermission) {
      console.log(`Mapped permission: ${permission} -> ${mappedPermission}`);
      return mappedPermission;
    }

    // Normalize common frontend formats into dot-style heuristically
    // IMPORTANT: Only replace colons with dots, NOT hyphens!
    // Hyphens are part of module names like "resource-library" and "post-course-run"
    const norm = String(permission).toLowerCase();
    const dot1 = norm.replace(/:/g, '.');
    // If it already looks dot-style, use it
    if (dot1.includes('.')) {
      console.log(`Normalized permission heuristic: ${permission} -> ${dot1}`);
      return dot1;
    }

    // Fallback: return original and allow caller to filter invalid ones
    console.log(`No mapping found for permission: ${permission}, returning raw`);
    return permission;
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

    // Find user by id (allow sending reset links to any role: POLWEL, TRAINER, TRAINING_COORDINATOR, etc.)
    const user = await prisma.user.findFirst({
      where: { id }
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

    // Check if user exists (allow any role: POLWEL, TRAINER, TRAINING_COORDINATOR)
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate reset token
    const resetToken = EmailService.generateResetToken();
    // Expire in 1 hour to match email copy and reduce window
    const resetTokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour from now

    // Save reset token to database
    await prisma.user.update({
      where: { id: id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

  // Build frontend reset URL (frontend route is /reset-password/:token)
  const frontend = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  const resetUrl = frontend ? `${frontend}/reset-password/${resetToken}` : resetToken;

    // Send reset email
    if (user.email) {
      const emailSent = await EmailService.sendPasswordResetEmail(
        user.email,
        user.name,
        resetUrl
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
      role: UserRole.POLWEL
    };

    if (search) {
      where.OR = [
  { name: { contains: search as string } },
  { email: { contains: search as string } }
      ];
    }

    if (status) {
      // If status is explicitly specified, filter by that status
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
        ...(skip !== undefined ? { skip } : {}),
        ...(take !== undefined ? { take } : {}),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    return res.json({
      users,
      pagination: {
        page: exportAll ? 1 : pageNum,
        limit: exportAll ? total : limitNum,
        total,
        totalPages: exportAll ? 1 : Math.ceil(total / limitNum)
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
  // Capture requested email early so it's available in catch blocks
  const { name, email, permissions = [] } = req.body;
  const requestedEmail = email ? String(email).trim().toLowerCase() : undefined;

  try {
    // Prepare data for validation (simple sanitization)
    const userData = {
      name: name?.trim(),
      email: requestedEmail
    };

    // Validate user data
  const validationErrors = await UserValidationService.validatePolwelUserData(userData as { name?: string; email?: string });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors[0], // Use the first validation error as the main message
        errors: validationErrors
      });
    }

    // Check for email conflicts
    const emailToCheck = userData.email || '';
    const emailConflict = await UserValidationService.checkEmailConflict(String(emailToCheck));
    if (emailConflict.isActiveConflict) {
      const conflictMessage = UserValidationService.generateEmailConflictMessage(
        emailConflict,
        String(emailToCheck)
      );
      return res.status(409).json({
        success: false,
        message: conflictMessage
      });
    }

    // Map and process permissions for creation
    console.log('Permissions requested for creation:', permissions);
    
    let mappedPermissions = mapPermissionNames(permissions);
    console.log('Mapped permissions for creation (raw):', mappedPermissions);

  // Deduplicate and normalize heuristics already applied; now filter against DB canonical names
  const requestedSet = Array.from(new Set(mappedPermissions));
  console.log('Requested permission candidates for creation:', requestedSet);

  // Resolve against permissions table to ensure only valid canonical names are stored
  let dbPermissions = await prisma.permission.findMany({ where: { name: { in: requestedSet.map(String) } } });
  const dbNames = dbPermissions.map(p => p.name);

  // If some requested permissions are not present in DB, attempt to create them with safe defaults
  const missing = requestedSet.filter(p => !dbNames.includes(p));
  if (missing.length > 0) {
    console.log('Missing permissions in DB, creating:', missing);
    const toCreate = missing.map(name => ({ name, description: name, module: name.split('.')[0] || 'General', action: name.split('.')[1] || 'custom' }));
    try {
      // Use createMany with skipDuplicates where supported; fall back to individual upserts if needed
      await prisma.permission.createMany({ data: toCreate, skipDuplicates: true });
    } catch (e) {
      // fallback: upsert each
      for (const p of toCreate) {
        try {
          await prisma.permission.upsert({ where: { name: p.name }, update: { description: p.description, module: p.module, action: p.action }, create: p });
        } catch (err) {
          console.error('Failed to upsert permission:', p.name, err);
        }
      }
    }

    // Reload permissions
    dbPermissions = await prisma.permission.findMany({ where: { name: { in: requestedSet.map(String) } } });
  }

  const dbNamesFinal = dbPermissions.map(p => p.name);
  mappedPermissions = requestedSet.filter(p => dbNamesFinal.includes(p));
  console.log('Normalized permission names for creation (validated against DB):', mappedPermissions);
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
        // Store permissions with human-readable names directly (canonical dot format)
        for (const permissionName of mappedPermissions) {
          await tx.userPermission.create({
            data: {
              userId: user.id,
              permissionName: permissionName,
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
      tempPassword: result.tempPassword,
      setupToken: result.setupToken,
      message: 'User created successfully. Setup email has been sent.',
      setupEmailSent: true
    });
  } catch (error) {
    console.error('Create POLWEL user error:', error);
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        // Provide a clear, role-specific message for duplicate emails
        return res.status(409).json({
          success: false,
          message: `Email ${requestedEmail} is already registered as an active POLWEL User/trainer/training coordinator`
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
      
      // Normalize: dedupe + validate against DB permissions table
      const requestedSet = Array.from(new Set(mappedPermissions));
      console.log('Requested permission candidates for update:', requestedSet);
      let dbPermissions = await prisma.permission.findMany({ where: { name: { in: requestedSet.map(String) } } });
      const dbNames = dbPermissions.map(p => p.name);

      // Auto-create missing permission definitions if necessary
      const missing = requestedSet.filter(p => !dbNames.includes(p));
      if (missing.length > 0) {
        console.log('Missing permissions in DB for update, creating:', missing);
        const toCreate = missing.map(name => ({ name, description: name, module: name.split('.')[0] || 'General', action: name.split('.')[1] || 'custom' }));
        try {
          await prisma.permission.createMany({ data: toCreate, skipDuplicates: true });
        } catch (e) {
          for (const p of toCreate) {
            try {
              await prisma.permission.upsert({ where: { name: p.name }, update: { description: p.description, module: p.module, action: p.action }, create: p });
            } catch (err) {
              console.error('Failed to upsert permission during update:', p.name, err);
            }
          }
        }

        dbPermissions = await prisma.permission.findMany({ where: { name: { in: requestedSet.map(String) } } });
      }

      const dbNamesFinal = dbPermissions.map(p => p.name);
      mappedPermissions = requestedSet.filter(p => dbNamesFinal.includes(p));
      console.log('Normalized permission names for update (validated against DB):', mappedPermissions);
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

          // Only create new permissions if we have normalized dot-style names
          if (mappedPermissions.length > 0) {
            for (const permissionName of mappedPermissions) {
              await tx.userPermission.create({
                data: {
                  userId: id,
                  permissionName: permissionName,
                  granted: true
                }
              });
            }
            console.log('New permissions created successfully with names:', mappedPermissions);
          } else {
            console.log('No mapped permissions provided - permissions cleared');
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
        old_email: emailBeforeDeletion,
        email: null,
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

// MFA endpoints removed — MFA has been deprecated

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

// Update POLWEL user status (ACTIVE <-> INACTIVE only)
export const updateUserStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate user ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Validate status
    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either ACTIVE or INACTIVE'
      });
    }

    // Find the user
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

    // Only allow changing status if current status is ACTIVE or INACTIVE (not PENDING, LOCKED, etc.)
    if (!['ACTIVE', 'INACTIVE'].includes(existingUser.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${existingUser.status}. Only ACTIVE and INACTIVE statuses can be changed.`
      });
    }

    // Update the user status
    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: {
        status: status as UserStatus
      }
    });

    // Log the status change
    await AuditService.logUserUpdate(
      req.user?.userId || 'system',
      existingUser.id,
      { status: existingUser.status },
      { status: updatedUser.status },
      `User status changed from ${existingUser.status} to ${updatedUser.status}`,
      req
    );

    return res.json({
      success: true,
      message: `User status updated to ${status} successfully`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        status: updatedUser.status
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
