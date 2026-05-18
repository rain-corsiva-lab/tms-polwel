# Certificate Email Status Per Learner Tracking

**Date:** 2026-05-18  
**Feature:** Track certificate email send status per learner in `course_run_learners` table

---

## Overview

Added `certificateEmailStatus` and `certificateEmailSentAt` fields to `CourseRunLearner` to track whether a certificate completion email has been sent to each learner, and display that status in both certificate dialog components.

---

## Changes

### Database

**Migration:** `20260518100000_certificate_email_status`

```sql
ALTER TABLE `course_run_learners`
  ADD COLUMN `certificateEmailStatus` ENUM('NOT_SENT','SENDING','SENT','FAILED') NOT NULL DEFAULT 'NOT_SENT',
  ADD COLUMN `certificateEmailSentAt` DATETIME(3) NULL;
```

### Prisma Schema (`polwel-backend/prisma/schema.prisma`)

Added to `CourseRunLearner` model:
- `certificateEmailStatus CertificateEmailStatus @default(NOT_SENT)`
- `certificateEmailSentAt DateTime?`

New enum:
```prisma
enum CertificateEmailStatus {
  NOT_SENT
  SENDING
  SENT
  FAILED
}
```

### Backend Controller (`polwel-backend/src/controllers/courseRunController.ts`)

**`generateCertificates`** (both object and class method):
- Now returns `certificateEmailStatus` and `certificateEmailSentAt` per learner

**`sendCertificatesToLearners`** (both object and class method):
- Before sending loop: bulk-sets all selected enrollments to `SENDING`
- On email success per learner: updates to `SENT` + sets `certificateEmailSentAt = now()`
- On email failure per learner: updates to `FAILED`
- On no-email / catch: updates to `FAILED`
- Response now includes `enrollmentId` per result entry

### Frontend

**`src/components/GenerateCertificatesDialog.tsx`**
- `LearnerWithAttendance` interface: added `certificateEmailStatus?` and `certificateEmailSentAt?`
- Present learners table: new "Email Status" column with color-coded badges
  - `NOT_SENT` → gray outline badge "Not Sent"
  - `SENDING` → blue badge "Sending…"
  - `SENT` → green badge "Sent"
  - `FAILED` → red destructive badge "Failed"
- After `handleSendCertificates` succeeds, `fetchCertificateData()` is called to refresh statuses

**`src/components/CertificateGenerationDialog.tsx`**
- `Learner` interface: added `certificateEmailStatus?` and `certificateEmailSentAt?`
- Eligible learners table: same "Email Status" column with same badge styling

---

## Status Values

| Value | Meaning |
|-------|---------|
| `NOT_SENT` | Default; no email attempted |
| `SENDING` | Email send in progress |
| `SENT` | Email delivered successfully |
| `FAILED` | Email send failed |

---

## Notes

- All existing rows default to `NOT_SENT` via migration `DEFAULT 'NOT_SENT'`
- The status is reset to `SENDING` each time the send action is triggered, allowing retries
