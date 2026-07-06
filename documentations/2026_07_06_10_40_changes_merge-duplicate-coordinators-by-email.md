# Technical Documentation: Merge Duplicate Training Coordinators

* **Date & Time:** 6 July 2026, 10:40 (Local Time)
* **Title:** Merge Duplicate Coordinators By Email
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
When merging duplicate organizations, training coordinators associated with the duplicate organizations are combined. This task implements a training coordinator merging check that matches active training coordinators sharing identical email addresses, redirects all their enrollment, booking, and attendance references to a single primary record, inherits coordinator-level flags, and releases unique email constraints on soft-deleted coordinators.

---

## 2. Implemented Code & Layout Changes

### A. Backend - API Controllers

#### [organizationsController.ts](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/organizationsController.ts)
* Updated `mergeDuplicates` action:
  - Inside the Prisma transaction, added scanning and grouping for duplicate active training coordinators (`role: 'TRAINING_COORDINATOR'`, `deletedAt: null`, non-empty `email`) sharing identical email addresses.
  - Designated the oldest coordinator record in each group as the `primary` record.
  - Transferred enrollments (`CourseRunLearner.trainingCoordinatorId`) cleanly from the secondary coordinators to the primary coordinator.
  - Transferred bookings (`Booking.userId` and `Booking.createdBy`) to reference the primary coordinator.
  - Transferred attendance edit logs (`CourseRunLearnerAttendance.editedBy`) to reference the primary coordinator.
  - Merged flags: If any secondary coordinator has `isPrimaryCoordinator = true`, inherited this flag onto the primary coordinator.
  - Soft-deleted secondary coordinators (`deletedAt: new Date()`, `status: 'INACTIVE'`) and set their email to `deleted-tc-${secondaryId}@polwel.org.sg` to release the database unique index constraint.
  - Updated API response JSON to return counts of merged and deleted training coordinators.

---

### B. Frontend - Components & Dialogs

#### [MergeDuplicateOrganizationsDialog.tsx](file:///c:/laragon/www/polwel/src/components/MergeDuplicateOrganizationsDialog.tsx)
* Updated `MergeResults` interface to capture `mergedCoordinators` and `deletedCoordinators` counts from the API response.
* Rendered merged/deleted training coordinator counts in the final Operations Log audit results screen.

---

## 3. Verification Details
1. **Compilation Validation:** Ran `npm run build` in both backend and frontend directories. Both completed with exit code 0.
2. **Database Verification:** Ran test script `test-coordinator-merge.ts`:
   - Seeding duplicate training coordinators under duplicate organizations.
   - Creating active enrollments, bookings, and attendance records associated with the duplicates.
   - Performing the merge transaction logic.
   - **Result**:
     ```
     Remaining active TC isPrimaryCoordinator = true (expected true due to inheritance): true
     Secondary TC is soft-deleted: true
     Secondary TC status is INACTIVE: true
     Secondary TC email is released: true
     Enrollment redirected to Primary TC: true
     Booking userId redirected to Primary TC: true
     Booking createdBy redirected to Primary TC: true
     Attendance editedBy redirected to Primary TC: true
     ```
   - All references redirected correctly, and database constraints remain clean and stable.
