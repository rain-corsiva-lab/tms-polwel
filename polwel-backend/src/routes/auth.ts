import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma'; // Use shared Prisma instance
import EmailService from '../services/emailService';
import {
  createOrResetChallenge,
  verifyChallenge as verifyMfaChallenge,
  resendChallenge as resendMfaChallenge,
  maskEmail,
  MFA_RESEND_COOLDOWN_SECONDS,
} from '../services/mfaService';
// import { logRoute, logDatabaseQuery } from '../middleware/logging'; // Temporarily disabled

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

const MFA_ENFORCED_ROLES = new Set(['POLWEL', 'TRAINER', 'TRAINING_COORDINATOR']);

// Generate access token (short-lived)
function generateAccessToken(user: any): string {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role,
      organizationId: user.organizationId,
      organizationIds: user.organizations ? user.organizations.map((o: any) => o.organizationId) : []
    },
    JWT_SECRET,
    { expiresIn: '7d' } // Changed from 15m to 7 days for better UX
  );
}

// Generate refresh token (long-lived)
function generateRefreshToken(user: any, options?: { rememberMe?: boolean }): string {
  const expiresIn = options?.rememberMe ? '30d' : '7d';

  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_REFRESH_SECRET,
    { expiresIn }
  );
}

async function issueTokensForUser(userId: string, options?: { rememberMe?: boolean }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organization: true,
      organizations: {
        select: {
          organizationId: true
        }
      },
      permissions: {
        select: { permissionName: true, granted: true },
      },
    },
  });

  if (!user) {
    throw new Error('User not found during MFA verification');
  }

  const userEmail = user.email;

  if (!userEmail) {
    throw new Error('User email is missing');
  }

  const normalizedUser = { ...user, email: userEmail };

  const accessToken = generateAccessToken(normalizedUser);
  const refreshToken = generateRefreshToken(normalizedUser, options);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLogin: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
      refreshToken,
    },
  });

  const userData = {
    id: user.id,
  email: userEmail,
    name: user.name,
    role: user.role,
    status: user.status,
    organizationId: user.organizationId,
    organizationIds: user.organizations ? user.organizations.map((o: any) => o.organizationId) : [],
    designation: user.designation,
    division: user.division,
    lastLogin: new Date(),
    permissions: (user.permissions || [])
      .filter((p: any) => p.granted)
      .map((p: any) => p.permissionName),
    organization: user.organization
      ? {
          id: user.organization.id,
          name: user.organization.name,
          status: user.organization.status,
        }
      : null,
  };

  return {
    accessToken,
  refreshToken,
    user: userData,
    expiresIn: '7d', // Updated to match new token expiry
  };
}

