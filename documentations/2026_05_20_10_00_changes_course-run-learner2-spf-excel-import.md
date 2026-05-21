# Course Run Learner 2 — SPF-Format Excel Import

**Date:** 2026-05-20  
**Feature:** New import workflow for SPF (Singapore Police Force) unit training records  
**Scope:** Database migration · Prisma schema · Backend controller + routes · Frontend dialog · Home.tsx

---

## 1. Overview

A second learner-import template was needed to support the SPF Excel export format, which
differs significantly from the original learner import format:

| Aspect | Original Learner Import | Course Run Learner 2 (SPF) |
|---|---|---|
| Lookup key | Email / name | `SPF Email Address` |
| Organisation column | Not present | `Department` (auto-creates SPF org) |
| Coordinator columns | Not present | `Training Officer's Name/Email/Phone` |
| Billing columns | Invoice / Remarks | PO No., Invoice No., Receipt No., Fees before GST, Fees Remarks |
| Date format | Various | `DD-MM-YYYY` |
| Multi-run matching | Not supported | Matches ALL runs on the same calendar day |

---

## 2. Database Changes

### 2.1 New columns on `course_run_learners`

```sql
ALTER TABLE `course_run_learners` ADD COLUMN `poNumber`     VARCHAR(255) NULL;
ALTER TABLE `course_run_learners` ADD COLUMN `receiptNumber` VARCHAR(255) NULL;
```

Migration file:
`polwel-backend/prisma/migrations/20260520100000_add_po_receipt_to_course_run_learners/migration.sql`

### 2.2 Prisma schema (`polwel-backend/prisma/schema.prisma`)

Two fields added to the `CourseRunLearner` model (before `certificateGeneratedAt`):

```prisma
poNumber      String? @db.VarChar(255)
receiptNumber String? @db.VarChar(255)
```

---

## 3. Backend

### 3.1 `polwel-backend/src/controllers/importController.ts`

Two new exported async functions appended after the existing `previewLearners`:

#### `previewCourseRunLearners2(req, res)`

- Reads the uploaded `.xlsx` / `.csv` buffer with `XLSX.read()`
- Returns first **100 rows** as a preview array (does not write to DB)
- Each preview row includes all key display columns: name, department, email, fees,
  invoice no., BU no., coordinator, enrollment/attendance status, course run title & start date

#### `importCourseRunLearners2(req, res)`

Full processing pipeline (row-by-row, sequential):

| Step | Action |
|---|---|
| 1 | **Upsert Learner** — look up by `SPF Email Address` (or name if no email). Update name/designation/contact if found; create if not. Cached per email/name key. |
| 2 | **Upsert Organisation** — `Department` column → `organizations` table with `organizationType = SPF`. Created if not found by exact name. `buNumber` stored on org. Cached per org name. |
| 3 | **Upsert Training Coordinator** — `Training Officer's Email` → `users` table. If not found AND `Training Officer's Name` present: auto-creates a `TRAINING_COORDINATOR` user with a random 32-hex password (must be reset). Cached per email. |
| 4 | **Find ALL matching CourseRuns** — looks up `courses` by `Course Run Title`, then `course_runs` on the UTC calendar day matching `Course Run Start Date`. Multiple runs on same day all receive the enrollment. Cached per `title\|date`. |
| 5 | **Enrollment/Attendance status** — `ENROLLED` (default) or `WITHDRAWN`; `PRESENT` / `ABSENT` / `PENDING` (default). |
| 6 | **Parse financial fields** — strips `$` / commas from `Fees before GST`, parses as float. |
| 7 | For each matched `courseRunId`: |
| 7a | Upsert `CourseRunBilling` (1:1 with run) |
| 7b | Upsert `CourseRunBillingEntry` per unique `Invoice No.` within that billing record |
| 7c | Upsert `CourseRunLearner` (unique on `courseRunId + learnerId`) — creates or updates all fields |

**Response shape:**

```json
{
  "success": true,
  "results": {
    "total": 50,
    "learnersCreated": 12,
    "learnersUpdated": 38,
    "organizationsCreated": 3,
    "coordinatorsCreated": 1,
    "enrollmentsCreated": 48,
    "enrollmentsUpdated": 2,
    "billingsCreated": 5,
    "billingEntriesCreated": 8,
    "skipped": 0,
    "errors": []
  },
  "message": "12 new learners, 38 learners updated, ..."
}
```

### 3.2 `polwel-backend/src/routes/import.ts`

Two new routes registered (both protected by `requirePermissions('course-run.create')`):

```
POST /import/course-run-learners-2/preview  → previewCourseRunLearners2
POST /import/course-run-learners-2          → importCourseRunLearners2
```

---

## 4. Frontend

