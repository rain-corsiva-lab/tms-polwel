# Fix Documentation: Organisation Participant Links, Coordinator Actions, Dual Excel Exports, and Deleted User Exclusion

**Date:** 17 August 2026, 11:50 AM  
**Module:** User Management (POLWEL Users, Training Coordinators), Client Organisations (Participants, Coordinators, Exports), Backend API & Controllers  

---

## 1. Overview & Business Objectives

This update addresses 4 critical system fixes and operational enhancements:
1. **Soft-Deleted POLWEL User Exclusion**: Eliminated the `"POLWEL user not found or already deleted"` error popup on the POLWEL user datatable by ensuring queries filter out soft-deleted users (`deletedAt: null`, `email: { not: null }`) and removing legacy mock dummy data fallbacks.
2. **Organisation Participant Tab Enhancements**:
   - Course column title now links directly to the Course Detail view (`/courses/detail/:courseId`).
   - Course Run column now displays the Course Run Code (`serialNumber` / `courseRunCode`) and links directly to the Course Run Detail view (`/course-runs/:courseRunId`).
   - Removed unnecessary **Status** and **Actions** columns from the Participants table.
3. **Training Coordinator Action Menu Cleanup**:
   - Removed the `"Mark Active"` / `"Mark Inactive"` menu item.
   - Restricted `"Resend Onboarding Email"` to show strictly for **PENDING** coordinators.
   - Restricted `"Send Password Reset Link"` to show strictly for **ACTIVE** coordinators.
4. **Dual Client Organisation Excel Exports**:
   - Replaced single export button with an interactive export dropdown supporting:
     1. **Training Coordinator List (.xlsx)**: Exports unique, deduplicated training coordinators with `Name`, `Email`, `Contact`, `Designation`, `Status`.
     2. **Client Organisation (.xlsx)**: Exports organization details (`Name`, `OrganisationType`, `Status`, `Coordinators`, `Participants`, `ContactEmail`, `ContactPhone`, `BUNumber`, `CreatedAt`, `UpdatedAt`) and dynamically appends 4 dedicated columns per TC at the right side (`TC1 Name`, `TC1 Contact`, `TC1 Email`, `TC1 Designation`, `TC2 Name`, `TC2 Contact`, `TC2 Email`, `TC2 Designation`, ...).

---

## 2. Technical Modifications Breakdown

### Backend Changes

#### 1. `polwel-backend/src/controllers/polwelUsersController.ts`
- **Exclusion of Soft-Deleted Users**:
  - `getPolwelUsers`: Added `deletedAt: null` and `email: { not: null }` to the `where` filter.
  - `getPolwelUserById`, `getPolwelUserDetails`, `updatePolwelUser`, `resendPolwelUserSetup`: Added `deletedAt: null` to lookup queries.
  - `deletePolwelUser`: Soft delete now sets `deletedAt: new Date()` in addition to updating `old_email`, `email: null`, and `status: UserStatus.INACTIVE`.

#### 2. `polwel-backend/src/controllers/organizationsController.ts`
- **`getOrganizationEnrollments`**:
  - Added `deletedAt: null` and `enrollmentStatus: { not: 'WITHDRAWN' }` to query filter.
  - Included `serialNumber: true` in the `courseRun` select relation so the frontend can display the official Course Run Code.

#### 3. `polwel-backend/src/controllers/clientOrganizationsController.ts`
- **`getClientOrganizations`**:
  - Added relation lookups for both direct `users` (`role: 'TRAINING_COORDINATOR'`) and many-to-many `coordinators` (`UserOrganization.user`) excluding deleted accounts.
  - Computed `tcNames` (comma-separated list of coordinator names) and accurate `coordinatorsCount` per organization.
- **`getAllCoordinatorsForExport`**:
  - Created a new controller method querying all active/pending Training Coordinator accounts.
  - Deduplicates by email/ID across multiple organization relationships and provides a consolidated list for Excel exports.

#### 4. `polwel-backend/src/routes/clientOrganizations.ts`
- Registered `router.get('/coordinators/export', authorizeRoles('POLWEL'), requirePermissions('clients.view'), getAllCoordinatorsForExport)` ahead of parameterized routes.

#### 5. `polwel-backend/src/controllers/organizationAnalyticsController.ts`
- **Multi-Organization Courses & Divisions Ranking**:
  - Automatically queries all connected organizations directly from the database for the logged-in Training Coordinator (both primary `organizationId` and many-to-many `UserOrganization` links).
  - `getCoursesByLearnersRanking` aggregates courses and learners across all connected client organizations, coordinator assignments, course runs, and organization bookings, ensuring that coordinators linked to multiple organizations view full course rankings.

---

### Frontend Changes

#### 1. `src/pages/PolwelUsers.tsx`
- Removed `dummyUsers` fallback on error to prevent non-existent static mock IDs from populating the datatable and causing deletion/action lookup errors.

#### 2. `src/pages/ClientOrganisationDetail.tsx`
- **Training Coordinators Tab**:
  - Removed "Mark Active" / "Mark Inactive" dropdown action.
  - Guarded "Send Password Reset Link" with `coordinator.status === 'ACTIVE'`.
  - Maintained "Resend Onboarding Email" for `coordinator.status === 'PENDING'`.
- **Participants Tab**:
  - Updated Course column to link to `/courses/detail/${enrollment.courseRun?.course?.id}`.
  - Updated Course Run column to display `enrollment.courseRun.serialNumber || enrollment.courseRun.courseRunCode || "View Run"` and link to `/course-runs/${enrollment.courseRun.id}`.
  - Removed Status and Actions table header and row cells.
  - Adjusted loading and empty table `colSpan` to 6.

#### 3. `src/pages/ClientOrganisations.tsx`
- Replaced the single export button with a clean `DropdownMenu` with:
  - **Training Coordinator List (.xlsx)**: Generates Excel sheet of deduplicated TC records.
  - **Client Organisation (.xlsx)**: Generates Excel sheet including the required `TC Names` column.
- **Excel UI/UX Styling**:
  - Implemented `exportToStyledExcel` using `ExcelJS`.
  - Header row styled with bold text, `#eee` (`FFEEEEEE`) gray background fill, subtle borders, and `26px` row height.
  - Dynamically calculates optimal column width based on content length with padding to prevent truncated cells.

#### 4. `src/lib/api.ts`
- Added `clientOrganizationsApi.getAllCoordinatorsExport()`.

---

## 3. Verification & Quality Assurance

1. **Backend TypeScript Type Check**:
   - `npx tsc --noEmit` -> **0 errors, passed cleanly**.
2. **Frontend TypeScript Type Check**:
   - `npx tsc --noEmit` -> **0 errors, passed cleanly**.
3. **Production Webpack/Vite Bundle**:
   - `npm run build:production` -> **0 errors, passed cleanly**.
