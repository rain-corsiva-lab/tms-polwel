import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
// import { logRoute, logDatabaseQuery } from '../middleware/logging'; // Temporarily disabled

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

// Generate access token (short-lived)
function generateAccessToken(user: any): string {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role,
      organizationId: user.organizationId 
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

// Generate refresh token (long-lived)
function generateRefreshToken(user: any): string {
  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

// Login endpoint
router.post('/login', /* logRoute('AUTH_LOGIN'), */ async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  console.log(`🔐 [AUTH] Login attempt started`);
  
  try {
    const { email, password, rememberMe = false } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user by email with logging
    // logDatabaseQuery('User', 'findUnique', { email });
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organization: true
      }
    });

    if (!user) {
      console.log(`❌ [AUTH] User not found: ${email}`);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log(`❌ [AUTH] Invalid password for user: ${email}`);
      
      // Increment failed login attempts
      // logDatabaseQuery('User', 'update', { failedLoginAttempts: 'increment' });
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
      console.log(`❌ [AUTH] User account not active: ${email} (status: ${user.status})`);
      res.status(401).json({ error: 'Account is not active' });
      return;
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      console.log(`❌ [AUTH] Account locked: ${email} (locked until: ${user.lockedUntil})`);
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
    // logDatabaseQuery('User', 'update', { lastLogin: 'now', failedLoginAttempts: 0 });
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
        refreshToken: refreshToken
      }
    });

    // Prepare user data for response (exclude sensitive fields)
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      organizationId: user.organizationId,
      department: user.department,
      division: user.division,
      lastLogin: new Date(),
      organization: user.organization ? {
        id: user.organization.id,
        name: user.organization.name,
        status: user.organization.status
      } : null
    };

    const duration = Date.now() - startTime;
    console.log(`✅ [AUTH] Successful login for user: ${user.email} (${user.role}) - Duration: ${duration}ms`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: userData,
      expiresIn: '15m'
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [AUTH] Login error - Duration: ${duration}ms`, error);
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    res.status(500).json({ error: errorMessage });
  }
});

// Refresh token endpoint
router.post('/refresh', /* logRoute('AUTH_REFRESH'), */ async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  console.log(`🔄 [AUTH] Token refresh attempt started`);
  
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token is required' });
      return;
    }

    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
      
      // Find user and verify refresh token
      // logDatabaseQuery('User', 'findUnique', { id: decoded.userId });
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { organization: true }
      });

      if (!user || user.refreshToken !== refreshToken) {
        console.log(`❌ [AUTH] Invalid refresh token for user: ${decoded.userId}`);
        res.status(401).json({ error: 'Invalid refresh token' });
        return;
      }

      if (user.status !== 'ACTIVE') {
        console.log(`❌ [AUTH] User account not active during refresh: ${user.email}`);
        res.status(401).json({ error: 'Account is not active' });
        return;
      }

      // Generate new access token
      const newAccessToken = generateAccessToken(user);
      
      const duration = Date.now() - startTime;
      console.log(`✅ [AUTH] Token refreshed for user: ${user.email} - Duration: ${duration}ms`);

      res.status(200).json({
        success: true,
        accessToken: newAccessToken,
        expiresIn: '15m'
      });

    } catch (jwtError) {
      console.log(`❌ [AUTH] JWT verification failed:`, jwtError);
      res.status(401).json({ error: 'Invalid refresh token' });
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [AUTH] Refresh error - Duration: ${duration}ms`, error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Logout endpoint
router.post('/logout', /* logRoute('AUTH_LOGOUT'), */ async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  console.log(`🚪 [AUTH] Logout attempt started`);
  
  try {
    const { refreshToken, userId } = req.body;

    if (userId && refreshToken) {
      // Clear refresh token from database
      // logDatabaseQuery('User', 'update', { refreshToken: null });
      await prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null }
      });
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [AUTH] Logout successful - Duration: ${duration}ms`);

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [AUTH] Logout error - Duration: ${duration}ms`, error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;
