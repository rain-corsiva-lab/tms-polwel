# Fix Learner Re-enrollment After Removal/Deletion on Course Run Detail Page

**Date & Time:** 24 August 2026, 17:30 SGT  
**Author:** AI Pair Programmer & Antigravity IDE  
**Target:** Course Run Detail, Learner Enrollment Engine (Single, Group, Import), Soft-Delete & Reactivation Architecture

---

## 1. Problem Overview & Symptom Description

### 1.1 Reported Scenario
1. An administrator navigated to a course run (`CourseRunDetail` page).
2. The administrator added 10 learners into the course run (all successful).
3. The administrator noticed an error in the fee / pricing per pax (or other configuration detail).
4. The administrator selected and deleted all 10 learners from the course run.
5. The course run correctly showed `Learners (0)` and `Enrolled Learners (0)` with the empty state *"No learners enrolled. Add learners to get started."*
6. The administrator amended the price / fee configuration and attempted to re-add the same 10 learners (via Single Add, Group Add, or CSV/Excel Import).
7. **Failure:** The system rejected the re-enrollment, showing the error toast:
   > `"Enrollment Failed: Learner is already enrolled in this course run"` (or skipping all 10 participants and enrolling 0).

---

## 2. Deep Root Cause Analysis

### 2.1 Schema & Soft Deletion Constraints
In `polwel-backend/prisma/schema.prisma`, `model CourseRunLearner` has a composite unique constraint:
```prisma
@@unique([courseRunId, learnerId])
```
When a learner is removed from a course run via `removeEnrollment` (`DELETE /api/course-runs/:courseRunId/learners/:learnerId`), the backend performs a **soft delete** by marking the enrollment record:
```typescript
await prisma.courseRunLearner.update({
  where: { courseRunId_learnerId: { courseRunId, learnerId } },
  data: {
    deletedAt: new Date(),
    enrollmentStatus: 'WITHDRAWN',
  },
});
```

### 2.2 Re-enrollment Detection Logic Flaws
Because the row continues to exist in the database table with `deletedAt !== null`:
1. **Single Add (`enrollLearner`)**:
   - Checked `prisma.courseRunLearner.findUnique({ where: { courseRunId_learnerId: { courseRunId, learnerId } } })`.
   - Found the soft-deleted row, treated any existing row as active, and immediately returned `400: 'Learner is already enrolled in this course run'`.
   - In addition, if `selectedLearnerId` was null and the user manually typed an existing email, `prisma.learner.findFirst({ where: { email, deletedAt: null } })` threw `"A learner with email ... already exists. Please select the existing learner or use a different email."` instead of automatically attaching to the learner record.
2. **Group Add (`enrollLearners`)**:
   - Checked `findUnique` for each learner in the group and executed `continue; // Skip if already enrolled`.
   - This skipped all 10 learners, producing `0 learners enrolled successfully` and leaving the course run empty.
   - Also threw duplicate email errors for new learners created during previous adds.
3. **Import from File (`importLearners`)**:
   - Checked `findUnique` and pushed `errors.push({ reason: 'Learner is already enrolled in this course run' })`.
4. **Dedicated Import Route (`importCourseRunLearners2`)**:
   - Updated fields on `existingEnrollment` without resetting `deletedAt: null` or updating withdrawal state.
5. **Withdrawal Re-enrollment (`reenrollLearner`)**:
   - Had `where: { courseRunId, deletedAt: null, ... }` which failed with 404 when attempting to re-enroll a removed record whose `deletedAt` was non-null.

---

## 3. Technical Changes & Solution Implementation

### 3.1 Reactivation / Upsert Architecture in `polwel-backend/src/controllers/courseRunController.ts`

