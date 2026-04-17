import { Response } from 'express';
import { UserStatus } from '@prisma/client';
import path from 'path';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import EmailService from '../services/emailService';

const extractErrorSource = (stack?: string) => {
  if (!stack) return null;
  const lines = stack.split('\n').map((line) => line.trim()).slice(1);
  for (const line of lines) {
    const match = line.match(/\((.*):(\d+):(\d+)\)$/) || line.match(/at (.*):(\d+):(\d+)/);
    if (!match) continue;
    const [, absolutePath, lineNumber, columnNumber] = match;
    if (!absolutePath || absolutePath.includes('node_modules')) {
      continue;
    }
    return {
      file: path.relative(process.cwd(), absolutePath),
      line: Number(lineNumber),
      column: Number(columnNumber),
    };
  }
  return null;
};

const errorResponse = (
  res: Response,
  status: number,
  message: string,
  extra: Record<string, unknown> = {}
) => {
  const err = new Error(message);
  if ((Error as any).captureStackTrace) {
    (Error as any).captureStackTrace(err, errorResponse);
  }
  const source = extractErrorSource(err.stack);
  return res.status(status).json({
    success: false,
    message,
    ...(source ? { source } : {}),
    ...extra,
  });
};



// Get all client organisations with pagination and filtering
export const getClientOrganizations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Parse and sanitize query parameters
    const rawPage = typeof req.query.page === 'string' ? req.query.page : undefined;
    const parsedPage = rawPage ? Number(rawPage) : undefined;
    const pageNum = parsedPage && Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;

    const rawLimit = typeof req.query.limit === 'string' ? req.query.limit : undefined;
    const exportAll = req.query.export === 'true' || req.query.all === 'true' || rawLimit === 'all';
    let limitNum = 10;
    if (!exportAll && rawLimit !== undefined) {
      const parsedLimit = Number(rawLimit);
      if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
        limitNum = Math.min(1000, Math.floor(parsedLimit));
      }
    } else if (!exportAll) {
      limitNum = 10;
    }
    const skip = exportAll ? undefined : (pageNum - 1) * limitNum;
    const take = exportAll ? undefined : limitNum;

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
              bookings: true,
              courseRunLearners: true
            }
          },
          users: {
            select: { role: true },
          },
        },
  ...(skip !== undefined ? { skip } : {}),
  ...(take !== undefined ? { take } : {}),
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
        learnersCount: org._count.courseRunLearners,
        stats: {
          totalUsers: org._count.users,
          totalLearners: org._count.courseRunLearners,
          totalBookings: org._count.bookings
        }
      })),
      pagination: {
        page: exportAll ? 1 : pageNum,
        limit: exportAll ? total : limitNum,
        total,
        totalPages: exportAll ? 1 : Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get client organizations error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};

