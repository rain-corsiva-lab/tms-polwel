# Email Logging — Comprehensive Error Tracking

**Date:** 2026-05-15  
**Scope:** Full-stack (database · backend · frontend)  
**Author:** GitHub Copilot (automated)

---

## 1. Overview

This change set resolves a critical issue where email send failures were **silently lost** — not recorded in `email_logs` at all, or recorded with insufficient detail to diagnose the root cause.

The fix covers:
- A **root bug** (double-log pattern) in `sendTrainerSetupEmail` and possibly others
- **5 new database columns** for richer error metadata
- **Automatic error classification** into 11 categories
- **Full transport response capture** for SMTP, Graph API, and Mailjet
- **Frontend filter + detail view** showing every new field

---

## 2. Root Cause Analysis

### 2.1 The Double-Log Bug

In `sendTrainerSetupEmail` (and potentially other methods), `createEmailLog()` was called **inside** the `if (transporter)` block:

```typescript
// BEFORE — broken
try {
  if (transporter) {
    const logId = await createEmailLog({ ... });   // ← created here
    const info  = await transporter.sendMail(...);
    await markEmailSent(logId, ...);
  }
} catch (error) {
  const logId2 = await createEmailLog({ ... });    // ← created AGAIN in catch
  await markEmailFailed(logId2, ...);
}
```

**Consequences:**
1. If `sendMail` threw after `createEmailLog` succeeded, the `logId` from the `try` block was out of scope in the `catch` block — so a second orphaned log was created.
2. The first log stayed `PENDING` forever.
3. The second log was marked `FAILED` but had no connection to the first record.
4. In race conditions (SMTP timeout, ECONNRESET) the `try` block's `createEmailLog` could itself throw before `transporter.sendMail`, leaving no log at all.

### 2.2 Missing Provider/Category Fields

All `markEmailFailed` calls previously omitted:
- Which transport was used (`SMTP`, `GRAPH_API`, `MAILJET`, or `NONE`)
- What category of error occurred
- The full transport response text
- The stack trace

This made it impossible to tell from the UI whether a failure was a network timeout, an auth problem, a rate limit, or a misconfiguration.

---

## 3. Database Changes

### 3.1 Migration File

`polwel-backend/prisma/migrations/20260515120000_email_logs_enhanced_error_tracking/migration.sql`

```sql
ALTER TABLE `email_logs`
  ADD COLUMN `provider`       VARCHAR(50)  NULL AFTER `errorCode`,
  ADD COLUMN `errorCategory`  VARCHAR(50)  NULL AFTER `provider`,
  ADD COLUMN `smtpResponse`   TEXT         NULL AFTER `errorCategory`,
  ADD COLUMN `errorStack`     TEXT         NULL AFTER `smtpResponse`,
  ADD COLUMN `sentAt`         DATETIME(3)  NULL AFTER `errorStack`;

CREATE INDEX `email_logs_provider_idx`       ON `email_logs`(`provider`);
CREATE INDEX `email_logs_errorCategory_idx`  ON `email_logs`(`errorCategory`);
```

### 3.2 New Columns

| Column | Type | Purpose |
|---|---|---|
| `provider` | `VARCHAR(50) NULL` | Transport used: `SMTP`, `GRAPH_API`, `MAILJET`, or `NONE` |
| `errorCategory` | `VARCHAR(50) NULL` | Classified error type (see §4) |
| `smtpResponse` | `TEXT NULL` | Full response string from the transport (e.g. `250 2.0.0 OK`) |
| `errorStack` | `TEXT NULL` | First ~2000 chars of the JavaScript stack trace |
| `sentAt` | `DATETIME(3) NULL` | Exact timestamp the server accepted the message (distinct from `lastAttemptAt`) |

### 3.3 Updated Prisma Schema

`polwel-backend/prisma/schema.prisma` — `EmailLog` model:

```prisma
model EmailLog {
  ...
  sentAt        DateTime?      @db.DateTime(3)
  errorCode     String?        @db.VarChar(100)
  provider      String?        @db.VarChar(50)
  errorCategory String?        @db.VarChar(50)
  smtpResponse  String?        @db.Text
  errorStack    String?        @db.Text
  ...
  @@index([provider])
  @@index([errorCategory])
}
```

---

## 4. Error Classification System

### 4.1 Constant: `EMAIL_PROVIDERS`

