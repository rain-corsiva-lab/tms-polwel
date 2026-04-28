/**
 * emailLogService.ts
 * Best-effort database logging for every outbound email.
 * All operations silently swallow errors so a DB hiccup never blocks email delivery.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Type constants ────────────────────────────────────────────────────────────
export const EMAIL_TYPES = {
  TA_APPROVAL:             'TA_APPROVAL',
  COURSE_CONFIRMATION:     'COURSE_CONFIRMATION',
  TRAINER_ASSIGNMENT:      'TRAINER_ASSIGNMENT',
  WAIVER_NOTIFICATION:     'WAIVER_NOTIFICATION',
  COURSE_CANCELLATION:     'COURSE_CANCELLATION',
  COURSE_COMPLETION:       'COURSE_COMPLETION',
  TRAINER_COMPLETION:      'TRAINER_COMPLETION',
  PASSWORD_RESET:          'PASSWORD_RESET',
  MFA_CODE:                'MFA_CODE',
  USER_SETUP:              'USER_SETUP',
  POLWEL_USER_SETUP:       'POLWEL_USER_SETUP',
  TRAINER_SETUP:           'TRAINER_SETUP',
  COORDINATOR_SETUP:       'COORDINATOR_SETUP',
  TRAINING_ASSIGNMENT:     'TRAINING_ASSIGNMENT',
} as const;

export type EmailType = typeof EMAIL_TYPES[keyof typeof EMAIL_TYPES];

export interface CreateEmailLogParams {
  emailType: string;
  /** Single address or comma-separated list for grouped sends */
  recipient: string;
  /** CC addresses (comma-separated) */
  cc?: string;
  subject?: string;
  courseRunId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a new PENDING log entry.
 * Returns the log ID on success, or null if the DB write fails (best-effort).
 */
export async function createEmailLog(params: CreateEmailLogParams): Promise<string | null> {
  try {
    const log = await prisma.emailLog.create({
      data: {
        emailType:   params.emailType,
        recipient:   params.recipient.substring(0, 2000),
        ...(params.cc       ? { cc:          params.cc.substring(0, 2000) }      : {}),
        ...(params.subject  ? { subject:     params.subject.substring(0, 500) }  : {}),
        ...(params.courseRunId ? { courseRunId: params.courseRunId }              : {}),
        ...(params.metadata ? { metadata:    params.metadata as any }            : {}),
        status:   'PENDING',
        attempts: 0,
      },
    });
    return log.id;
  } catch (err) {
    console.error('[EmailLog] createEmailLog failed:', (err as any)?.message);
    return null;
  }
}

/**
 * Mark a log entry as SENT.
 */
export async function markEmailSent(
  logId: string | null,
  messageId?: string,
  attempts = 1,
): Promise<void> {
  if (!logId) return;
  try {
    await prisma.emailLog.update({
      where: { id: logId },
      data: {
        status:       'SENT',
        attempts,
        lastAttemptAt: new Date(),
        ...(messageId ? { messageId: messageId.substring(0, 255) } : {}),
      },
    });
  } catch (err) {
    console.error('[EmailLog] markEmailSent failed:', (err as any)?.message);
  }
}

/**
 * Mark a log entry as FAILED.
 */
export async function markEmailFailed(
  logId: string | null,
  errorMessage?: string,
  errorCode?: string,
  attempts = 1,
): Promise<void> {
  if (!logId) return;
  try {
    await prisma.emailLog.update({
      where: { id: logId },
      data: {
        status:   'FAILED',
        attempts,
        lastAttemptAt: new Date(),
        ...(errorMessage ? { errorMessage } : {}),
        ...(errorCode    ? { errorCode: errorCode.substring(0, 100) } : {}),
      },
    });
  } catch (err) {
    console.error('[EmailLog] markEmailFailed failed:', (err as any)?.message);
  }
}

/**
 * Mark a log entry as RETRYING (mid-retry state).
 */
export async function markEmailRetrying(
  logId: string | null,
  attempts: number,
  errorMessage?: string,
): Promise<void> {
  if (!logId) return;
  try {
    await prisma.emailLog.update({
      where: { id: logId },
      data: {
        status:   'RETRYING',
        attempts,
        lastAttemptAt: new Date(),
        ...(errorMessage ? { errorMessage } : {}),
      },
    });
  } catch (err) {
    console.error('[EmailLog] markEmailRetrying failed:', (err as any)?.message);
  }
}
