import express, { Request, Response, Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const router = Router();

// Configure multer for email attachments
const attachmentsDir = path.join(process.cwd(), 'uploads/email-attachments');
const resourceLibraryDir = path.join(process.cwd(), 'uploads/resource-library');

// Ensure directories exist
if (!fs.existsSync(attachmentsDir)) {
  fs.mkdirSync(attachmentsDir, { recursive: true });
}
if (!fs.existsSync(resourceLibraryDir)) {
  fs.mkdirSync(resourceLibraryDir, { recursive: true });
}

const storageEmailAttachments = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, attachmentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const storageResourceLibrary = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, resourceLibraryDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const uploadEmailAttachment = multer({
  storage: storageEmailAttachments,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB - Microsoft Outlook restriction
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

const uploadResourceLibrary = multer({
  storage: storageResourceLibrary,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for PDF documents
  },
  fileFilter: (req, file, cb) => {
    // Allow only PDF files for resource library
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for Resource Library'));
    }
  },
});

const buildErrorResponse = (method: string, userMessage: string, error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  return {
    success: false,
    error: userMessage,
    message: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
  };
};

// POST /api/uploads/email-attachments - Upload email attachment
router.post(
  '/email-attachments',
  authenticateToken,
  uploadEmailAttachment.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file provided',
        });
        return;
      }

      const userId = (req as any).user?.id || 'system';

      // Store file metadata in database
      const media = await prisma.media.create({
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: req.file.path, // Store absolute path for email attachment
          mimeType: req.file.mimetype,
          size: req.file.size,
        },
      });

      res.json({
        success: true,
        fileId: media.id,
        id: media.id,
        originalName: media.originalName,
        filename: media.filename,
        path: media.path,
      });
    } catch (error) {
      console.error('Error uploading attachment:', error);

      // Clean up uploaded file if there was an error
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkErr) {
          console.error('Error deleting uploaded file:', unlinkErr);
        }
      }

      res.status(500).json(buildErrorResponse('uploadsRoute.emailAttachments', 'Failed to upload attachment', error));
    }
  },
);

// POST /api/uploads/media/upload - Upload media file (for Resource Library PDFs)
router.post(
  '/media/upload',
  authenticateToken,
  uploadResourceLibrary.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file provided',
        });
        return;
      }

      const userId = (req as any).user?.userId || (req as any).user?.id || 'system';

      // Build the URL for the uploaded file
      const fileUrl = `/uploads/resource-library/${req.file.filename}`;

      // Store file metadata in database
      const media = await prisma.media.create({
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: fileUrl, // Store relative URL path
          mimeType: req.file.mimetype,
          size: req.file.size,
        },
      });

      res.json({
        success: true,
        url: fileUrl,
        fileId: media.id,
        id: media.id,
        originalName: media.originalName,
        filename: media.filename,
        mimeType: media.mimeType,
        size: media.size,
      });
    } catch (error) {
      console.error('Error uploading media file:', error);

      // Clean up uploaded file if there was an error
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkErr) {
          console.error('Error deleting uploaded file:', unlinkErr);
        }
      }

      res.status(500).json(buildErrorResponse('uploadsRoute.mediaUpload', 'Failed to upload file', error));
    }
  },
);

export default router;
