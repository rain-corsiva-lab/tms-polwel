import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import AuditService from '../services/auditService';
import EmailService from '../services/emailService';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import { forgotPasswordSchema, resetPasswordSchema } from '../schemas/authSchemas';

const router = express.Router();

// Request password reset (forgot password) with Zod validation & asyncHandler
router.post(
  '/forgot-password',
  validateBody(forgotPasswordSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    // Find user by email (case insensitive)
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        deletedAt: null,
        status: {
          not: 'INACTIVE'
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true
      }
    });

    // Always return success to prevent email enumeration
    // But only send email if user exists and is active
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry: tokenExpiry
        }
      });

      const rawFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const frontendUrlParts = rawFrontendUrl.split(',');
      const frontendUrl = (frontendUrlParts[0] || 'http://localhost:5173').trim();
      
      const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
      
      try {
        await EmailService.sendPasswordResetEmail(
          user.email!,
          user.name,
          resetUrl
        );
        
        console.log(`Password reset email sent to: ${user.email}`);
        
        await AuditService.logPasswordChange(
          user.id,
          user.id,
          'Password reset requested via forgot password form',
          req
        );
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
      }
    } else {
      console.log(`Password reset requested for non-existent/inactive email: ${email}`);
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  })
);

// Verify reset token
router.get(
  '/verify-token/:token',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Reset token is required',
        code: 'BAD_REQUEST'
      });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date()
        }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (!user) {
      console.log(`Password reset - Invalid token access attempt: ${token}`);
      res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    await AuditService.logPasswordChange(
      user.id,
      user.id,
      'Password reset page accessed - Token verified successfully',
      req
    );

    res.json({
      success: true,
      user: {
        name: user.name,
        email: user.email
      }
    });
  })
);

// Reset password with Zod validation & asyncHandler
router.post(
  '/reset-password',
  validateBody(resetPasswordSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token, newPassword } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      console.log(`Password reset - Invalid/expired token used: ${token}`);
      res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // Check if new password matches current password
    const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);
    if (isSameAsCurrent) {
      res.status(400).json({
        success: false,
        error: 'New password cannot be the same as your current password.',
        code: 'PASSWORD_REUSE_FORBIDDEN'
      });
      return;
    }

    // Check last 5 passwords
    const history = Array.isArray(user.passwordHistory) ? (user.passwordHistory as string[]) : [];
    for (const oldHash of history) {
      if (typeof oldHash === 'string') {
        const matchesOld = await bcrypt.compare(newPassword, oldHash);
        if (matchesOld) {
          res.status(400).json({
            success: false,
            error: 'New password cannot be reused. It must not match any of your last 5 passwords.',
            code: 'PASSWORD_REUSE_FORBIDDEN'
          });
          return;
        }
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const updatedHistory = [user.password, ...history.filter(h => h !== user.password)].slice(0, 5);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordHistory: updatedHistory,
        resetToken: null,
        resetTokenExpiry: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        passwordExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 365 days
      }
    });

    await AuditService.logPasswordChange(
      user.id,
      user.id,
      `Password successfully reset via email link. Expiration set to 365 days.`,
      req
    );

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  })
);

export default router;
