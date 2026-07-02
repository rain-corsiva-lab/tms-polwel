# Technical Documentation: Merge Duplicate Client Organizations

* **Date & Time:** 2 July 2026, 19:00 (Local Time)
* **Title:** Merge Duplicate Organizations Into One
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
Due to historical manual inputs or unvalidated imports, duplicate client organizations with identical names were created in the database. This causes fragmented records for billing analytics, reporting, and learner enrollment checks.

This task implements a merge duplicates manager to detect organizations sharing identical names, group them, and combine their records. All referencing learners, bookings, users, and dedicated course runs are redirected to the oldest primary organization (created first). The redundant organization records are then safely deleted in a database transaction to prevent foreign key violations.

---

## 2. Implemented Code & Layout Changes

### A. Backend - API Controllers & Routes

#### [organizationsController.ts](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/organizationsController.ts)
* Added `getDuplicates` controller action:
  - Scans active/non-inactive organizations and groups them by name where the occurrence count is greater than 1.
  - Designates the oldest organization in each group (based on `createdAt`) as the primary record.
  - Counts the number of connected learners (`courseRunLearners`) associated with the duplicates to display in the scan summary.
* Added `mergeDuplicates` controller action:
  - Executes the merge operations inside a Prisma database transaction (`prisma.$transaction`).
  - Updates all dependent records to reference the primary organization's ID:
    - **Learners / Enrollments (`CourseRunLearner`)**
    - **Corporate Bookings (`Booking`)**
    - **Corporate Users (`User`)**
    - **Dedicated runs (`CourseRun`)**
  - Safely deletes the redundant duplicate organization rows.
  - Returns a detailed operation summary including counts of groups merged, rows deleted, and references updated.

#### [organizations.ts](file:///c:/laragon/www/polwel/polwel-backend/src/routes/organizations.ts)
* Registered routing handlers for the new actions:
  - `GET /duplicates` mapped to `organizationsController.getDuplicates`
  - `POST /merge-duplicates` mapped to `organizationsController.mergeDuplicates`
  - *Note: These routes are declared before parameterized routes (like `/:id`) to prevent wildcard mismatch errors.*

---

### B. Frontend - API & Components

#### [api.ts](file:///c:/laragon/www/polwel/src/lib/api.ts)
* Added `getDuplicates()` and `mergeDuplicates()` helper functions to the client-side `organizationsApi` export wrapper.

#### [MergeDuplicateOrganizationsDialog.tsx](file:///c:/laragon/www/polwel/src/components/MergeDuplicateOrganizationsDialog.tsx)
* Implemented a premium dialog wrapper:
  - **Scan Phase**: Prompts the user to scan the database.
  - **Summary Phase**: Renders a tabular list of duplicate organizations, duplicate counts, and affected learner counts. Shows a warnings/confirmation box.
  - **Execute/Result Phase**: Invokes the merge API, showing a loading indicator, and displays a detailed operation summary upon completion.

#### [Home.tsx](file:///c:/laragon/www/polwel/src/pages/Home.tsx)
* Imported and rendered `<MergeDuplicateOrganizationsDialog />` under the "Data Import" section of the main admin dashboard.

---

## 3. Verification Details
1. **Compilation Validation:** Ran `npm run build` in both backend and frontend directories. The frontend bundle compiled successfully via `vite build`, and backend compilation (`tsc`) completed with exit code 0.
2. **Database Verification:** Ran a database transaction test script (`test-org-merge.ts`) simulating 3 duplicate organizations and multiple learner enrollments linked to the duplicates:
   - **Result**:
     ```
     Found target group: true with count: 3
     Running Merge Operation...
     Merged groups: 1
     Deleted count: 2
     Learner references updated: 2
     Remaining organizations with name: 1
     Remaining organization ID matches Primary ID: true
     Enrollment 1 redirected to Primary ID: true
     Enrollment 2 redirected to Primary ID: true
     ```
   - All references updated cleanly, and duplicates were purged without constraints failures.
