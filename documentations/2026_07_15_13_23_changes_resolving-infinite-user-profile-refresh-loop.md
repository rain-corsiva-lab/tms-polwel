# Technical Documentation: Resolving Infinite User Profile Refresh Loop

* **Date & Time:** 15 July 2026, 13:23 (Local Time)
* **Title:** Resolving Infinite User Profile Refresh Loop
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
The purpose of this change is to resolve a critical infinite loop bug in the frontend application where the client repeatedly requests the user profile (`/profile`) and organization details in quick succession, causing major lag and network overhead.

---

## 2. Implemented Changes

### A. Frontend Layer
* **useAuth.tsx**:
  - Found that the silent background refresh logic `authService.refreshUser()` was inside the general `checkAuth()` helper function.
  - Because `refreshUser` broadcasts a `"polwel_auth_updated"` event which `AuthProvider` listens to and triggers `checkAuth()`, it created a cascading infinite feedback loop.
  - Moved the silent refresh call out of `checkAuth` and placed it directly in the mount `useEffect`, executing it exactly **once** on application startup.
* **OrganizationDashboard.tsx**:
  - Changed the dependency for the organizations query `useEffect` from `orgIds` (which is a new array reference on every render) to `orgIds.join(",")` (a primitive string).
  - This prevents unnecessary re-fetching of client organizations when array instances are recreated during other state updates.

---

## 3. Verification & Testing
* Verified frontend compiler checks with `npm run build`.
