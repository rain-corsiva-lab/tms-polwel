import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient, UserStatus } from '@prisma/client';
import AuditService from '../services/auditService';

const router = express.Router();
const prisma = new PrismaClient();

// Verify setup token
router.get('/verify-token/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Setup token is required'
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
        message: 'Invalid or expired setup token'
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
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Complete user setup
router.post('/complete-setup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password, termsAccepted, privacyAccepted } = req.body;

    // Validation
    if (!token || !password) {
      res.status(400).json({
        success: false,
        message: 'Token and password are required'
      });
      return;
    }

    if (!termsAccepted || !privacyAccepted) {
      res.status(400).json({
        success: false,
        message: 'You must accept the Terms & Conditions and Privacy Policy'
      });
      return;
    }

    // Password validation
    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
      return;
    }

    // Find user with valid setup token
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
        message: 'Invalid or expired setup token'
      });
      return;
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user - activate account and clear setup token
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

    // Log the account activation
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
  } catch (error) {
    console.error('Complete setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
