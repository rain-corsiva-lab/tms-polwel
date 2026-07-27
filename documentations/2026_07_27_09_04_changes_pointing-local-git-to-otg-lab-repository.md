# Technical Documentation: Pointing Local Git to OTG-Lab Repository

* **Date & Time:** 27 July 2026, 09:04 (Local Time)
* **Title:** Pointing Local Git to OTG-Lab Repository
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
The purpose of this update is to switch the workspace's Git remote configuration to point exclusively to the official OTG-Lab organization repository (`https://github.com/OTG-Lab/polwelpdms.git`), merge recent remote CI/CD and refactoring updates from `OTG-Lab/main`, and synchronize all local development branches (`kukuh`, `staging`, `main`).

---

## 2. Implemented Changes

### A. Remote Re-configuration & Fetching
* **Git Origin URL Update**:
  - Executed `git remote set-url origin https://github.com/OTG-Lab/polwelpdms.git`.
  - Fetched all branches from `https://github.com/OTG-Lab/polwelpdms.git`.

### B. Branch Merges & Upstream Tracking
* **Branch Merges**:
  - Merged remote `origin/main` (which included CI/CD `.github/workflows/deploy.yml` and `formatDate` utilities from `OTG-Lab`) into local `kukuh`.
  - Resolved merge conflict in `QuarterDetailsDialog.tsx` by integrating `formatDate` alongside custom course summary breakdown tables.
* **Synchronization & Push**:
  - Pushed local `kukuh` to `origin/kukuh` and set upstream tracking (`git push -u origin kukuh`).
  - Merged and pushed `staging` to `origin/staging`.
  - Merged and pushed `main` to `origin/main`.
