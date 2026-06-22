# Change Documentation

**Date/Time**: 2026-06-22 11:20 SGT  
**Author**: Antigravity AI  
**Title**: Hide soft-deleted organizations from queries and lookups  

---

## 1. Executive Summary
This document records the changes made to the Polwel Training Management System to ensure that client organizations that have been soft-deleted (status set to `INACTIVE`) are hidden from all list tables, stats count, detail queries, report filter options, and import matchers.

---

## 2. Backend & Database Changes

### 2.1 Filtering Client Organizations List & Details
- **File**: [`polwel-backend/src/controllers/clientOrganizationsController.ts`](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/clientOrganizationsController.ts)
  - **`getClientOrganizations`**: Updated the index list query. When no explicit status filter is requested via the API query parameters, it defaults to querying organizations that are not inactive: `where.status = { not: 'INACTIVE' }`. This ensures deleted organizations are hidden from the dashboard tables by default.
  - **`getClientOrganizationById`**: If a query is made for a specific organization by ID and its status is `INACTIVE`, the backend returns a `404 Organization not found` error.
- **File**: [`polwel-backend/src/controllers/organizationsController.ts`](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/organizationsController.ts)
  - **`getOrganizationById`**: Likewise updated to return `404 Organization not found` if the requested organization is `INACTIVE`.

### 2.2 Updating Statistics Counts
- **File**: [`polwel-backend/src/controllers/clientOrganizationsController.ts`](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/clientOrganizationsController.ts)
  - **`getOrganizationStats`**: Modified `totalOrganizations` to count only non-inactive organizations: `prisma.organization.count({ where: { status: { not: 'INACTIVE' } } })`. Soft-deleted organizations are no longer counted in total counts.

### 2.3 Reporting Dropdown Filters
- **File**: [`polwel-backend/src/controllers/reportingController.ts`](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/reportingController.ts)
  - **`getFilterOptions`**: Added a where filter to the organization dropdown selection options query: `where: { status: { not: 'INACTIVE' } }`. This prevents deleted organizations from being selectable as filters on the reports pages.

### 2.4 Import & Duplication Lookups
- **File**: [`polwel-backend/src/controllers/importController.ts`](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/importController.ts)
  - **`importLearners`**: Lookup finds only non-inactive client organizations.
  - **`importCourseRunLearners2`**: Lookup filters out `INACTIVE` organizations.
  - **`importCourseRuns2`**: Matcher queries only non-inactive client organizations.
- **File**: [`polwel-backend/src/controllers/courseRunController.ts`](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/courseRunController.ts)
  - **`getOrganizationByName`**: The internal organization helper used during duplications/imports now filters out `INACTIVE` records.

---

## 3. Verification & Compilation Check
- Run types build check on backend: `npx tsc --noEmit` -> Success, zero errors.
- Run types build check on frontend: `npx tsc --noEmit` -> Success, zero errors.
