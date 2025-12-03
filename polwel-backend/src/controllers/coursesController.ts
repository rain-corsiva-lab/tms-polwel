import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import prisma from '../lib/prisma';
import AuditService from '../services/auditService';
import sanitizeHtml from 'sanitize-html';



// Validation schemas based on actual schema and frontend form
const CourseCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  courseCode: z.string().trim().max(5, "Course code must be at most 5 characters"),
  description: z.string().optional(),
  learningObjectives: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  objectives: z.union([z.array(z.string()), z.any()]).default([]),
  targetAudience: z.string().optional(),
  prerequisites: z.union([z.array(z.string()), z.any()]).default([]),
  materials: z.union([z.array(z.string()), z.any()]).default([]),
  duration: z.string().min(1, "Duration is required").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 1;
  }, { message: "Duration must be at least 1" }),
  durationType: z.string().default("days"),
  maxParticipants: z.number().int().positive().nullable().optional(),
  minParticipants: z.union([z.number().int().positive(), z.null()]).transform(val => val ?? 1).default(1),
  certificates: z.string().default("polwel"),
  certificationType: z.string().optional(),
  level: z.string().optional(),
  venueId: z.string().optional(),
  specifiedLocation: z.string().optional(),
  remarks: z.string().optional(),
  syllabus: z.string().optional(),
  assessmentMethod: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  
  // Simplified financial fields - allow null and transform to default
  defaultCourseFee: z.union([z.number(), z.null()]).transform(val => val ?? 0).default(0),
  contractFees: z.union([z.number(), z.null()]).transform(val => val ?? 0).default(0),
  venueFee: z.number().nullable().optional(),
  venueFeeType: z.string().optional(), // Fee type suffix (/ venue or / head)
  discounts: z.union([z.array(z.object({ id: z.string().optional(), name: z.string(), percentage: z.number().nonnegative().max(100) })), z.any()]).optional(),
  venueMaxParticipants: z.number().int().positive().nullable().optional(),
  perHeadPriceIfMaxExceed: z.number().nullable().optional()
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

      // Get courses
      const courses = await prisma.course.findMany({
        where,
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
        courses: coursesWithMetrics,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCourses,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
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
          courseTrainers: {
            include: {
              trainer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  partnerOrganization: true,
                  specializations: true
                }
              }
            }
          },
          coursePartners: {
            include: {
              partner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  status: true
                }
              }
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

      // Additional business validations
      const validationErrors: string[] = [];

      // Validate trainer requirement
      if (!req.body.trainers || !Array.isArray(req.body.trainers) || req.body.trainers.length === 0) {
        validationErrors.push('At least one trainer is required');
      }

      // Validate venue pricing fields when venueFeeType is PER_VENUE (if provided, they must be valid)
      if (data.venueFeeType === 'PER_VENUE') {
        if (data.venueMaxParticipants !== null && data.venueMaxParticipants !== undefined && data.venueMaxParticipants <= 0) {
          validationErrors.push('Max Participants (Venue) must be greater than 0 if provided');
        }
        if (data.perHeadPriceIfMaxExceed !== null && data.perHeadPriceIfMaxExceed !== undefined && data.perHeadPriceIfMaxExceed < 0) {
          validationErrors.push('Per Head Price If Max Exceed must be 0 or greater if provided');
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors.map(msg => ({ message: msg }))
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Create course data object
      const courseData: any = {
        title: data.title,
        certificates: data.certificates
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
      if (data.learningObjectives !== undefined) {
        courseData.learningObjectives = sanitizeHtml(data.learningObjectives, {
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
      // Only set venueId if it's a valid non-empty string (prevents foreign key constraint violation)
      if (data.venueId !== undefined && data.venueId !== null && data.venueId !== '') {
        courseData.venueId = data.venueId;
      }
      if (data.specifiedLocation !== undefined) courseData.specifiedLocation = data.specifiedLocation;
      if (data.remarks !== undefined) courseData.remarks = data.remarks;
      if (data.syllabus !== undefined) courseData.syllabus = data.syllabus;
      if (data.assessmentMethod !== undefined) courseData.assessmentMethod = data.assessmentMethod;
      if (data.status !== undefined) courseData.status = data.status;
      
      // Simplified financial fields
      if (data.defaultCourseFee !== undefined) courseData.defaultCourseFee = data.defaultCourseFee;
      if (data.contractFees !== undefined) courseData.contractFees = data.contractFees;
      if (data.venueFee !== undefined) courseData.venueFee = data.venueFee;
      if (data.venueFeeType !== undefined) courseData.venueFeeType = data.venueFeeType;
      if (data.discounts !== undefined) courseData.discounts = data.discounts;
      if (data.venueMaxParticipants !== undefined) courseData.venueMaxParticipants = data.venueMaxParticipants;
      if (data.perHeadPriceIfMaxExceed !== undefined) courseData.perHeadPriceIfMaxExceed = data.perHeadPriceIfMaxExceed;

      const course = await prisma.course.create({
        data: courseData
      });

      // Handle trainers and partners via pivot tables if provided
      if (req.body.trainers && Array.isArray(req.body.trainers) && req.body.trainers.length > 0) {
        // Separate trainers (Users) and partners (Partners) based on their existence in respective tables
        const trainersAndPartners = await Promise.all(
          req.body.trainers.map(async (item: any) => {
            // Support both string IDs (legacy) and objects with {id, feePerRun, remarks}
            const itemId = typeof item === 'string' ? item : item.id;
            const feePerRun = typeof item === 'object' && item.feePerRun !== undefined ? item.feePerRun : (courseData.contractFees || 0);
            const remarks = typeof item === 'object' && item.remarks ? item.remarks : null;
            
            const user = await prisma.user.findUnique({ where: { id: itemId }, select: { id: true, role: true } });
            if (user && user.role === 'TRAINER') {
              return { type: 'trainer', id: itemId, feePerRun, remarks };
            }
            const partner = await prisma.partner.findUnique({ where: { id: itemId }, select: { id: true } });
            if (partner) {
              return { type: 'partner', id: itemId };
            }
            return null;
          })
        );

        const trainers = trainersAndPartners.filter((item) => item?.type === 'trainer');
        const partners = trainersAndPartners.filter((item) => item?.type === 'partner').map((item) => item!.id);

        if (trainers.length > 0) {
          // If syncRemarksToTrainers flag is true, use course-level remarks for all trainers
          const remarksToUse = req.body.syncRemarksToTrainers ? data.remarks : null;
          
          await prisma.courseTrainer.createMany({
            data: trainers.map((trainer) => ({ 
              courseId: course.id, 
              trainerId: trainer!.id,
              feePerRun: trainer!.feePerRun,
              remarks: remarksToUse !== null ? remarksToUse : trainer!.remarks
            })),
            skipDuplicates: true
          });
        }

        if (partners.length > 0) {
          await prisma.coursePartner.createMany({
            data: partners.map((partnerId) => ({ courseId: course.id, partnerId })),
            skipDuplicates: true
          });
        }
      }

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

      // Additional business validations
      const validationErrors: string[] = [];

      // Validate trainer requirement if trainers array is provided
      if (req.body.trainers !== undefined) {
        if (!Array.isArray(req.body.trainers) || req.body.trainers.length === 0) {
          validationErrors.push('At least one trainer is required');
        }
      }

      // Validate venue pricing fields when venueFeeType is PER_VENUE (if provided, they must be valid)
      if (data.venueFeeType === 'PER_VENUE') {
        if (data.venueMaxParticipants !== null && data.venueMaxParticipants !== undefined && data.venueMaxParticipants <= 0) {
          validationErrors.push('Max Participants (Venue) must be greater than 0 if provided');
        }
        if (data.perHeadPriceIfMaxExceed !== null && data.perHeadPriceIfMaxExceed !== undefined && data.perHeadPriceIfMaxExceed < 0) {
          validationErrors.push('Per Head Price If Max Exceed must be 0 or greater if provided');
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors.map(msg => ({ message: msg }))
        });
      }

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
          } else if (key === 'learningObjectives' && typeof value === 'string') {
            updateData.learningObjectives = sanitizeHtml(value, {
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
            } else if (key === 'venueMaxParticipants' || key === 'perHeadPriceIfMaxExceed') {
              // Explicitly handle nullable venue pricing fields
              updateData[key] = value;
            } else if (key === 'venueId') {
              // Only set venueId if it's a valid non-empty string, otherwise set to null
              updateData[key] = (value && value !== '') ? value : null;
            } else {
              updateData[key] = value;
            }
          }
        }
      });

      const updatedCourse = await prisma.course.update({
        where: { id },
        data: updateData
      });

      // Handle trainers and partners via pivot tables if provided
      if (req.body.trainers && Array.isArray(req.body.trainers)) {
        // Delete existing trainer and partner associations
        await prisma.courseTrainer.deleteMany({
          where: { courseId: id }
        });
        await prisma.coursePartner.deleteMany({
          where: { courseId: id }
        });

        // Create new associations
        if (req.body.trainers.length > 0) {
          // Separate trainers (Users) and partners (Partners)
          const trainersAndPartners = await Promise.all(
            req.body.trainers.map(async (item: any) => {
              // Support both string IDs (legacy) and objects with {id, feePerRun, remarks}
              const itemId = typeof item === 'string' ? item : item.id;
              const feePerRun = typeof item === 'object' && item.feePerRun !== undefined ? item.feePerRun : (data.contractFees || 0);
              const remarks = typeof item === 'object' && item.remarks ? item.remarks : null;
              
              const user = await prisma.user.findUnique({ where: { id: itemId }, select: { id: true, role: true } });
              if (user && user.role === 'TRAINER') {
                return { type: 'trainer', id: itemId, feePerRun, remarks };
              }
              const partner = await prisma.partner.findUnique({ where: { id: itemId }, select: { id: true } });
              if (partner) {
                return { type: 'partner', id: itemId };
              }
              return null;
            })
          );

          const trainers = trainersAndPartners.filter((item) => item?.type === 'trainer');
          const partners = trainersAndPartners.filter((item) => item?.type === 'partner').map((item) => item!.id);

          if (trainers.length > 0) {
            // If syncRemarksToTrainers flag is true, use course-level remarks for all trainers
            const remarksToUse = req.body.syncRemarksToTrainers ? data.remarks : null;
            
            await prisma.courseTrainer.createMany({
              data: trainers.map((trainer) => ({ 
                courseId: id, 
                trainerId: trainer!.id,
                feePerRun: trainer!.feePerRun,
                remarks: remarksToUse !== null ? remarksToUse : trainer!.remarks
              })),
              skipDuplicates: true
            });
          }

          if (partners.length > 0) {
            await prisma.coursePartner.createMany({
              data: partners.map((partnerId) => ({ courseId: id, partnerId })),
              skipDuplicates: true
            });
          }
        }
      }

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

  // Toggle course status (ACTIVE/INACTIVE)
  async toggleCourseStatus(req: AuthenticatedRequest, res: Response): Promise<Response> {
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

      // Toggle status
      const newStatus = existingCourse.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

      const updatedCourse = await prisma.course.update({
        where: { id },
        data: { status: newStatus }
      });

      // Log audit trail
      if (req.user?.userId) {
        await AuditService.log({
          userId: req.user.userId,
          action: 'Course Status Updated',
          actionType: 'STATUS_CHANGE',
          tableName: 'courses',
          recordId: id,
          oldValues: { status: existingCourse.status },
          newValues: { status: newStatus },
          details: `Changed course status from ${existingCourse.status} to ${newStatus}: ${existingCourse.title}`,
          performedBy: req.user.userId
        }, req);
      }

      return res.json({
        success: true,
        message: `Course ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
        data: { course: updatedCourse }
      });
    } catch (error) {
      console.error('Error toggling course status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to toggle course status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

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
          createdAt: true
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
