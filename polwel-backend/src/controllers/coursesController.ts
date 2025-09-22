import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import prisma from '../lib/prisma';
import AuditService from '../services/auditService';
import sanitizeHtml from 'sanitize-html';



// Validation schemas based on actual schema and frontend form
const CourseCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  courseCode: z.string().trim().min(3, "Course code must be at least 3 chars").max(50).optional(),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  objectives: z.union([z.array(z.string()), z.any()]).default([]),
  targetAudience: z.string().optional(),
  prerequisites: z.union([z.array(z.string()), z.any()]).default([]),
  materials: z.union([z.array(z.string()), z.any()]).default([]),
  duration: z.string().optional(),
  durationType: z.string().default("days"),
  maxParticipants: z.number().int().positive().default(25),
  minParticipants: z.number().int().positive().default(1),
  certificates: z.string().default("polwel"),
  certificationType: z.string().optional(),
  level: z.string().optional(),
  venue: z.string().optional(),
  specifiedLocation: z.string().optional(),
  trainers: z.union([z.array(z.string()), z.any()]).default([]),
  remarks: z.string().optional(),
  courseOutline: z.any().optional(), // JSON
  syllabus: z.string().optional(),
  assessmentMethod: z.string().optional(),
  
  // Simplified financial fields
  defaultCourseFee: z.number().default(0),
  billingRate: z.number().default(0),
  venueFee: z.number().default(0), // used as Venue Expenses
  venueFeeType: z.string().optional(), // Fee type suffix (/ venue or / head)
  contractsFeePayout: z.number().default(0),
  discounts: z.union([z.array(z.object({ id: z.string().optional(), name: z.string(), percentage: z.number().nonnegative().max(100) })), z.any()]).optional()
});

const CourseUpdateSchema = CourseCreateSchema.partial();

