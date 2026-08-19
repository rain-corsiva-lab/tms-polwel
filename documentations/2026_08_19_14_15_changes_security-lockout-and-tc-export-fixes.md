# System Security Hardening & Training Coordinator Export Troubleshooting Documentation

**Date**: August 19, 2026  
**Status**: Implemented & Verified Locally (Pending Review / Commit / Push)

---

## 1. Executive Summary & Root Cause Analysis

### Issue 1: Training Coordinator Export Issues (Missing Organisation & Duplicated / Composite Records)
- **PM Observation**: 
  - *"training coordinator export please include their organisation."*
  - *"and can I check why got duplicated records"* (showing rows like `-`, `Angeline Tan / Janice Lam`, `Angeline Tan / Janice Lam / Low Ee Ching`, etc.).
- **Root Cause**:
  1. **Missing Organisation Column**: In [src/pages/ClientOrganisations.tsx](file:///c:/laragon/www/polwel/src/pages/ClientOrganisations.tsx), the `handleExportCoordinators` Excel column configuration only defined `Name`, `Email`, `Contact`, `Designation`, and `Status`—omitting `Organisation`.
  2. **Legacy Import Concatenation & Placeholder Rows**: When past historical course runs or learner spreadsheets were imported, cells with composite strings (e.g. `Angeline Tan / Janice Lam`) or placeholder marks (`-`) were inserted into the `User` table as distinct records with multiple concatenated email addresses (e.g. `angeline_tan@spf.gov.sg janice_qp_lam@spf.gov.sg`).
- **Fix Applied**:
  - In [polwel-backend/src/controllers/clientOrganizationsController.ts](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/clientOrganizationsController.ts) (`getAllCoordinatorsForExport`):
    - Added regex email parser (`/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g`) to separate composite entries into distinct individual coordinator entities.
    - Discarded placeholder/junk records where name or email is `-`, empty, or `N/A`.
    - Deduplicated coordinators by normalized email address.
    - Aggregated all primary and junction linked organisations (`c.organization.name` + `c.organizations.organization.name`) into a clean comma-separated list under `organizations`.
  - In [src/pages/ClientOrganisations.tsx](file:///c:/laragon/www/polwel/src/pages/ClientOrganisations.tsx):
    - Added `{ header: "Organisation", key: "Organisation" }` to Excel columns.
    - Mapped `Organisation: tc.organizations ?? tc.organization ?? ""` in exported rows.

---

### Issue 2: Section 3.3 Security, Login Failure, Lockout, and Password Rules
- **PM Specification**:
  ```
  3.3 Login Failure and Lockout
  After 3 failed login attempts, the account is expected to auto-lock for 30 minutes. POLWEL users can manually unlock or reset accounts.
  
  Password rules:
  Password expires every 365 days. The last 5 passwords cannot be reused. Login and account activity should be recorded in the audit trail.
  ```
- **Audit Findings & Gaps**:
  1. **Lockout Threshold & Duration**: Previously configured for 5 failed attempts with a 15-minute lockout.
  2. **Manual Unlock**: No explicit administrator unlock endpoint existed for locked user or coordinator accounts.
  3. **Password Expiry**: Hardcoded to 90 days across password reset and profile update routes instead of 365 days.
  4. **Password History**: No history tracking existed, allowing users to reuse previous passwords.
  5. **Audit Trail**: Login successes, login failures, account lockouts, and logouts were not logging entries to `AuditLog`.

- **Fixes Applied**:
  1. **3 Failed Login Attempts -> 30-Minute Auto-Lockout**:
     - Updated [polwel-backend/src/routes/auth.ts](file:///c:/laragon/www/polwel/polwel-backend/src/routes/auth.ts):
       - Consecutive failed attempts threshold updated to `>= 3`.
       - Auto-lock duration updated to `30 * 60 * 1000` (30 minutes).
       - Returns `423 Locked` with remaining lockout minutes and friendly guidance.
  2. **Audit Trail Logging**:
     - Auto-lockout logged as `Account Auto-Locked` in `AuditLog`.
     - Failed login attempts logged as `Login Failed` with attempt count (`X/3`).
     - Successful logins logged via `AuditService.logLogin`.
     - Logouts logged via `AuditService.logLogout`.
  3. **Password Expiry (365 Days)**:
     - Updated password expiration in [profileController.ts](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/profileController.ts), [routes/passwordReset.ts](file:///c:/laragon/www/polwel/polwel-backend/src/routes/passwordReset.ts), and [routes/users.ts](file:///c:/laragon/www/polwel/polwel-backend/src/routes/users.ts) to `365 * 24 * 60 * 60 * 1000` (365 days).
     - Token issuance flags `passwordExpired: true` if `now > passwordExpiry`.
  4. **Password History (Prevent Reusing Last 5 Passwords)**:
     - Added `passwordHistory Json?` field to Prisma schema and regenerated Prisma client.
     - On password change / reset, compares new password with current password and up to 5 previous hashed passwords in `passwordHistory`.
     - Rejects duplicate passwords with a clear error: *"New password cannot be reused. It must not match any of your last 5 passwords."*
     - Stores historical password hashes (max 5) on successful change.
  5. **Manual Unlock Capabilities for POLWEL Administrators**:
     - Added `unlockPolwelUser` in [polwelUsersController.ts](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/polwelUsersController.ts) (`POST /api/polwel-users/:id/unlock`).
     - Added `unlockCoordinator` in [clientOrganizationsController.ts](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/clientOrganizationsController.ts) (`POST /api/client-organizations/coordinators/:coordinatorId/unlock`).
     - Clears `failedLoginAttempts: 0` and `lockedUntil: null`, and logs action to Audit Trail.

---

## 2. Modified Files Summary

| File | Changes |
| :--- | :--- |
| [polwel-backend/prisma/schema.prisma](file:///c:/laragon/www/polwel/polwel-backend/prisma/schema.prisma) | Added `passwordHistory Json?` to `model User`. |
| [polwel-backend/src/controllers/clientOrganizationsController.ts](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/clientOrganizationsController.ts) | Sanitized TC export (dedupe, regex email extractor, composite splitter, merged organisations), added `unlockCoordinator`. |
| [src/pages/ClientOrganisations.tsx](file:///c:/laragon/www/polwel/src/pages/ClientOrganisations.tsx) | Added `Organisation` column and row mapping in `handleExportCoordinators`. |
| [polwel-backend/src/routes/auth.ts](file:///c:/laragon/www/polwel/polwel-backend/src/routes/auth.ts) | Implemented 3-attempt 30-minute lockout, password expiry status, and audit trail logs. |
| [polwel-backend/src/controllers/profileController.ts](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/profileController.ts) | Enforced 365-day expiry and last 5 passwords history prevention on password change. |
| [polwel-backend/src/routes/passwordReset.ts](file:///c:/laragon/www/polwel/polwel-backend/src/routes/passwordReset.ts) | Enforced 365-day expiry and last 5 passwords history prevention on password reset. |
| [polwel-backend/src/routes/users.ts](file:///c:/laragon/www/polwel/polwel-backend/src/routes/users.ts) | Enforced 365-day expiry and last 5 passwords history prevention on user password update. |
| [polwel-backend/src/controllers/polwelUsersController.ts](file:///c:/laragon/www/polwel/polwel-backend/src/controllers/polwelUsersController.ts) | Added `unlockPolwelUser`, included `lockedUntil` and `failedLoginAttempts` in user selects. |
| [polwel-backend/src/routes/polwelUsers.ts](file:///c:/laragon/www/polwel/polwel-backend/src/routes/polwelUsers.ts) | Registered `POST /:id/unlock` route for POLWEL users. |
| [polwel-backend/src/routes/clientOrganizations.ts](file:///c:/laragon/www/polwel/polwel-backend/src/routes/clientOrganizations.ts) | Registered `POST /coordinators/:coordinatorId/unlock` route. |

---

## 3. Verification & Build Integrity
- Backend TypeScript check (`npx tsc --noEmit` in `polwel-backend`): **0 errors (PASSED)**
- Frontend TypeScript check (`npx tsc --noEmit` in root): **0 errors (PASSED)**
- Git status: Changes staged/unstaged in working tree, **NOT committed or pushed** per user directive.
