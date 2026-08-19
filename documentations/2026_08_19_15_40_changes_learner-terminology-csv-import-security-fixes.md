# Comprehensive System Enhancements: Learner Terminology Standardization, Course Run Import Fixes, Report Updates & Security Hardening

**Date**: August 19, 2026  
**Status**: Implemented & Verified Locally (Pending Review / Commit / Push)

---

## 1. Executive Summary

This document details all technical updates, root-cause troubleshooting, and enhancements implemented across the frontend and backend systems:

1. **Frontend Terminology Standardization ("Participant" → "Learner")**:
   - Standardized all client-facing UI labels, tab headers, dialog titles, table headers, toasts, button text, and export filenames from "Participant" / "Participants" to "Learner" / "Learners" across the entire application while strictly maintaining internal API payload and database schema properties to prevent any breaking changes.
2. **Course Run CSV / Excel Import Fix & Upgrade**:
   - Resolved the issue where the CSV/Excel import on the Course Run Detail page was not functioning. Upgraded `ImportLearnersDialog.tsx` to support both course-run-scoped imports (with flexible column mapping, downloadable pre-formatted templates, client-side spreadsheet parsing, validation preview, and direct batch enrollment via `courseRunsApi.enrollLearners`) and global learner imports.
3. **Learner Report Excel Export Update**:
   - Added the `Email Address` column directly after `Learner Name` in the backend `downloadLearnerReport` Excel export handler in `reportingController.ts`.
4. **Security Hardening (Section 3.3 Compliance)**:
   - Enforced 3-attempt / 30-minute account auto-lockout (`423 Locked`).
   - Integrated comprehensive `AuditLog` records for login success, login failure, account auto-lockout, and logout.
   - Set password expiration duration to 365 days.
   - Implemented password history tracking to prevent reusing any of the last 5 passwords.
   - Added manual account unlock endpoints and UI capabilities for POLWEL administrators.
5. **Training Coordinator Export Fixes**:
   - Resolved duplicate and composite entries (e.g. legacy combined rows like `Angeline Tan / Janice Lam`), parsed multiple email addresses into distinct records, merged multi-organization affiliations into a clean comma-separated list, and added the `Organisation` column to the export.

---

## 2. Detailed Breakdown of Changes

### A. Frontend UI Standardization ("Participant" → "Learner")

All user-visible text across pages and dialogs was standardized to use "Learner" / "Learners":