```typescript
export const EMAIL_PROVIDERS = {
  SMTP:      'SMTP',
  GRAPH_API: 'GRAPH_API',
  MAILJET:   'MAILJET',
  NONE:      'NONE',
} as const;
```

`NONE` is used when no transport is configured (dev/test environment).

### 4.2 Constant: `EMAIL_ERROR_CATEGORIES`

```typescript
export const EMAIL_ERROR_CATEGORIES = {
  RATE_LIMIT:          'RATE_LIMIT',
  AUTH_FAILED:         'AUTH_FAILED',
  NETWORK_ERROR:       'NETWORK_ERROR',
  SMTP_TIMEOUT:        'SMTP_TIMEOUT',
  INVALID_RECIPIENT:   'INVALID_RECIPIENT',
  ATTACHMENT_ERROR:    'ATTACHMENT_ERROR',
  CONFIG_ERROR:        'CONFIG_ERROR',
  GRAPH_API_ERROR:     'GRAPH_API_ERROR',
  MAILJET_ERROR:       'MAILJET_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  UNKNOWN:             'UNKNOWN',
} as const;
```

### 4.3 Function: `classifyError(error)`

Inspects `error.code`, `error.message`, `error.response`, and `error.responseCode` using case-insensitive regex:

| Pattern matched | Category |
|---|---|
| `ECONNREFUSED`, `ENOTFOUND`, `ECONNRESET` | `NETWORK_ERROR` |
| `ETIMEDOUT`, `ESOCKET`, `GREETING_TIMEOUT` | `SMTP_TIMEOUT` |
| `EAUTH`, `535`, `530`, `534` | `AUTH_FAILED` |
| `RATE_LIMIT`, `429`, `THROTTL` | `RATE_LIMIT` |
| `503`, `421`, `SERVICE_UNAVAILABLE` | `SERVICE_UNAVAILABLE` |
| `550`–`554`, `NO_SUCH_USER` | `INVALID_RECIPIENT` |
| `452`, `SIZE_EXCEEDED`, `TOO_LARGE` | `ATTACHMENT_ERROR` |
| `GRAPH`, `AZURE`, `TOKEN`, `OAUTH` | `GRAPH_API_ERROR` |
| `MAILJET` | `MAILJET_ERROR` |
| `NO_TRANSPORTER`, `NOT_CONFIGURED` | `CONFIG_ERROR` |
| (everything else) | `UNKNOWN` |

If `classifyError` is not called explicitly, `markEmailFailed` **auto-classifies** using the provided `errorMessage` and `errorCode`.

### 4.4 Helper Functions

| Function | Returns | Purpose |
|---|---|---|
| `classifyError(error)` | `string` | Classify any Error or plain object |
| `extractStack(error)` | `string \| undefined` | Safe stack trace truncated to 2000 chars |
| `extractSmtpResponse(error, fallback?)` | `string \| undefined` | Extract SMTP/API response text from error properties |

---

## 5. Backend Service Changes

### 5.1 `emailLogService.ts` — Updated Interfaces

```typescript
export interface MarkSentExtras {
  smtpResponse?: string | undefined;
  sentAt?: Date | undefined;
}

export interface MarkFailedExtras {
  errorCategory?: string | undefined;
  smtpResponse?: string | undefined;
  errorStack?: string | undefined;
  provider?: string | undefined;
}
```

Note: `string | undefined` (not just `string?`) is required due to `exactOptionalPropertyTypes: true` in tsconfig.

### 5.2 `emailLogService.ts` — Updated Function Signatures

**`markEmailSent`** — now accepts `extras?: MarkSentExtras`:
```typescript
markEmailSent(logId, messageId?, attempts?, extras?)
// extras.smtpResponse → stored in smtpResponse column
// extras.sentAt       → stored in sentAt column (defaults to now())
```

**`markEmailFailed`** — now accepts `extras?: MarkFailedExtras`:
```typescript
markEmailFailed(logId, errorMessage?, errorCode?, attempts?, extras?)
// extras.errorCategory → stored (auto-classified if omitted)
// extras.smtpResponse  → stored in smtpResponse column
// extras.errorStack    → stored in errorStack column
// extras.provider      → stored in provider column
```

**`markEmailRetrying`** — now accepts `extras?: { errorCategory?, provider? }`:
```typescript
markEmailRetrying(logId, attempts, errorMessage?, extras?)
```

### 5.3 `emailService.ts` — New Helper

