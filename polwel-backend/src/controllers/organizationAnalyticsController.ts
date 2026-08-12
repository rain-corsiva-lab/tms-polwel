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
    const uniqueOrgIds = Array.from(new Set(userOrgIds.filter(Boolean)));

    // Get all course runs with learners from this organization / linked organizations
    const courseRunsWithLearners = await prisma.courseRun.findMany({
      where: {
        deletedAt: null,
        courseRunLearners: {
          some: {
            deletedAt: null,
            enrollmentStatus: { not: 'WITHDRAWN' },
            OR: [
              { clientOrganizationId: { in: uniqueOrgIds } },
              { trainingCoordinator: { organizationId: { in: uniqueOrgIds } } },
              ...(req.user?.userId ? [{ trainingCoordinatorId: req.user.userId }] : []),
            ]
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
            enrollmentStatus: { not: 'WITHDRAWN' },
            OR: [
              { clientOrganizationId: { in: uniqueOrgIds } },
              { trainingCoordinator: { organizationId: { in: uniqueOrgIds } } },
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

    // Aggregate by course
    const courseMap = new Map<string, { courseName: string; learnerSet: Set<string>; runType: string }>();

    courseRunsWithLearners.forEach(run => {
      const courseId = run.course?.id;
      if (!courseId) return;

      const courseName = run.course?.title || 'Untitled Course';
      const runType = run.courseRunType || 'OPEN_RUN';

      if (courseMap.has(courseId)) {
        const existing = courseMap.get(courseId)!;
        run.courseRunLearners.forEach((l) => existing.learnerSet.add(l.learnerId));
      } else {
        const learnerSet = new Set<string>();
        run.courseRunLearners.forEach((l) => learnerSet.add(l.learnerId));
        courseMap.set(courseId, {
          courseName,
          learnerSet,
          runType
        });
      }
    });

    // Convert to array and sort by unique learner count
    const rankings = Array.from(courseMap.values())
      .map((item) => ({
        courseName: item.courseName,
        numberOfLearners: item.learnerSet.size
      }))
      .sort((a, b) => b.numberOfLearners - a.numberOfLearners)
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
 * Get divisions/departments ranked by number of learners for a specific organization
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
    const uniqueOrgIds = Array.from(new Set(userOrgIds.filter(Boolean)));

    // Get all enrollments for this organization & linked organizations
    const enrollments = await prisma.courseRunLearner.findMany({
      where: {
        deletedAt: null,
        enrollmentStatus: { not: 'WITHDRAWN' },
        OR: [
          { clientOrganizationId: { in: uniqueOrgIds } },
          { trainingCoordinator: { organizationId: { in: uniqueOrgIds } } },
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

    // Aggregate by department/division
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

      if (!rawDept || rawDept.toLowerCase() === 'unassigned' || rawDept.toLowerCase() === 'n/a') {
        return; // Skip unassigned and empty data
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

    // Convert to array and sort by learner count (returning full ranked list)
    const rankings = Array.from(departmentMap.entries())
      .map(([deptName, data]) => ({
        divisionDepartment: deptName,
        numberOfLearners: data.totalLearners.size
      }))
      .sort((a, b) => b.numberOfLearners - a.numberOfLearners)
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