| File Path | Component / Page | Visible Changes Applied |
| :--- | :--- | :--- |
| `src/pages/CourseRunDetail.tsx` | Course Run Detail Page | • Tab header updated to `Learners ({count})`<br>• Enrolled card title: `Enrolled Learners ({count})`<br>• Withdrawn card title: `Withdrawn Learners ({count})`<br>• Action buttons: `Add Learners`, `Export learner list`<br>• Selection toolbar: `{count} learner(s) selected`<br>• Export filename: `learner-list-${serialNumber}.xlsx`<br>• Toasts: `Exported X learner(s)`, `Cannot add learners while course run is in DRAFT status` |
| `src/components/AddLearnersDialog.tsx` | Add Learners Dialog | • Dialog title: `Add Learners`<br>• Added `initialMode` prop support (`"single" \| "group" \| "import"`)<br>• Enabled 3-mode card selection grid (`grid-cols-1 md:grid-cols-3`)<br>• Mode labels: `Add Single Learner`, `Add Group of Learners`, `Import from File` |
| `src/components/ImportLearnersDialog.tsx` | Import Learners Modal | • Title: `Import Learners (CSV / Excel)`<br>• Description: `Upload a CSV or XLSX file containing learner particulars`<br>• Added Download Template button (`learner_import_template.xlsx`)<br>• Table preview headers: `Learner Name`, `SPF Email Address`, `Designation`, etc. |
| `src/pages/CourseRuns.tsx` | Course Runs Management | • Table header `<TableHead>Learners</TableHead>`<br>• Cancel dialog description: `Learners will be notified based on backend workflow settings.`<br>• Email preview notes: `Sample greeting uses the first enrolled learner's name...`<br>• Cancellation reason placeholder: `Let learners and stakeholders know why this run is cancelled`<br>• Workflow transition prompt: `Send learner emails` / `Notify enrolled learners about this transition`<br>• Training assignment email dialog: `Send training assignment emails to learners and trainers` |
| `src/pages/CourseRunForm.tsx` | Create / Edit Course Run | • Tab header: `<TabsTrigger value="learner-particulars">Learners</TabsTrigger>`<br>• Venue capacity labels: `Max Learners (Venue)`, `Price per extra learner`, `Charge per learner beyond the maximum limit`<br>• Learner Management tab header & placeholder info cards |
| `src/components/CourseFormTabs/CourseInformationTab.tsx` | Course Form Information Tab | • Input labels: `Min Learners *`, `Max Learners`<br>• Placeholder: `Min pax (minimum 1)` |
| `src/components/CourseFormTabs/FeesRevenueTab.tsx` | Course Form Fees Tab | • Expense labels: `Max Learners (Venue)`, `Per Head Fee if Max Exceeded ($)`<br>• Descriptions: `Fee charged to learners/client`, `Maximum learners before per-head charges apply`, `Additional fee per learner if maximum is exceeded` |
| `src/pages/PostRunManagement.tsx` | Post Run Management | • Table column header: `<TableHead className="min-w-[100px]">Learners</TableHead>` |
| `src/pages/PostRunDetail.tsx` | Post Run Detail | • Stat card: `<div className="text-sm text-muted-foreground">Learners</div>`<br>• Billing participant selector: `Learners`, `Search learners...`, `{count} learner(s) selected`, `Select learners`<br>• Discounts summary: `Discounts Allocated (Applied to Selected Learners)` |
| `src/pages/TrainerDashboard.tsx` | Trainer Dashboard | • Statistics card: `Learners Trained`<br>• Upcoming runs table header: `<th className="text-left p-2">Learners</th>` |
| `src/pages/UserManagement.tsx` | User Management | • Metric card: `<CardTitle className="text-lg">Learners</CardTitle>`<br>• Stat item: `<span className="text-muted-foreground">Active Learners</span>` |
| `src/pages/WaiverRequests.tsx` | Waiver Requests | • Table header: `<TableHead className="min-w-[150px]">Learner Name</TableHead>` |
| `src/pages/VenueForm.tsx` | Venue Form | • Labels & Placeholders: `Max Learners`, `Maximum learners allowed`, `Price per extra learner`, `Charge per learner beyond the maximum limit` |
| `src/pages/Home.tsx` | Home Dashboard | • Upcoming runs table header: `<TableHead>Learners</TableHead>` |
| `src/pages/Login.tsx` | Login Page | • Test credentials quick login button label updated from `Participant` to `Learner` |
| `src/components/AttendanceListDialog.tsx` | Attendance Dialog | • Dialog title: `Attendance List — Enrolled Learners`<br>• Empty state message: `No learners enrolled yet. Add learners to this course run to start tracking attendance.` |
| `src/components/EditLearnerDialog.tsx` | Edit Learner Dialog | • Dialog title: `Edit Learner`<br>• Success toast: `Learner enrollment updated successfully`<br>• Error toast: `Learner enrollment not found. It may have been deleted.` |
| `src/pages/reporting/RunsByVenue.tsx` | Runs By Venue Report | • Table header: `<TableHead>Learners</TableHead>`<br>• Excel export column key: `Learners: learners` |
| `src/pages/reporting/RunDetailsDialog.tsx` | Run Details Dialog | • Section header: `Learners & Attendance`<br>• Stat item: `Total Learners:`<br>• Empty state: `No learners enrolled` |
| `src/pages/reporting/QuarterDetailsDialog.tsx` | Quarter Details Dialog | • Summary card: `Total Learners`<br>• Excel export column keys: `Learners: run.learners \|\| 0` |
| `src/pages/reporting/BoardReport.tsx` | Board Report | • Table header: `<TableHead>Learners</TableHead>`<br>• Excel export column key: `"Total Learners": quarter.totalLearners` |

---

### B. Course Run CSV / Excel Import Fix & Upgrade

#### 1. Problem
On the Course Run Detail page (`src/pages/CourseRunDetail.tsx`), the "Import CSV" button was not functional or connected properly, and the standard import dialog was only geared for system-wide imports rather than direct batch enrollment into an active course run.

