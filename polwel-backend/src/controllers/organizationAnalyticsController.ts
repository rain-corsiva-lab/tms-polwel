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

    // Get all course runs with learners from this organization / linked organizations
    const courseRunsWithLearners = await prisma.courseRun.findMany({
      where: {
        deletedAt: null,
        OR: [
          {
            courseRunLearners: {
              some: {
                deletedAt: null,
                enrollmentStatus: { not: 'WITHDRAWN' },
                OR: [
                  { clientOrganizationId: { in: uniqueOrgIds } },
                  { trainingCoordinator: { organizationId: { in: uniqueOrgIds } } },
                  { trainingCoordinator: { organizations: { some: { organizationId: { in: uniqueOrgIds } } } } },
                  ...(req.user?.userId ? [{ trainingCoordinatorId: req.user.userId }] : []),
                ]
              }
            }
          },
          {
            bookings: {
              some: {
                organizationId: { in: uniqueOrgIds },
                status: { not: 'CANCELLED' }
              }
            }
          }
        ]
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
            enrollmentStatus: { not: 'WITHDRAWN' },
            OR: [
              { clientOrganizationId: { in: uniqueOrgIds } },
              { trainingCoordinator: { organizationId: { in: uniqueOrgIds } } },
              { trainingCoordinator: { organizations: { some: { organizationId: { in: uniqueOrgIds } } } } },
              ...(req.user?.userId ? [{ trainingCoordinatorId: req.user.userId }] : []),
            ]
          },
          select: {
            id: true,
            learnerId: true,
          }
        }
      }
    });

    // Also get direct bookings for any of these organizations
    const bookings = await prisma.booking.findMany({
      where: {
        organizationId: { in: uniqueOrgIds },
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

    // 2. Populate enrolled learners
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
 * Get divisions/departments ranked by number of learners for a specific organization (Only SPF Divisions)
 * GET /api/client-organizations/:organizationId/analytics/divisions-by-learners
 */
export const getDivisionsByLearnersRanking = async (
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

    // Get all enrollments for this organization & linked organizations
    const enrollments = await prisma.courseRunLearner.findMany({
      where: {
        deletedAt: null,
        enrollmentStatus: { not: 'WITHDRAWN' },
        OR: [
          { clientOrganizationId: { in: uniqueOrgIds } },
          { trainingCoordinator: { organizationId: { in: uniqueOrgIds } } },
          { trainingCoordinator: { organizations: { some: { organizationId: { in: uniqueOrgIds } } } } },
          ...(req.user?.userId ? [{ trainingCoordinatorId: req.user.userId }] : []),
        ]
      },
      select: {
        id: true,
        departmentName: true,
        division: true,
        attendanceStatus: true,
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
            name: true,
            division: true,
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

    // Helper to verify if an organization / department / division is an SPF Division
    const isSpfEntity = (rawDept: string, enrollment: any): boolean => {
      const name = (rawDept || '').trim();
      if (!name) return false;
      const nameLower = name.toLowerCase();

      // Generic exclusions
      if (['unassigned', 'n/a', 'polwel'].includes(nameLower)) {
        return false;
      }

      // Explicit non-SPF blacklist (e.g. private companies, vendor names)
      if (
        nameLower.includes('corsiva') ||
        nameLower.includes('microsoft') ||
        nameLower.includes('private') ||
        nameLower.includes('pte ltd') ||
        nameLower.includes('llc')
      ) {
        return false;
      }

      // Check if clientOrganization is explicitly SPF
      if (enrollment.clientOrganization?.organizationType === 'SPF') {
        return true;
      }

      // Check if trainingCoordinator organization is SPF
      if (enrollment.trainingCoordinator?.organization?.organizationType === 'SPF') {
        return true;
      }

      // Check if department/division name contains SPF keywords or standard division pattern
      if (
        nameLower.includes('singapore police force') ||
        nameLower.includes('spf') ||
        nameLower.includes('police') ||
        nameLower.includes('division') ||
        nameLower.includes('tracom') ||
        nameLower.includes('cid') ||
        nameLower.includes('cad') ||
        nameLower.includes('soc') ||
        nameLower.includes('traffic police') ||
        nameLower.includes('coast guard') ||
        /^[a-z]\s+division$/i.test(name)
      ) {
        return true;
      }

      return false;
    };

    // Aggregate by SPF department/division
    const departmentMap = new Map<string, { totalLearners: Set<string>; completedCourses: number; totalEnrollments: number }>();

    enrollments.forEach(enrollment => {
      if (enrollment.learner?.deletedAt) return; // Skip deleted learners

      // Robust multi-stage resolution for division/department name
      const getDivisionName = (): string => {
        // 1. Explicit departmentName on enrollment (if specific and non-generic)
        const dept = enrollment.departmentName?.trim();
        if (dept && !['unassigned', 'n/a', 'polwel', 'spf'].includes(dept.toLowerCase())) {
          return dept;
        }

        // 2. Explicit division on enrollment
        const div = enrollment.division?.trim();
        if (div && !['unassigned', 'n/a', 'polwel', 'spf'].includes(div.toLowerCase())) {
          return div;
        }

        // 3. Client Organization Name (e.g. "Singapore Police Force - Ang Mo Kio Division", "P Division")
        const orgName = enrollment.clientOrganization?.name?.trim();
        if (orgName && !['polwel', 'spf'].includes(orgName.toLowerCase())) {
          return orgName;
        }

        // 4. Training Coordinator's Division
        const tcDiv = enrollment.trainingCoordinator?.division?.trim();
        if (tcDiv && !['unassigned', 'n/a', 'polwel', 'spf'].includes(tcDiv.toLowerCase())) {
          return tcDiv;
        }

        // 5. Training Coordinator's Organization Name
        const tcOrgName = enrollment.trainingCoordinator?.organization?.name?.trim();
        if (tcOrgName && !['polwel', 'spf'].includes(tcOrgName.toLowerCase())) {
          return tcOrgName;
        }

        // 6. Generic fallbacks if nothing more specific was found
        if (dept && !['unassigned', 'n/a'].includes(dept.toLowerCase())) return dept;
        if (div && !['unassigned', 'n/a'].includes(div.toLowerCase())) return div;
        if (orgName && orgName.toLowerCase() !== 'polwel') return orgName;
        if (tcDiv) return tcDiv;
        if (tcOrgName) return tcOrgName;

        return '';
      };

      const rawDept = getDivisionName();

      // Only include valid SPF Divisions (excluding non-SPF entities like Corsiva Microsoft)
      if (!rawDept || !isSpfEntity(rawDept, enrollment)) {
        return;
      }

      const dept = rawDept;
      const isCompleted = enrollment.attendanceStatus === 'PRESENT' ? 1 : 0;

      if (departmentMap.has(dept)) {
        const existing = departmentMap.get(dept)!;
        existing.totalLearners.add(enrollment.learner.id);
        existing.completedCourses += isCompleted;
        existing.totalEnrollments += 1;
      } else {
        const learnerSet = new Set<string>();
        learnerSet.add(enrollment.learner.id);
        departmentMap.set(dept, {
          totalLearners: learnerSet,
          completedCourses: isCompleted,
          totalEnrollments: 1
        });
      }
    });

    // Convert to array and sort by learner count (returning full ranked list of SPF divisions)
    const rankings = Array.from(departmentMap.entries())
      .map(([deptName, data]) => ({
        divisionDepartment: deptName,
        numberOfLearners: data.totalLearners.size
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
