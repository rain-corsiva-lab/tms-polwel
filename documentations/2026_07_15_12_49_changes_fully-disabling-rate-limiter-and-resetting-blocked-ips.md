# Technical Documentation: Fully Disabling Rate Limiter and Resetting Blocked IPs

* **Date & Time:** 15 July 2026, 12:49 (Local Time)
* **Title:** Fully Disabling Rate Limiter and Resetting Blocked IPs
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
The purpose of this change is to completely deactivate the global rate limiter by default for staging/production environments, and to provide a quick utility script to clear current blocked memory cache entries and unblock all users immediately.

---

## 2. Implemented Changes

### A. Backend Layer
* **index.ts**:
  - Modified how the global `limiter` middleware is loaded.
  - Replaced the global `app.use(limiter)` statement with a conditional wrapper: `if (process.env.ENABLE_RATE_LIMIT === 'true') { app.use(limiter); }`.
  - By default, because the environment variable is not defined or is false, the rate limiter is fully disabled out-of-the-box.

### B. Helper Utility Script
* **unblock-ips.sh**:
  - Created a shell script in the root directory that restarts the backend PM2 process (`polwel-backend`) and updates environment variables, which immediately clears memory caches and unblocks all blocked IPs.

---

## 3. Verification & Testing
* Verified backend compiler checks with `npm run build`.
