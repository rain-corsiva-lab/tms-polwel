# Technical Documentation: Fixing Email Logs Page Access and Routing

* **Date & Time:** 27 July 2026, 08:23 (Local Time)
* **Title:** Fixing Email Logs Page Access and Routing
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
The `/email-logs` route in the frontend application was rendering a "404 Page Not Found" error when accessed directly in the browser address bar or through navigation. The goal was to troubleshoot the root cause, restore the sidebar navigation link for POLWEL administrators, and correct the web server URL rewriting rules so direct route access succeeds seamlessly.

---

## 2. Root Cause Analysis
1. **Web Server SPA Rewriting (`htaccess`)**:
   - The project's root `htaccess` file had `RewriteBase /subdirectory` hardcoded instead of `RewriteBase /`.
   - When Vite built the application bundle, `dist/.htaccess` was populated with `RewriteBase /subdirectory`, causing Apache on production/staging servers to look for non-existent `/subdirectory/index.html` fallback paths when direct URL navigation (like `https://tms.polwel.org.sg/email-logs`) occurred.
2. **Commented Out Sidebar Link (`Sidebar.tsx`)**:
   - The `<NavItem to="/email-logs" icon={Mail} label="Email Logs" />` navigation item inside `Sidebar.tsx` was commented out inside `{/* ... */}` block, preventing POLWEL admin users from seeing and accessing the Email Logs menu option.

---

## 3. Implemented Changes

### A. Web Server Configuration (Vite & Apache)
* **htaccess**:
  - Updated `RewriteBase /subdirectory` to `RewriteBase /` in [htaccess](file:///c:/laragon/www/polwel/htaccess#L2).
  - Verified that Vite builds cleanly copy the corrected `.htaccess` rule to `dist/.htaccess`.

### B. Navigation & Sidebar (Frontend)
* **Sidebar.tsx**:
  - Uncommented `{isPolwelUser && <NavItem to="/email-logs" icon={Mail} label="Email Logs" />}` in [Sidebar.tsx](file:///c:/laragon/www/polwel/src/components/Sidebar.tsx#L400) so POLWEL administrators can view and navigate to Email Logs from the sidebar menu.

---

## 4. Verification & Testing
* **Frontend Compilation**: Executed `npm run build` — built in 21.56s with 0 errors. Verified `dist/.htaccess` contains `RewriteBase /`.
