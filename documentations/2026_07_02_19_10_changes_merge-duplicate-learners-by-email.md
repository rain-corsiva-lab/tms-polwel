# Technical Documentation: Merge Duplicate Learners & Fix Search Limits

* **Date & Time:** 2 July 2026, 19:10 (Local Time)
* **Title:** Merge Duplicate Learners By Email
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
To clean up database duplication, we need to merge active learners sharing identical email addresses whenever organizations are merged. This ensures a single source of truth for learner records, enrollments, and attendance histories.
Additionally, we troubleshoot and fix the issue where some existing learners do not show up in the `Select Existing Participant` dropdown under `AddLearnersDialog`.

---

## 2. Implemented Code & Layout Changes

### A. Backend - API Controllers

#### [organizationsController.ts](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/organizationsController.ts)
* Updated `mergeDuplicates` action:
  - Inside the Prisma transaction, added logic to scan and group active learners (`deletedAt: null` and non-empty `email`) by email where count > 1.
  - Designated the oldest learner in each group as the `primary` record.
  - Transferred enrollments (`CourseRunLearner`): If the primary learner is already enrolled in the same course run, deleted the secondary enrollment/attendance records to prevent unique compound constraint violations. Otherwise, updated `learnerId` to refer to the primary learner.
  - Transferred attendance records (`CourseRunLearnerAttendance`): Checked for existing attendance records matching `(courseRunId, primaryLearnerId, day)` to avoid compound key constraints. Safely redirected unique attendance items and deleted duplicates.
  - Soft-deleted redundant secondary learner records (`deletedAt: new Date()`).
  - Increased Prisma transaction timeout configuration (`timeout: 60000`) to guarantee execution stability under CPU load.
  - Updated API response JSON to return counts of merged and deleted learners.

#### [clientOrganizationsController.ts](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/clientOrganizationsController.ts)
* Updated `getAllLearners` action:
  - Increased the hard-coded search limit safety cap from `1000` to `10000` to support loading large learner populations in dropdowns.

---

### B. Frontend - Components & Dialogs

#### [AddLearnersDialog.tsx](file:///c:/laragon/www/polwel/src/components/AddLearnersDialog.tsx)
* Increased query limit in `loadAllLearners` from `1000` to `10000` in the client API request.
* Fixed mapping logic: Resolved nested corporate values (like `clientOrganizationId`, `clientOrganizationName`, and training coordinators) from `learner.courseRunLearners?.[0]` to prevent dropdown entries from disappearing when a division/organization filter is active.

#### [MergeDuplicateOrganizationsDialog.tsx](file:///c:/laragon/www/polwel/src/components/MergeDuplicateOrganizationsDialog.tsx)
* Extended UI state interfaces to support `mergedLearners` and `deletedLearners` fields.
* Rendered merged/deleted learner statistics in the transaction results audit log block.

---

## 3. Verification Details
1. **Compilation Validation:** Ran `npm run build` in both frontend and backend directories. Both projects compiled successfully.
2. **Database Verification:** Ran simulated interactive database transaction test script `test-learner-merge.ts`:
   - Seeding duplicate learners sharing `duplicate_learner_email_test@example.com`.
   - Creating compound enrollment and attendance conflicts on the same course runs.
   - Merging within transaction and testing assertions.
   - **Result**:
     ```
     Active learners with email count (expected 1): 1
     Remaining active learner is Primary: true
     Secondary learner is soft-deleted: true
     Primary learner enrollments count (expected 2 - run1 and run2): 2
     Primary enrolled in Run 1: true
     Primary enrolled in Run 2: true
     Primary learner attendance records count (expected 2): 2
     ```
   - Redirection is fully type-safe and database constraints are preserved.
