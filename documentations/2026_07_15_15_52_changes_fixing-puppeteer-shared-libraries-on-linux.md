# Technical Documentation: Fixing Puppeteer Shared Libraries on Linux

* **Date & Time:** 15 July 2026, 15:52 (Local Time)
* **Title:** Fixing Puppeteer Shared Libraries on Linux
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
The purpose of this change is to fix a critical runtime issue on Linux production/staging servers where Puppeteer's bundled Chrome binary fails to launch due to missing system-level shared libraries (e.g. `libatk-1.0.so.0`, `libatk-bridge-2.0.so.0`, `libcups.so.2`, `libxcomposite.so.1`, `libxdamage.so.1`, `libxrandr.so.2`, etc.).

---

## 2. Implemented Changes

### A. Infrastructure & Dependencies (Linux Server)
* **install-puppeteer-deps.sh (New Helper Script)**:
  - Created a robust shell script `install-puppeteer-deps.sh` inside the project root folder.
  - The script detects the Linux packaging system:
    * **Debian/Ubuntu (`apt-get`)**: Installs Chromium dependencies like `libatk1.0-0`, `libatk-bridge2.0-0`, `libgbm1`, `libxcomposite1`, `libxdamage1`, `libxrandr2`, etc.
    * **CentOS/RHEL (`yum`/`dnf`)**: Installs required library packages like `alsa-lib`, `atk`, `cups-libs`, `gtk3`, `libXcomposite`, etc.
  - Ensures a single, automatic utility to configure and verify all Puppeteer shared libraries on target deployment systems.
* **execute-prod.sh & execute-stag.sh (Deployment Scripts)**:
  - Updated production and staging deploy scripts to automatically run `install-puppeteer-deps.sh` during the pipeline execution process right after a git pull.
  - This ensures that missing Chromium/Chrome shared libraries are automatically resolved on the target server environment.

---

## 3. Verification & Testing
* Verified bash script formatting and permission configuration.
