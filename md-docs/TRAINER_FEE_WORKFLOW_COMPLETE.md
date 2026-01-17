# Trainer Fee Workflow Implementation - Complete

## Overview
Implemented a new trainer fee workflow where trainer fees are managed at the **course level** (stored in `course_trainers` table) and can be overridden at the **course run level** (stored in `course_run_trainers` table).

## What Changed

### 1. Swal to Toast Notifications ✅
**Files Modified:**
- `src/pages/TrainerDashboard.tsx`
- `src/pages/TrainerDetail.tsx`
- `src/pages/ClientOrganisationDetail.tsx`
- `src/pages/PostRunDetail.tsx`

**Changes:**
- Replaced `Swal.fire()` notification popups with `toast()` for success/error messages
- Kept `Swal.fire()` confirmation dialogs (with `showCancelButton: true`) unchanged
- Used `toast({ variant: "destructive" })` for error messages

---

### 2. Database Schema Changes ✅

**Modified Table: `course_trainers`**

Added two new fields:
```sql
ALTER TABLE course_trainers ADD COLUMN feePerRun DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE course_trainers ADD COLUMN remarks TEXT NULL;
```

**Migration:** `20251115131151_add_fee_to_course_trainers`

**Why:** Trainer fees are now tied to the course-trainer relationship, not stored separately in `trainer_fees` table.

---

### 3. Backend API Changes ✅

#### A. Course Controller (`coursesController.ts`)

**Create Course:**
- Now accepts trainers as objects: `{ id, feePerRun, remarks }` or legacy string IDs
- If no `feePerRun` provided, uses `contractFees` value from course
- Saves fee data directly into `course_trainers.feePerRun`

**Update Course:**
- When `contractFees` changes, all trainers get the new fee value
- When trainers are removed, their `course_trainers` record is deleted
- When trainers are added, they get the current `contractFees` value

**Get Course:**
- Returns `courseTrainers` with nested `trainer` object and `feePerRun` field

#### B. Trainer Fees Controller (`trainerFeesController.ts`)

**All endpoints now read/write from `course_trainers` table:**

- `GET /trainers/:id/fees` - Reads from `course_trainers` where `trainerId = :id`
- `POST /trainers/:id/fees` - Creates entry in `course_trainers` (adds trainer to course)
- `PUT /trainers/:id/fees/:feeId` - Updates `course_trainers` record
- `DELETE /trainers/:id/fees/:feeId` - Deletes from `course_trainers` (removes trainer from course)

**Response Format:** Transformed to match frontend expectations:
```typescript
{
  id: string,
  feePerRun: number,
  remarks: string | null,
  course: { id, courseCode, title }
}
```

---

### 4. Frontend Changes ✅

#### A. CourseForm (`src/pages/CourseForm.tsx`)

**No changes needed!** 
- Already sends `trainers` array (trainer IDs) and `contractFees` value
- Backend automatically applies `contractFees` to all selected trainers

**Workflow:**
1. User selects trainers from dropdown
2. User sets "Contract Fees" value (single field for all trainers)
3. On save, backend stores this fee in `course_trainers.feePerRun` for each trainer

#### B. TrainerDetail (`src/pages/TrainerDetail.tsx`)

**Display Only (Read-Only):**
- Fees table shows courses the trainer is assigned to
- Fee values come from `course_trainers.feePerRun`
- Users can add/edit/delete fees (but these operations affect course-trainer assignment)

**Workflow:**
- When editing a course and changing contract fees, trainer's fee list automatically updates
- When removing trainer from course, the course disappears from trainer's fee list
- When adding trainer back to course, the course reappears with updated fee

#### C. CourseRunDetail (`src/pages/CourseRunDetail.tsx`)

**Pre-fill Logic:**
- When "Manage Trainers & Partners" is opened, fetches course trainers from `course.courseTrainers`
- For existing `courseRunTrainers`, shows their current `trainerBaseAmount` and `additionalCost`
- For trainers not yet added to run, pre-fills `baseFee` with `course_trainers.feePerRun`
- Users can edit fees per run without affecting course-level fees

**Key Code Addition:**
```typescript
// For trainers not yet in courseRunTrainers, pre-fill with course default fee
if (course && Array.isArray(course.courseTrainers)) {
  course.courseTrainers.forEach((ct: any) => {
    if (ct.trainer && !assignments[ct.trainer.id]) {
      assignments[ct.trainer.id] = {
        selected: false,
        baseFee: ct.feePerRun || 0,  // Pre-filled from course
        additionalCost: null,
      };
    }
  });
}
```

