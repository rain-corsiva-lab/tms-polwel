/**
 * emailQueueService.ts
 *
 * Manages the email retry queue (email_retry_queue table).
 *
 * Design:
 *  • On FIRST send failure, the email method calls enqueueEmailRetry().
 *    This creates a PENDING queue entry with nextRunAt = now + 3 minutes.
 *  • A background worker (emailRetryWorker) polls every 30 seconds, picks up
 *    PENDING jobs where nextRunAt <= now, and dispatches them via dispatchRetryJob().
 *  • dispatchRetryJob() calls the appropriate EmailService method with a
 *    RetryContext, so the method creates a NEW email_log entry linked to the
 *    queue job via retryQueueId.
 *  • On retry success  → queue entry set to SENT.
 *  • On retry failure  → attempts++; if attempts < maxAttempts → PENDING again
 *                        with nextRunAt += 3 min; else → ABANDONED.
 *  • Maximum 10 attempts total (1 first attempt + 9 retries), configurable.
 */

import { PrismaClient } from '@prisma/client';
import { EMAIL_TYPES, classifyError } from './emailLogService';

const prisma = new PrismaClient();

// ── Constants ─────────────────────────────────────────────────────────────────

/** Delay between retries (3 minutes). */
export const RETRY_DELAY_MS = 3 * 60 * 1000;

/** Maximum total attempts (first attempt + retries) before abandoning. */
export const MAX_ATTEMPTS = 10;

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Passed to email methods when they are being called as a retry.
 * The method links its email_log entry to this queue job via retryQueueId.
 */
export interface RetryContext {
  retryQueueId: string;
}

export interface EnqueueParams {
  emailType: string;
  recipient: string;
  subject?: string | undefined;
  /** Serializable email parameters — Buffers/Dates are serialized automatically. */
  payload: Record<string, unknown>;
  courseRunId?: string | undefined;
  maxAttempts?: number | undefined;
  /** Override delay (ms) before first retry. Default: RETRY_DELAY_MS (3 min). */
  delayMs?: number | undefined;
}

// ── Payload serialization ─────────────────────────────────────────────────────
// Handles Buffer (→ base64 object) and Date (→ ISO string object) round-trips.

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };

function serializeValue(val: unknown): JsonValue {
  if (val === null || val === undefined) return null;
  if (Buffer.isBuffer(val)) return { __type: 'Buffer', data: (val as Buffer).toString('base64') };
  if (val instanceof Date)  return { __type: 'Date',   iso:  (val as Date).toISOString() };
  if (Array.isArray(val))   return (val as unknown[]).map(serializeValue);
  if (typeof val === 'object') {
    const out: { [k: string]: JsonValue } = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      out[k] = serializeValue(v);
    }
    return out;
  }
  return val as JsonPrimitive;
}

function deserializeValue(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object' && !Array.isArray(val)) {
    const obj = val as Record<string, unknown>;
    if (obj.__type === 'Buffer' && typeof obj.data === 'string') {
      return Buffer.from(obj.data as string, 'base64');
    }
    if (obj.__type === 'Date' && typeof obj.iso === 'string') {
      return new Date(obj.iso as string);
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = deserializeValue(v);
    }
    return out;
  }
  if (Array.isArray(val)) return (val as unknown[]).map(deserializeValue);
  return val;
}

export function serializePayload(params: Record<string, unknown>): Record<string, unknown> {
  return serializeValue(params) as Record<string, unknown>;
}

export function deserializePayload(json: unknown): Record<string, unknown> {
  return deserializeValue(json) as Record<string, unknown>;
}

// ── Queue management ──────────────────────────────────────────────────────────

/**
 * Enqueue an email for retry after first-attempt failure.
 * Stores serialized payload so the worker can reconstruct and re-send.
 * Returns the queue entry ID, or null if the DB write fails.
 */
