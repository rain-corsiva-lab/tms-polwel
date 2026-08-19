import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

/**
 * Get resource library items for training coordinators
 * GET /api/client-organizations/:organizationId/resources
 */
export const getCoordinatorResources = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const resources = await prisma.resourceLibrary.findMany({
      where: {
        deletedAt: null,
        status: 'PUBLISHED',
        targetAudience: 'TRAINING_COORDINATORS'
      },
      select: {
        id: true,
        title: true,
        description: true,
        fileName: true,
        fileUrl: true,
        fileSize: true,
        mimeType: true,
        imageUrl: true,
        imageName: true,
        imageSize: true,
        publishedAt: true,
        uploader: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        publishedAt: 'desc'
      }
    });

    // Construct full URLs for PDF and cover image (relative paths)
    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const toAbsoluteUrl = (url: string | null): string | null => {
      if (!url) return null;
      if (url.startsWith('http')) return url;
      return `${backendUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    };
    const resourcesWithFullUrls = resources.map((resource) => ({
      ...resource,
      fileUrl: toAbsoluteUrl(resource.fileUrl) ?? resource.fileUrl,
      imageUrl: toAbsoluteUrl(resource.imageUrl),
    }));

    res.json({
      success: true,
      resources: resourcesWithFullUrls
    });
  } catch (error) {
    console.error('Error fetching coordinator resources:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resources',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get courses ranked by number of learners for a specific organization
 * GET /api/client-organizations/:organizationId/analytics/courses-by-learners
 */
export const getCoursesByLearnersRanking = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID is required'
      });
      return;
    }

    const userOrgIds: string[] = [];
    if (organizationId) userOrgIds.push(organizationId);
    if (req.user?.organizationId) userOrgIds.push(req.user.organizationId);
    if (Array.isArray((req.user as any)?.organizationIds)) {
      userOrgIds.push(...(req.user as any).organizationIds);
    }

    // Always fetch fresh connected organizations directly from database for the logged-in user
    if (req.user?.userId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          organizationId: true,
          organizations: {
            select: { organizationId: true }
          }
        }
      });
      if (dbUser?.organizationId) userOrgIds.push(dbUser.organizationId);
      if (dbUser?.organizations) {
        dbUser.organizations.forEach(o => {
          if (o.organizationId) userOrgIds.push(o.organizationId);
        });
      }
    }
    const uniqueOrgIds = Array.from(new Set(userOrgIds.filter(Boolean)));

    // 1. Fetch ALL active courses that POLWEL provides
    const allCourses = await prisma.course.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        title: true,
        courseCode: true
      },
      orderBy: {
        title: 'asc'
      }
    });

    // 2. Get all course runs with enrolled learners across the entire system
    const courseRunsWithLearners = await prisma.courseRun.findMany({
      where: {
        deletedAt: null,
        courseRunLearners: {
          some: {
            deletedAt: null,
            enrollmentStatus: { not: 'WITHDRAWN' }
          }
        }
      },
      select: {
        id: true,
        courseRunType: true,
        course: {
          select: {
            id: true,
            title: true,
            courseCode: true
          }
        },
        courseRunLearners: {
          where: {
            deletedAt: null,
            enrollmentStatus: { not: 'WITHDRAWN' }
          },
          select: {
            id: true,
            learnerId: true,
          }
        }
      }
    });

    // 3. Get direct bookings across the entire system
    const bookings = await prisma.booking.findMany({
      where: {
        status: { not: 'CANCELLED' }
      },
      select: {
        courseId: true,
        participantCount: true,
        course: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    // Aggregate by course - initializing ALL POLWEL courses so whole ranking is displayed
    const courseMap = new Map<string, { courseName: string; learnerSet: Set<string>; bookingCount: number }>();

    // 1. Prepopulate ALL active POLWEL courses with 0 learners
    allCourses.forEach(c => {
      courseMap.set(c.id, {
        courseName: c.title || 'Untitled Course',
        learnerSet: new Set<string>(),
        bookingCount: 0
      });
    });

    // 2. Populate enrolled learners across the entire system
    courseRunsWithLearners.forEach(run => {
      const courseId = run.course?.id;
      if (!courseId) return;

      const courseName = run.course?.title || 'Untitled Course';

      if (courseMap.has(courseId)) {
        const existing = courseMap.get(courseId)!;
        run.courseRunLearners.forEach((l) => existing.learnerSet.add(l.learnerId));
      } else {
        const learnerSet = new Set<string>();
        run.courseRunLearners.forEach((l) => learnerSet.add(l.learnerId));
        courseMap.set(courseId, {
          courseName,
          learnerSet,
          bookingCount: 0
        });
      }
    });

    // 3. Include bookings count if any
    bookings.forEach(b => {
      if (!b.courseId) return;
      if (courseMap.has(b.courseId)) {
        const existing = courseMap.get(b.courseId)!;
        existing.bookingCount += (b.participantCount || 0);
      } else {
        courseMap.set(b.courseId, {
          courseName: b.course?.title || 'Untitled Course',
          learnerSet: new Set<string>(),
          bookingCount: b.participantCount || 0
        });
      }
    });

    // Convert to array and sort by unique learner count (falling back to booking count if no individual learners)
    const rankings = Array.from(courseMap.values())
      .map((item) => ({
        courseName: item.courseName,
        numberOfLearners: item.learnerSet.size > 0 ? item.learnerSet.size : item.bookingCount
      }))
      .sort((a, b) => {
        if (b.numberOfLearners !== a.numberOfLearners) {
          return b.numberOfLearners - a.numberOfLearners;
        }
        return a.courseName.localeCompare(b.courseName);
      })
      .map((item, index) => ({
        rank: index + 1,
        ...item
      }));

    res.json({
      success: true,
      rankings
    });
  } catch (error) {
    console.error('Error fetching courses by learners ranking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course rankings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get divisions/departments ranked by number of learners across the whole SPF department (Strictly organizationType: SPF only)
 * GET /api/client-organizations/:organizationId/analytics/divisions-by-learners
 */
export const getDivisionsByLearnersRanking = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    // 1. Fetch ALL active organizations strictly with organizationType = 'SPF'
    const spfOrganizations = await prisma.organization.findMany({
      where: {
        organizationType: 'SPF',
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        organizationType: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    const spfOrgIdSet = new Set<string>(spfOrganizations.map(o => o.id));
    const spfOrgNameMap = new Map<string, string>();
    const departmentMap = new Map<string, Set<string>>();

    // Pre-populate all active SPF organizations with 0 learners
    spfOrganizations.forEach(org => {
      const orgName = org.name?.trim();
      if (orgName && !['polwel', 'spf'].includes(orgName.toLowerCase())) {
        spfOrgNameMap.set(org.id, orgName);
        departmentMap.set(orgName, new Set<string>());
      }
    });

    // 2. Get enrollments strictly belonging to SPF organizations
    const enrollments = await prisma.courseRunLearner.findMany({
      where: {
        deletedAt: null,
        enrollmentStatus: { not: 'WITHDRAWN' },
        OR: [
          { clientOrganization: { organizationType: 'SPF' } },
          { clientOrganizationId: { in: Array.from(spfOrgIdSet) } },
          { trainingCoordinator: { organization: { organizationType: 'SPF' } } }
        ]
      },
      select: {
        id: true,
        clientOrganizationId: true,
        clientOrganization: {
          select: {
            id: true,
            name: true,
            organizationType: true,
          }
        },
        trainingCoordinator: {
          select: {
            id: true,
            organizationId: true,
            organization: {
              select: {
                id: true,
                name: true,
                organizationType: true,
              }
            }
          }
        },
        learner: {
          select: {
            id: true,
            deletedAt: true
          }
        }
      }
    });

    // 3. Count unique learners strictly under each SPF organization
    enrollments.forEach(enrollment => {
      if (enrollment.learner?.deletedAt) return; // Skip deleted learners

      let spfOrgName = '';
      if (enrollment.clientOrganization?.organizationType === 'SPF' && enrollment.clientOrganization.name) {
        spfOrgName = enrollment.clientOrganization.name.trim();
      } else if (enrollment.trainingCoordinator?.organization?.organizationType === 'SPF' && enrollment.trainingCoordinator.organization.name) {
        spfOrgName = enrollment.trainingCoordinator.organization.name.trim();
      } else if (enrollment.clientOrganizationId && spfOrgNameMap.has(enrollment.clientOrganizationId)) {
        spfOrgName = spfOrgNameMap.get(enrollment.clientOrganizationId)!;
      }

      if (!spfOrgName) return;

      if (departmentMap.has(spfOrgName)) {
        departmentMap.get(spfOrgName)!.add(enrollment.learner.id);
      }
    });

    // Convert to array and sort by learner count (returning full ranked list strictly of SPF organizations)
    const rankings = Array.from(departmentMap.entries())
      .map(([deptName, learnerSet]) => ({
        divisionDepartment: deptName,
        numberOfLearners: learnerSet.size
      }))
      .sort((a, b) => {
        if (b.numberOfLearners !== a.numberOfLearners) {
          return b.numberOfLearners - a.numberOfLearners;
        }
        return a.divisionDepartment.localeCompare(b.divisionDepartment);
      })
      .map((item, index) => ({
        rank: index + 1,
        ...item
      }));

    res.json({
      success: true,
      rankings
    });
  } catch (error) {
    console.error('Error fetching divisions by learners ranking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch division rankings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