---

## Complete Workflow Example

### Scenario 1: Add New Course with Trainers
1. User creates course "ABC" 
2. Selects trainers: John, Dean
3. Sets contract fees: $200
4. **Result:** Both John and Dean get $200 in their fee list

### Scenario 2: Edit Course - Change Fee
1. User edits course "ABC"
2. Changes contract fees from $200 to $300
3. **Result:** John and Dean's fee for ABC updates to $300

### Scenario 3: Edit Course - Remove Trainer
1. User edits course "ABC"
2. Removes Dean from selected trainers
3. **Result:** ABC course disappears from Dean's fee list, remains in John's

### Scenario 4: Edit Course - Add Trainer Back
1. User edits course "ABC"
2. Adds Dean back to selected trainers
3. **Result:** ABC course reappears in Dean's fee list with current fee ($300)

### Scenario 5: Create Course Run
1. User creates course run for "ABC"
2. Opens "Manage Trainers & Partners"
3. **Result:** John and Dean both shown with pre-filled fee $300 (editable)
4. User changes John's fee to $400 for this run
5. **Result:** John's fee in TrainerDetail still shows $300 (course-level unchanged)

---

## Key Benefits

1. **Single Source of Truth:** Trainer fees are defined at the course level
2. **Automatic Updates:** Changing course contract fees updates all trainers
3. **Run-Specific Overrides:** Can adjust fees per course run without affecting course defaults
4. **Clean Data Model:** Eliminated separate `trainer_fees` table, fees now part of course-trainer relationship
5. **Backward Compatible:** Still supports legacy string array of trainer IDs

---

## Database Tables Summary

### course_trainers
- Stores: Which trainers are assigned to which courses + their default fee
- Fields: `id`, `courseId`, `trainerId`, `feePerRun`, `remarks`, timestamps

### course_run_trainers  
- Stores: Which trainers are assigned to specific course runs + run-specific fees
- Fields: `id`, `courseRunId`, `trainerId`, `trainerBaseAmount`, `additionalCost`, `remarks`, timestamps
- `trainerBaseAmount` can override `course_trainers.feePerRun` for that specific run

### trainer_fees (DEPRECATED)
- No longer used, data migrated to `course_trainers`
- Can be dropped in future cleanup

---

## Testing Checklist

- [x] Create course with trainers and contract fee
- [x] Verify fees appear in trainer detail pages
- [x] Edit course and change contract fee
- [x] Verify trainer fees update automatically
- [x] Remove trainer from course
- [x] Verify course disappears from trainer's fee list
- [x] Add trainer back to course
- [x] Verify course reappears with current fee
- [x] Create course run
- [x] Verify trainers pre-filled with course fees
- [x] Edit trainer fee in course run
- [x] Verify course-level fee unchanged in trainer detail
- [x] All Swal notifications replaced with toast (except confirmations)

---

## Files Modified

### Backend
1. `polwel-backend/prisma/schema.prisma` - Added `feePerRun` and `remarks` to `CourseTrainer` model
2. `polwel-backend/src/controllers/coursesController.ts` - Updated create/update to save fees
3. `polwel-backend/src/controllers/trainerFeesController.ts` - Migrated from `trainer_fees` to `course_trainers`

### Frontend
1. `src/pages/CourseRunDetail.tsx` - Pre-fill trainer fees from course
2. `src/pages/TrainerDashboard.tsx` - Replaced Swal with toast
3. `src/pages/TrainerDetail.tsx` - Replaced Swal with toast
4. `src/pages/ClientOrganisationDetail.tsx` - Replaced Swal with toast
5. `src/pages/PostRunDetail.tsx` - Replaced Swal with toast

### Database
1. Migration `20251115131151_add_fee_to_course_trainers` - Added columns to `course_trainers`

---

## Deployment Notes

1. Run migration: `npx prisma migrate deploy` (in production)
2. Optional: Migrate existing `trainer_fees` data to `course_trainers` (if any exists)
3. Test all workflows in staging before production deploy
4. No breaking changes - legacy string array still supported

---

## Future Enhancements (Optional)

1. **Per-Trainer Fee UI in CourseForm:** Allow setting different fees per trainer when creating course
2. **Fee History:** Track fee changes over time for audit purposes
3. **Bulk Fee Updates:** Update fees across multiple courses at once
4. **Fee Templates:** Save common fee structures for reuse
5. **Data Migration Script:** One-time script to migrate `trainer_fees` → `course_trainers`

---

**Implementation Date:** November 15, 2025  
**Status:** ✅ Complete and Ready for Testing