export async function enqueueEmailRetry(params: EnqueueParams): Promise<string | null> {
  try {
    const delay = params.delayMs ?? RETRY_DELAY_MS;
    const entry = await prisma.emailRetryQueue.create({
      data: {
        emailType:   params.emailType,
        recipient:   params.recipient.substring(0, 2000),
        ...(params.subject     ? { subject:     params.subject.substring(0, 500) }    : {}),
        ...(params.courseRunId ? { courseRunId: params.courseRunId }                   : {}),
        payload:     serializePayload(params.payload) as any,
        status:      'PENDING',
        attempts:    1,                               // first attempt already happened
        maxAttempts: params.maxAttempts ?? MAX_ATTEMPTS,
        nextRunAt:   new Date(Date.now() + delay),
      },
    });
    console.log(
      `[EmailQueue] Enqueued retry for ${params.emailType} → ${params.recipient} ` +
      `(id=${entry.id}, nextRunAt=${entry.nextRunAt.toISOString()})`,
    );
    return entry.id;
  } catch (err) {
    console.error('[EmailQueue] enqueueEmailRetry failed:', (err as any)?.message);
    return null;
  }
}

/**
 * Mark a queue job as successfully sent.
 */
export async function markQueueJobSent(id: string): Promise<void> {
  try {
    await prisma.emailRetryQueue.update({
      where: { id },
      data:  { status: 'SENT', lastError: null },
    });
    console.log(`[EmailQueue] Job ${id} marked SENT.`);
  } catch (err) {
    console.error('[EmailQueue] markQueueJobSent failed:', (err as any)?.message);
  }
}

/**
 * Mark a queue job as failed.
 * If attempts < maxAttempts → schedule next retry (PENDING); else → ABANDONED.
 */
export async function markQueueJobFailed(
  id: string,
  error: string,
  category?: string | undefined,
): Promise<void> {
  try {
    const job = await prisma.emailRetryQueue.findUnique({ where: { id } });
    if (!job) return;

    const newAttempts = job.attempts + 1;

    if (newAttempts >= job.maxAttempts) {
      await prisma.emailRetryQueue.update({
        where: { id },
        data: {
          status:        'ABANDONED',
          attempts:      newAttempts,
          lastError:     error.substring(0, 5000),
          ...(category ? { errorCategory: category.substring(0, 50) } : {}),
        },
      });
      console.warn(
        `[EmailQueue] Job ${id} (${job.emailType}) ABANDONED after ${newAttempts}/${job.maxAttempts} attempts.`,
      );
    } else {
      const nextRunAt = new Date(Date.now() + RETRY_DELAY_MS);
      await prisma.emailRetryQueue.update({
        where: { id },
        data: {
          status:        'PENDING',
          attempts:      newAttempts,
          nextRunAt,
          lastError:     error.substring(0, 5000),
          ...(category ? { errorCategory: category.substring(0, 50) } : {}),
        },
      });
      console.log(
        `[EmailQueue] Job ${id} retry ${newAttempts}/${job.maxAttempts} ` +
        `scheduled at ${nextRunAt.toISOString()}.`,
      );
    }
  } catch (err) {
    console.error('[EmailQueue] markQueueJobFailed failed:', (err as any)?.message);
  }
}

// ── Dispatcher ────────────────────────────────────────────────────────────────
// Lazy import to avoid circular dependency (emailService imports emailQueueService
// and emailQueueService imports emailService).

async function getEmailService() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('./emailService') as { default: typeof import('./emailService').default };
  return mod.default;
}

/**
 * Dispatch a retry job by calling the appropriate EmailService method.
 * Returns true on success, false on failure.
 */
