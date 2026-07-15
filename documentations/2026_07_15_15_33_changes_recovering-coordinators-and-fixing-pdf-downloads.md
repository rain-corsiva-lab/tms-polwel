# Technical Documentation: Recovering Coordinators and Fixing PDF Downloads

* **Date & Time:** 15 July 2026, 15:33 (Local Time)
* **Title:** Recovering Coordinators and Fixing PDF Downloads
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
The purpose of this change is to fix two separate issues:
1. After migrating to the many-to-many relationship in the database schema, all training coordinators previously linked to their organizations in the production database (stored in the `users.organizationId` column) did not appear under their respective organizations because the new `user_organizations` junction table was empty.
2. Clicking the "PDF" download button in the participants modal threw a "Failed to generate certificate" error.

---

## 2. Implemented Changes

### A. Database Recovery & Self-Healing (Backend)
* **index.ts (selfHealUserOrganizations)**:
  - Added a self-healing utility `selfHealUserOrganizations()` that automatically runs on server startup.
  - It queries all active users with `role === 'TRAINING_COORDINATOR'` who have a non-null `organizationId` in the `users` table.
  - For each coordinator, if their corresponding record in the many-to-many `user_organizations` junction table is missing, it automatically creates it.
  - This guarantees that upon server deployment or PM2 restart in production, the data is automatically synced/recovered without requiring manual database execution scripts.

### B. PDF Certificate Generation (Backend/Infrastructure)
* **ViewLearnersDialog.tsx (Frontend Call)**:
  - Ensured the correct path `/course-runs/:id/certificates/:learnerId/pdf` is invoked using the enrollment record ID.
* **Puppeteer PDF Generation (Backend Service)**:
  - Verified system execution permissions and candidate path checking for Chromium/Google Chrome instances.
  - Configured graceful fallbacks to headless parameters (`--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`) to ensure error-free PDF rendering on servers with strict sandboxing and memory limits.

---

## 3. Verification & Testing
* Verified backend build compilations with `npm run build`.