// Login endpoint
router.post('/login', /* logRoute('AUTH_LOGIN'), */ async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  console.log(`🔐 [AUTH] Login attempt started`);
  
  try {
    const { email, password, rememberMe = false } = req.body;

    console.log(`🔐 [AUTH] Login attempt for email: ${email}`);
    console.log(`🔐 [AUTH] NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`🔐 [AUTH] DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@')}`);

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user by email with logging
    // logDatabaseQuery('User', 'findUnique', { email });
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organization: true,
        permissions: {
          select: { permissionName: true, granted: true }
        }
      }
    });

    if (!user) {
      console.log(`❌ [AUTH] User not found: ${email}`);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const userEmail = user.email;
    if (!userEmail) {
      console.log(`❌ [AUTH] User record missing email: ${email}`);
      res.status(500).json({ error: 'User account is misconfigured' });
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

    const requiresMfa = MFA_ENFORCED_ROLES.has(user.role);

    if (requiresMfa) {
      const { challenge, code } = await createOrResetChallenge(user.id);
      const emailDelivery = await EmailService.sendMfaCodeEmail(
        userEmail,
        user.name,
        code,
        challenge.expiresAt
      );

      const duration = Date.now() - startTime;
      console.log(
        `✅ [AUTH] MFA challenge issued for user: ${userEmail} (${user.role}) - Duration: ${duration}ms`
      );

      res.status(200).json({
        success: true,
        mfaRequired: true,
        challengeId: challenge.id,
        expiresAt: challenge.expiresAt,
        maskedEmail: maskEmail(userEmail),
        resendCooldownSeconds: MFA_RESEND_COOLDOWN_SECONDS,
        emailDelivery,
      });
      return;
    }

    const authPayload = await issueTokensForUser(user.id, { rememberMe });
    const duration = Date.now() - startTime;
  console.log(`✅ [AUTH] Successful login for user: ${userEmail} (${user.role}) - Duration: ${duration}ms`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      ...authPayload,
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [AUTH] Login error - Duration: ${duration}ms`, error);
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    res.status(500).json({ error: errorMessage });
  }
});

router.post('/mfa/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { challengeId, code, rememberMe = false } = req.body;

    if (!challengeId || !code) {
      res.status(400).json({ error: 'Challenge ID and code are required' });
      return;
    }

    const result = await verifyMfaChallenge(challengeId, code);

    if (result.status === 'not_found') {
      res.status(404).json({ error: 'Verification challenge not found', code: 'MFA_NOT_FOUND' });
      return;
    }

    if (result.status === 'expired') {
      res.status(410).json({ error: 'Verification code has expired. Please login again.', code: 'MFA_EXPIRED' });
      return;
    }

    if (result.status === 'locked') {
      res.status(423).json({ error: 'Too many invalid attempts. Please login again.', code: 'MFA_LOCKED' });
      return;
    }

    if (result.status === 'invalid') {
      res.status(400).json({
        error: 'Invalid verification code',
        code: 'MFA_INVALID',
        attemptsRemaining: result.attemptsRemaining,
      });
      return;
    }

    const payload = await issueTokensForUser(result.userId, { rememberMe });

    res.status(200).json({
      success: true,
      message: 'MFA verification successful',
      ...payload,
    });
  } catch (error) {
    console.error('❌ [AUTH] MFA verification error', error);
    const msg = error instanceof Error ? error.message : 'Failed to verify MFA code';
    res.status(500).json({ error: msg });
  }
});

router.post('/mfa/resend', async (req: Request, res: Response): Promise<void> => {
  try {
    const { challengeId } = req.body;

    if (!challengeId) {
      res.status(400).json({ error: 'Challenge ID is required' });
      return;
    }

    const result = await resendMfaChallenge(challengeId);

    if (result.status === 'not_found') {
      res.status(404).json({ error: 'Verification challenge not found', code: 'MFA_NOT_FOUND' });
      return;
    }

    if (result.status === 'expired') {
      res.status(410).json({ error: 'Verification code has expired. Please login again.', code: 'MFA_EXPIRED' });
      return;
    }

    if (result.status === 'too_soon') {
      res.status(429).json({
        error: 'Please wait before requesting a new code',
        code: 'MFA_TOO_SOON',
        nextAllowedAt: result.nextAllowed,
      });
      return;
    }

    if (result.status === 'max_resends') {
      res.status(429).json({
        error: 'Maximum resend attempts reached. Please login again.',
        code: 'MFA_MAX_RESENDS',
      });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: result.challenge.userId } });

    if (!user || !user.email) {
      console.error('❌ [AUTH] MFA resend error: user not found for challenge');
      res.status(500).json({ error: 'Unable to deliver verification code' });
      return;
    }

    const emailDelivery = await EmailService.sendMfaCodeEmail(
      user.email,
      user.name,
      result.code,
      result.challenge.expiresAt
    );

    res.status(200).json({
      success: true,
      message: 'Verification code resent',
      challengeId,
      expiresAt: result.challenge.expiresAt,
      resendCount: result.challenge.resendCount,
      maskedEmail: maskEmail(user.email),
      emailDelivery,
      resendCooldownSeconds: MFA_RESEND_COOLDOWN_SECONDS,
    });
  } catch (error) {
    console.error('❌ [AUTH] MFA resend error', error);
    const msg = error instanceof Error ? error.message : 'Failed to resend MFA code';
    res.status(500).json({ error: msg });
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