export async function dispatchRetryJob(job: {
  id: string;
  emailType: string;
  payload: unknown;
}): Promise<boolean> {
  const EmailService = await getEmailService();
  const params = deserializePayload(job.payload as Record<string, unknown>);
  const ctx: RetryContext = { retryQueueId: job.id };

  try {
    switch (job.emailType) {
      case EMAIL_TYPES.TRAINER_SETUP:
        return await EmailService.sendTrainerSetupEmail(
          params.email as string,
          params.name as string,
          params.setupUrl as string,
          ctx,
        );

      case EMAIL_TYPES.COORDINATOR_SETUP:
        return await EmailService.sendCoordinatorSetupEmail(
          params.email as string,
          params.name as string,
          params.setupUrl as string,
          params.organizationName as string,
          ctx,
        );

      case EMAIL_TYPES.PASSWORD_RESET:
        return await EmailService.sendPasswordResetEmail(
          params.email as string,
          params.name as string,
          params.resetUrl as string,
          ctx,
        );

      case EMAIL_TYPES.MFA_CODE:
        return await EmailService.sendMfaCodeEmail(
          params.email as string,
          params.name as string | null,
          params.code as string,
          params.expiresAt as Date,
          ctx,
        );

      case EMAIL_TYPES.USER_SETUP:
      case EMAIL_TYPES.POLWEL_USER_SETUP:
        return await EmailService.sendPolwelUserSetupEmail(
          params.email as string,
          params.name as string,
          params.setupUrl as string,
          ctx,
        );

      case EMAIL_TYPES.TRAINER_ASSIGNMENT: {
        const result = await EmailService.sendTrainerAssignmentEmail(
          params.email as string,
          params.name as string,
          params.courseRunDetails as any,
          params.baseFee as number,
          params.ccEmails as string[] | null | undefined,
          params.additionalBody as string | null | undefined,
          params.attachments as any[] | null | undefined,
          params.recipientType as 'trainer' | 'partner' | undefined,
          ctx,
        );
        return result.success;
      }

      case EMAIL_TYPES.COURSE_CONFIRMATION:
        return await EmailService.sendLearnerCourseConfirmationEmail(
          params as any,
          ctx,
        );

      case EMAIL_TYPES.COURSE_CANCELLATION:
        return await EmailService.sendCourseCancellationEmail(
          params as any,
          ctx,
        );

      case EMAIL_TYPES.COURSE_COMPLETION:
        return await EmailService.sendCourseCompletionEmail(
          params as any,
          ctx,
        );

      case EMAIL_TYPES.TRAINER_COMPLETION:
        return await EmailService.sendTrainerCourseCompletionEmail(
          params as any,
          ctx,
        );

      case EMAIL_TYPES.TA_APPROVAL:
        return await EmailService.sendCourseRunTAApprovalEmail(
          params as any,
          ctx,
        );

      case EMAIL_TYPES.WAIVER_NOTIFICATION:
        return await EmailService.sendWaiverPendingNotificationEmail(
          params as any,
          ctx,
        );

      default:
        console.error(`[EmailQueue] Unknown emailType in dispatchRetryJob: ${job.emailType}`);
        return false;
    }
  } catch (err) {
    console.error(
      `[EmailQueue] dispatchRetryJob threw for ${job.emailType} (id=${job.id}):`,
      (err as any)?.message,
    );
    return false;
  }
}

// ── Main processor (called by worker) ────────────────────────────────────────

let _isProcessing = false;

/**
 * Fetch and process all due retry jobs.
 * Atomically claims each job (PENDING → PROCESSING) to prevent double-execution
 * in case multiple backend processes are running.
 */
export async function processDueRetries(): Promise<void> {
  if (_isProcessing) return;
  _isProcessing = true;
  try {
    // Find due jobs (avoid large IN clause — take up to 20 per cycle)
    const due = await prisma.emailRetryQueue.findMany({
      where:   { status: 'PENDING', nextRunAt: { lte: new Date() } },
      orderBy: { nextRunAt: 'asc' },
      take:    20,
    });

    if (due.length > 0) {
      console.log(`[EmailQueue] ${due.length} due retry job(s) found.`);
    }

    for (const job of due) {
      // Atomic claim: only proceeds if the row is still PENDING
      const claimed = await prisma.emailRetryQueue.updateMany({
        where: { id: job.id, status: 'PENDING' },
        data:  { status: 'PROCESSING' },
      });
      if (claimed.count === 0) {
        // Another worker instance claimed it first — skip
        continue;
      }

      console.log(
        `[EmailQueue] Processing job ${job.id} | type=${job.emailType} | ` +
        `attempt ${job.attempts + 1}/${job.maxAttempts} | to=${job.recipient}`,
      );

      const success = await dispatchRetryJob(job);

      if (success) {
        await markQueueJobSent(job.id);
      } else {
        // Get the latest error from email_logs for this queue job
        const latestLog = await prisma.emailLog.findFirst({
          where:   { retryQueueId: job.id },
          orderBy: { createdAt: 'desc' },
          select:  { errorMessage: true, errorCategory: true },
        });
        await markQueueJobFailed(
          job.id,
          latestLog?.errorMessage ?? 'Retry attempt failed',
          latestLog?.errorCategory ?? undefined,
        );
      }
    }
  } catch (err) {
    console.error('[EmailQueue] processDueRetries error:', (err as any)?.message);
  } finally {
    _isProcessing = false;
  }
}
