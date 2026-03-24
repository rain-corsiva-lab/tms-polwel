import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

type MulterFile = Express.Multer.File;
import { z } from 'zod';
import prisma from '../lib/prisma';
import path from 'path';
import fs from 'fs';

const RESOURCE_LIBRARY_URL_PREFIX = '/uploads/resource-library';
const MAX_COVER_IMAGE_BYTES = 5 * 1024 * 1024;

function publicUrlForResourceLibraryFile(filename: string): string {
  return `${RESOURCE_LIBRARY_URL_PREFIX}/${filename}`;
}

function absolutePathFromPublicUrl(publicUrl: string): string | null {
  if (!publicUrl.startsWith('/uploads/')) return null;
  return path.join(process.cwd(), publicUrl.replace(/^\//, ''));
}

function unlinkPublicFile(publicUrl: string | null | undefined): void {
  if (!publicUrl) return;
  const abs = absolutePathFromPublicUrl(publicUrl);
  if (abs && fs.existsSync(abs)) {
    try {
      fs.unlinkSync(abs);
    } catch (e) {
      console.error('Failed to unlink resource library file:', abs, e);
    }
  }
}

function cleanupUploadedFiles(files: { path: string }[]): void {
  for (const f of files) {
    try {
      if (f.path && fs.existsSync(f.path)) {
        fs.unlinkSync(f.path);
      }
    } catch (e) {
      console.error('Failed to cleanup multer file:', f.path, e);
    }
  }
}

function getFilesRecord(req: AuthenticatedRequest): Record<string, MulterFile[]> | undefined {
  return req.files as Record<string, MulterFile[]> | undefined;
}

const MultipartResourceBodySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  targetAudience: z.enum(['TRAINING_COORDINATORS', 'ALL_USERS']).default('TRAINING_COORDINATORS'),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});

const MultipartResourceUpdateBodySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  targetAudience: z.enum(['TRAINING_COORDINATORS', 'ALL_USERS']),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  clearCoverImage: z.string().optional(),
});

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

  // Create new resource (JSON with URLs, or multipart/form-data with pdf + optional coverImage)
  async create(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const isMultipart = req.is('multipart/form-data');
    const files = getFilesRecord(req);

    if (isMultipart) {
      const pdfFile = files?.pdf?.[0] || files?.file?.[0];
      const coverFile = files?.coverImage?.[0];
      const staged: { path: string }[] = [];
      if (pdfFile) staged.push(pdfFile);
      if (coverFile) staged.push(coverFile);

      if (!pdfFile) {
        cleanupUploadedFiles(staged);
        return res.status(400).json({
          success: false,
          message: 'PDF file is required',
        });
      }

      if (!coverFile) {
        cleanupUploadedFiles(staged);
        return res.status(400).json({
          success: false,
          message: 'Cover image is required',
        });
      }

      if (coverFile.size > MAX_COVER_IMAGE_BYTES) {
        cleanupUploadedFiles(staged);
        return res.status(400).json({
          success: false,
          message: `Cover image must be at most ${MAX_COVER_IMAGE_BYTES / (1024 * 1024)} MB`,
        });
      }

      const parsed = MultipartResourceBodySchema.safeParse(req.body);
      if (!parsed.success) {
        cleanupUploadedFiles(staged);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: parsed.error.errors,
        });
      }

      const b = parsed.data;
      const fileUrl = publicUrlForResourceLibraryFile(pdfFile.filename);
      const imageUrl = publicUrlForResourceLibraryFile(coverFile.filename);
      const imageName = coverFile.originalname;
      const imageSize = coverFile.size;

      try {
        const resource = await prisma.resourceLibrary.create({
          data: {
            title: b.title,
            description: b.description || null,
            fileName: pdfFile.originalname,
            fileUrl,
            fileSize: pdfFile.size,
            mimeType: pdfFile.mimetype,
            imageUrl,
            imageName,
            imageSize,
            targetAudience: b.targetAudience,
            status: b.status,
            uploadedBy: userId,
            publishedAt: b.status === 'PUBLISHED' ? new Date() : null,
          },
          include: {
            uploader: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        return res.status(201).json({
          success: true,
          message: 'Resource created successfully',
          data: resource,
        });
      } catch (error) {
        cleanupUploadedFiles(staged);
        console.error('🔴 Error creating resource (multipart):', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create resource',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    try {
      console.log('📥 Create resource called with body:', req.body);

      const validation = ResourceLibraryCreateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors,
        });
      }

      const data = validation.data;

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
          publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
        },
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      console.log('✅ Resource created:', resource.id);

      return res.status(201).json({
        success: true,
        message: 'Resource created successfully',
        data: resource,
      });
    } catch (error) {
      console.error('🔴 Error creating resource:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create resource',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  // Update resource (JSON partial, or multipart with optional pdf / coverImage)
  async update(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Resource ID is required',
      });
    }

    const existingResource = await prisma.resourceLibrary.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingResource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    const isMultipart = req.is('multipart/form-data');
    const files = getFilesRecord(req);

    if (isMultipart) {
      const pdfFile = files?.pdf?.[0] || files?.file?.[0];
      const coverFile = files?.coverImage?.[0];

      const staged: { path: string }[] = [];
      if (pdfFile) staged.push(pdfFile);
      if (coverFile) staged.push(coverFile);

      if (coverFile && coverFile.size > MAX_COVER_IMAGE_BYTES) {
        cleanupUploadedFiles(staged);
        return res.status(400).json({
          success: false,
          message: `Cover image must be at most ${MAX_COVER_IMAGE_BYTES / (1024 * 1024)} MB`,
        });
      }

      const parsed = MultipartResourceUpdateBodySchema.safeParse(req.body);
      if (!parsed.success) {
        cleanupUploadedFiles(staged);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: parsed.error.errors,
        });
      }

      const b = parsed.data;
      const clearCover = b.clearCoverImage === '1' || b.clearCoverImage === 'true';
      const updateData: Record<string, unknown> = {
        title: b.title,
        description: b.description ?? null,
        targetAudience: b.targetAudience,
        status: b.status,
      };

      if (b.status === 'PUBLISHED' && existingResource.status !== 'PUBLISHED') {
        updateData.publishedAt = new Date();
      }

      const previousPdfUrl = existingResource.fileUrl;
      const previousImageUrl = existingResource.imageUrl;

      if (pdfFile) {
        updateData.fileName = pdfFile.originalname;
        updateData.fileUrl = publicUrlForResourceLibraryFile(pdfFile.filename);
        updateData.fileSize = pdfFile.size;
        updateData.mimeType = pdfFile.mimetype;
      }

      if (coverFile) {
        updateData.imageUrl = publicUrlForResourceLibraryFile(coverFile.filename);
        updateData.imageName = coverFile.originalname;
        updateData.imageSize = coverFile.size;
      } else if (clearCover) {
        updateData.imageUrl = null;
        updateData.imageName = null;
        updateData.imageSize = null;
      }

      try {
        const updatedResource = await prisma.resourceLibrary.update({
          where: { id },
          data: updateData as any,
          include: {
            uploader: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        if (pdfFile) {
          unlinkPublicFile(previousPdfUrl);
        }
        if (coverFile) {
          unlinkPublicFile(previousImageUrl);
        } else if (clearCover) {
          unlinkPublicFile(previousImageUrl);
        }

        return res.json({
          success: true,
          message: 'Resource updated successfully',
          data: updatedResource,
        });
      } catch (error) {
        cleanupUploadedFiles(staged);
        console.error('Error updating resource (multipart):', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update resource',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    try {
      const validation = ResourceLibraryUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.error.errors,
        });
      }

      const data = validation.data;

      const updatePayload: any = { ...data };
      if (data.status === 'PUBLISHED' && existingResource.status !== 'PUBLISHED') {
        updatePayload.publishedAt = new Date();
      }

      const updatedResource = await prisma.resourceLibrary.update({
        where: { id },
        data: updatePayload,
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return res.json({
        success: true,
        message: 'Resource updated successfully',
        data: updatedResource,
      });
    } catch (error) {
      console.error('Error updating resource:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update resource',
        error: error instanceof Error ? error.message : 'Unknown error',
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
