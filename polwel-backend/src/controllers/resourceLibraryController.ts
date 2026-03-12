import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import prisma from '../lib/prisma';
import path from 'path';
import fs from 'fs';

// Validation schemas
const ResourceLibraryCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().min(1, "File URL is required"),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  imageUrl: z.string().optional().nullable(),
  imageName: z.string().optional().nullable(),
  imageSize: z.number().optional().nullable(),
  targetAudience: z.enum(['TRAINING_COORDINATORS', 'ALL_USERS']).default('TRAINING_COORDINATORS'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'DELETED']).default('DRAFT'),
});

const ResourceLibraryUpdateSchema = ResourceLibraryCreateSchema.partial();

export const resourceLibraryController = {
  // Get all resource library items with filtering and pagination
  async getAll(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      console.log('📥 getResourceLibrary called with query:', req.query);

      const {
        page = '1',
        limit = '50',
        search,
        status,
        targetAudience,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Validate and sanitize pagination parameters
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(200, Math.max(1, parseInt(limit as string) || 50));
      const skip = (pageNum - 1) * limitNum;

      // Validate sortBy field
      const allowedSortFields = ['createdAt', 'updatedAt', 'title', 'status', 'publishedAt'];
      const safeSortBy = allowedSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';
      const safeSortOrder = (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder : 'desc';

      console.log('📊 Pagination:', { pageNum, limitNum, skip });
      console.log('🔄 Sort:', { sortBy: safeSortBy, sortOrder: safeSortOrder });

      // Build where clause
      const where: any = {
        deletedAt: null // Only show non-deleted items
      };

      if (search && typeof search === 'string' && search.trim()) {
        where.OR = [
          { title: { contains: search.trim() } },
          { description: { contains: search.trim() } },
        ];
      }

      if (status && status !== 'all' && typeof status === 'string') {
        where.status = status;
      }

      if (targetAudience && targetAudience !== 'all' && typeof targetAudience === 'string') {
        where.targetAudience = targetAudience;
      }

      console.log('🔍 Where clause:', JSON.stringify(where, null, 2));

      // Get resources with uploader info
      const resources = await prisma.resourceLibrary.findMany({
        where,
        orderBy: {
          [safeSortBy]: safeSortOrder
        },
        skip,
        take: limitNum,
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Get total count for pagination
      const totalResources = await prisma.resourceLibrary.count({ where });

      console.log('✅ Query successful:', { resourcesCount: resources.length, totalResources });

      const totalPages = Math.ceil(totalResources / limitNum);

      const responseData = {
        success: true,
        data: resources,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalResources,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      };

      console.log('📤 Sending response:', { 
        resourcesCount: resources.length, 
        pagination: responseData.pagination 
      });

      return res.json(responseData);
    } catch (error) {
      console.error('🔴 Error in getResourceLibrary:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch resource library items',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Get single resource by ID
  async getById(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID is required'
        });
      }

      const resource = await prisma.resourceLibrary.findFirst({
        where: { 
          id,
          deletedAt: null
        },
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      return res.json({
        success: true,
        data: resource
      });
    } catch (error) {
      console.error('Error fetching resource:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch resource',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Create new resource
  async create(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      console.log('📥 Create resource called with body:', req.body);

      // Validate input
      const validation = ResourceLibraryCreateSchema.safeParse(req.body);
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

      // Create resource
      const resource = await prisma.resourceLibrary.create({
        data: {
          title: data.title,
          description: data.description || null,
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          fileSize: data.fileSize || null,
          mimeType: data.mimeType || null,
          imageUrl: data.imageUrl || null,
          imageName: data.imageName || null,
          imageSize: data.imageSize || null,
          targetAudience: data.targetAudience,
          status: data.status,
          uploadedBy: userId,
          publishedAt: data.status === 'PUBLISHED' ? new Date() : null
        },
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      console.log('✅ Resource created:', resource.id);

      return res.status(201).json({
        success: true,
        message: 'Resource created successfully',
        data: resource
      });
    } catch (error) {
      console.error('🔴 Error creating resource:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create resource',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Update resource
  async update(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID is required'
        });
      }

      // Validate input
      const validation = ResourceLibraryUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors
        });
      }

      // Check if resource exists
      const existingResource = await prisma.resourceLibrary.findFirst({
        where: { id, deletedAt: null }
      });

      if (!existingResource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      const data = validation.data;

      // Update publishedAt if status changes to PUBLISHED
      const updateData: any = { ...data };
      if (data.status === 'PUBLISHED' && existingResource.status !== 'PUBLISHED') {
        updateData.publishedAt = new Date();
      }

      const updatedResource = await prisma.resourceLibrary.update({
        where: { id },
        data: updateData,
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return res.json({
        success: true,
        message: 'Resource updated successfully',
        data: updatedResource
      });
    } catch (error) {
      console.error('Error updating resource:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update resource',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Update status (toggle between DRAFT and PUBLISHED)
  async updateStatus(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID is required'
        });
      }

      if (!status || !['DRAFT', 'PUBLISHED'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Valid status (DRAFT or PUBLISHED) is required'
        });
      }

      // Check if resource exists
      const existingResource = await prisma.resourceLibrary.findFirst({
        where: { id, deletedAt: null }
      });

      if (!existingResource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      const updatedResource = await prisma.resourceLibrary.update({
        where: { id },
        data: {
          status,
          publishedAt: status === 'PUBLISHED' ? new Date() : existingResource.publishedAt
        },
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return res.json({
        success: true,
        message: `Resource ${status === 'PUBLISHED' ? 'published' : 'set to draft'} successfully`,
        data: updatedResource
      });
    } catch (error) {
      console.error('Error updating resource status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update resource status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Soft delete resource
  async delete(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID is required'
        });
      }

      // Check if resource exists
      const existingResource = await prisma.resourceLibrary.findFirst({
        where: { id, deletedAt: null }
      });

      if (!existingResource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Soft delete
      await prisma.resourceLibrary.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: 'DELETED'
        }
      });

      return res.json({
        success: true,
        message: 'Resource deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting resource:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete resource',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};
