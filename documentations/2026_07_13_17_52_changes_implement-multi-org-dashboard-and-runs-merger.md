# Technical Documentation: Multi-Org Dashboard, Many-to-Many training coordinators, and Duplicate Course Runs Merger

* **Date & Time:** 13 July 2026, 17:52 (Local Time)
* **Title:** Implement Multi-Org Dashboard, Many-to-Many Training Coordinators, and Duplicate Course Runs Merger
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
The purpose of these updates is to resolve dashboard data inaccuracy, allow training coordinators to manage and switch between multiple linked client organizations, add the ability to remove/delete training coordinators from organizations, and introduce a cleanup tool for merging duplicate course runs.

---

## 2. Implemented Changes

### A. Database Layer
* **schema.prisma**: Defined `UserOrganization` junction model representing the many-to-many relationship between `User` and `Organization`. Added the corresponding relation fields on `User` and `Organization` models. Added `@db.VarChar(30)` to `EmailRetryQueue.id` to match the FK column definition in `EmailLog` and avoid migration push constraints block.
* **Migration & Seed**: Sync'd the schema using `npx prisma db push` and ran a data migration to populate the new `user_organizations` table for all existing Training Coordinators.

### B. Backend Layer
* **auth.ts (Middleware)**: Updated JWT deserialization and request verification to fetch all linked organization IDs for the logged-in user, saving them in `req.user.organizationIds`. Extended authorization checks to allow access to any organization in the user's `organizationIds` array.
* **clientOrganizationsController.ts**:
  - **getCoordinatorCourseRunsSelf / getOrganizationLearnersSelf**: Removed scoping filters that checked `trainingCoordinatorId === coordinatorId`. Scoped these dashboard endpoints to the organization level (`clientOrganizationId === organizationId`) so all linked training coordinators see all runs and learners.
  - **createOrganizationCoordinator**: Linked the user via `UserOrganization`. If a user with `role: 'TRAINING_COORDINATOR'` already exists, added them to the organization instead of throwing a 409 conflict error.
  - **deleteOrganizationCoordinator**: Deleted the `UserOrganization` record. If the unlinked organization matches their primary `organizationId` column, reassigned it to another active organization or set to `null` and deactivated the user globally if they have no remaining organizations.
* **organizationAnalyticsController.ts**:
  - **getDivisionsByLearnersRanking**: Excluded `Unassigned` division entries and removed `completionRate` statistics from returned division rankings.
  - **getCoursesByLearnersRanking**: Omitted the `runType` property from the courses ranking response.
* **courseRunMergerController.ts / courseRunMerger.ts**: Added scan (`GET /api/course-runs-merger/duplicates`) and consolidation merge (`POST /api/course-runs-merger/merge`) endpoints. The merge handles unique constraints on learner enrollment and attendance.

### C. Frontend Layer
* **api.ts**: Added `courseRunsMergerApi` declarations.
* **OrganizationDashboard.tsx**:
  - Fetched all organization details linked to the Training Coordinator.
  - Displayed a horizontal tab list at the top of the dashboard if they are associated with multiple organizations, allowing seamless switching.
  - Removed "Run Type" column from Courses Ranked table and "Completion Rate" column from Divisions Ranked table.
* **ClientOrganisationDetail.tsx**: Included a "Delete Coordinator" option in the actions dropdown next to each coordinator in the list.
* **MergeDuplicateCourseRunsDialog.tsx**: Designed a duplicate course runs console dialog to scan and consolidate duplicates. Mounted the component in **Home.tsx**.

### D. Package Scripts
* **package.json (Backend)**: Added `dev:safe-w` script using PowerShell to kill any process listening on port 3001 on Windows systems and subsequently start the nodemon dev server, resolving address in use conflicts cleanly.

---

## 3. Sizing Guidelines for cover banner image
For the 'Important Announcements & Resources' banner, the card has a fixed height of `500px` and a maximum width of `1400px` with `background-size: cover`.
To prevent cropping on desktop viewports, the recommended size is **1400 x 500 pixels** (aspect ratio **2.8:1**), with text and critical graphical information kept in the center (safe zone).
