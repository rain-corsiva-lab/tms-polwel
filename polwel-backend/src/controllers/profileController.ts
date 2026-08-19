import { Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        contactNumber: true,
        bio: true,
        role: true,
        status: true,
  permissionLevel: true,
  designation: true,
        organizationId: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
        organizations: {
          select: {
            organizationId: true
          }
        }
      }
    });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const userData = {
      ...user,
      organizationIds: user.organizations ? user.organizations.map((o: any) => o.organizationId) : []
    };

    return res.json({ success: true, data: userData });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { name, contactNumber, bio } = req.body;

    // Basic validation
    if (name !== undefined && typeof name !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid name' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(contactNumber !== undefined && { contactNumber }),
        ...(bio !== undefined && { bio })
      },
      select: {
        id: true,
        name: true,
        email: true,
        contactNumber: true,
        bio: true,
        updatedAt: true
      }
    });

    return res.json({ success: true, data: updated, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

import AuditService from '../services/auditService';

export const changePassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { currentPassword, newPassword } = req.body;

    // Strong password: min 12 chars, upper, lower, number, special
    const requirements = [
      { ok: typeof newPassword === 'string' && newPassword.length >= 12, msg: 'at least 12 characters' },
      { ok: /[A-Z]/.test(newPassword || ''), msg: 'one uppercase letter' },
      { ok: /[a-z]/.test(newPassword || ''), msg: 'one lowercase letter' },
      { ok: /\d/.test(newPassword || ''), msg: 'one number' },
      { ok: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword || ''), msg: 'one special character' },
    ];
    const failed = requirements.filter(r => !r.ok).map(r => r.msg);
    if (failed.length > 0) {
      return res.status(400).json({ success: false, message: `New password must contain ${failed.join(', ')}.` });
    }

    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ success: false, message: 'Current password is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, password: true, passwordHistory: true }
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    // Check if new password is same as current password
    const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);
    if (isSameAsCurrent) {
      return res.status(400).json({ success: false, message: 'New password cannot be the same as your current password.' });
    }

    // Check history (last 5 passwords cannot be reused)
    const history = Array.isArray(user.passwordHistory) ? (user.passwordHistory as string[]) : [];
    for (const oldHash of history) {
      if (typeof oldHash === 'string') {
        const matchesOld = await bcrypt.compare(newPassword, oldHash);
        if (matchesOld) {
          return res.status(400).json({ success: false, message: 'New password cannot be reused. It must not match any of your last 5 passwords.' });
        }
      }
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    const updatedHistory = [user.password, ...history.filter(h => h !== user.password)].slice(0, 5);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashed,
        passwordHistory: updatedHistory,
        passwordExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 365 days expiry
        failedLoginAttempts: 0,
        lockedUntil: null,
        refreshToken: null
      }
    });

    await AuditService.logPasswordChange(
      userId,
      userId,
      `User ${user.name} changed their password. Expiration set to 365 days.`,
      req
    );

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
