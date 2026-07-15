# Technical Documentation: Fix Dashboard Tabs and Participants Counter

* **Date & Time:** 13 July 2026, 18:19 (Local Time)
* **Title:** Fix Dashboard Tabs and Participants Counter
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
The purpose of these updates is to resolve the missing organization tabs for Training Coordinators linked to multiple organizations on initial login or page refresh, and correct the dashboard total participants counts.

---

## 2. Implemented Changes

### A. Backend Layer
* **profileController.ts (getProfile)**: Updated the profile query to select the `organizations` junction relationship and map them to `organizationIds` in the returned payload. This ensures that the frontend receives the full list of associated organization IDs on page refreshes.

### B. Frontend Layer
* **useAuth.tsx (AuthProvider)**:
  - Added a background silent refresh check inside `useEffect` during initialization. If a user session is active, it calls `authService.refreshUser()` in the background to automatically populate and sync the latest user profile (including `organizationIds`) from the server.
* **OrganizationDashboard.tsx**:
  - Replaced the local state-derived `totalLearners` and `activeLearners` counters (which loaded only when the participants tab was clicked) with `organization.stats.totalLearners` and `organization.stats.activeLearners` from the backend API. This guarantees accurate counts are visible immediately when the dashboard is loaded.

---

## 3. Verification & Testing
* Verified backend compiler checks with `npm run build`.
* Checked frontend build outputs with `npm run build`.