```typescript
private static getProviderName(): string {
  if (this.isGraphApiMode()) return EMAIL_PROVIDERS.GRAPH_API;
  if (this.isMailjetSmtp())   return EMAIL_PROVIDERS.MAILJET;
  if (!this.transporter)      return EMAIL_PROVIDERS.NONE;
  return EMAIL_PROVIDERS.SMTP;
}
```

Called at log-creation time to record which transport is in use.

### 5.4 Corrected Pattern (all 12 send methods)

```typescript
// AFTER — correct pattern
const logId = await createEmailLog({
  emailType: EMAIL_TYPES.EXAMPLE,
  recipient:  email,
  subject,
  provider:   this.getProviderName(),   // ← new field
}).catch(() => null);

try {
  if (!transporter) {
    await markEmailFailed(logId, 'SMTP not configured', 'NO_TRANSPORTER', 1, {
      errorCategory: 'CONFIG_ERROR',
      provider: EMAIL_PROVIDERS.NONE,
    }).catch(() => {});
    return false;
  }

  const info = await transporter.sendMail(mailOptions);

  if (info.rejected?.length) {
    await markEmailFailed(logId, `Rejected: ${JSON.stringify(info.rejected)}`, 'SMTP_REJECTED', 1, {
      smtpResponse:  info.response,
      errorCategory: 'INVALID_RECIPIENT',
    }).catch(() => {});
    return false;
  }

  await markEmailSent(logId, info.messageId, 1, {
    smtpResponse: info.response,   // ← new field
  }).catch(() => {});
  return true;
} catch (error) {
  await markEmailFailed(logId, error.message, error.code, 1, {
    smtpResponse:  extractSmtpResponse(error),   // ← new
    errorStack:    extractStack(error),           // ← new
    errorCategory: classifyError(error),          // ← new
    provider:      this.getProviderName(),        // ← new
  }).catch(() => {});
  return false;
}
```

### 5.5 Methods Updated

All 12 email-sending methods were updated:

| Method | Changes |
|---|---|
| `sendTrainerSetupEmail` | Fixed double-log bug; single logId before try/catch; added provider, smtpResponse, errorStack, errorCategory |
| `sendCoordinatorSetupEmail` | Added provider to createEmailLog; smtpResponse to markEmailSent; full extras to markEmailFailed |
| `sendPasswordResetEmail` | Added provider, smtpResponse, errorStack, errorCategory |
| `sendMfaCodeEmail` | Added provider, smtpResponse, errorStack, errorCategory |
| `sendPolwelUserSetupEmail` | Added provider, smtpResponse, errorStack, errorCategory |
| `sendTrainerAssignmentEmail` | Added provider; Mailjet path now logs messageId; full markEmailFailed extras |
| `sendLearnerCourseConfirmationEmail` | Added provider; fixed Mailjet error category; SMTP_REJECTED includes smtpResponse; full extras |
| `sendCourseCancellationEmail` | Added provider; Mailjet failure logs MAILJET_ERROR; SMTP response captured |
| `sendCourseCompletionEmail` | Added provider; Mailjet failure logs MAILJET_ERROR; full extras |
| `sendTrainerCourseCompletionEmail` | Added provider; NO_TRANSPORTER returns false (was a silent no-op); full extras |
| `sendCourseRunTAApprovalEmail` | Added provider; retry loop passes provider to markEmailRetrying; full extras on final failure |
| `sendWaiverPendingNotificationEmail` | Added provider; full extras on failure |

---

## 6. Backend Controller Changes

### 6.1 `emailLogController.ts` — `getEmailLogs`

Added two new filter query parameters:

```typescript
const {
  ...,
  provider,       // filter by transport provider
  errorCategory,  // filter by error category
} = req.query;

if (provider)      where.provider      = provider;
if (errorCategory) where.errorCategory = errorCategory;
```

---

## 7. Frontend Changes

### 7.1 `src/lib/api.ts` — `emailLogsApi.getAll`

Added `provider` and `errorCategory` to the params type:

```typescript
getAll: async (params: {
  ...
  provider?: string;
  errorCategory?: string;
})
```

### 7.2 `src/pages/EmailLogs.tsx`

#### Updated `EmailLog` interface

Added fields:
```typescript
sentAt?: string | null;
provider?: string | null;
errorCategory?: string | null;
smtpResponse?: string | null;
errorStack?: string | null;
```

#### New constants

