/**
 * emailLogService.ts
 *
 * Best-effort database logging for every outbound email.
 * All operations silently swallow errors so a DB hiccup never blocks email delivery.
 *
 * Key concepts:
 *  - Every email send attempt is logged immediately as PENDING before sending.
 *  - On success  → markEmailSent()     updates status to SENT with messageId + sentAt.
 *  - On failure  → markEmailFailed()   updates status to FAILED with full error context.
 *  - On retry    → markEmailRetrying() marks the in-flight retry state.
 *  - classifyError() maps any raw error/code into a human-readable category enum so
 *    admins can filter logs by root cause without reading raw SMTP responses.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Email type constants ──────────────────────────────────────────────────────
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

// ── Provider constants ────────────────────────────────────────────────────────

/** Transport layer that was used to send the email. */
export const EMAIL_PROVIDERS = {
  SMTP:      'SMTP',
  GRAPH_API: 'GRAPH_API',
  MAILJET:   'MAILJET',
  /** No transporter configured (dev mode / misconfiguration). */
  NONE:      'NONE',
} as const;

export type EmailProvider = typeof EMAIL_PROVIDERS[keyof typeof EMAIL_PROVIDERS];

// ── Error category constants ──────────────────────────────────────────────────

/**
 * Classified error category for every failed send attempt.
 * Stored in email_logs.errorCategory for fast UI filtering without parsing raw error text.
 */
export const EMAIL_ERROR_CATEGORIES = {
  /** SMTP / API responded with rate-limit or throttle code (429, etc.). */
  RATE_LIMIT:          'RATE_LIMIT',
  /** Authentication rejected (wrong credentials, expired token, EAUTH). */
  AUTH_FAILED:         'AUTH_FAILED',
  /** TCP-level failure: ECONNREFUSED, ENOTFOUND, ECONNRESET. */
  NETWORK_ERROR:       'NETWORK_ERROR',
  /** ETIMEDOUT, ESOCKET, or greeting timeout. */
  SMTP_TIMEOUT:        'SMTP_TIMEOUT',
  /** Recipient address rejected (550, 551, 553, invalid mailbox). */
  INVALID_RECIPIENT:   'INVALID_RECIPIENT',
  /** Message too large / attachment error (452, SIZE exceeded). */
  ATTACHMENT_ERROR:    'ATTACHMENT_ERROR',
  /** Missing / invalid SMTP or Graph API env config. */
  CONFIG_ERROR:        'CONFIG_ERROR',
  /** Microsoft Graph API / Azure AD error (token, permissions, HTTP 4xx). */
  GRAPH_API_ERROR:     'GRAPH_API_ERROR',
  /** Mailjet REST API returned non-success status. */
  MAILJET_ERROR:       'MAILJET_ERROR',
  /** Upstream mail server temporarily unavailable (503 / 421). */
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  /** Catch-all for anything that does not match a specific pattern. */
  UNKNOWN:             'UNKNOWN',
} as const;

export type EmailErrorCategory = typeof EMAIL_ERROR_CATEGORIES[keyof typeof EMAIL_ERROR_CATEGORIES];

// ── Error classifier ──────────────────────────────────────────────────────────

/**
 * Classify any thrown error or string into an EmailErrorCategory.
 * Uses the error's `code` property first (reliable for nodemailer errors),
 * then falls back to pattern-matching the stringified message and SMTP response.
 *
 * This function never throws.
 */