#### 2. Technical Solution
1. **Upgraded `src/components/ImportLearnersDialog.tsx`**:
   - Added controlled modal props: `open`, `onOpenChange`, `courseRunId`, `courseRun`, `baseCourseFee`, and `onSuccess`.
   - Built a comprehensive client-side spreadsheet parser using `xlsx` (supporting both `.csv` and `.xlsx` files).
   - Added flexible case-insensitive header matching for SPF standard templates and generic CSV files:
     - `Name` / `Full Name` / `Learner Name` / `Participant Name`
     - `Email` / `SPF Email Address` / `Email Address`
     - `Contact` / `Contact Number` / `Phone`
     - `Designation` / `Rank` / `Role`
     - `Payment Method` / `Payment Mode` / `Billing Type`
     - `BU Number` / `Billing Unit`
     - `Organisation` / `Organization` / `Division` / `Department`
   - Added "Download Template" button that generates a clean, pre-styled `learner_import_template.xlsx` workbook with sample rows.
   - Built an interactive table preview showing row-by-row validation status (detecting missing required names or emails).
   - Connected direct batch enrollment via `courseRunsApi.enrollLearners(courseRunId, { learners, sendEmails: false })`.
2. **Integrated with `CourseRunDetail.tsx` & `AddLearnersDialog.tsx`**:
   - Wired the "Import CSV" button and the 3rd mode card in `AddLearnersDialog` to open `ImportLearnersDialog`.
   - On successful import, automatically triggers `loadCourseRunDetail()` to refresh the enrolled learners table, update counters, and display a success notification.

---

### C. Backend Learner Report Excel Export (`reportingController.ts`)

#### 1. Problem
In `polwel-backend/src/controllers/reportingController.ts` (`downloadLearnerReport`), the exported Excel file did not include the learner's email address column, which was needed by training administrators.

#### 2. Technical Solution
- In Prisma query `prisma.courseRun.findMany`:
  - Added `email: true` to `courseRunLearners.include.learner.select`.
- In row mapping:
  - Mapped `email: crl.learner?.email ?? ''`.
- In worksheet structure:
  - Inserted `{ header: 'Email Address', key: 'email' }` as column 3 (directly after `Learner Name`).
  - Added `email` to `colKeys` and `row.email` in `ws.addRow`.
  - Updated grid border application loop from 11 columns to 12 columns (`for (let c = 1; c <= 12; c++)`).
  - Set column width for `Email Address` to `28` for readability.

---

### D. Security Hardening & Account Lockout Compliance

1. **3 Failed Attempts → 30-Minute Auto-Lockout**:
   - `polwel-backend/src/routes/auth.ts`: Threshold updated to `>= 3`, duration set to `30 * 60 * 1000`.
   - Returns HTTP `423 Locked` with remaining lockout time.
2. **Audit Trail Logging**:
   - Recorded `Account Auto-Locked`, `Login Failed (X/3 attempts)`, `User Logged In`, and `User Logged Out` in `AuditLog`.
3. **365-Day Password Expiry**:
   - Updated password expiry across `profileController.ts`, `passwordReset.ts`, and `users.ts` to 365 days (`365 * 24 * 60 * 60 * 1000`).
4. **Password History (Last 5 Passwords Prevention)**:
   - Added `passwordHistory Json?` to Prisma schema for `model User`.
   - Rejects password updates if the new hash matches the current password or any of the previous 5 hashes in history.
5. **Manual Unlock Capabilities**:
   - Added `POST /api/polwel-users/:id/unlock` and `POST /api/client-organizations/coordinators/:coordinatorId/unlock`.

---

### E. Training Coordinator Export Fixes

1. **Deduplication & Composite Record Splitting**:
   - In `clientOrganizationsController.ts` (`getAllCoordinatorsForExport`), parsed legacy concatenated names and emails (e.g. `Angeline Tan / Janice Lam`) using email regex extraction into individual records.
   - Filtered out empty, `-`, or `N/A` placeholder rows.
   - Merged multiple organization affiliations per coordinator into a single unified record.
2. **Export Column Addition**:
   - Added `Organisation` column to `ClientOrganisations.tsx` coordinator export.

---

## 3. Verification & Build Integrity

| Test / Check | Target | Result |
| :--- | :--- | :--- |
| **Backend TypeScript Check** | `polwel-backend/` (`npx tsc --noEmit`) | **0 errors (PASSED)** |
| **Frontend Production Build** | Root workspace (`npm run build`) | **0 errors (PASSED)** |
| **Backward Compatibility** | Database schema, internal query fields & API endpoints | **Preserved (No breaking changes)** |
| **Git Status** | Working tree | **Not committed / Not pushed** per user instruction |