// Get client organization by ID
export const getClientOrganizationById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, 400, 'Organization ID is required');
    }

    const organization = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        address: true,
        contactEmail: true,
        contactPhone: true,
        contactPerson: true,
        buNumber: true,
        organizationType: true,
        createdAt: true,
        updatedAt: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            contactNumber: true,
            designation: true,
            isPrimaryCoordinator: true,
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
      return errorResponse(res, 404, 'Organization not found');
    }

    // Count unique learners from enrollments (CourseRunLearner)
    const totalLearnersPromise = prisma.courseRunLearner.findMany({
      where: { clientOrganizationId: id, deletedAt: null },
      select: { learnerId: true },
      distinct: ['learnerId'],
    }).then(results => results.length);

    const activeLearnersPromise = prisma.courseRunLearner.findMany({
      where: { 
        clientOrganizationId: id, 
        deletedAt: null,
        learner: { deletedAt: null }
      },
      select: { learnerId: true },
      distinct: ['learnerId'],
    }).then(results => results.length);

    const courseRunsPromise = prisma.courseRun.findMany({
      where: {
        deletedAt: null,
        OR: [
          {
            courseRunLearners: {
              some: {
                deletedAt: null,
                clientOrganizationId: id
              }
            }
          },
          { bookings: { some: { organizationId: id } } }
        ]
      },
      select: {
        id: true,
        courseId: true,
        status: true,
        startDatetime: true,
        endDatetime: true,
        updatedAt: true,
        course: {
          select: {
            id: true,
            title: true,
            courseCode: true
          }
        },
        venue: {
          select: {
            id: true,
            name: true
          }
        },
        bookings: {
          where: { organizationId: id },
          select: { id: true, participantCount: true }
        },
        courseRunLearners: {
          where: {
            deletedAt: null,
            clientOrganizationId: id
          },
          select: {
            id: true,
            enrollmentStatus: true
          }
        }
      }
    });

    const [totalLearners, activeLearners, courseRuns] = await Promise.all([
      totalLearnersPromise,
      activeLearnersPromise,
      courseRunsPromise
    ]);

    const now = new Date();
    const upcomingStatuses = new Set([
      'PENDING',
      'ACTIVE',
      'CONFIRMED',
      'CONFIRMED_PENDING_TA_APPROVAL',
      'CONFIRMED_PENDING_CONFIRMATION_EMAILS',
      'PUBLISHED'
    ]);
    const ongoingStatuses = new Set(['ONGOING', 'IN_PROGRESS']);
    const completedStatuses = new Set(['COMPLETED']);
    const pendingBillingStatuses = new Set(['PENDING_BILLING']);
    const cancelledStatuses = new Set(['CANCELLED']);

    const processedRuns = courseRuns.map((run) => {
      const start = run.startDatetime ? new Date(run.startDatetime) : null;
      const end = run.endDatetime ? new Date(run.endDatetime) : null;
      const learnerCount = run.courseRunLearners.length;
      const activeEnrollmentCount = run.courseRunLearners.filter((l) => l.enrollmentStatus === 'ENROLLED').length;

      let bucket: 'upcoming' | 'ongoing' | 'completed' | 'cancelled' = 'upcoming';

      if (cancelledStatuses.has(run.status)) {
        bucket = 'cancelled';
      } else if (pendingBillingStatuses.has(run.status) || completedStatuses.has(run.status) || (end && end < now)) {
        bucket = 'completed';
      } else if (ongoingStatuses.has(run.status) || (start && start <= now && (!end || end >= now))) {
        bucket = 'ongoing';
      } else if (upcomingStatuses.has(run.status) || (start && start > now)) {
        bucket = 'upcoming';
      }

      return {
        id: run.id,
        courseId: run.courseId,
        courseTitle: run.course?.title ?? 'Untitled Course',
  courseCode: run.course?.courseCode ?? null,
        status: run.status,
        startDate: run.startDatetime ? new Date(run.startDatetime) : null,
        endDate: run.endDatetime ? new Date(run.endDatetime) : null,
        updatedAt: new Date(run.updatedAt),
        venueName: run.venue?.name ?? null,
        learnerCount,
        activeEnrollmentCount,
        bucket
      };
    });

    let upcomingCount = 0;
    let ongoingCount = 0;
    let completedCount = 0;
    let pendingBillingCount = 0;
    let cancelledCount = 0;
    let lastEngagementAt: Date | null = null;
    const uniqueCourseIds = new Set<string>();
    let totalEnrollments = 0;
    let activeEnrollments = 0;

    const updateLastEngagement = (candidate: Date | null) => {
      if (!candidate) {
        return;
      }
      if (!lastEngagementAt || candidate > lastEngagementAt) {
        lastEngagementAt = candidate;
      }
    };

    processedRuns.forEach((run) => {
      uniqueCourseIds.add(run.courseId);
      totalEnrollments += run.learnerCount;
      activeEnrollments += run.activeEnrollmentCount;

      if (run.bucket === 'upcoming') {
        upcomingCount += 1;
      } else if (run.bucket === 'ongoing') {
        ongoingCount += 1;
      } else if (run.bucket === 'completed') {
        completedCount += 1;
      } else if (run.bucket === 'cancelled') {
        cancelledCount += 1;
      }

      if (run.status === 'PENDING_BILLING') {
        pendingBillingCount += 1;
      }

      updateLastEngagement(run.endDate ?? run.startDate ?? null);
    });

    const getAscendingTime = (run: typeof processedRuns[number]) => {
      if (run.startDate) {
        return run.startDate.getTime();
      }
      if (run.endDate) {
        return run.endDate.getTime();
      }
      return Number.MAX_SAFE_INTEGER;
    };

    const getDescendingTime = (run: typeof processedRuns[number]) => {
      if (run.endDate) {
        return run.endDate.getTime();
      }
      if (run.startDate) {
        return run.startDate.getTime();
      }
      return 0;
    };

    const mapRunForSummary = (run: typeof processedRuns[number]) => ({
      id: run.id,
      courseTitle: run.courseTitle,
      courseCode: run.courseCode,
      status: run.status,
      startDate: run.startDate,
      endDate: run.endDate,
      venueName: run.venueName,
      learnerCount: run.learnerCount,
      activeEnrollmentCount: run.activeEnrollmentCount
    });

    const courseRunSummary = {
      upcoming: processedRuns
        .filter((run) => run.bucket === 'upcoming')
        .sort((a, b) => getAscendingTime(a) - getAscendingTime(b))
        .slice(0, 5)
        .map(mapRunForSummary),
      recent: processedRuns
        .filter((run) => run.bucket !== 'upcoming')
        .sort((a, b) => getDescendingTime(b) - getDescendingTime(a))
        .slice(0, 5)
        .map(mapRunForSummary)
    };

    const coordinatorUsers = organization.users.filter((user) => user.role === 'TRAINING_COORDINATOR');
    const activeCoordinators = coordinatorUsers.filter((user) => user.status === 'ACTIVE').length;
    const primaryCoordinator = coordinatorUsers.find((user) => user.isPrimaryCoordinator) || null;

    const stats = {
      totalUsers: organization._count.users,
      totalBookings: organization._count.bookings,
      totalLearners,
      activeLearners,
      inactiveLearners: Math.max(totalLearners - activeLearners, 0),
      totalCoordinators: coordinatorUsers.length,
      activeCoordinators,
      upcomingCourseRuns: upcomingCount,
      ongoingCourseRuns: ongoingCount,
      completedCourseRuns: completedCount,
      pendingBillingCourseRuns: pendingBillingCount,
      cancelledCourseRuns: cancelledCount,
      totalCourseRuns: processedRuns.length,
      uniqueCourses: uniqueCourseIds.size,
      totalEnrollments,
      activeEnrollments,
      lastEngagementAt
    };

    return res.json({
      id: organization.id,
      name: organization.name,
      status: organization.status,
      address: organization.address,
      contactEmail: organization.contactEmail,
      contactPhone: organization.contactPhone,
      contactPerson: organization.contactPerson,
      buNumber: organization.buNumber,
      organizationType: organization.organizationType,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
      users: organization.users,
      stats,
      primaryCoordinator: primaryCoordinator
        ? {
            id: primaryCoordinator.id,
            name: primaryCoordinator.name,
            email: primaryCoordinator.email,
            status: primaryCoordinator.status,
            contactNumber: primaryCoordinator.contactNumber,
            designation: primaryCoordinator.designation
          }
        : null,
      courseRunSummary
    });
  } catch (error) {
    console.error('Get client organization by ID error:', error);
    return errorResponse(res, 500, 'Internal server error');
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
      return errorResponse(res, 400, 'Organization name is required');
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
      return errorResponse(res, 409, 'Organization with this name already exists');
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
    return errorResponse(res, 500, 'Internal server error');
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
      return errorResponse(res, 400, 'Organization ID is required');
    }

    // Check if organization exists
    const existingOrganization = await prisma.organization.findUnique({
      where: { id }
    });

    if (!existingOrganization) {
      return errorResponse(res, 404, 'Organization not found');
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
    return errorResponse(res, 500, 'Internal server error');
  }
};