#### 1. Single Learner Enrollment (`enrollLearner`)
- **Learner Record Resolution**: If `!data.selectedLearnerId`, check for an existing `Learner` record with matching email. If found, reuse that learner and update any newly provided attributes (`fullname`, `designation`, `contact`). If not found, create a new `Learner`.
- **Enrollment Reactivation**:
  - If `existingEnrollment` exists:
    - If `!existingEnrollment.deletedAt && existingEnrollment.enrollmentStatus !== 'WITHDRAWN'`: Return `400: 'Learner is already enrolled in this course run'` (actively enrolled).
    - If `existingEnrollment.deletedAt !== null || existingEnrollment.enrollmentStatus === 'WITHDRAWN'`: **Reactivate and update** the record with the new payload, clearing `deletedAt: null`, resetting `enrollmentStatus: 'ENROLLED'`, clearing withdrawal metadata (`withdrawnReason: null`, `withdrawnAt: null`, `withdrawnBy: null`, `supportingDocumentWithdrawnId: null`), resetting `attendanceStatus: 'PENDING'`, and applying new fee/discount/organization particulars.
  - If `existingEnrollment` does not exist: Create new `CourseRunLearner`.
- **Venue Final Fee Recalculation**: Automatically recalculated and updated on the course run.

#### 2. Group Learner Enrollment (`enrollLearners`)
- **Iterative Learner Resolution**: For each participant in the group, reuse existing `Learner` records by email or create new ones without erroring out.
- **Group Reactivation & Update**: If `existingEnrollment` was soft-deleted or withdrawn, update the row with the new group fee structure and reactivate it to `'ENROLLED'` with `deletedAt: null`. If not existing, create a new row.
- **Accurate Error Reporting**: Only genuinely active duplicate enrollments are flagged in `errors`.

#### 3. CSV/Excel Bulk Import (`importLearners`)
- If an existing soft-deleted/withdrawn enrollment is encountered during import, it is reactivated with updated imported row values instead of failing the row.
- Learner contact and designation details are updated if matching existing learners.

#### 4. Learner Removal (`removeEnrollment`)
- Added automatic `venueFinalFee` recalculation so removing participants immediately adjusts variable capacity fees and venue headcounts.

#### 5. Re-enrollment Action (`reenrollLearner`)
- Removed `deletedAt: null` restriction on initial lookup so both withdrawn and soft-deleted learners can be found.
- Cleared `deletedAt: null` and withdrawal fields on update.

---

### 3.2 Backend Import Controller (`polwel-backend/src/controllers/importController.ts`)
- Updated `importCourseRunLearners2` so that updating existing enrollments always resets `deletedAt: null`, `enrollmentStatus: EnrollmentStatus.ENROLLED`, and clears withdrawal metadata.

---

### 3.3 Frontend Response Handling (`src/components/AddLearnersDialog.tsx`)
- Enhanced group enrollment feedback:
  - If group enrollment returns partial or full errors, detailed messages are parsed and presented in toast notifications.
  - If successful, the dialog cleanly closes and triggers a refresh on the parent `CourseRunDetail` component.

---

## 4. Verification & Testing

1. **Backend TypeScript Typecheck & Compilation**:
   - Command: `npm run build` inside `polwel-backend/`
   - Result: `tsc` succeeded with **exit code 0**.
2. **Frontend Production Build**:
   - Command: `npm run build` in root workspace
   - Result: Vite production build transformed 3522 modules and generated assets with **exit code 0**.

---

## 5. Summary of Modified Files

| File | Type | Description |
| :--- | :--- | :--- |
| `polwel-backend/src/controllers/courseRunController.ts` | Backend | Implemented reactivation pattern in `enrollLearner`, `enrollLearners`, `importLearners`, `reenrollLearner`, and `removeEnrollment`. |
| `polwel-backend/src/controllers/importController.ts` | Backend | Ensured `importCourseRunLearners2` reactivates deleted/withdrawn records cleanly. |
| `src/components/AddLearnersDialog.tsx` | Frontend | Improved group enrollment response and toast error handling. |
| `documentations/2026_08_24_17_30_changes_fix-learner-re-enrollment-after-deletion.md` | Docs | Comprehensive documentation of the troubleshooting, root cause, and changes. |
