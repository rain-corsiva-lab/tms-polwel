# Email Auto-Retry Queue System

**Date:** 2026-05-15  
**Feature:** Automatic email retry on failure — up to 10 retries, 3-minute intervals  
**Scope:** All 12 outbound email types, no exceptions

---

## Overview

When any email send fails, the system now automatically enqueues it for retry. The retry worker polls every 30 seconds and re-attempts any queued emails whose `nextRunAt` time has passed.

**Retry behaviour:**
- First failure → enqueued, next attempt in **3 minutes**
- Each subsequent failure → re-enqueued, next attempt in **3 more minutes**
- **Maximum 10 attempts** total (original + 9 retries)
- After 10 failures → status set to `ABANDONED`, no more retries
- On success → status set to `SENT`, retries stop immediately
- Each attempt (success or failure) is logged as a separate `email_logs` row linked via `retryQueueId`

**Example timeline:**
```
13:00 - Course cancelled → email send fails → log entry (FAILED) + enqueued
13:03 - Retry #1 → still fails → log entry (FAILED)
13:06 - Retry #2 → success → log entry (SENT) → queue job SENT, retries stop
```

---

## Files Changed

### New Files
| File | Purpose |
|------|---------|
| `polwel-backend/src/services/emailQueueService.ts` | Queue management: enqueue, mark sent/failed, poll and dispatch retries |
| `polwel-backend/src/jobs/emailRetryWorker.ts` | Background worker using `node-cron` (every 30 seconds) |
| `polwel-backend/prisma/migrations/20260515140000_email_retry_queue/migration.sql` | DB migration: `email_retry_queue` table, `retryQueueId` on `email_logs` |

### Modified Files
| File | Changes |
|------|---------|
| `polwel-backend/prisma/schema.prisma` | New `EmailRetryQueue` model, `EmailRetryStatus` enum, `retryQueueId` field on `EmailLog` |
| `polwel-backend/src/services/emailLogService.ts` | `retryQueueId` param in `createEmailLog`, `markEmailRetrying` helper |
| `polwel-backend/src/services/emailService.ts` | All 12 methods accept `_ctx?: RetryContext`, enqueue on first-time failure |
| `polwel-backend/src/controllers/emailLogController.ts` | New `getRetryQueue`, `getRetryQueueById`, `cancelRetryJob` handlers |
| `polwel-backend/src/routes/emailLogs.ts` | New routes: `GET /retry-queue`, `GET /retry-queue/:id`, `DELETE /retry-queue/:id` |
| `polwel-backend/src/index.ts` | `startEmailRetryWorker()` called on server start |
| `src/lib/api.ts` | New `emailRetryQueueApi` (getAll, getById, cancel) |
| `src/pages/EmailLogs.tsx` | Tabs (Email Logs / Retry Queue), retry queue table with cancel action |

---

## Database Schema

### New table: `email_retry_queue`
```sql
id            VARCHAR(30)  PRIMARY KEY  -- cuid()
emailType     VARCHAR(100) NOT NULL
recipient     VARCHAR(2000) NOT NULL
subject       VARCHAR(500)
payload       JSON         NOT NULL     -- serialized email params
status        ENUM('PENDING','PROCESSING','SENT','ABANDONED')  DEFAULT 'PENDING'
attempts      INT          DEFAULT 1
maxAttempts   INT          DEFAULT 10
nextRunAt     DATETIME(3)  NOT NULL
lastError     TEXT
errorCategory VARCHAR(50)
courseRunId   VARCHAR(30)
createdAt     DATETIME(3)  DEFAULT NOW()
updatedAt     DATETIME(3)
```

### Modified: `email_logs`
```sql
retryQueueId  VARCHAR(30)  -- FK to email_retry_queue.id (nullable)
```

---

## Architecture

```
EmailService.sendXxx()
    │
    ├─ success → markEmailSent() → done
    │
    └─ failure
         ├─ markEmailFailed()
         ├─ (if NOT already a retry: !_ctx?.retryQueueId)
         │   └─ enqueueEmailRetry() → creates email_retry_queue row (PENDING)
         └─ return false

EmailRetryWorker (every 30s)
    └─ processDueRetries()
         ├─ find PENDING rows where nextRunAt <= now
         ├─ set status = PROCESSING (atomic)
         └─ dispatchRetryJob(job)
              ├─ calls EmailService.sendXxx(params, { retryQueueId: job.id })
              ├─ success → markQueueJobSent()
              └─ failure
                   ├─ attempts < maxAttempts → PENDING, nextRunAt += 3min
                   └─ attempts >= maxAttempts → ABANDONED
```

### Circular dependency avoidance
`emailQueueService.ts` uses `require('./emailService')` (synchronous CJS require) inside `dispatchRetryJob()` to avoid the circular import chain at module load time.

### Payload serialization
`serializePayload()` converts `Buffer` → base64 string and `Date` → ISO string before JSON storage. `deserializePayload()` reverses this on dispatch.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/email-logs/retry-queue` | List retry queue jobs (filterable by status, emailType, courseRunId) |
| `GET` | `/api/email-logs/retry-queue/:id` | Get single retry job with all linked email_logs |
| `DELETE` | `/api/email-logs/retry-queue/:id` | Cancel (abandon) a pending retry job |

All endpoints require authentication.

---

## Email Types Covered

All 12 outbound email methods have retry support:
1. `sendTrainerSetupEmail`
2. `sendCoordinatorSetupEmail`
3. `sendPasswordResetEmail`
4. `sendMfaCodeEmail`
5. `sendPolwelUserSetupEmail` (+ alias `sendUserSetupEmail`)
6. `sendTrainerAssignmentEmail`
7. `sendLearnerCourseConfirmationEmail`
8. `sendCourseCancellationEmail`
9. `sendCourseCompletionEmail`
10. `sendTrainerCourseCompletionEmail`
11. `sendCourseRunTAApprovalEmail` *(has existing 3-attempt in-process loop; retry queue fires only after all 3 in-process attempts fail)*
12. `sendWaiverPendingNotificationEmail`

---

## UI Changes (EmailLogs page)

- New tab bar: **Email Logs** | **Retry Queue**
- Retry Queue tab shows all jobs with status, attempts/max, next retry time, last error, and a Cancel button for pending jobs
- Email Logs tab: `retryQueueId` field available on each log record (links log attempt to its queue job)
