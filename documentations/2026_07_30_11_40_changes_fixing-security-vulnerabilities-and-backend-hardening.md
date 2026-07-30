# Backend Security Hardening & Vulnerability Remediation (Qualys WAS Audit)

**Date & Time**: 2026-07-30 11:40 SGT  
**Module**: `polwel-backend` (`notFound.ts`, `errorHandler.ts`, `auth.ts`, `passwordReset.ts`, `userSetup.ts`, `index.ts`, `validate.ts`, `authSchemas.ts`, `asyncHandler.ts`)  
**Scope**: Qualys WAS Security Scan remediation for CWE-79 / QID 150084 (Reflected XSS), QID 150042 (HTTP 500 Unhandled Exception on Auth Routes), Security Headers & CSP Configuration, and Frontend React Audit.

---

## 1. Executive Summary

To pass the Qualys WAS Security Audit and protect the POLWEL Training Management System from unauthorized access, reflected XSS, and unhandled exception crashes, the Express backend and React frontend underwent comprehensive security patching:

1. **Eliminated Reflected XSS (CWE-79 / QID 150084)**: Standardized the Express 404 route handler to return a static JSON error payload with zero reflected user input. Added HTML entity escaping (`sanitizeHtmlString`) to global error handling middleware.
2. **Fixed HTTP 500 Exception Handling on Auth Routes (QID 150042)**: Integrated Zod schema validation middleware (`validateBody`) and `asyncHandler` wrappers across all authentication endpoints (`/login`, `/mfa/verify`, `/mfa/resend`, `/refresh`, `/forgot-password`, `/reset-password`, `/onboarding`). All malformed payloads, invalid types, and non-JSON inputs return structured `400 Bad Request` or `422 Unprocessable Entity` responses (zero 500 crashes).
3. **Hardened Security Headers & Content Security Policy (CSP)**: Configured Helmet with `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 0`, and strict Content Security Policy directives.
4. **Audited Frontend React Components**: Confirmed no API error responses use `dangerouslySetInnerHTML`. All error messages are rendered safely inside JSX text nodes.

---

## 2. Technical Implementation Details

### A. Task 1: 404 Route & Global Error Handler Hardening (QID 150084)
- **File**: [polwel-backend/src/middleware/notFound.ts](file:///c:/laragon/www/polwel/polwel-backend/src/middleware/notFound.ts)
  - Updated `notFound` middleware to return static 404 JSON response without echoing `req.originalUrl` or `req.path`:
    ```typescript
    export const notFound = (req: Request, res: Response, _next: NextFunction): void => {
      res.status(404).json({
        success: false,
        error: 'Resource or endpoint not found',
        code: 'NOT_FOUND',
      });
    };
    ```
- **File**: [polwel-backend/src/middleware/errorHandler.ts](file:///c:/laragon/www/polwel/polwel-backend/src/middleware/errorHandler.ts)
  - Implemented `sanitizeHtmlString` helper to escape special characters (`&`, `<`, `>`, `"`, `'`, `/`):
    ```typescript
    export function sanitizeHtmlString(str: string): string {
      if (typeof str !== 'string') return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    ```
  - Applied HTML entity escaping to `responseBody.error` and stripped stack traces in production.

### B. Task 2: Input Validation & Unhandled Exception Handling (QID 150042)
- **Validation Middleware**: Created [polwel-backend/src/middleware/validate.ts](file:///c:/laragon/www/polwel/polwel-backend/src/middleware/validate.ts) to intercept incoming request bodies before reaching controller logic. Non-object, missing, or malformed payloads return `400 Bad Request`.
- **Zod Schemas**: Created [polwel-backend/src/schemas/authSchemas.ts](file:///c:/laragon/www/polwel/polwel-backend/src/schemas/authSchemas.ts) covering `loginSchema`, `mfaVerifySchema`, `mfaResendSchema`, `refreshTokenSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, and `onboardingSchema`.
- **Async Handler**: Created [polwel-backend/src/middleware/asyncHandler.ts](file:///c:/laragon/www/polwel/polwel-backend/src/middleware/asyncHandler.ts) to route uncaught promise rejections directly to the global error middleware.
- **Routes Protection**: Updated [auth.ts](file:///c:/laragon/www/polwel/polwel-backend/src/routes/auth.ts), [passwordReset.ts](file:///c:/laragon/www/polwel/polwel-backend/src/routes/passwordReset.ts), and [userSetup.ts](file:///c:/laragon/www/polwel/polwel-backend/src/routes/userSetup.ts).

### C. Task 3: Security Headers & CSP Configuration
- **File**: [polwel-backend/src/index.ts](file:///c:/laragon/www/polwel/polwel-backend/src/index.ts)
  - Configured `helmet`:
    - `noSniff: true` -> `X-Content-Type-Options: nosniff`
    - `frameguard: { action: 'deny' }` -> `X-Frame-Options: DENY`
    - `xssFilter: false` + `res.setHeader('X-XSS-Protection', '0')` -> Disables legacy browser filter in favor of strict CSP.

### D. Task 4: Frontend React Audit
- Audited [src/lib/errorHandler.ts](file:///c:/laragon/www/polwel/src/lib/errorHandler.ts) and UI components.
- Confirmed zero use of `dangerouslySetInnerHTML` for API error strings. All error messages are safely rendered as text nodes in React JSX.

---

## 3. Empirical Test Results

| Test # | Attack / Test Scenario | Endpoint / Header | Expected Result | Actual Result | Status |
|:---:|:---|:---|:---:|:---:|:---:|
| **1** | **Reflected XSS Attack** | `GET /api/auth/login?"><script>alert(1)</script>` | HTTP 404 JSON, 0 unescaped `<script>` | `404` (`{"success":false,"error":"Resource or endpoint not found"}`) | ✅ **PASS** |
| **2a** | **Malformed Body: Empty Object** | `POST /api/auth/login` (`{}`) | HTTP 400 Bad Request | `400` (`"Validation error: email: Email is required..."`) | ✅ **PASS** |
| **2b** | **Malformed Body: Invalid Email** | `POST /api/auth/login` (`email: "abc"`) | HTTP 400 Bad Request | `400` (`"Validation error: email: Invalid email address format"`) | ✅ **PASS** |
| **2c** | **Malformed Body: Non-String Email** | `POST /api/auth/login` (`email: []`) | HTTP 400 Bad Request | `400` (`"Validation error: email: Expected string, received array"`) | ✅ **PASS** |
| **2d** | **Malformed Body: Non-JSON String** | `POST /api/auth/login` (`"raw_string"`) | HTTP 400 Bad Request | `400` (`"Unexpected token..."`) | ✅ **PASS** |
| **3a** | **MIME Sniffing Header** | `X-Content-Type-Options` | `nosniff` | `nosniff` | ✅ **PASS** |
| **3b** | **Clickjacking Header** | `X-Frame-Options` | `DENY` | `DENY` | ✅ **PASS** |
| **3c** | **XSS Header** | `X-XSS-Protection` | `0` | `0` | ✅ **PASS** |

---

## 4. Verification

- **Backend TypeScript Compilation**: `npx tsc --noEmit` in `polwel-backend` passed with **0 errors**.
- **Frontend TypeScript Compilation**: `npx tsc --noEmit` in root passed with **0 errors**.
