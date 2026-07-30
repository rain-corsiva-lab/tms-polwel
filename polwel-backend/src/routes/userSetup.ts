import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { UserStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import AuditService from '../services/auditService';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { onboardingSchema } from '../schemas/authSchemas';

const router = express.Router();

// Verify setup token
router.get(
  '/verify-token/:token',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Setup token is required',
        code: 'BAD_REQUEST'
      });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date()
        },
        status: UserStatus.PENDING
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true
      }
    });

    if (!user) {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired setup token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Setup token is valid',
      user: {
        name: user.name,
        email: user.email
      }
    });
  })
);

// Complete user setup
router.post(
  '/onboarding',
  validateBody(onboardingSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date()
        },
        status: UserStatus.PENDING
      }
    });

    if (!user) {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired setup token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        status: UserStatus.ACTIVE,
        resetToken: null,
        resetTokenExpiry: null,
        emailVerified: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true
      }
    });

    await AuditService.logUserUpdate(
      updatedUser.id,
      updatedUser.id,
      { status: UserStatus.PENDING },
      { status: UserStatus.ACTIVE },
      'User completed account setup and activated account',
      req
    );

    res.json({
      success: true,
      message: 'Account setup completed successfully',
      user: updatedUser
    });
  })
);

export default router;
