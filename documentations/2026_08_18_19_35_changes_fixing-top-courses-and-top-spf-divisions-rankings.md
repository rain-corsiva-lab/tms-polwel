# Fix Documentation: Global Rankings Scope & Removal of Learners Column

**Date:** 18 August 2026, 7:45 PM  
**Module:** Training Coordinator Dashboard (`OrganizationDashboard.tsx`), Organization Analytics Controller (`organizationAnalyticsController.ts`)  

---

## 1. Overview & Business Objectives

This update applies two important adjustments to the Training Coordinator Dashboard Organisation Analytics tables:
1. **Removed "Number of Learners" Column**:
   - Removed the "Number of Learners" column and its badge from both analytics tables (**Top Courses** and **Top SPF Divisions**).
   - Tables now present a streamlined 2-column layout: **Rank** and **Course Name** / **Division / Department**.
2. **Whole System / Global Data Scope**:
   - **Top Courses Ranked by Number of Learners**: Ranks all active POLWEL courses based on total enrollments across the entire system.
   - **Top SPF Divisions Ranked by Number of Learners**: Ranks the entire SPF department across all SPF divisions in the system (including registered SPF organizations), regardless of whether the logged-in training coordinator is linked to them.

---

## 2. Technical Modifications Breakdown

### Backend Changes (`polwel-backend/src/controllers/organizationAnalyticsController.ts`)
- **`getCoursesByLearnersRanking`**:
  - Global query across all non-deleted course runs and learners in the entire system (`enrollmentStatus: { not: 'WITHDRAWN' }`).
  - Pre-populates all active POLWEL courses (`status: 'ACTIVE'`).
  - Sorts all courses descending by global unique learner count (and secondary alphabetical sort) with sequential rank `1..N`.
- **`getDivisionsByLearnersRanking`**:
  - Pre-populates all active registered SPF organizations from the database (`organizationType: 'SPF'`).
  - Queries all enrollments across the whole system and matches them against SPF divisions (`isSpfEntity`), strictly excluding private vendor/company accounts (like "Corsiva Microsoft").
  - Sorts all SPF divisions descending by global unique learner count with sequential rank `1..N`.

### Frontend Changes (`src/pages/OrganizationDashboard.tsx`)
- Removed `TableHead` and `TableCell` for "Number of Learners" from both ranking tables.
- Styled `Rank` column (`w-20 text-center font-semibold`) and name columns (`font-medium`).

---

## 3. Verification & Quality Assurance
- **Backend TypeScript**: `npx tsc --noEmit` -> **0 errors**.
- **Frontend TypeScript**: `npx tsc --noEmit` -> **0 errors**.
- **Production Build**: `npm run build:production` -> **0 errors (built in 20.14s)**.