// Delete client organization (soft delete)
export const deleteClientOrganization = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, 400, 'Organization ID is required');
    }

    // Check if organization exists
    const existingOrganization = await prisma.organization.findUnique({
      where: { id }
    });

    if (!existingOrganization) {
      return errorResponse(res, 404, 'Organization not found');
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
    return errorResponse(res, 500, 'Internal server error');
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
    return errorResponse(res, 500, 'Internal server error');
  }
};

// Get all industries
export const getIndustries = async (req: AuthenticatedRequest, res: Response) => {
  try {
  // industry field removed from schema; return empty list
  return res.json({ industries: [] });
  } catch (error) {
    console.error('Get industries error:', error);
    return errorResponse(res, 500, 'Internal server error');
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
      return errorResponse(res, 400, 'Organization ID is required');
    }

    // Parse status query parameter to allow callers to request all statuses
    const rawStatus = typeof req.query.status === 'string' ? req.query.status.trim().toUpperCase() : '';

    // Build where clause
    const where: any = {
      organizationId,
      role: 'TRAINING_COORDINATOR',
    };

    // If caller provided a specific status (and didn't ask for ALL), filter by it.
    // If no status provided, default to hiding INACTIVE coordinators for backward compatibility.
    if (rawStatus) {
      if (rawStatus !== 'ALL') {
        where.status = rawStatus;
      }
      // else: rawStatus === 'ALL' -> do not add status filter
    } else {
      // default behaviour: hide INACTIVE unless caller specified otherwise
      where.status = { not: 'INACTIVE' };
    }

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
          contactNumber: true,
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
      contactNumber: coordinator.contactNumber || null,
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
    return errorResponse(res, 500, 'Internal server error');
  }
};

