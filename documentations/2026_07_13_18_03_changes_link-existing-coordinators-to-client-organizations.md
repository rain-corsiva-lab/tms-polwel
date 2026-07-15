# Technical Documentation: Link Existing Training Coordinator to Client Organization

* **Date & Time:** 13 July 2026, 18:03 (Local Time)
* **Title:** Link Existing Training Coordinator to Client Organization
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
The purpose of this feature is to allow linking a training coordinator account that is already registered in the system (but not associated with the current organization) directly to a client organization.

---

## 2. Implemented Changes

### A. Backend Layer
* **clientOrganizationsController.ts**:
  - **getAvailableCoordinators**: Queries all active users with `role: 'TRAINING_COORDINATOR'` who do *not* have a junction record linking them to the target client organization, and returns them in a list.
  - **linkExistingCoordinator**: Handles transactional junction record creation. If set as the primary coordinator, it unsets any existing primary coordinator in the organization, inserts the `UserOrganization` record, and updates the user properties.
* **clientOrganizations.ts (Routes)**: Registered the endpoints:
  - `GET /api/client-organizations/:organizationId/available-coordinators`
  - `POST /api/client-organizations/:organizationId/coordinators/:coordinatorId/link`

### B. Frontend Layer
* **api.ts**: Added frontend client mapping functions:
  - `getAvailableCoordinators`
  - `linkCoordinator`
* **LinkExistingCoordinatorDialog.tsx [NEW]**: Created a dialog component utilizing a modern, unified Popover and Command combobox search-select layout. It allows users to search available training coordinators by name or email, choose one, and link them to the organization with an optional toggle to set them as primary.
* **ClientOrganisationDetail.tsx**: Mounted `<LinkExistingCoordinatorDialog />` next to `<AddCoordinatorDialog />` in the coordinators tab list, refreshing the coordinator table view upon successful association.

---

## 3. Verification & Testing
* Verified backend compiler checks with `npm run build`.
* Checked frontend build outputs with `npm run build`.
* Tested transaction link operation programmatically via mock tests.
