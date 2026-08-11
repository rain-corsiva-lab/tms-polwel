# Fixing Division Rankings Across Client Organizations in Dashboard

**Date & Time**: 2026-08-11 17:30 SGT  
**Modules Modified**: `polwel-backend` (`organizationAnalyticsController.ts`), Frontend (`OrganizationDashboard.tsx`)  
**Scope**: Root cause analysis and resolution of "Divisions Ranked by Number of Learners" table showing only 2 divisions instead of the full list of divisions across client organizations.  

---

## 1. Executive Summary & Root Cause Analysis

### Problem Description
In the Organization Analytics Dashboard under **Divisions Ranked by Number of Learners**, the table previously only displayed 2 divisions (`Bedok Division / Changi NPC` and `ERT`), despite hundreds of learners being enrolled across various SPF divisions and client organizations.

### Root Cause
1. **Selection of Only `departmentName`**:
   - In `getDivisionsByLearnersRanking` (`organizationAnalyticsController.ts`), Prisma only selected `departmentName: true`.
   - It omitted `division: true` and `clientOrganization: { select: { name: true } }`.
   - For enrollments where division data was stored in `enrollment.division` or inherited from `clientOrganization.name`, `enrollment.departmentName` was `null` and evaluated as empty string.
2. **Restrictive Filter `enrollmentStatus: 'ENROLLED'`**:
   - The query restricted results to `enrollmentStatus: 'ENROLLED'`.
   - Any learner whose status was set or updated to other non-withdrawn statuses (e.g. `COMPLETED`, `PENDING_BILLING`, `ATTENDED`) was filtered out.
3. **Overly Narrow Organization Scope**:
   - The query filtered strictly by single `clientOrganizationId = organizationId`.
   - Multi-organization coordinators or parent organizations (SPF) with learners in linked sub-organizations or coordinator IDs were excluded.
4. **Hardcoded `.slice(0, 10)` Truncation**:
   - The endpoint hard-truncated results at 10 items, and without proper division resolution, yielded only 2 items.

---

## 2. Technical Solution & Changes Made

### 1. Backend Enhancement (`polwel-backend/src/controllers/organizationAnalyticsController.ts`)
- **Multi-Source Division Fallback Resolution**:
  Updated `getDivisionsByLearnersRanking` to resolve division/department names using a robust fallback chain:
  ```typescript
  const rawDept = (
    enrollment.departmentName?.trim() ||
    enrollment.division?.trim() ||
    (enrollment.clientOrganization?.name && enrollment.clientOrganization.name.toLowerCase() !== 'polwel'
      ? enrollment.clientOrganization.name.trim()
      : '')
  );
  ```
- **Broadened Status & Organization Scope**:
  - Replaced strict `enrollmentStatus: 'ENROLLED'` with `enrollmentStatus: { not: 'WITHDRAWN' }`.
  - Included all linked organization IDs for the training coordinator/user (`uniqueOrgIds`).
- **Full Ranked List Generation**:
  Removed `.slice(0, 10)` truncation so all division rankings are computed and returned to the client.

### 2. Frontend Scrollable Container (`src/pages/OrganizationDashboard.tsx`)
- Wrapped both **Courses Ranked** and **Divisions Ranked** tables in `<div className="max-h-[500px] overflow-y-auto">` with sticky headers (`sticky top-0 z-10`).
- Allows users to scroll through the full list of ranked divisions and courses seamlessly.

---

## 3. Verification & Build Results

- **Backend TypeScript Compilation (`npx tsc --noEmit`)**: Clean build with **0 errors**.
- **Backend Production Build (`npm run build`)**: Clean build with **0 errors**.
- **Frontend TypeScript Compilation (`npx tsc --noEmit`)**: Clean build with **0 errors**.
- **Frontend Production Build (`npm run build`)**: Clean build with **0 errors**.
