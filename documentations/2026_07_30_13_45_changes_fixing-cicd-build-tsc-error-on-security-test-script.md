# Fixing CI/CD Build `tsc` Error on Security Test Script

**Date & Time**: 2026-07-30 13:45 SGT  
**Module**: `polwel-backend` (`src/scripts/test-security-hardening.ts`)  
**Scope**: Remediation of TypeScript TS2339 build failure in CI/CD pipeline (`npm run build` / `tsc`).  
**Git Status**: **NOT COMMITTED OR PUSHED TO REMOTE** (per explicit user instruction).

---

## 1. Issue Summary & Root Cause Analysis

### Root Cause
During CI/CD pipeline execution (`npm run build` -> `tsc`), TypeScript compilation failed with error `TS2339`:

```text
src/scripts/test-security-hardening.ts(118,93): error TS2339: Property 'substring' does not exist on type 'string | string[]'.
  Property 'substring' does not exist on type 'string[]'.
Error: Process completed with exit code 1.
```

In Node.js HTTP header type definitions (`http.IncomingHttpHeaders`), headers can be defined as `string | string[] | undefined`. Invoking `.substring(0, 80)` directly on `healthRes.headers['content-security-policy']` caused a strict type mismatch when `tsc` compiled the codebase for production build.

---

## 2. Changes Made

### A. Safe Type Conversion for HTTP Headers
- **File**: [polwel-backend/src/scripts/test-security-hardening.ts](file:///c:/laragon/www/polwel/polwel-backend/src/scripts/test-security-hardening.ts#L112-L122)
- Added type guard `Array.isArray(...)` to handle both `string` and `string[]` header return values safely before string operations:

```typescript
const cspHeader = Array.isArray(healthRes.headers['content-security-policy'])
  ? healthRes.headers['content-security-policy'].join('; ')
  : healthRes.headers['content-security-policy'] || '';

console.log('  Content-Security-Policy:', cspHeader.substring(0, 80) + '...');
```

---

## 3. Verification & Build Results

1. **Backend Build (`npm run build`)**: `tsc` compiled cleanly and generated `dist/` with **0 errors**.
2. **Frontend Build (`npm run build`)**: Vite built production bundle in 31.47s with **0 errors**.
3. **Security Test Suite**: `npx tsx src/scripts/test-security-hardening.ts` passed 100% of security header and attack vector tests.
4. **Git Status**: **Uncommitted and unpushed** per user explicit instruction ("dont commit or push it yet").
