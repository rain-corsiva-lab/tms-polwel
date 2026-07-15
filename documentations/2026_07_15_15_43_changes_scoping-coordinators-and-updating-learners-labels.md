# Technical Documentation: Scoping Coordinators and Updating Learners Labels

* **Date & Time:** 15 July 2026, 15:43 (Local Time)
* **Title:** Scoping Coordinators and Updating Learners Labels
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
The purpose of this change is to fix two separate issues:
1. When a client logged in as a Training Coordinator could see their organization, but admins looking at the coordinator list for that organization did not see them because their link was not mapped in the junction table or was blocked during updates.
2. In the Training Coordinator dashboard, changing wording to improve terminology:
   - Rename "Total Participants" to "Total Learners".
   - Remove "5 currently active" subtitle.
   - Rename "Participants" tab/headers to "All Learners".

---

## 2. Implemented Changes

### A. Coordinator Management Alignment (Backend)
* **clientOrganizationsController.ts (updateOrganizationCoordinator)**:
  - Refactored the verification check in `updateOrganizationCoordinator` to validate that the coordinator belongs to the organization via the many-to-many `user_organizations` junction table rather than the legacy `User.organizationId` column.
  - Refactored the `isPrimary` reset transaction block to query and update other organization coordinators' primary flags using the many-to-many junction record instead of the legacy `User.organizationId` column.
  - This allows editing coordinators who are linked to multiple organizations without triggering a `404 Coordinator not found` or `Insufficient permissions` error.

### B. Terminology Wording Refactoring (Frontend UI)
* **OrganizationDashboard.tsx**:
  - Renamed the dashboard statistics overview title `Total Participants` to `Total Learners`.
  - Removed the subordinate subtitle `{activeLearners} currently active` from the overview card.
  - Updated `<TabsTrigger value="learners">` to label the tab trigger `All Learners`.
  - Updated the inner card title label to `All Learners ({totalLearners})`.
  - Updated the empty state label to read `No learners found`.

---

## 3. Verification & Testing
* Verified backend build compilations with `npm run build`.
* Verified frontend build compilations with `npm run build`.