### 4.1 `src/lib/api.ts` — `importApi` additions

```typescript
importApi.previewCourseRunLearners2(file)   // POST /import/course-run-learners-2/preview
importApi.importCourseRunLearners2(file)    // POST /import/course-run-learners-2
```

### 4.2 `src/components/ImportCourseRunLearners2Dialog.tsx` (new file)

Three-step dialog following the same UX pattern as `ImportLearnersDialog.tsx`:

| Step | Screen |
|---|---|
| **Upload** | Drag-and-drop / click zone + column reference table listing all 20 expected Excel columns |
| **Preview** | Scrollable table of up to 100 rows with enrolment/attendance badge colouring |
| **Result** | 10 stat cards (new learners, updated learners, new orgs, new coordinators, enrollments created/updated, billings, billing entries, skipped), error list |

### 4.3 `src/pages/Home.tsx`

- Added import: `import { ImportCourseRunLearners2Dialog } from "@/components/ImportCourseRunLearners2Dialog";`
- Added `<ImportCourseRunLearners2Dialog />` inside the "Data Import" card
- Updated card description to mention SPF format

---

## 5. Excel Column Mapping Reference

| Excel Column | Target | Notes |
|---|---|---|
| `Name` | `learners.fullname` | Required |
| `Department` | `organizations.name` (type SPF) | Auto-created if missing |
| `Designation` | `learners.designation` | Optional |
| `SPF Email Address` | `learners.email` | Primary lookup key |
| `Contact Number` | `learners.contact` | Optional |
| `Retiring Officer?` | — | **Ignored** |
| `Payment Mode` | `course_run_learners.paymentMode` | Mapped via `parsePaymentMode()` |
| `Fees before GST` | `course_run_learners.totalFees` | Strips `$`, commas, spaces |
| `Fees Remarks` | `course_run_learners.feesRemarks` | Optional |
| `PO No./ Payment Advice` | `course_run_learners.poNumber` | **New field** |
| `Invoice No.` | `course_run_learners.invoiceNumber` + `course_run_billing_entries.pbmsInvoiceNumber` | Creates billing entry per unique invoice |
| `Receipt No.` | `course_run_learners.receiptNumber` | **New field** |
| `Business Unit Number` | `organizations.buNumber` + `course_run_learners.buNumber` | Optional |
| `Training Officer's Name` | `users.name` (TRAINING_COORDINATOR) | Used for auto-create |
| `Training Officer's Email` | `users.email` | Lookup key; auto-creates if missing |
| `Training Officer's Phone Number` | `users.contactNumber` | Optional |
| `Enrollment Status` | `course_run_learners.enrollmentStatus` | ENROLLED (default) / WITHDRAWN |
| `Attendance Status` | `course_run_learners.attendanceStatus` | PRESENT / ABSENT / PENDING (default) |
| `Course Run Title` | `courses.title` (lookup) | Required |
| `Course Run Start Date` | `course_runs.startDatetime` (UTC calendar day) | Required; DD-MM-YYYY or serial |

---

## 6. Error Handling

- Rows with missing `Name` or `Course Run Title` are skipped with an error entry
- Rows where `Course Run Start Date` cannot be parsed are skipped
- Rows where no matching course run is found are skipped with a descriptive error
- Per-run database errors (e.g. constraint violations) are recorded per row but do not abort the rest
- All errors are returned in `results.errors[]` and displayed in the Result step of the dialog

---

## 7. Security Notes

- Auto-created coordinator accounts receive a random 16-byte hex password, bcrypt-hashed at cost 12
- The account is immediately active but the password is not stored in plaintext anywhere
- A password-reset flow must be used before the coordinator can log in
- All routes require `course-run.create` permission (admin / polwel staff only)
- File upload is handled by `multer.memoryStorage()` with a 20 MB limit — no files are written to disk

---

## 8. Files Changed / Created

| File | Change |
|---|---|
| `polwel-backend/prisma/schema.prisma` | Added `poNumber`, `receiptNumber` to `CourseRunLearner` |
| `polwel-backend/prisma/migrations/20260520100000_add_po_receipt_to_course_run_learners/migration.sql` | **CREATED** — `ALTER TABLE` migration |
| `polwel-backend/src/controllers/importController.ts` | Appended `previewCourseRunLearners2` + `importCourseRunLearners2` |
| `polwel-backend/src/routes/import.ts` | Added two new routes + updated imports |
| `src/lib/api.ts` | Added `previewCourseRunLearners2` + `importCourseRunLearners2` to `importApi` |
| `src/components/ImportCourseRunLearners2Dialog.tsx` | **CREATED** — full three-step import dialog |
| `src/pages/Home.tsx` | Added import + dialog usage in Data Import card |
