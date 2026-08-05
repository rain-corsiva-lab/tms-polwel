# Fixing Soft-Deleted & Withdrawn Learners Display in Administrative Matters & Certificate Dialogs

**Date & Time**: 2026-08-05 10:25 SGT  
**Modules Modified**: `polwel-backend` (`courseRunController.ts`), Frontend (`GenerateCertificatesDialog.tsx`, `CertificateGenerationDialog.tsx`)  
**Scope**: Root cause analysis and resolution of withdrawn/soft-deleted learners still appearing under "Absent Learners" in the Administrative Matters / Certificate dialog popup.  

---

## 1. Executive Summary & Root Cause Analysis

### Problem Description
In production post-run management, when a learner enrollment was deleted or marked as `WITHDRAWN` (e.g. `Muhammad Salihin Bin Abdullah`), the learner was soft-deleted (`deletedAt IS NOT NULL`) and set to `enrollmentStatus = 'WITHDRAWN'`.

However:
1. When opening the "Administrative Matters" / Certificate dialog popup, the backend API (`GET /api/course-runs/:id/certificates`) still returned the withdrawn learner.
2. Because the learner's `attendanceStatus` in the database was `'PENDING'` (not `'PRESENT'`), the frontend categorized `isPresent = false` and rendered the withdrawn/deleted learner under **Absent Learners (1)** with status `Absent`.

### Root Cause
1. **Backend Duplicate Method Override in `courseRunController.ts`**:
   - `courseRunController.ts` contained a duplicate implementation of `generateCertificates` at the bottom of the object definition (lines 6991–7073).
   - In JavaScript/TypeScript object literals, keys declared later override keys declared earlier.
   - The duplicate `generateCertificates` handler at line 6992 queried `courseRunLearners` **without any `where` filter**:
     ```typescript
     courseRunLearners: {
       include: {
         learner: { ... }
       }
     }
     ```
   - This flaw caused Prisma to fetch **ALL** enrollments, including soft-deleted ones (`deletedAt IS NOT NULL`) and withdrawn ones (`enrollmentStatus = 'WITHDRAWN'`).
2. **Missing `enrollmentStatus: { not: 'WITHDRAWN' }` Filter**:
   - In the primary `generateCertificates` (and related certificate PDF/ZIP endpoints), `deletedAt: null` was checked, but `enrollmentStatus: { not: 'WITHDRAWN' }` was omitted. Withdrawn learners were therefore not filtered out.
3. **Frontend Absence of Defensive Filters**:
   - `GenerateCertificatesDialog.tsx` and `CertificateGenerationDialog.tsx` computed `presentLearners` and `absentLearners` directly from `learners.filter(l => l.isPresent)` without verifying `l.enrollmentStatus !== 'WITHDRAWN'` or `!l.deletedAt`.

---

## 2. Changes Implemented

### 1. Backend Fixes (`polwel-backend/src/controllers/courseRunController.ts`)
- **Removed Duplicate Method Override Block**: Deleted the entire duplicate block (lines 6991–7339) containing flawed, un-filtered handlers (`generateCertificates`, `submitWaiverForm`, `generateCertificatePDF`, `generateCertificatesZIP`, `sendCertificatesToLearners`).
- **Enforced Strict Prisma Filters (`generateCertificates`)**:
  Updated the primary `generateCertificates` handler to query only active enrollments:
  ```typescript
  courseRunLearners: {
    where: {
      deletedAt: null,
      enrollmentStatus: { not: 'WITHDRAWN' },
    },
    include: { learner: { select: { id: true, fullname: true, email: true } } },
  }
  ```
  And filtered `activeEnrollments` before building attendance mapping.
- **Hardened Certificate PDF, ZIP, and Email Dispatch Endpoints**:
  Added `enrollmentStatus: { not: 'WITHDRAWN' }` and `deletedAt: null` to `generateCertificatePDF`, `generateCertificatesZIP`, `sendCertificatesToLearners`, and `previewCertificateEmail`.

### 2. Frontend Fixes (`src/components/`)
- **`GenerateCertificatesDialog.tsx`**:
  - Added `enrollmentStatus?: string` and `deletedAt?: string | null` to `LearnerWithAttendance` interface.
  - Added defensive filter in `fetchCertificateData` and learner list computations:
    ```typescript
    const activeLearners = learners.filter((l: any) => l.enrollmentStatus !== "WITHDRAWN" && !l.deletedAt);
    const presentLearners = activeLearners.filter((l) => l.isPresent);
    const absentLearners = activeLearners.filter((l) => !l.isPresent);
    ```
- **`CertificateGenerationDialog.tsx`**:
  - Applied the same `activeLearners` safety filter before computing `presentLearners` and `absentLearners`.

---

## 3. Verification & Build Results

- **Backend TypeScript Compilation (`npx tsc --noEmit`)**: Clean build with **0 errors**.
- **Backend Production Build (`npm run build`)**: Clean build with **0 errors**.
- **Frontend TypeScript Compilation (`npx tsc --noEmit`)**: Clean build with **0 errors**.
- **Frontend Production Build (`npm run build`)**: Clean build with **0 errors**.