export function classifyError(error: unknown): EmailErrorCategory {
  try {
    const code     = ((error as any)?.code     ?? '').toString().toUpperCase();
    const msg      = ((error as any)?.message  ?? String(error ?? '')).toString().toUpperCase();
    const response = ((error as any)?.response ?? '').toString().toUpperCase();
    const combined = `${code} ${msg} ${response}`;

    // Network / connectivity
    if (/ECONNREFUSED|ENOTFOUND|ECONNRESET|ENETUNREACH|EHOSTUNREACH/.test(combined))  return EMAIL_ERROR_CATEGORIES.NETWORK_ERROR;
    // Timeout
    if (/ETIMEDOUT|ESOCKET|SOCKET_TIMEOUT|GREETING_TIMEOUT|TIMED.?OUT/.test(combined)) return EMAIL_ERROR_CATEGORIES.SMTP_TIMEOUT;
    // Authentication
    if (/EAUTH|\b535\b|\b530\b|\b534\b|AUTH.FAILED|INVALID.CREDENTIALS|WRONG.PASSWORD|AUTHENTICATION.FAILED/.test(combined)) return EMAIL_ERROR_CATEGORIES.AUTH_FAILED;
    // Rate limiting
    if (/RATE.?LIMIT|THROTTL|\b429\b|TOO.MANY|QUOTA.EXCEEDED/.test(combined))          return EMAIL_ERROR_CATEGORIES.RATE_LIMIT;
    // Service unavailable
    if (/\b503\b|\b421\b|SERVICE.UNAVAIL|TRY.AGAIN.LATER/.test(combined))               return EMAIL_ERROR_CATEGORIES.SERVICE_UNAVAILABLE;
    // Invalid recipient
    if (/\b550\b|\b551\b|\b552\b|\b553\b|\b554\b|INVALID.RECIPIENT|MAILBOX.NOT.FOUND|NO.SUCH.USER|DOES.NOT.EXIST|USER.UNKNOWN/.test(combined)) return EMAIL_ERROR_CATEGORIES.INVALID_RECIPIENT;
    // Attachment / message size
    if (/\b452\b|SIZE.EXCEEDED|TOO.LARGE|ATTACHMENT|MESSAGE.SIZE|ATTACHMENT.SIZE/.test(combined)) return EMAIL_ERROR_CATEGORIES.ATTACHMENT_ERROR;
    // Graph / Azure
    if (/GRAPH|AZURE|MICROSOFT|ACCESS.TOKEN|TENANT|CLIENT_SECRET|CLIENT_ID|OAUTH|BEARER/.test(combined)) return EMAIL_ERROR_CATEGORIES.GRAPH_API_ERROR;
    // Mailjet
    if (/MAILJET/.test(combined))                                                         return EMAIL_ERROR_CATEGORIES.MAILJET_ERROR;
    // Config / no transporter
    if (/NO.TRANSPORTER|NOT.CONFIGURED|SMTP.NOT.CONFIGURED|NO.SMTP|CONFIG.ERROR/.test(combined)) return EMAIL_ERROR_CATEGORIES.CONFIG_ERROR;

    return EMAIL_ERROR_CATEGORIES.UNKNOWN;
  } catch {
    return EMAIL_ERROR_CATEGORIES.UNKNOWN;
  }
}

/**
 * Convenience helper: extract a truncated stack trace from any error value.
 * Returns undefined if no stack is present.
 */
export function extractStack(error: unknown): string | undefined {
  const stack = (error as any)?.stack;
  if (!stack) return undefined;
  return String(stack).substring(0, 2000);
}

/**
 * Convenience helper: extract the full SMTP response string from a nodemailer error,
 * or Graph / Mailjet HTTP response body string.
 */
export function extractSmtpResponse(error: unknown, fallback?: string): string | undefined {
  const response =
    (error as any)?.response     ||   // nodemailer SMTP response line
    (error as any)?.responseCode ||   // some transports
    (error as any)?.body         ||   // HTTP body
    fallback;
  if (!response) return undefined;
  return String(response).substring(0, 4000);
}

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface CreateEmailLogParams {
  emailType: string;
  /** Single address or comma-separated list for grouped sends */
  recipient: string;
  /** CC addresses (comma-separated) */
  cc?: string;
  subject?: string;
  courseRunId?: string;
  metadata?: Record<string, unknown>;
  /** Transport provider being used for this send */
  provider?: string;
  /** Link to the retry queue job this attempt belongs to (undefined = first attempt) */
  retryQueueId?: string | undefined;
}

export interface MarkSentExtras {
  /** Full SMTP / Graph / Mailjet response text (may be empty on 202 Accepted) */
  smtpResponse?: string | undefined;
  /** Exact datetime the server accepted the message */
  sentAt?: Date | undefined;
}

