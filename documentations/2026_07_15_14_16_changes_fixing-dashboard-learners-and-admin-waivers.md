# Technical Documentation: Fixing Dashboard Learners and Admin Waivers

* **Date & Time:** 15 July 2026, 14:16 (Local Time)
* **Title:** Fixing Dashboard Learners and Admin Waivers
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
The purpose of this change is to fix two separate issues:
1. When viewing course run participants from the Training Coordinator dashboard, the learners list popup was empty despite the counter showing enrolled learners.
2. Submitted waivers from Training Coordinators were not showing up on the admin dashboard for review.

---

## 2. Implemented Changes

### A. Backend Layer
* **courseRunController.ts (getLearners)**:
  - Scoped the enrolled learners query based on the requester's role.
  - If the requester is a `TRAINING_COORDINATOR`, they can now view **all enrolled learners belonging to any of their linked client organizations**, regardless of the individual coordinator account that registered them. This aligns with the counter logic and provides the correct details in the popup.
* **waiverController.ts (getAll)**:
  - Refactored `where` conditions to use combined Prisma `AND` operators, preventing search parameters from overwriting status filter conditions (`whereClause.OR`).
  - Fixed an invalid prisma selector where `whereClause.courseRunLearner` was incorrectly defined (it should filter `clientOrganizationId` directly on `CourseRunLearner`).
  - Added role isolation scoping: Training Coordinators querying waivers now only see requests for their own organization(s), while POLWEL administrators continue to see all submitted requests.

---

## 3. Verification & Testing
* Verified backend compiler checks with `npm run build`.
