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

// Ensure directory exists
if (!fs.existsSync(attachmentsDir)) {
  fs.mkdirSync(attachmentsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, attachmentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
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
  upload.single('file'),
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

export default router;
