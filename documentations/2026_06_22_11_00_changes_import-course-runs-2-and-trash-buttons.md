# Change Documentation

**Date/Time**: 2026-06-22 11:00 SGT  
**Author**: Antigravity AI  
**Title**: Import Course Runs 2 and soft delete trash buttons implementation  

---

## 1. Executive Summary
This document records the changes made to the Polwel Training Management System to introduce:
1. A new, complete, and comprehensive course run Excel import feature (**"Import Course Runs 2"**).
2. Cascade-deleting **trash buttons** for completed course runs (in Post Run Management) and client organisations (in Client Organisations).

---

## 2. Backend & Database Changes

### 2.1 Course Run Cascading Soft Delete
- **File**: [`polwel-backend/src/controllers/courseRunController.ts`](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/courseRunController.ts)
- **Details**:
  - The `delete` method has been refactored to wrap database updates inside a Prisma transaction (`prisma.$transaction`).
  - When a course run is deleted, it updates `deletedAt` and `updatedAt` on the `CourseRun` record.
  - It also cascade soft-deletes related records by updating their `deletedAt` and `updatedAt` fields in:
    1. `CourseRunLearner` (pivot table between CourseRun and Learner)
    2. `CourseRunTrainer` (pivot table between CourseRun and User/Trainer)
    3. `CourseRunPartner` (pivot table between CourseRun and Partner)
    4. `CourseRunLearnerAttendance` (attendance logs)
  - If a `CourseRunBilling` record exists, it transactionally soft-deletes both the `CourseRunBilling` record and its linked `CourseRunBillingEntry` records.
  - Crucially, it does **not** touch or delete the primary `Learner`, `User`, or `Partner` table rows.

### 2.2 Client Organisation Deactivation & Coordinator Soft Delete
- **File**: [`polwel-backend/src/controllers/clientOrganizationsController.ts`](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/clientOrganizationsController.ts)
- **Details**:
  - Modified the `deleteClientOrganization` controller to wrap the deactivation sequence inside a transaction.
  - Sets the `Organization` status to `INACTIVE`.
  - Cascade soft-deletes all training coordinator users (`role: 'TRAINING_COORDINATOR'`) belonging to this organization by setting their user status to `INACTIVE` and `deletedAt` to `new Date()`.

### 2.3 Import Course Runs 2 Endpoints
- **File**: [`polwel-backend/src/controllers/importController.ts`](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/importController.ts)
- **Details**:
  - Added type imports for `CourseRunFeeType` from `@prisma/client`.
  - Implemented **`previewCourseRuns2`**: Parses the spreadsheet, reads the first 100 rows, formats columns, and returns them for preview.
  - Implemented **`importCourseRuns2`**: Parses and imports the complete set of course run fields:
    - Resolves `courseId` from `Course Title`.
    - Generates `serialNumber` if empty, format: `${courseCode}-${DD}${MM}${YY}`.
    - Resolves `clientOrganizationId` from `Client Organisation`. Validation throws an error if type is DEDICATED/TALKS/CUSTOMIZED but organization is not found/specified.
    - Combines Date + Time strings into full SGT (UTC+8) datetimes and stores them as UTC. Start/End times default to 09:00 / 17:00 if left blank.
    - Resolves `venueId` from `Venue Name`.
    - Parses numbers/floats: `minClassSize`, `maxClassSize`, `baseCourseFee`, `venueFinalFee`, `venueMaxParticipant`, and `perHeadFeeIfMaxExceed`.
    - Resolves up to three trainers by name (`Trainer 1`, `Trainer 2`, `Trainer 3`). Logs warning and skips if any provided name doesn't exist.
    - If trainer fees are not specified in the Excel row, resolves default `feePerRun` from the `CourseTrainer` configuration.
    - Resolves up to three partners by name (`Partner 1`, `Partner 2`, `Partner 3`). Logs warning and skips if any provided partner name doesn't exist.
    - Looks up existing course runs by `serialNumber` or within a 1-hour window. Updates if found; creates if new.
    - Sequentially syncs trainer assignments and deletes assignments not present in the spreadsheet.
    - Sequentially syncs partner assignments and deletes assignments not present in the spreadsheet.
- **File**: [`polwel-backend/src/routes/import.ts`](file:///c:/laragon/www/polwel/polwel-backend/src/routes/import.ts)
  - Registered `/import/course-runs-2/preview` and `/import/course-runs-2` endpoints.

---

## 3. Frontend Changes

### 3.1 API Client Extensions
- **File**: [`src/lib/api.ts`](file:///c:/laragon/www/polwel/src/lib/api.ts)
  - Added `previewCourseRuns2` and `importCourseRuns2` wrapper methods to the `importApi` object.

### 3.2 Dynamic Template Generator & Dialog Component
- **File**: [`src/components/ImportCourseRuns2Dialog.tsx`](file:///c:/laragon/www/polwel/src/components/ImportCourseRuns2Dialog.tsx)
  - Created a new dialog component built on standard shadcn-ui.
  - Implemented client-side spreadsheet generation using the `exceljs` library.
  - **Premium Header Styling**: Dark charcoal color (`#1F2937`) with bold white text.
  - **Required indicator**: Column names marked with `*` for required inputs.
  - **Formatting Comments/Notes**: Hover comments embedded on headers explaining required data and date formats.
  - **Enum Dropdowns**: Data validation drop-downs built on spreadsheet columns (rows 2 to 100) for:
    - Course Run Type (`OPEN, DEDICATED, TALKS, CUSTOMIZED`)
    - Venue Type (`HOTEL, ON_PREMISE, CLIENT_FACILITY`)
    - Individual Registration Required (`Yes, No`)
    - Course Run Fee Type (`PER_HEAD, PER_RUN`)
    - Course Status (`DRAFT, PENDING, ACTIVE, CONFIRMED, COMPLETED, CANCELLED`)
  - **5 Realistic Examples**: Seeded in the template automatically with example trainer and partner values.
  - **Partner Support**: Adds `Partner 1`, `Partner 2`, and `Partner 3` columns to the spreadsheet headers, metadata notes, example rows, and data preview table.
  - **Upload & Preview Step**: Parses spreadsheet data and renders a comprehensive layout including partner columns.
  - **Results Summary**: Displays counts of processed records (Created, Updated, Skipped) and a detailed errors log.

### 3.3 Dashboard Integration
- **File**: [`src/pages/Home.tsx`](file:///c:/laragon/www/polwel/src/pages/Home.tsx)
  - Imported and rendered `ImportCourseRuns2Dialog` in the Data Import card, next to the other import tools.

### 3.4 Soft Delete Trash Buttons
- **File**: [`src/pages/PostRunManagement.tsx`](file:///c:/laragon/www/polwel/src/pages/PostRunManagement.tsx)
  - Imported `Trash2` and `Swal` (SweetAlert2).
  - Added `handleDeleteCourseRun` callback that presents a warning overlay explaining the cascading deletion of attendance/billings.
  - Mounted a red trash icon button in the Completed course runs datatable Actions cell.
- **File**: [`src/pages/ClientOrganisations.tsx`](file:///c:/laragon/www/polwel/src/pages/ClientOrganisations.tsx)
  - Imported `Trash2` and `Swal`.
  - Added `handleDeleteOrg` callback presenting a warning overlay regarding inactivating the organisation and soft-deleting all linked training coordinators.
  - Mounted a red trash icon button in the table next to the "Manage" button.

---

## 4. Verification & Compilation Check
- Run types build check on backend: `npx tsc --noEmit` -> Success, zero errors.
- Run types build check on frontend: `npx tsc --noEmit` -> Success, zero errors.