```typescript
const PROVIDERS = [
  { value: 'all',      label: 'All Providers' },
  { value: 'SMTP',     label: 'SMTP' },
  { value: 'GRAPH_API',label: 'Graph API' },
  { value: 'MAILJET',  label: 'Mailjet' },
  { value: 'NONE',     label: 'None (unconfigured)' },
];

const ERROR_CATEGORIES = {
  RATE_LIMIT:          { label: 'Rate Limit',         color: 'orange' },
  AUTH_FAILED:         { label: 'Auth Failed',         color: 'red' },
  NETWORK_ERROR:       { label: 'Network Error',       color: 'blue' },
  SMTP_TIMEOUT:        { label: 'SMTP Timeout',        color: 'yellow' },
  INVALID_RECIPIENT:   { label: 'Invalid Recipient',   color: 'pink' },
  ATTACHMENT_ERROR:    { label: 'Attachment Error',    color: 'purple' },
  CONFIG_ERROR:        { label: 'Config Error',        color: 'gray' },
  GRAPH_API_ERROR:     { label: 'Graph API Error',     color: 'indigo' },
  MAILJET_ERROR:       { label: 'Mailjet Error',       color: 'cyan' },
  SERVICE_UNAVAILABLE: { label: 'Service Unavailable', color: 'amber' },
  UNKNOWN:             { label: 'Unknown',             color: 'gray' },
};
```

#### New `providerBadge()` helper

Renders a coloured badge for each transport provider.

#### Filter bar

Added **Provider** dropdown filter (uses `PROVIDERS` list). Filter state is preserved and cleared with Reset.

#### Table

Added **Provider** column (with coloured badge) between Status and Attempts.

#### Detail modal (`LogDetail` component)

- Shows **Provider** badge row
- Shows **Sent At** timestamp row (only when present)
- Error section shows **Error Category** badge (colour-coded by type) above the error message box
- New **Transport Response** section shows `smtpResponse` in a `<pre>` block
- New collapsible **Stack Trace** section shows `errorStack` in a `<pre>` block

---

## 8. Migration Instructions

### 8.1 Run on staging/production

```bash
cd /path/to/polwel-backend
npx prisma migrate deploy
npx prisma generate
```

### 8.2 Rebuild backend

```bash
npx tsc
# or via PM2:
pm2 restart polwel-backend
```

### 8.3 Rebuild frontend

```bash
cd /path/to/polwel
npm run build
# deploy dist/ to web server
```

---

## 9. Behavioural Differences After This Change

| Scenario | Before | After |
|---|---|---|
| SMTP ECONNREFUSED | Log created, status PENDING; no failure record | Log created, status FAILED, errorCategory=NETWORK_ERROR, provider=SMTP |
| SMTP AUTH 535 | Log created, status PENDING | status FAILED, errorCategory=AUTH_FAILED |
| Rate limit 429 | No log | status FAILED, errorCategory=RATE_LIMIT, smtpResponse captured |
| Mailjet API failure | Log FAILED, no category | status FAILED, errorCategory=MAILJET_ERROR, provider=MAILJET |
| Graph API token error | Log FAILED, no category | status FAILED, errorCategory=GRAPH_API_ERROR, provider=GRAPH_API |
| SMTP not configured | Log SENT (incorrect) | Log FAILED, errorCategory=CONFIG_ERROR, provider=NONE |
| Email rejected post-send | Log SENT (incorrect) | Log FAILED, errorCategory=INVALID_RECIPIENT, smtpResponse captured |
| Crash during sendMail | Orphaned PENDING log | Single log FAILED with stack trace |

---

## 10. Files Changed

| File | Change Type |
|---|---|
| `polwel-backend/prisma/schema.prisma` | Modified — 5 new fields, 2 new indexes |
| `polwel-backend/prisma/migrations/20260515120000_email_logs_enhanced_error_tracking/migration.sql` | Created — adds 5 columns and 2 indexes |
| `polwel-backend/src/services/emailLogService.ts` | Rewritten — new constants, helpers, updated function signatures |
| `polwel-backend/src/services/emailService.ts` | Modified — all 12 send methods updated with provider tracking and full error extras |
| `polwel-backend/src/controllers/emailLogController.ts` | Modified — added `provider` and `errorCategory` filter params |
| `src/lib/api.ts` | Modified — added `provider` and `errorCategory` to `emailLogsApi.getAll` params |
| `src/pages/EmailLogs.tsx` | Modified — new interface fields, provider filter, provider column, error category badge, smtpResponse and errorStack in detail view |