// Create training coordinator for an organization
export const createOrganizationCoordinator = async (req: AuthenticatedRequest, res: Response) => {
  try {
  const { organizationId } = req.params;
  const { name, email, designation, password, isPrimary, contactNumber } = req.body;

    if (!organizationId) {
      return errorResponse(res, 400, 'Organization ID is required');
    }

    // Validation
    const normalizedContactNumber = typeof contactNumber === 'string' ? contactNumber.trim() : '';

    if (!name || !email || !password || !normalizedContactNumber) {
      return errorResponse(res, 400, 'Name, email, password, and contact number are required');
    }

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      return errorResponse(res, 404, 'Organization not found');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return errorResponse(
        res,
        409,
        `Email ${email} is already registered as an active POLWEL User/trainer/training coordinator`
      );
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
          isPrimaryCoordinator: isPrimary === true,
          contactNumber: normalizedContactNumber,
        },
        select: {
          id: true,
          name: true,
          email: true,
          designation: true,
          status: true,
          isPrimaryCoordinator: true,
          contactNumber: true,
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
    return errorResponse(res, 500, 'Internal server error');
  }
};

// Update training coordinator
export const updateOrganizationCoordinator = async (req: AuthenticatedRequest, res: Response) => {
  try {
  const { organizationId, coordinatorId } = req.params;
  const { name, email, designation, status, isPrimary, contactNumber } = req.body;

    if (!organizationId || !coordinatorId) {
      return errorResponse(res, 400, 'Organization ID and Coordinator ID are required');
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
      return errorResponse(res, 404, 'Coordinator not found or does not belong to this organization');
    }

    // If email is being changed, check if new email already exists
    if (email && email !== existingCoordinator.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });

      if (emailExists) {
        return errorResponse(
          res,
          409,
          `Email ${email} is already registered as an active POLWEL User/trainer/training coordinator`
        );
      }
    }

    const normalizedContactNumber =
      contactNumber === undefined
        ? undefined
        : typeof contactNumber === 'string' && contactNumber.trim().length > 0
          ? contactNumber.trim()
          : null;

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
          ...(isPrimary !== undefined && { isPrimaryCoordinator: !!isPrimary }),
          ...(normalizedContactNumber !== undefined && { contactNumber: normalizedContactNumber })
        },
        select: {
          id: true,
          name: true,
          email: true,
          designation: true,
          status: true,
          isPrimaryCoordinator: true,
          contactNumber: true,
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
    return errorResponse(res, 500, 'Internal server error');
  }
};

// Delete training coordinator (soft delete)
export const deleteOrganizationCoordinator = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { organizationId, coordinatorId } = req.params;

    if (!organizationId || !coordinatorId) {
      return errorResponse(res, 400, 'Organization ID and Coordinator ID are required');
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
      return errorResponse(res, 404, 'Coordinator not found or does not belong to this organization');
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
    return errorResponse(res, 500, 'Internal server error');
  }
};

// ============ LEARNERS MANAGEMENT ============

