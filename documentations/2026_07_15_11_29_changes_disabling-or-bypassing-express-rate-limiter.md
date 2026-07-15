# Technical Documentation: Disabling or Bypassing Express Rate Limiter

* **Date & Time:** 15 July 2026, 11:29 (Local Time)
* **Title:** Disabling or Bypassing Express Rate Limiter
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
The purpose of this change is to resolve the generic `Scan failed. Too many requests from this IP, please try again later.` rate-limit block which occurred on duplicate course runs scan and other dashboard operations. 

---

## 2. Implemented Changes

### A. Backend Layer
* **index.ts**:
  - Restructured the rate limiter setup in `polwel-backend/src/index.ts`.
  - Added support for a new environment variable check `DISABLE_RATE_LIMIT=true` to skip rate limiting completely.
  - Automatically skip rate limiting for all requests when `NODE_ENV === 'development'` or when running locally.
  - Increased the default fallback max threshold to a very generous `15000` requests per 15 minutes window to avoid unexpected rate-limit triggers.
* **.env**:
  - Added `DISABLE_RATE_LIMIT=true` to the local development environment variables file.

---

## 3. Verification & Testing
* Verified backend compiler checks with `npm run build`.
