import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import EmailService from '../services/emailService';
import {
  createOrResetChallenge,
  verifyChallenge as verifyMfaChallenge,
  resendChallenge as resendMfaChallenge,
  maskEmail,
  MFA_RESEND_COOLDOWN_SECONDS,
} from '../services/mfaService';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  loginSchema,
  mfaVerifySchema,
  mfaResendSchema,
  refreshTokenSchema,
  logoutSchema,
} from '../schemas/authSchemas';

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
    { expiresIn: '7d' }
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
    expiresIn: '7d',
  };
}

// Login endpoint with Zod input validation & asyncHandler wrapper
router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    console.log(`🔐 [AUTH] Login attempt started`);
    
    const { email, password, rememberMe = false } = req.body;

    console.log(`🔐 [AUTH] Login attempt for email: ${email}`);

    // Find user by email
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
      res.status(401).json({ success: false, error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
      return;
    }

    const userEmail = user.email;
    if (!userEmail) {
      console.log(`❌ [AUTH] User record missing email: ${email}`);
      res.status(400).json({ success: false, error: 'User account is misconfigured', code: 'ACCOUNT_MISCONFIGURED' });
      return;
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      console.log(`❌ [AUTH] Account locked: ${email} (locked until: ${user.lockedUntil})`);
      res.status(423).json({ 
        success: false,
        error: 'Account is temporarily locked due to multiple failed login attempts',
        code: 'ACCOUNT_LOCKED',
        lockedUntil: user.lockedUntil
      });
      return;
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log(`❌ [AUTH] Invalid password for user: ${email}`);
      
      const newAttempts = user.failedLoginAttempts + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          failedLoginAttempts: { increment: 1 },
          ...(newAttempts >= 5 && {
            lockedUntil: new Date(Date.now() + 15 * 60 * 1000) // Lock for 15 minutes
          })
        }
      });

      res.status(401).json({ success: false, error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
      return;
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      console.log(`❌ [AUTH] User account not active: ${email} (status: ${user.status})`);
      res.status(401).json({ success: false, error: 'Account is not active', code: 'ACCOUNT_INACTIVE' });
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
  })
);

// MFA Verify endpoint with Zod input validation & asyncHandler wrapper
router.post(
  '/mfa/verify',
  validateBody(mfaVerifySchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { challengeId, code, rememberMe = false } = req.body;

    const result = await verifyMfaChallenge(challengeId, code);

    if (result.status === 'not_found') {
      res.status(404).json({ success: false, error: 'Verification challenge not found', code: 'MFA_NOT_FOUND' });
      return;
    }

    if (result.status === 'expired') {
      res.status(410).json({ success: false, error: 'Verification code has expired. Please login again.', code: 'MFA_EXPIRED' });
      return;
    }

    if (result.status === 'locked') {
      res.status(423).json({ success: false, error: 'Too many invalid attempts. Please login again.', code: 'MFA_LOCKED' });
      return;
    }

    if (result.status === 'invalid') {
      res.status(400).json({
        success: false,
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
  })
);

// MFA Resend endpoint with Zod input validation & asyncHandler wrapper
router.post(
  '/mfa/resend',
  validateBody(mfaResendSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { challengeId } = req.body;

    const result = await resendMfaChallenge(challengeId);

    if (result.status === 'not_found') {
      res.status(404).json({ success: false, error: 'Verification challenge not found', code: 'MFA_NOT_FOUND' });
      return;
    }

    if (result.status === 'expired') {
      res.status(410).json({ success: false, error: 'Verification code has expired. Please login again.', code: 'MFA_EXPIRED' });
      return;
    }

    if (result.status === 'too_soon') {
      res.status(429).json({
        success: false,
        error: 'Please wait before requesting a new code',
        code: 'MFA_TOO_SOON',
        nextAllowedAt: result.nextAllowed,
      });
      return;
    }

    if (result.status === 'max_resends') {
      res.status(429).json({
        success: false,
        error: 'Maximum resend attempts reached. Please login again.',
        code: 'MFA_MAX_RESENDS',
      });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: result.challenge.userId } });

    if (!user || !user.email) {
      console.error('❌ [AUTH] MFA resend error: user not found for challenge');
      res.status(400).json({ success: false, error: 'Unable to deliver verification code', code: 'USER_NOT_FOUND' });
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
  })
);

// Refresh token endpoint with Zod input validation & asyncHandler wrapper
router.post(
  '/refresh',
  validateBody(refreshTokenSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    console.log(`🔄 [AUTH] Token refresh attempt started`);
    
    const { refreshToken } = req.body;

    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { organization: true }
      });

      if (!user || user.refreshToken !== refreshToken) {
        console.log(`❌ [AUTH] Invalid refresh token for user: ${decoded?.userId}`);
        res.status(401).json({ success: false, error: 'Invalid refresh token', code: 'INVALID_TOKEN' });
        return;
      }

      if (user.status !== 'ACTIVE') {
        console.log(`❌ [AUTH] User account not active during refresh: ${user.email}`);
        res.status(401).json({ success: false, error: 'Account is not active', code: 'ACCOUNT_INACTIVE' });
        return;
      }

      const newAccessToken = generateAccessToken(user);
      
      const duration = Date.now() - startTime;
      console.log(`✅ [AUTH] Token refreshed for user: ${user.email} - Duration: ${duration}ms`);

      res.status(200).json({
        success: true,
        accessToken: newAccessToken,
        expiresIn: '7d'
      });

    } catch (jwtError) {
      console.log(`❌ [AUTH] JWT verification failed:`, jwtError);
      res.status(401).json({ success: false, error: 'Invalid or expired refresh token', code: 'INVALID_TOKEN' });
    }
  })
);

// Logout endpoint with Zod input validation & asyncHandler wrapper
router.post(
  '/logout',
  validateBody(logoutSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    console.log(`🚪 [AUTH] Logout attempt started`);
    
    const { refreshToken, userId } = req.body;

    if (userId && refreshToken) {
      await prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null }
      }).catch(() => {});
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [AUTH] Logout successful - Duration: ${duration}ms`);

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  })
);

export default router;
