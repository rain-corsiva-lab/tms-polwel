import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

export const MFA_CODE_LENGTH = 6;
export const MFA_CODE_EXPIRY_MINUTES = 10;
export const MFA_MAX_ATTEMPTS = 5;
export const MFA_RESEND_COOLDOWN_SECONDS = 60;
export const MFA_MAX_RESENDS = 5;

const padCode = (num: number) => num.toString().padStart(MFA_CODE_LENGTH, '0');

export function generateMfaCode(): string {
  const max = Math.pow(10, MFA_CODE_LENGTH) - 1;
  const min = Math.pow(10, MFA_CODE_LENGTH - 1);
  const value = Math.floor(Math.random() * (max - min + 1)) + min;
  return padCode(value);
}

export function maskEmail(email: string): string {
  const [localPart = '', domain = ''] = email.split('@');

  if (!localPart || !domain) {
    return email;
  }

  if (localPart.length <= 2) {
    return `${localPart[0] || ''}***@${domain}`;
  }

  const visible = localPart.slice(0, 2);
  const maskedLength = Math.max(localPart.length - 2, 3);

  return `${visible}${'*'.repeat(maskedLength)}@${domain}`;
}

export async function createOrResetChallenge(userId: string) {
  const code = generateMfaCode();
  const codeHash = await bcrypt.hash(code, 10);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + MFA_CODE_EXPIRY_MINUTES * 60 * 1000);

  const challenge = await prisma.mfaChallenge.upsert({
    where: { userId },
    update: {
      codeHash,
      expiresAt,
      attempts: 0,
      resendCount: 0,
      lastSentAt: now,
    },
    create: {
      userId,
      codeHash,
      expiresAt,
      lastSentAt: now,
    },
  });

  return { challenge, code };
}

export async function verifyChallenge(challengeId: string, code: string) {
  const challenge = await prisma.mfaChallenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge) {
    return { status: 'not_found' as const };
  }

  const now = new Date();
  if (challenge.expiresAt < now) {
    await prisma.mfaChallenge.delete({ where: { id: challengeId } });
    return { status: 'expired' as const };
  }

  const isMatch = await bcrypt.compare(code, challenge.codeHash);
  if (!isMatch) {
    const updated = await prisma.mfaChallenge.update({
      where: { id: challengeId },
      data: { attempts: { increment: 1 } },
    });

    if (updated.attempts >= MFA_MAX_ATTEMPTS) {
      await prisma.mfaChallenge.delete({ where: { id: challengeId } });
      return { status: 'locked' as const };
    }

    return {
      status: 'invalid' as const,
      attemptsRemaining: Math.max(MFA_MAX_ATTEMPTS - updated.attempts, 0),
    };
  }

  await prisma.mfaChallenge.delete({ where: { id: challengeId } });
  return { status: 'success' as const, userId: challenge.userId };
}

export async function resendChallenge(challengeId: string) {
  const challenge = await prisma.mfaChallenge.findUnique({ where: { id: challengeId } });
  if (!challenge) {
    return { status: 'not_found' as const };
  }

  const now = new Date();
  if (challenge.expiresAt < now) {
    await prisma.mfaChallenge.delete({ where: { id: challengeId } });
    return { status: 'expired' as const };
  }

  const nextAllowed = new Date(challenge.lastSentAt.getTime() + MFA_RESEND_COOLDOWN_SECONDS * 1000);
  if (now < nextAllowed) {
    return { status: 'too_soon' as const, nextAllowed };
  }

  if (challenge.resendCount >= MFA_MAX_RESENDS) {
    return { status: 'max_resends' as const };
  }

  const code = generateMfaCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(now.getTime() + MFA_CODE_EXPIRY_MINUTES * 60 * 1000);

  const updated = await prisma.mfaChallenge.update({
    where: { id: challengeId },
    data: {
      codeHash,
      expiresAt,
      attempts: 0,
      resendCount: { increment: 1 },
      lastSentAt: now,
    },
  });

  return { status: 'resent' as const, challenge: updated, code };
}
