# Fix Documentation: Strict SPF Organization Type Filter for Division Analytics

**Date:** 19 August 2026, 10:19 AM  
**Module:** Training Coordinator Dashboard (`OrganizationDashboard.tsx`), Organization Analytics Controller (`organizationAnalyticsController.ts`)  

---

## 1. Overview & Business Objectives

This update enforces strict filtering on the **Top SPF Divisions Ranked by Number of Learners** table to ensure:
1. **Strict SPF Organization Type (`organizationType: 'SPF'`)**:
   - The table **only contains organizations that have `organizationType: 'SPF'`**.
   - Pre-populates the list exclusively from active SPF client organizations.
   - Any non-SPF organization (`PUBLIC_SECTOR`, `PRIVATE_SECTOR`, `POLWEL`, vendor accounts) is strictly excluded and cannot appear in the SPF divisions ranking.
2. **Learner Aggregation**:
   - Learner counts are attributed strictly to their corresponding SPF organization (`organizationType: 'SPF'`).
3. **Column Structure**:
   - Both tables remain clean 2-column tables: **Rank** | **Course Name** and **Rank** | **Division / Department**.

---

## 2. Technical Modifications Breakdown

### Backend Changes (`polwel-backend/src/controllers/organizationAnalyticsController.ts`)
- **`getDivisionsByLearnersRanking`**:
  - `prisma.organization.findMany({ where: { organizationType: 'SPF', status: 'ACTIVE' } })` strictly determines the allowed entities in `departmentMap`.
  - Enrollments query is filtered strictly to `clientOrganization: { organizationType: 'SPF' }`, `trainingCoordinator: { organization: { organizationType: 'SPF' } }`, or matching SPF organization IDs.
  - Attribution maps only to confirmed SPF organizations.
  - Ranked in descending order of learner counts with sequential ranks `1..N`.

---

## 3. Verification & Quality Assurance
- **Backend TypeScript**: `npx tsc --noEmit` -> **0 errors**.
- **Frontend TypeScript**: `npx tsc --noEmit` -> **0 errors**.
- **Production Build**: `npm run build:production` -> **0 errors**.
