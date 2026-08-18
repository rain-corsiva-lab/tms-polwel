# Fix Documentation: Top Courses (All POLWEL Courses) and Top SPF Divisions Rankings

**Date:** 18 August 2026, 7:35 PM  
**Module:** Training Coordinator Dashboard (`OrganizationDashboard.tsx`), Organization Analytics Controller (`organizationAnalyticsController.ts`)  

---

## 1. Overview & Business Objectives

This update addresses two specific requirements for the Training Coordinator Dashboard's Organisation Analytics tables:
1. **Top Courses Ranked by Number of Learners**:
   - Displays **all active courses that POLWEL provides** in the ranking list.
   - Courses with learners/bookings from the coordinator's connected organizations are ranked at the top by their unique learner count.
   - Remaining POLWEL courses without enrollments are included in the whole ranking with `0` learners, showing the complete catalogue.
   - Card title updated to: **"Top Courses Ranked by Number of Learners"**.
2. **Top SPF Divisions Ranked by Number of Learners**:
   - Strictly restricted to **SPF Divisions / Departments only**.
   - Filters out non-SPF entities and private vendor accounts (e.g., "Corsiva Microsoft").
   - Card title updated to: **"Top SPF Divisions Ranked by Number of Learners"**.

---

## 2. Technical Modifications Breakdown

### Backend Changes (`polwel-backend/src/controllers/organizationAnalyticsController.ts`)
- **`getCoursesByLearnersRanking`**:
  - Queries all active courses: `prisma.course.findMany({ where: { status: 'ACTIVE' }, select: { id: true, title: true, courseCode: true } })`.
  - Initializes all active courses in the ranking map with `0` learners.
  - Aggregates unique learner counts and bookings from the logged-in coordinator's connected organizations.
  - Sorts courses primarily by `numberOfLearners` descending and secondarily by `courseName` alphabetically.
  - Returns the complete list of ranked courses with sequential ranks `1, 2, 3...`.
- **`getDivisionsByLearnersRanking`**:
  - Added strict SPF validation (`isSpfEntity`) checking `clientOrganization.organizationType === 'SPF'`, `trainingCoordinator.organization.organizationType === 'SPF'`, and division/department name keywords (`Singapore Police Force`, `SPF`, `Division`, `TRACOM`, `CID`, `CAD`, `SOC`, etc.).
  - Explicitly filters out non-SPF entities (such as "Corsiva Microsoft", private companies).
  - Ranks valid SPF divisions by unique learner counts.

### Frontend Changes (`src/pages/OrganizationDashboard.tsx`)
- Updated analytics card headers:
  - Left Card: **"Top Courses Ranked by Number of Learners"**
  - Right Card: **"Top SPF Divisions Ranked by Number of Learners"**

---

## 3. Verification & Quality Assurance
- **Backend TypeScript Compilation**: `npx tsc --noEmit` -> **0 errors**.
- **Frontend TypeScript Compilation**: `npx tsc --noEmit` -> **0 errors**.
- **Production Build**: `npm run build:production` -> **0 errors**.
