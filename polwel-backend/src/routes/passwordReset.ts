import express from 'express';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma';
import AuditService from '../services/auditService';

const router = express.Router();


// Verify reset token
router.get('/verify-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is required'
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date() // Token must not be expired
        }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (!user) {
      // Log failed token verification attempt
      console.log(`Password reset - Invalid token access attempt: ${token}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Log successful token verification (for audit purposes)
    await AuditService.logPasswordChange(
      user.id,
      user.id,
      'Password reset page accessed - Token verified successfully',
      req
    );

    return res.json({
      success: true,
      user: {
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Verify reset token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      // Log failed password reset attempt
      console.log(`Password reset - Invalid/expired token used: ${token}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        failedLoginAttempts: 0, // Reset failed attempts
        lockedUntil: null, // Unlock account if locked
        passwordExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // Set expiry to 90 days
      }
    });

    // Log password change with comprehensive details
    await AuditService.logPasswordChange(
      user.id,
      user.id, // User is resetting their own password
      `Password successfully reset via email link - Account security restored. Failed login attempts cleared and account unlocked.`,
      req
    );

    return res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