// Get all learners across organizations (POLWEL only)
export const getAllLearners = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = "1", limit = "20", search, status, organizationId } = req.query;

    const rawPage = Number(page);
    const rawLimit = Number(limit);
    const pageNum = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const limitNum = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(1000, Math.floor(rawLimit)) : 20;
    const skip = (pageNum - 1) * limitNum;

    const rawSearch = typeof search === "string" ? search.trim() : undefined;
    const normalizedSearch = rawSearch && rawSearch.length > 0 ? rawSearch.substring(0, 500) : undefined;
    const rawStatus = typeof status === "string" ? status.trim().toUpperCase() : undefined;
    const rawOrganizationId = typeof organizationId === "string" ? organizationId.trim() : undefined;

    // Build where clause for learners
    const learnerWhere: any = {};

    if (normalizedSearch) {
      learnerWhere.OR = [
        { fullname: { contains: normalizedSearch, mode: "insensitive" } },
        { email: { contains: normalizedSearch, mode: "insensitive" } },
        { designation: { contains: normalizedSearch, mode: "insensitive" } },
        { contactNumber: { contains: normalizedSearch, mode: "insensitive" } },
      ];
    }

    if (rawStatus === "ACTIVE") {
      learnerWhere.deletedAt = null;
    } else if (rawStatus === "INACTIVE") {
      learnerWhere.deletedAt = { not: null };
    }

    // If filtering by organization, first get learner IDs from enrollments
    if (rawOrganizationId) {
      const enrollmentsForOrg = await prisma.courseRunLearner.findMany({
        where: { clientOrganizationId: rawOrganizationId, deletedAt: null },
        select: { learnerId: true },
        distinct: ['learnerId']
      });
      const learnerIdsInOrg = enrollmentsForOrg.map(e => e.learnerId);
      
      if (learnerIdsInOrg.length === 0) {
        return res.json({
          learners: [],
          pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 }
        });
      }
      
      learnerWhere.id = { in: learnerIdsInOrg };
    }

    const [learners, total] = await Promise.all([
      prisma.learner.findMany({
        where: learnerWhere,
        select: {
          id: true,
          fullname: true,
          email: true,
          designation: true,
          contact: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          courseRunLearners: {
            where: { 
              deletedAt: null,
              ...(rawOrganizationId ? { clientOrganizationId: rawOrganizationId } : {})
            },
            select: {
              id: true,
              clientOrganizationId: true,
              trainingCoordinatorId: true,
              departmentName: true,
              createdAt: true,
              clientOrganization: {
                select: {
                  id: true,
                  name: true,
                  buNumber: true,
                }
              },
              trainingCoordinator: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  contactNumber: true,
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 1, // Get most recent enrollment for display
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.learner.count({ where: learnerWhere }),
    ]);

    const formattedLearners = learners.map((learner) => {
      // Use most recent enrollment for organization/coordinator display
      const recentEnrollment = learner.courseRunLearners[0];
      const totalEnrollments = learner.courseRunLearners.length;

      return {
        id: learner.id,
        fullname: learner.fullname,
        email: learner.email,
        designation: learner.designation || "",
        departmentName: recentEnrollment?.departmentName || "",
        contact: learner.contact || "",
        clientOrganizationId: recentEnrollment?.clientOrganizationId || null,
        clientOrganizationName: recentEnrollment?.clientOrganization?.name || null,
        clientOrganizationBuNumber: recentEnrollment?.clientOrganization?.buNumber || null,
        trainingCoordinatorId: recentEnrollment?.trainingCoordinator || null,
        trainingCoordinatorName: recentEnrollment?.trainingCoordinator?.name || null,
        trainingCoordinatorEmail: recentEnrollment?.trainingCoordinator?.email || null,
        trainingCoordinatorPhone: recentEnrollment?.trainingCoordinator?.contactNumber || null,
        status: learner.deletedAt ? "INACTIVE" : "ACTIVE",
        enrolledCourses: totalEnrollments,
        createdAt: learner.createdAt,
        updatedAt: learner.updatedAt,
      };
    });

    return res.json({
      learners: formattedLearners,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get all learners error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Get learners for an organization
export const getOrganizationLearners = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { page = '1', limit = '10', search, status } = req.query;

    if (!organizationId) {
      return errorResponse(res, 400, 'Organization ID is required');
    }

    const rawPage = Number(page);
    const rawLimit = Number(limit);
    const pageNum = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const limitNum = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(1000, Math.floor(rawLimit)) : 10;
    const skip = (pageNum - 1) * limitNum;

    const rawSearch = typeof search === 'string' ? search.trim() : undefined;
    const normalizedSearch = rawSearch && rawSearch.length > 0 ? rawSearch.substring(0, 500) : undefined;
    const rawStatus = typeof status === 'string' ? status.trim().toUpperCase() : undefined;

    // Get unique learner IDs from enrollments for this organization
    const enrollmentsForOrg = await prisma.courseRunLearner.findMany({
      where: { clientOrganizationId: organizationId, deletedAt: null },
      select: { learnerId: true },
      distinct: ['learnerId']
    });
    const learnerIdsInOrg = enrollmentsForOrg.map(e => e.learnerId);

    if (learnerIdsInOrg.length === 0) {
      return res.json({
        learners: [],
        pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 }
      });
    }

    const learnerWhere: any = {
      id: { in: learnerIdsInOrg }
    };

    if (normalizedSearch) {
      learnerWhere.OR = [
        { fullname: { contains: normalizedSearch, mode: 'insensitive' } },
        { email: { contains: normalizedSearch, mode: 'insensitive' } },
        { designation: { contains: normalizedSearch, mode: 'insensitive' } },
        { contact: { contains: normalizedSearch, mode: 'insensitive' } }
      ];
    }

    if (rawStatus === 'ACTIVE') {
      learnerWhere.deletedAt = null;
    } else if (rawStatus === 'INACTIVE') {
      learnerWhere.deletedAt = { not: null };
    }

    const [learners, total] = await Promise.all([
      prisma.learner.findMany({
        where: learnerWhere,
        select: {
          id: true,
          fullname: true,
          email: true,
          designation: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          courseRunLearners: {
            where: { deletedAt: null, clientOrganizationId: organizationId },
            select: {
              enrollmentStatus: true
            }
          }
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.learner.count({ where: learnerWhere })
    ]);

    const formattedLearners = learners.map(learner => {
      const enrolledCourses = learner.courseRunLearners.length;
      const completedCourses = 0;

      return {
        id: learner.id,
        name: learner.fullname,
        email: learner.email,
        designation: learner.designation || 'N/A',
        status: learner.deletedAt ? 'INACTIVE' : 'ACTIVE',
        enrolledCourses,
        completedCourses,
        organizationId: organizationId,
        createdAt: learner.createdAt,
        updatedAt: learner.updatedAt
      };
    });

    return res.json({
      learners: formattedLearners,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get organization learners error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};

// Get course runs for an organization scoped to the logged-in training coordinator (self)
export const getCoordinatorCourseRunsSelf = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    if (!organizationId) {
      return errorResponse(res, 400, 'Organization ID is required');
    }
    if (!req.user) {
      return errorResponse(res, 401, 'Authentication required');
    }

    const coordinatorId = req.user.userId;

    const runs = await prisma.courseRun.findMany({
      where: {
        deletedAt: null,
        OR: [
          {
            courseRunLearners: {
              some: {
                deletedAt: null,
                clientOrganizationId: organizationId,
                trainingCoordinatorId: coordinatorId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        courseId: true,
        status: true,
        startDatetime: true,
        endDatetime: true,
        course: { select: { id: true, title: true, courseCode: true } },
        courseRunLearners: {
          where: {
            deletedAt: null,
            clientOrganizationId: organizationId,
            trainingCoordinatorId: coordinatorId,
          },
          select: { id: true },
        },
      },
      orderBy: { startDatetime: 'desc' },
    });

    const now = new Date();
    const inProgress: any[] = [];
    const completed: any[] = [];

    runs.forEach((run) => {
      const start = run.startDatetime ? new Date(run.startDatetime) : null;
      const end = run.endDatetime ? new Date(run.endDatetime) : null;
      const participants = run.courseRunLearners.length;

      // Categorize based on status
      const completedStatuses = ['COMPLETED', 'INCOMPLETED', 'PENDING_BILLING'];
      const isCompleted = completedStatuses.includes(run.status) || (end && end < now && !['DRAFT', 'CANCELLED'].includes(run.status));

      // Normalize display status for completed bucket: past end date reads as COMPLETED for the client
      const displayStatus =
        isCompleted && end && end < now ? 'COMPLETED' : run.status;

      const item = {
        id: run.id,
        courseName: run.course?.title || 'Untitled Course',
        courseCode: run.course?.courseCode || null,
        startDate: start,
        endDate: end,
        participants,
        status: displayStatus,
      };
      
      if (isCompleted) {
        completed.push(item);
      } else {
        // All other statuses go to in-progress: DRAFT, PENDING, CONFIRMED, CONFIRMED_PENDING_TA_APPROVAL,
        // CONFIRMED_PENDING_CONFIRMATION_EMAILS, ACTIVE, IN_PROGRESS, and future courses
        inProgress.push(item);
      }
    });

    return res.json({ inProgress, completed });
  } catch (error) {
    console.error('Get coordinator course runs error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};

// Get learners for organization scoped to the logged-in training coordinator (self)
export const getOrganizationLearnersSelf = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { page = '1', limit = '10', search, status } = req.query;

    if (!organizationId) {
      return errorResponse(res, 400, 'Organization ID is required');
    }
    if (!req.user) {
      return errorResponse(res, 401, 'Authentication required');
    }

    const coordinatorId = req.user.userId;

    const rawPage = Number(page);
    const rawLimit = Number(limit);
    const pageNum = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const limitNum = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(1000, Math.floor(rawLimit)) : 10;
    const skip = (pageNum - 1) * limitNum;

    const rawSearch = typeof search === 'string' ? search.trim() : undefined;
    const normalizedSearch = rawSearch && rawSearch.length > 0 ? rawSearch.substring(0, 500) : undefined;
    const rawStatus = typeof status === 'string' ? status.trim().toUpperCase() : undefined;

    // Query CourseRunLearner instead of Learner for organization-specific enrollments
    const enrollmentWhere: any = {
      clientOrganizationId: organizationId,
      trainingCoordinatorId: coordinatorId,
      deletedAt: null,
    };

    // Get unique learner IDs from enrollments
    const enrollments = await prisma.courseRunLearner.findMany({
      where: enrollmentWhere,
      select: { learnerId: true },
      distinct: ['learnerId'],
    });

    const learnerIds = enrollments.map(e => e.learnerId);

    if (learnerIds.length === 0) {
      return res.json({
        learners: [],
        pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
      });
    }

    const learnerWhere: any = {
      id: { in: learnerIds },
    };

    if (normalizedSearch) {
      learnerWhere.OR = [
        { fullname: { contains: normalizedSearch, mode: 'insensitive' } },
        { email: { contains: normalizedSearch, mode: 'insensitive' } },
        { designation: { contains: normalizedSearch, mode: 'insensitive' } },
        { contactNumber: { contains: normalizedSearch, mode: 'insensitive' } },
      ];
    }

    if (rawStatus === 'ACTIVE') {
      learnerWhere.deletedAt = null;
    } else if (rawStatus === 'INACTIVE') {
      learnerWhere.deletedAt = { not: null };
    }

    const [rows, total] = await Promise.all([
      prisma.learner.findMany({
        where: learnerWhere,
        select: {
          id: true,
          fullname: true,
          email: true,
          designation: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          courseRunLearners: {
            where: { 
              deletedAt: null,
              clientOrganizationId: organizationId,
              trainingCoordinatorId: coordinatorId,
            },
            select: { id: true, enrollmentStatus: true, attendanceStatus: true },
          },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.learner.count({ where: learnerWhere }),
    ]);

    const learners = rows.map((l) => ({
      id: l.id,
      name: l.fullname,
      email: l.email,
      designation: l.designation || 'N/A',
      status: l.deletedAt ? 'INACTIVE' : 'ACTIVE',
      enrolledCourses: l.courseRunLearners.length,
      completedCourses: l.courseRunLearners.filter(crl => crl.attendanceStatus === 'PRESENT').length,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    }));

    return res.json({
      learners,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) || 1 },
    });
  } catch (error) {
    console.error('Get coordinator learners error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};

// Resend setup email for training coordinator
export const resendCoordinatorSetup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { organizationId, coordinatorId } = req.params;

    if (!organizationId || !coordinatorId) {
        return errorResponse(res, 400, 'Organization ID and Coordinator ID are required');
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
        return errorResponse(res, 404, 'Coordinator not found or account already active');
    }

    if (!organization) {
        return errorResponse(res, 404, 'Organization not found');
    }

    if (!coordinator.email) {
        return errorResponse(res, 400, 'Coordinator email not found');
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
      if (process.env.ENABLE_TC_ONBOARDING_EMAIL !== 'true') {
        console.log(`[resendCoordinatorSetup] TC onboarding email is disabled (ENABLE_TC_ONBOARDING_EMAIL != true) — skipping for: ${coordinator.email}`);
        return res.json({
          success: false,
          message: 'TC onboarding emails are currently disabled. No email was sent.',
          setupTokenResent: false,
        });
      }

      const setupUrl = `${process.env.FRONTEND_URL}/onboarding/${setupToken}`;
      await EmailService.sendCoordinatorSetupEmail(coordinator.email, coordinator.name, setupUrl, organization.name);

      console.log(`🔄 Coordinator setup email resent to: ${coordinator.email}`);

      return res.json({
        success: true,
        message: 'Setup email has been resent successfully',
        setupTokenResent: true,
      });
    } catch (emailError) {
      console.error('Failed to resend coordinator setup email:', emailError);
      return errorResponse(res, 500, 'Failed to send setup email. Please try again.');
    }

  } catch (error) {
    console.error('Resend coordinator setup error:', error);
      return errorResponse(res, 500, 'Internal server error');
  }
};

// ─── BU Number Options ───────────────────────────────────────────────────────

export const getBuNumbers = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const buNumbers = await prisma.buNumberOption.findMany({
      orderBy: { value: 'asc' },
    });
    return res.json({ success: true, buNumbers: buNumbers.map((b) => b.value) });
  } catch (error) {
    console.error('Get BU numbers error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};

export const createBuNumber = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { value } = req.body;
    if (!value || typeof value !== 'string' || !value.trim()) {
      return errorResponse(res, 400, 'BU number value is required');
    }
    const trimmed = value.trim().toUpperCase();
    // Basic format check: alphanumeric only
    if (!/^[A-Z0-9]+$/.test(trimmed)) {
      return errorResponse(res, 400, 'BU number must contain only letters and digits');
    }
    const existing = await prisma.buNumberOption.findUnique({ where: { value: trimmed } });
    if (existing) {
      return res.json({ success: true, buNumber: trimmed, created: false });
    }
    await prisma.buNumberOption.create({ data: { value: trimmed } });
    return res.status(201).json({ success: true, buNumber: trimmed, created: true });
  } catch (error) {
    console.error('Create BU number error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};

export const updateBuNumber = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentValue = typeof req.params.value === 'string' ? req.params.value.trim().toUpperCase() : '';
    const { newValue } = req.body;

    if (!currentValue) {
      return errorResponse(res, 400, 'Current BU number value is required');
    }

    if (!newValue || typeof newValue !== 'string' || !newValue.trim()) {
      return errorResponse(res, 400, 'New BU number value is required');
    }

    const trimmedNewValue = newValue.trim().toUpperCase();

    if (!/^[A-Z0-9]+$/.test(trimmedNewValue)) {
      return errorResponse(res, 400, 'BU number must contain only letters and digits');
    }

    if (trimmedNewValue === currentValue) {
      return res.json({ success: true, buNumber: trimmedNewValue, updated: false });
    }

    const existing = await prisma.buNumberOption.findUnique({ where: { value: trimmedNewValue } });
    if (existing) {
      return errorResponse(res, 409, 'BU number already exists');
    }

    const current = await prisma.buNumberOption.findUnique({ where: { value: currentValue } });
    if (!current) {
      return errorResponse(res, 404, 'BU number option not found');
    }

    await prisma.buNumberOption.update({
      where: { value: currentValue },
      data: { value: trimmedNewValue },
    });

    return res.json({ success: true, buNumber: trimmedNewValue, updated: true });
  } catch (error) {
    console.error('Update BU number error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};

export const deleteBuNumber = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const value = typeof req.params.value === 'string' ? req.params.value.trim().toUpperCase() : '';
    if (!value) {
      return errorResponse(res, 400, 'BU number value is required');
    }

    const existing = await prisma.buNumberOption.findUnique({ where: { value } });
    if (!existing) {
      return errorResponse(res, 404, 'BU number option not found');
    }

    await prisma.buNumberOption.delete({ where: { value } });
    return res.json({ success: true, deleted: true, buNumber: value });
  } catch (error) {
    console.error('Delete BU number error:', error);
    return errorResponse(res, 500, 'Internal server error');
  }
};
