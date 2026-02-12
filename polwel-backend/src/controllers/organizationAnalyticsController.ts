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

    // Construct full URLs for resources
    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const resourcesWithFullUrls = resources.map(resource => ({
      ...resource,
      fileUrl: resource.fileUrl && !resource.fileUrl.startsWith('http') 
        ? `${backendUrl}${resource.fileUrl.startsWith('/') ? '' : '/'}${resource.fileUrl}`
        : resource.fileUrl
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

    // Get all course runs with learners from this organization
    const courseRunsWithLearners = await prisma.courseRun.findMany({
      where: {
        deletedAt: null,
        courseRunLearners: {
          some: {
            deletedAt: null,
            clientOrganizationId: organizationId
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
            clientOrganizationId: organizationId
          },
          select: {
            id: true
          }
        }
      }
    });

    // Aggregate by course
    const courseMap = new Map<string, { courseName: string; learnerCount: number; runType: string }>();

    courseRunsWithLearners.forEach(run => {
      const courseId = run.course?.id;
      if (!courseId) return;

      const courseName = run.course?.title || 'Untitled Course';
      const learnerCount = run.courseRunLearners.length;
      const runType = run.courseRunType || 'OPEN_RUN';

      if (courseMap.has(courseId)) {
        const existing = courseMap.get(courseId)!;
        existing.learnerCount += learnerCount;
      } else {
        courseMap.set(courseId, {
          courseName,
          learnerCount,
          runType
        });
      }
    });

    // Convert to array and sort by learner count
    const rankings = Array.from(courseMap.values())
      .sort((a, b) => b.learnerCount - a.learnerCount)
      .slice(0, 10) // Top 10
      .map((item, index) => ({
        rank: index + 1,
        courseName: item.courseName,
        numberOfLearners: item.learnerCount,
        runType: item.runType === 'DEDICATED_RUN' ? 'Dedicated Run' : 'Open Run'
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

    // Get all enrollments for this organization
    const enrollments = await prisma.courseRunLearner.findMany({
      where: {
        clientOrganizationId: organizationId,
        deletedAt: null,
        enrollmentStatus: 'ENROLLED'
      },
      select: {
        id: true,
        departmentName: true,
        attendanceStatus: true,
        learner: {
          select: {
            id: true,
            deletedAt: true
          }
        }
      }
    });

    // Aggregate by department
    const departmentMap = new Map<string, { totalLearners: Set<string>; completedCourses: number; totalEnrollments: number }>();

    enrollments.forEach(enrollment => {
      const dept = enrollment.departmentName || 'Unassigned';
      const isCompleted = enrollment.attendanceStatus === 'PRESENT' ? 1 : 0;
      const isActiveLearner = !enrollment.learner?.deletedAt;

      if (departmentMap.has(dept)) {
        const existing = departmentMap.get(dept)!;
        if (isActiveLearner) {
          existing.totalLearners.add(enrollment.learner.id);
        }
        existing.completedCourses += isCompleted;
        existing.totalEnrollments += 1;
      } else {
        const learnerSet = new Set<string>();
        if (isActiveLearner) {
          learnerSet.add(enrollment.learner.id);
        }
        departmentMap.set(dept, {
          totalLearners: learnerSet,
          completedCourses: isCompleted,
          totalEnrollments: 1
        });
      }
    });

    // Convert to array and calculate completion rate
    const rankings = Array.from(departmentMap.entries())
      .map(([deptName, data]) => ({
        divisionDepartment: deptName,
        numberOfLearners: data.totalLearners.size,
        completionRate: data.totalEnrollments > 0 
          ? Math.round((data.completedCourses / data.totalEnrollments) * 100) 
          : 0
      }))
      .sort((a, b) => b.numberOfLearners - a.numberOfLearners)
      .slice(0, 10) // Top 10
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
