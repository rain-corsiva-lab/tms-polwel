# Changes: Microsoft Outlook Integration via Microsoft Graph API

**Date:** 2026-06-12 18:30 SGT  
**Author:** Antigravity  
**Goal:** Fix the SMTP authentication unsuccessful error when using Microsoft Outlook in local/development mode.

---

## 1. Problem Description

Standard SMTP connection to `smtp-mail.outlook.com` on port `587` fails with:
```
Invalid login: 535 5.7.139 Authentication unsuccessful, SmtpClientAuthentication is disabled for the Tenant.
```
This is because Microsoft blocks legacy SMTP AUTH at the tenant level for security reasons.

Since the tenant has already configured Microsoft Graph API credentials (`GRAPH_TENANT_ID`, `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET`, `GRAPH_MAIL_FROM_ADDRESS`), the modern Graph API should be used instead of SMTP in development. However, the legacy backend code restricted Graph API mode strictly to `process.env.NODE_ENV === 'Production'`.

---

## 2. Changes Made

### Configuration Update

#### `polwel-backend/.env`
- Set `MAIL_MAILER=outlook` to explicitly activate Outlook integration in development.
- Commented out the Gmail fallback configuration to prevent unintended SMTP fallbacks.

### Code Adjustments

#### `polwel-backend/src/services/emailService.ts`

1. **Updated `isGraphApiMode()`**:
   Modified the helper method to verify if Graph API credentials are set AND either `NODE_ENV === 'Production'` or `MAIL_MAILER` is set to `'outlook'`, `'graph'`, or `'microsoft'`:
   ```typescript
   private static isGraphApiMode(): boolean {
     const hasGraphCreds = !!(
       process.env.GRAPH_CLIENT_ID &&
       process.env.GRAPH_CLIENT_SECRET &&
       process.env.GRAPH_TENANT_ID &&
       process.env.GRAPH_MAIL_FROM_ADDRESS
     );
     if (!hasGraphCreds) return false;

     return (
       process.env.NODE_ENV === 'Production' ||
       process.env.MAIL_MAILER === 'outlook' ||
       process.env.MAIL_MAILER === 'graph' ||
       process.env.MAIL_MAILER === 'microsoft'
     );
   }
   ```

2. **Unified Transporter Setup (`getTransporter`)**:
   Changed the conditional initialization block to check `this.isGraphApiMode()` instead of hardcoded `process.env.NODE_ENV === "Production"`. This allows local development environment to load `AzureTransport` (Graph API) when configured.

3. **Dynamic Sender (`mailFromAddress`)**:
   Converted the static `mailFromAddress` property into a static getter:
   ```typescript
   private static get mailFromAddress(): string {
     return this.isGraphApiMode()
       ? process.env.GRAPH_MAIL_FROM_ADDRESS || 'noreply@polwel.org'
       : process.env.MAIL_FROM_ADDRESS || 'noreply@polwel.org';
   }
   ```
   This ensures that the correct sender email is used dynamically, avoiding initialization order issues.

---

## 3. Verification Details

1. **Build verification**:
   TypeScript compiled successfully without errors:
   ```bash
   npm run build
   ```

2. **Integration Test run**:
   Ran the following test script:
   ```bash
   $env:TEST_EMAIL="kukuhthewow@gmail.com"; node test-email-service.js
   ```
   - **Log Output**:
     ```
     📧 Initializing email service with Microsoft Graph API
        Tenant ID: f980d913***
        Client ID: b3ec3af4***
        From Email: pdcs_tms@polwel.org.sg
     ...
     📨 Attempting to send trainer setup email via transporter
     ✅ Graph API connection verified successfully
     ✅ Trainer setup email sent to kukuhthewow@gmail.com
        Message ID: graph-1781263400102-36ea0c38
        Response: 202 Accepted
     ```
   - **Result**: Successfully connected, retrieved modern OAuth2 access token, and sent the email via Graph API.