export interface MarkFailedExtras {
  /** Classified error category — auto-detected via classifyError() if not supplied */
  errorCategory?: string | undefined;
  /** Full SMTP / API response text */
  smtpResponse?: string | undefined;
  /** Truncated stack trace */
  errorStack?: string | undefined;
  /** Transport that was in use when the failure occurred */
  provider?: string | undefined;
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Create a new PENDING log entry.
 *
 * IMPORTANT: Call this BEFORE the send attempt so a record always exists even
 * if the process crashes mid-send.  Reuse the returned ID in both success and
 * failure paths — do NOT call createEmailLog a second time in the catch block.
 *
 * Returns the log ID on success, or null if the DB write fails (best-effort).
 */
export async function createEmailLog(params: CreateEmailLogParams): Promise<string | null> {
  try {
    const log = await prisma.emailLog.create({
      data: {
        emailType:   params.emailType,
        recipient:   params.recipient.substring(0, 2000),
        ...(params.cc          ? { cc:          params.cc.substring(0, 2000) }      : {}),
        ...(params.subject     ? { subject:     params.subject.substring(0, 500) }  : {}),
        ...(params.courseRunId ? { courseRunId: params.courseRunId }                 : {}),
        ...(params.metadata    ? { metadata:    params.metadata as any }             : {}),
        ...(params.provider      ? { provider:      params.provider.substring(0, 50) }   : {}),
        ...(params.retryQueueId  ? { retryQueueId:  params.retryQueueId }                 : {}),
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
 *
 * @param logId      - ID returned by createEmailLog
 * @param messageId  - SMTP Message-ID or Graph/Mailjet message UUID
 * @param attempts   - Total number of attempts made (usually 1)
 * @param extras     - Optional smtpResponse and sentAt timestamp
 */
export async function markEmailSent(
  logId: string | null,
  messageId?: string,
  attempts = 1,
  extras?: MarkSentExtras,
): Promise<void> {
  if (!logId) return;
  try {
    await prisma.emailLog.update({
      where: { id: logId },
      data: {
        status:        'SENT',
        attempts,
        lastAttemptAt: new Date(),
        sentAt:        extras?.sentAt ?? new Date(),
        ...(messageId            ? { messageId:    messageId.substring(0, 255) }            : {}),
        ...(extras?.smtpResponse ? { smtpResponse: extras.smtpResponse.substring(0, 4000) } : {}),
      },
    });
  } catch (err) {
    console.error('[EmailLog] markEmailSent failed:', (err as any)?.message);
  }
}

/**
 * Mark a log entry as FAILED.
 * Automatically classifies the error category if not supplied via extras.
 *
 * @param logId        - ID returned by createEmailLog
 * @param errorMessage - Human-readable error message
 * @param errorCode    - Short code (nodemailer error.code, HTTP status, etc.)
 * @param attempts     - Total attempts made
 * @param extras       - Optional errorCategory, smtpResponse, errorStack, provider
 */
export async function markEmailFailed(
  logId: string | null,
  errorMessage?: string,
  errorCode?: string,
  attempts = 1,
  extras?: MarkFailedExtras,
): Promise<void> {
  if (!logId) return;
  try {
    // Auto-classify error if caller did not supply a category
    const category = extras?.errorCategory
      ?? classifyError({ message: errorMessage, code: errorCode });

    await prisma.emailLog.update({
      where: { id: logId },
      data: {
        status:        'FAILED',
        attempts,
        lastAttemptAt: new Date(),
        errorCategory: category.substring(0, 50),
        ...(errorMessage         ? { errorMessage:  errorMessage.substring(0, 5000) }          : {}),
        ...(errorCode            ? { errorCode:     errorCode.substring(0, 100) }              : {}),
        ...(extras?.smtpResponse ? { smtpResponse:  extras.smtpResponse.substring(0, 4000) }  : {}),
        ...(extras?.errorStack   ? { errorStack:    extras.errorStack.substring(0, 2000) }     : {}),
        ...(extras?.provider     ? { provider:      extras.provider.substring(0, 50) }         : {}),
      },
    });
  } catch (err) {
    console.error('[EmailLog] markEmailFailed failed:', (err as any)?.message);
  }
}

/**
 * Mark a log entry as RETRYING (mid-retry transient state).
 */
export async function markEmailRetrying(
  logId: string | null,
  attempts: number,
  errorMessage?: string,
  extras?: { errorCategory?: string; provider?: string },
): Promise<void> {
  if (!logId) return;
  try {
    const category = extras?.errorCategory ?? classifyError({ message: errorMessage });

    await prisma.emailLog.update({
      where: { id: logId },
      data: {
        status:        'RETRYING',
        attempts,
        lastAttemptAt: new Date(),
        errorCategory: category.substring(0, 50),
        ...(errorMessage     ? { errorMessage: errorMessage.substring(0, 5000) } : {}),
        ...(extras?.provider ? { provider:     extras.provider.substring(0, 50) } : {}),
      },
    });
  } catch (err) {
    console.error('[EmailLog] markEmailRetrying failed:', (err as any)?.message);
  }
}
