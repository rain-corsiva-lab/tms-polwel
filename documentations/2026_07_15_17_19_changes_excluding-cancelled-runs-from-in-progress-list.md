# Technical Documentation: Excluding Cancelled Runs From In Progress List

* **Date & Time:** 15 July 2026, 17:19 (Local Time)
* **Title:** Excluding Cancelled Runs From In Progress List
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
The purpose of this change is to ensure that course runs with a status of `"CANCELLED"` do not appear in the "In Progress Course Runs" table on the Training Coordinator (TC) organization dashboard page.

---

## 2. Implemented Changes

### A. Dashboard Query Filtering (Frontend)
* **OrganizationDashboard.tsx (fetchOrganizationData)**:
  - Modified the course runs partitioning logic inside `fetchOrganizationData` to explicitly filter out any runs with `status === 'CANCELLED'` from the `inProgress` runs array.
  - This ensures that cancelled course runs are omitted from the active "In Progress" listing and are excluded from the `ongoingCourses` count displayed in the stats overview metrics block.

---

## 3. Verification & Testing
* Verified frontend build compilations with `npm run build`.
