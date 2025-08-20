import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { PrismaClient, CourseStatus } from '@prisma/client';
import AuditService from '../services/auditService';

const prisma = new PrismaClient();

// Validation schemas based on actual schema and frontend form
const CourseCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
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
  trainers: z.union([z.array(z.string()), z.any()]).default([]),
  remarks: z.string().optional(),
  courseOutline: z.any().optional(), // JSON
  syllabus: z.string().optional(),
  assessmentMethod: z.string().optional(),
  
  // Financial fields matching frontend
  courseFee: z.number().default(0),
  venueFee: z.number().default(0),
  trainerFee: z.number().default(0),
  amountPerPax: z.number().default(0),
  discount: z.number().default(0),
  adminFees: z.number().default(0),
  contingencyFees: z.number().default(0),
  serviceFees: z.number().default(0),
  vitalFees: z.number().default(0),
  
  status: z.nativeEnum(CourseStatus).default('DRAFT' as CourseStatus)
});

const CourseUpdateSchema = CourseCreateSchema.partial();

const CourseStatusSchema = z.object({
  status: z.nativeEnum(CourseStatus)
});

export const coursesController = {
  // Get all courses with pagination and filtering
  async getCourses(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const {
        page = '1',
        limit = '10',
        search,
        category,
        status,
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
          { title: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { category: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      if (category && category !== 'all') {
        where.category = category as string;
      }

      if (status && status !== 'all') {
        where.status = status as CourseStatus;
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

      // Calculate financial metrics for each course using actual schema fields
      const coursesWithMetrics = courses.map((course: any) => {
        const totalFeesPerPax = course.amountPerPax || 0;
        const totalCostPerPax = (course.courseFee + course.venueFee + course.trainerFee + course.adminFees + course.contingencyFees + course.serviceFees + course.vitalFees) / (course.maxParticipants || 1);
        
        const totalRevenue = totalFeesPerPax * (course.maxParticipants || 0);
        const totalCost = totalCostPerPax * (course.maxParticipants || 0);
        const totalProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        return {
          ...course,
          calculatedMetrics: {
            totalRevenue: totalRevenue,
            totalCost: totalCost,
            totalProfit: totalProfit,
            profitMargin: profitMargin
          }
        };
      });

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

      // Calculate financial metrics using actual schema fields
      const totalFeesPerPax = course.amountPerPax || 0;
      const totalCostPerPax = (course.courseFee + course.venueFee + course.trainerFee + course.adminFees + course.contingencyFees + course.serviceFees + course.vitalFees) / (course.maxParticipants || 1);
      
      const totalRevenue = totalFeesPerPax * (course.maxParticipants || 0);
      const totalCost = totalCostPerPax * (course.maxParticipants || 0);
      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      const courseWithMetrics = {
        ...course,
        calculatedMetrics: {
          totalRevenue: totalRevenue,
          totalCost: totalCost,
          totalProfit: totalProfit,
          profitMargin: profitMargin
        }
      };

      return res.json({
        success: true,
        data: { course: courseWithMetrics }
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
        status: data.status,
        certificates: data.certificates,
        createdBy: userId
      };

      // Add optional fields only if they exist - matching actual schema
      if (data.description !== undefined) courseData.description = data.description;
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
      if (data.trainers !== undefined) courseData.trainers = data.trainers;
      if (data.remarks !== undefined) courseData.remarks = data.remarks;
      if (data.courseOutline !== undefined) courseData.courseOutline = data.courseOutline;
      if (data.syllabus !== undefined) courseData.syllabus = data.syllabus;
      if (data.assessmentMethod !== undefined) courseData.assessmentMethod = data.assessmentMethod;
      
      // Financial fields
      if (data.courseFee !== undefined) courseData.courseFee = data.courseFee;
      if (data.venueFee !== undefined) courseData.venueFee = data.venueFee;
      if (data.trainerFee !== undefined) courseData.trainerFee = data.trainerFee;
      if (data.amountPerPax !== undefined) courseData.amountPerPax = data.amountPerPax;
      if (data.discount !== undefined) courseData.discount = data.discount;
      if (data.adminFees !== undefined) courseData.adminFees = data.adminFees;
      if (data.contingencyFees !== undefined) courseData.contingencyFees = data.contingencyFees;
      if (data.serviceFees !== undefined) courseData.serviceFees = data.serviceFees;
      if (data.vitalFees !== undefined) courseData.vitalFees = data.vitalFees;

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
        const value = data[key as keyof typeof data];
        if (value !== undefined) {
          updateData[key] = value;
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
  async updateCourseStatus(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Course ID is required'
        });
      }

      // Validate input
      const validation = CourseStatusSchema.safeParse(req.body);
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

      const { status } = validation.data;
      const oldStatus = existingCourse.status;

      const updatedCourse = await prisma.course.update({
        where: { id },
        data: { status },
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
          action: 'Course Status Changed',
          actionType: 'STATUS_CHANGE',
          tableName: 'courses',
          recordId: id,
          oldValues: { status: oldStatus },
          newValues: { status },
          details: `Changed course status from ${oldStatus} to ${status} for: ${updatedCourse.title}`,
          performedBy: req.user.userId
        }, req);
      }

      return res.json({
        success: true,
        message: 'Course status updated successfully',
        data: { course: updatedCourse }
      });
    } catch (error) {
      console.error('Error updating course status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update course status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Get course statistics
  async getCourseStatistics(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      // Get total counts by status
      const statusCounts = await prisma.course.groupBy({
        by: ['status'],
        _count: {
          id: true
        }
      });

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

      // Get total courses count
      const totalCourses = await prisma.course.count();

      // Get recent courses
      const recentCourses = await prisma.course.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          creator: {
            select: {
              name: true
            }
          }
        }
      });

      // Calculate financial statistics using actual schema fields
      const financialStats = await prisma.course.aggregate({
        _avg: {
          courseFee: true,
          venueFee: true,
          trainerFee: true,
          amountPerPax: true,
          adminFees: true,
          contingencyFees: true,
          serviceFees: true,
          vitalFees: true
        },
        _sum: {
          courseFee: true,
          venueFee: true,
          trainerFee: true,
          amountPerPax: true
        },
        _count: {
          id: true
        }
      });

      return res.json({
        success: true,
        data: {
          totalCourses,
          statusBreakdown: statusCounts.reduce((acc: Record<string, number>, curr: any) => {
            acc[curr.status] = curr._count.id;
            return acc;
          }, {}),
          categoryBreakdown: categoryCounts.reduce((acc: Record<string, number>, curr: any) => {
            if (curr.category) {
              acc[curr.category] = curr._count.id;
            }
            return acc;
          }, {}),
          recentCourses,
          financialStats: {
            averageCourseFee: financialStats._avg?.courseFee || 0,
            averageVenueFee: financialStats._avg?.venueFee || 0,
            averageTrainerFee: financialStats._avg?.trainerFee || 0,
            averageAmountPerPax: financialStats._avg?.amountPerPax || 0,
            averageAdminFees: financialStats._avg?.adminFees || 0,
            totalCourseFees: financialStats._sum?.courseFee || 0,
            totalVenueFees: financialStats._sum?.venueFee || 0,
            totalTrainerFees: financialStats._sum?.trainerFee || 0
          }
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
