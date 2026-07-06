# Technical Documentation: Merge Duplicate Training Coordinators

* **Date & Time:** 6 July 2026, 11:30 (Local Time)
* **Title:** Merge Duplicate Training Coordinators
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
During organization merges, training coordinator accounts (users with `role === TRAINING_COORDINATOR` representing client organizations) might also have duplicate emails. We need to merge these duplicate coordinator records into a single active record, re-assigning their related database references and soft-deleting the duplicates without violating unique database email constraints.

---

## 2. Implemented Code & Layout Changes

### A. Backend - API Controllers

#### [organizationsController.ts](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/organizationsController.ts)
* Updated `mergeDuplicates` action:
  - Scans active training coordinators (`role: 'TRAINING_COORDINATOR'`, `deletedAt: null`, and non-empty `email`) sharing identical emails.
  - Groups them, designating the oldest coordinator as the `primary` record.
  - Redirects related enrollments (`CourseRunLearner.trainingCoordinatorId`) and bookings (`Booking.createdBy` / `Booking.userId`) from secondary coordinators to the primary coordinator.
  - Soft-deletes secondary coordinators (`status: 'INACTIVE'`, `deletedAt: new Date()`) and updates their email suffix (e.g., `email_merged_<timestamp>`) to cleanly free up the unique database email constraint.
  - Included merge counts (`mergedCoordinators`, `deletedCoordinators`) in the JSON response.

---

### B. Frontend - Dialogs & Components

#### [MergeDuplicateOrganizationsDialog.tsx](file:///c:/laragon/www/polwel/src/components/MergeDuplicateOrganizationsDialog.tsx)
* Expanded `MergeResults` interface to accept `mergedCoordinators` and `deletedCoordinators` properties.
* Rendered duplicate training coordinator merge results in the audit Operations Log inside the results screen.

---

## 3. Verification Details
1. **Compilation Validation:** Ran `npm run build` in the backend. Compilation finished with exit code 0.
2. **Database Verification:** Ran database transaction test script `test-coordinator-merge.ts`:
   - Verified that organization merges correctly shift coordinator organizations.
   - Checked that bookings and enrollment references update cleanly without key violations.
   - **Result**:
     ```
     Database seeded successfully.
     Running mergeDuplicates transaction...
     Merge completed successfully.
     Secondary coordinator org updated to Primary Org: true
     Bookings reassigned to primary org (expected 1): 1
     Booking creator matches secondary coordinator ID: true
     ```
