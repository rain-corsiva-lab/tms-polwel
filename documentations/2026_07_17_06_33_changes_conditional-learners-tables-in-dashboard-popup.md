# Technical Documentation: Conditional Learners Tables in Dashboard Popup

* **Date & Time:** 17 July 2026, 06:33 (Local Time)
* **Title:** Conditional Learners Tables in Dashboard Popup
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
The purpose of this change is to dynamically configure the enrolled learners table in the course run details popup depending on the completion status of the course run.

---

## 2. Implemented Changes

### A. Learners Dialog Dynamic Rendering (Frontend UI)
* **ViewLearnersDialog.tsx**:
  - Implemented the `isCompletedRun` flag, identifying if the course run's status is either `"COMPLETED"` or `"PENDING_BILLING"`.
  - Configured the Enrolled Learners datatable headers:
    - If `isCompletedRun` is true: Renders the column header `"Attendance"`.
    - If `isCompletedRun` is false: Renders the column header `"Status"`.
  - Configured the enrolled learners table cells for the status column:
    - If `isCompletedRun` is true: Renders the attendance badge (`Present`/`Absent`/`Pending`).
    - If `isCompletedRun` is false: Renders the static `"Enrolled"` badge.
  - Configured the actions column cell:
    - If `isCompletedRun` is true: Renders normal PDF download or Waiver submission buttons.
    - If `isCompletedRun` is false: Hides actions completely (renders `"—"`).

---

## 3. Verification & Testing
* Verified frontend build compilations with `npm run build`.