export const coursesController = {
  // Get all courses with pagination and filtering
  async getCourses(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const {
        page = '1',
        limit = '10',
        search,
        category,
        certificates,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { title: { contains: search as string } },
          { description: { contains: search as string } },
          { category: { contains: search as string } }
        ];
      }

      if (category && category !== 'all') {
        where.category = category as string;
      }

      if (certificates && certificates !== 'all') {
        where.certificates = certificates as string;
      }

      // Get courses with creator info
      const courses = await prisma.course.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          [sortBy as string]: sortOrder as 'asc' | 'desc'
        },
        skip,
        take: limitNum
      });

      // Get total count for pagination
      const totalCourses = await prisma.course.count({ where });

  const coursesWithMetrics = courses; // Metrics removed per new simplified model

      const totalPages = Math.ceil(totalCourses / limitNum);

      return res.json({
        success: true,
        data: {
          courses: coursesWithMetrics,
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalCourses,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          }
        }
      });
    } catch (error) {
      console.error('Error fetching courses:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch courses',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Get single course by ID
  async getCourseById(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Course ID is required'
        });
      }

      const course = await prisma.course.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      return res.json({
        success: true,
        data: { course }
      });
    } catch (error) {
      console.error('Error fetching course:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch course',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Create new course
  async createCourse(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      // Validate input
      const validation = CourseCreateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors
        });
      }

      const data = validation.data;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Create course data object
      const courseData: any = {
        title: data.title,
        certificates: data.certificates,
        creator: { connect: { id: userId } }
      };

      if (data.courseCode) {
        courseData.courseCode = data.courseCode.toUpperCase();
      }

      // Add optional fields only if they exist - matching actual schema
      if (data.description !== undefined) {
        courseData.description = sanitizeHtml(data.description, {
          allowedTags: ['h1','h2','h3','h4','h5','h6','blockquote','p','a','ul','ol','li','b','i','strong','em','u','strike','code','hr','br','div','span','img'],
          allowedAttributes: {
            a: ['href','name','target','rel'],
            img: ['src','alt','title'],
            span: ['style'],
            p: ['style'],
            div: ['style']
          },
          allowedSchemes: ['data','http','https']
        });
      }
      if (data.category !== undefined) courseData.category = data.category;
      if (data.objectives !== undefined) courseData.objectives = data.objectives;
      if (data.targetAudience !== undefined) courseData.targetAudience = data.targetAudience;
      if (data.prerequisites !== undefined) courseData.prerequisites = data.prerequisites;
      if (data.materials !== undefined) courseData.materials = data.materials;
      if (data.duration !== undefined) courseData.duration = data.duration;
      if (data.durationType !== undefined) courseData.durationType = data.durationType;
      if (data.maxParticipants !== undefined) courseData.maxParticipants = data.maxParticipants;
      if (data.minParticipants !== undefined) courseData.minParticipants = data.minParticipants;
      if (data.certificationType !== undefined) courseData.certificationType = data.certificationType;
      if (data.level !== undefined) courseData.level = data.level;
      if (data.venue !== undefined) courseData.venue = data.venue;
  if (data.specifiedLocation !== undefined) courseData.specifiedLocation = data.specifiedLocation;
      if (data.trainers !== undefined) courseData.trainers = data.trainers;
      if (data.remarks !== undefined) courseData.remarks = data.remarks;
      if (data.courseOutline !== undefined) courseData.courseOutline = data.courseOutline;
      if (data.syllabus !== undefined) courseData.syllabus = data.syllabus;
      if (data.assessmentMethod !== undefined) courseData.assessmentMethod = data.assessmentMethod;
      
  // Simplified financial fields
  if (data.defaultCourseFee !== undefined) courseData.defaultCourseFee = data.defaultCourseFee;
  if (data.billingRate !== undefined) courseData.billingRate = data.billingRate;
  if (data.venueFee !== undefined) courseData.venueFee = data.venueFee;
  if (data.venueFeeType !== undefined) courseData.venueFeeType = data.venueFeeType;
  if (data.contractsFeePayout !== undefined) courseData.contractsFeePayout = data.contractsFeePayout;
  if (data.discounts !== undefined) courseData.discounts = data.discounts;

      const course = await prisma.course.create({
        data: courseData,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Log audit trail
      if (req.user?.userId) {
        await AuditService.log({
          userId: req.user.userId,
          action: 'Course Created',
          actionType: 'CREATION',
          tableName: 'courses',
          recordId: course.id,
          newValues: course,
          details: `Created course: ${course.title}`,
          performedBy: req.user.userId
        }, req);
      }

      return res.status(201).json({
        success: true,
        message: 'Course created successfully',
        data: { course }
      });
    } catch (error) {
      console.error('Error creating course:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create course',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Update course
  async updateCourse(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Course ID is required'
        });
      }

      // Validate input
      const validation = CourseUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors
        });
      }

      // Check if course exists
      const existingCourse = await prisma.course.findUnique({
        where: { id }
      });

      if (!existingCourse) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      const data = validation.data;

      // Create update data object, only including defined fields
      const updateData: any = {};
      Object.keys(data).forEach(key => {
        if (key === 'createdBy' || key === 'creator') return; // prevent manual creator change
        const value = data[key as keyof typeof data];
        if (value !== undefined) {
          if (key === 'description' && typeof value === 'string') {
            updateData.description = sanitizeHtml(value, {
              allowedTags: ['h1','h2','h3','h4','h5','h6','blockquote','p','a','ul','ol','li','b','i','strong','em','u','strike','code','hr','br','div','span','img'],
              allowedAttributes: {
                a: ['href','name','target','rel'],
                img: ['src','alt','title'],
                span: ['style'],
                p: ['style'],
                div: ['style']
              },
              allowedSchemes: ['data','http','https']
            });
          } else {
            if (key === 'courseCode' && typeof value === 'string') {
              updateData.courseCode = value.toUpperCase();
            } else {
              updateData[key] = value;
            }
          }
        }
      });

      const updatedCourse = await prisma.course.update({
        where: { id },
        data: updateData,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Log audit trail
      if (req.user?.userId) {
        await AuditService.log({
          userId: req.user.userId,
          action: 'Course Updated',
          actionType: 'UPDATE',
          tableName: 'courses',
          recordId: id,
          oldValues: existingCourse,
          newValues: updatedCourse,
          details: `Updated course: ${updatedCourse.title}`,
          performedBy: req.user.userId
        }, req);
      }

      return res.json({
        success: true,
        message: 'Course updated successfully',
        data: { course: updatedCourse }
      });
    } catch (error) {
      console.error('Error updating course:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update course',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Delete course
  async deleteCourse(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Course ID is required'
        });
      }

      // Check if course exists
      const existingCourse = await prisma.course.findUnique({
        where: { id }
      });

      if (!existingCourse) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check if course has any active bookings or runs
      // Note: We'll skip this check for now since those relations might not exist yet
      // This can be added later when those models are implemented

      // Delete the course
      await prisma.course.delete({
        where: { id }
      });

      // Log audit trail
      if (req.user?.userId) {
        await AuditService.log({
          userId: req.user.userId,
          action: 'Course Deleted',
          actionType: 'DELETION',
          tableName: 'courses',
          recordId: id,
          oldValues: existingCourse,
          details: `Deleted course: ${existingCourse.title}`,
          performedBy: req.user.userId
        }, req);
      }

      return res.json({
        success: true,
        message: 'Course deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting course:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete course',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Update course status
  // Get course statistics
  async getCourseStatistics(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      // Get total courses
      const totalCourses = await prisma.course.count();

      // Get total counts by category
      const categoryCounts = await prisma.course.groupBy({
        by: ['category'],
        _count: {
          id: true
        },
        where: {
          category: {
            not: null
          }
        }
      });

      // Get recent courses
      const recentCourses = await prisma.course.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          creator: {
            select: {
              name: true
            }
          }
        }
      });

      return res.json({
        success: true,
        data: {
          totalCourses,
          categoryBreakdown: categoryCounts.reduce((acc: Record<string, number>, curr: any) => {
            if (curr.category) acc[curr.category] = curr._count.id;
            return acc;
          }, {}),
          recentCourses
        }
      });
    } catch (error) {
      console.error('Error fetching course statistics:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch course statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};
