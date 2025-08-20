import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authenticateToken, authorizeRoles, authorizeOwnershipOrAdmin } from '../middleware/auth';
// import { logRoute, logDatabaseQuery } from '../middleware/logging'; // Temporarily disabled

const router = express.Router();


// Get all users (POLWEL and TRAINING_COORDINATOR only)
router.get('/', /* logRoute('USERS_GET_ALL'), */ authenticateToken, authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  console.log(`👥 [USERS] Get all users request started`);
  
  try {
    const { role, status, organizationId } = req.query;
    const currentUser = req.user!;

    let whereClause: any = {};

    // Filter by role if specified
    if (role) {
      whereClause.role = role;
    }

    // Filter by status if specified
    if (status) {
      whereClause.status = status;
    }

    // TRAINING_COORDINATOR can only see users from their organization
    if (currentUser.role === 'TRAINING_COORDINATOR') {
      whereClause.organizationId = currentUser.organizationId;
    } else if (organizationId) {
      // POLWEL can filter by organization
      whereClause.organizationId = organizationId;
    }

    // logDatabaseQuery('User', 'findMany', whereClause);
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        emailVerified: true,
        lastLogin: true,
        organizationId: true,
        division: true,
        contactNumber: true,
        availabilityStatus: true,
        partnerOrganization: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const duration = Date.now() - startTime;
    console.log(`✅ [USERS] Get all users successful - Found ${users.length} users - Duration: ${duration}ms`);

    res.json({
      success: true,
      data: users,
      total: users.length
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [USERS] Get all users error - Duration: ${duration}ms`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID (users can access their own profile, admins can access any)
router.get('/:id', /* logRoute('USERS_GET_BY_ID'), */ authenticateToken, authorizeOwnershipOrAdmin('id'), async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  console.log(`👤 [USERS] Get user by ID request started`);
  
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    // logDatabaseQuery('User', 'findUnique', { id });
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        emailVerified: true,
        mfaEnabled: true,
        lastLogin: true,
        permissionLevel: true,
        department: true,
        organizationId: true,
        division: true,
        buCostCentre: true,
        paymentMode: true,
        contactNumber: true,
        additionalEmails: true,
        availabilityStatus: true,
        partnerOrganization: true,
        bio: true,
        specializations: true,
        certifications: true,
        experience: true,
        rating: true,
        employeeId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.patch('/:id/password', authenticateToken, authorizeOwnershipOrAdmin('id'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    const currentUser = req.user!;

    if (!id) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    if (!newPassword) {
      res.status(400).json({ error: 'New password is required' });
      return;
    }

    // For non-admin users, verify current password
    if (currentUser.role !== 'POLWEL' || currentUser.userId === id) {
      if (!currentPassword) {
        res.status(400).json({ error: 'Current password is required' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: { password: true }
      });

      if (!user || !await bcrypt.compare(currentPassword, user.password)) {
        res.status(400).json({ error: 'Current password is incorrect' });
        return;
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id },
      data: { 
        password: hashedPassword,
        passwordExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        refreshToken: null // Invalidate refresh tokens
      }
    });

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
