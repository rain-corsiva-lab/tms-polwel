# Technical Documentation: Enforce Microsoft Graph API Email Always

* **Date & Time:** 1 July 2026, 16:00 (Local Time)
* **Title:** Enforce Microsoft Graph API Email Always
* **Author:** Antigravity AI Code Assistant

---

## 1. Goal Description
The objective of this task is to ensure the POLWEL backend application always uses the Microsoft Outlook Graph API for sending emails in all environments (local, staging, production) whenever the Microsoft Graph API credentials are configured in the environment variables.

Previously, the configuration logic only defaulted to Microsoft Graph API if the environment was explicitly set to `'Production'` (with a capital 'P') or `MAIL_MAILER` was set to `'outlook'`. On staging servers where `NODE_ENV` was set to lowercase `'production'` or other configurations were loaded, it would fall back to standard SMTP providers (e.g. Mailjet), resulting in delivery failure due to sender identity verification constraints.

---

## 2. Implemented Code Changes

### A. Backend - Email Service Helper

#### [emailService.ts](file:///c:/laragon/www/polwel/polwel-backend/src/services/emailService.ts)
* Simplified the `isGraphApiMode()` logic to return `true` whenever the required Microsoft Graph API credentials are set in the environment variables, bypassing any environment/mailer checks:
  ```diff
  -  private static isGraphApiMode(): boolean {
  -    const hasGraphCreds = !!(
  -      process.env.GRAPH_CLIENT_ID &&
  -      process.env.GRAPH_CLIENT_SECRET &&
  -      process.env.GRAPH_TENANT_ID &&
  -      process.env.GRAPH_MAIL_FROM_ADDRESS
  -    );
  -    if (!hasGraphCreds) return false;
  -
  -    return (
  -      process.env.NODE_ENV === 'Production' ||
  -      process.env.MAIL_MAILER === 'outlook' ||
  -      process.env.MAIL_MAILER === 'graph' ||
  -      process.env.MAIL_MAILER === 'microsoft'
  -    );
  -  }
  +  private static isGraphApiMode(): boolean {
  +    const hasGraphCreds = !!(
  +      process.env.GRAPH_CLIENT_ID &&
  +      process.env.GRAPH_CLIENT_SECRET &&
  +      process.env.GRAPH_TENANT_ID &&
  +      process.env.GRAPH_MAIL_FROM_ADDRESS
  +    );
  +    return hasGraphCreds;
  +  }
  ```

---

## 3. Verification Details
1. **Compilation Validation:** Ran `npm run build` in the `polwel-backend` project. The TypeScript compilation finished successfully with exit code 0.
2. **Graph API Connection Verification:** Ran a local test script verifying that with the credentials:
   * Client ID: `b3ec3af4-95f4-4ac3-a74a-17b01aa8c003`
   * Tenant ID: `f980d913-ead6-4e7f-bafe-805f0ddebcae`
   * Sender Email: `pdcs_tms@polwel.org.sg`
   The system successfully established a connection with Microsoft Graph API, validated the OAuth token, and resolved the transporter (`✅ Graph API connection verified successfully`).
3. **Email Delivery Success:** Sent a test MFA email to `kukuhthewow@gmail.com` using the Microsoft Graph API, which successfully completed with `Email send result: true`.
