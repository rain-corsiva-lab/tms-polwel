import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Generate access token
const generateAccessToken = (user: any): string => {
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role,
      ...(user.organizationId && { organizationId: user.organizationId })
    },
    jwtSecret,
    { expiresIn: '15m' } // Short-lived access token
  );
};

// Generate refresh token
const generateRefreshToken = (user: any): string => {
  const jwtSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
  return jwt.sign(
    { userId: user.id },
    jwtSecret,
    { expiresIn: '7d' } // Long-lived refresh token
  );
};

// Login endpoint
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, rememberMe = false } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organization: true
      }
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      // Increment failed login attempts
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          failedLoginAttempts: { increment: 1 },
          ...(user.failedLoginAttempts >= 4 && {
            lockedUntil: new Date(Date.now() + 15 * 60 * 1000) // Lock for 15 minutes
          })
        }
      });

      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      res.status(401).json({ error: 'Account is not active' });
      return;
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      res.status(423).json({ 
        error: 'Account is temporarily locked due to multiple failed login attempts',
        code: 'ACCOUNT_LOCKED',
        lockedUntil: user.lockedUntil
      });
      return;
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Update user login info
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
        refreshToken: rememberMe ? refreshToken : null
      }
    });

    // Return user data and tokens (excluding sensitive data)
    const { password: _, refreshToken: __, ...userWithoutSensitiveData } = user;
    
    res.json({
      success: true,
      accessToken,
      ...(rememberMe && { refreshToken }),
      user: userWithoutSensitiveData,
      expiresIn: '15m'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token required' });
      return;
    }

    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
    
    jwt.verify(refreshToken, jwtRefreshSecret, async (err: any, decoded: any) => {
      if (err) {
        res.status(403).json({ error: 'Invalid refresh token' });
        return;
      }

      const payload = decoded as any;
      
      // Find user and verify refresh token
      const user = await prisma.user.findUnique({
        where: { 
          id: payload.userId,
          refreshToken: refreshToken
        }
      });

      if (!user || user.status !== 'ACTIVE') {
        res.status(403).json({ error: 'Invalid refresh token' });
        return;
      }

      // Generate new access token
      const newAccessToken = generateAccessToken(user);
      
      res.json({
        success: true,
        accessToken: newAccessToken,
        expiresIn: '15m'
      });
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
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

    let organization = null;
    if (user?.organizationId) {
      organization = await prisma.organization.findUnique({
        where: { id: user.organizationId }
      });
    }

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      user: {
        ...user,
        organization
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user) {
      // Clear refresh token
      await prisma.user.update({
        where: { id: req.user.userId },
        data: { refreshToken: null }
      });
    }

    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate token endpoint (for frontend to check if token is still valid)
router.get('/validate', authenticateToken, (req: Request, res: Response): void => {
  res.json({ 
    success: true, 
    valid: true,
    user: req.user
  });
});

export default router;
