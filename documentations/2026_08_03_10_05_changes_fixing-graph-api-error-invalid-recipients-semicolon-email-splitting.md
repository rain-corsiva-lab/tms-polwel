# Fixing Microsoft Graph API `ErrorInvalidRecipients` & Email Semicolon Splitting

**Date & Time**: 2026-08-03 10:05 SGT  
**Module**: `polwel-backend` (`emailService.ts`, `AzureTransport`, `courseRunController.ts`, `courseRunWorkflowService.ts`)  
**Scope**: Root cause analysis and resolution of Microsoft Graph API `ErrorInvalidRecipients` (HTTP 400) failure when dispatching course confirmation emails containing multiple or semicolon/comma-separated recipient email addresses.  
**Git Status**: **NOT COMMITTED OR PUSHED TO REMOTE** (per explicit user instruction).

---

## 1. Executive Summary & Root Cause Analysis

### Problem Description
In production, sending course confirmation emails for certain SPF course runs failed with the following Microsoft Graph API error:

```json
Failed to send email. Status: 400 - {"error":{"code":"ErrorInvalidRecipients","message":"At least one recipient is not valid., Recipient 'Jaymann_WONG@spf.gov.sg; Kimberly_PX_LIM@spf.gov.sg; LIM_Jian_Xiong@spf.gov.sg' is not resolved. All recipients must be resolved before a message can be submitted."}}
```

### Root Cause
1. **Unsplit Concatenated Email Strings**: Database learner records or import payloads contained multiple email addresses concatenated together with semicolons or commas (e.g. `'Jaymann_WONG@spf.gov.sg; Kimberly_PX_LIM@spf.gov.sg; LIM_Jian_Xiong@spf.gov.sg'`).
2. **Graph API Payload Format**: Microsoft Graph API requires each recipient address to be an individual item in the `toRecipients` / `ccRecipients` JSON array:
   ```json
   "toRecipients": [
     { "emailAddress": { "address": "jaymann_wong@spf.gov.sg" } },
     { "emailAddress": { "address": "kimberly_px_lim@spf.gov.sg" } },
     { "emailAddress": { "address": "lim_jian_xiong@spf.gov.sg" } }
   ]
   ```
   When `AzureTransport.send` received a single string containing `;` or `,` (or an array containing unsplit concatenated strings), it passed the raw string into `address: "Jaymann_WONG@spf.gov.sg; Kimberly_PX_LIM@spf.gov.sg; LIM_Jian_Xiong@spf.gov.sg"`. Microsoft Graph API treated the entire string including the semicolons as one invalid email address and rejected the payload.

---

## 2. Technical Solution & Changes Made

### 1. Robust Recipient Normalization Utility (`EmailService.normalizeEmailAddresses`)
- Added `EmailService.normalizeEmailAddresses(input: any): string[]` in [emailService.ts](file:///c:/laragon/www/polwel/polwel-backend/src/services/emailService.ts):
  - Accepts strings, arrays of strings, semicolon `;` or comma `,` delimited strings, or address objects (`{ address, email }`).
  - Splits concatenated email strings by `[;,]`.
  - Extracts valid email addresses via regex, trims whitespace, removes duplicates, and converts all addresses to lowercase for case-insensitive deduplication.

### 2. Transport-Level Hardening (`AzureTransport.send`)
- Updated `AzureTransport.send` in [emailService.ts](file:///c:/laragon/www/polwel/polwel-backend/src/services/emailService.ts) to automatically run `EmailService.normalizeEmailAddresses` on `to`, `cc`, and `bcc` before building Microsoft Graph API `toRecipients`, `ccRecipients`, and `bccRecipients` arrays.
- Guarantees that Graph API **ALWAYS** receives clean, individual recipient objects with 0 semicolons/commas in `address` fields.

### 3. Service & Logging Normalization (`sendLearnerCourseConfirmationEmail` & `sendTrainerAssignmentEmail`)
- Updated `sendLearnerCourseConfirmationEmail` and `sendTrainerAssignmentEmail` in [emailService.ts](file:///c:/laragon/www/polwel/polwel-backend/src/services/emailService.ts) to normalize `to` and `cc` recipients prior to building mail options and logging records into `email_logs`.

---

## 3. Verification & Empirical Test Results

### Automated Unit Test Suite (`test-recipient-normalization.ts`)
Executed `npx tsx src/scripts/test-recipient-normalization.ts` with 100% pass rate across all edge cases:

```text
================================================================
📧 TESTING RECIPIENT EMAIL NORMALIZATION & SPLITTING
================================================================

Test: Semicolon-delimited string (Production error case)
 Input:     Jaymann_WONG@spf.gov.sg; Kimberly_PX_LIM@spf.gov.sg; LIM_Jian_Xiong@spf.gov.sg
 Output:    [ 'jaymann_wong@spf.gov.sg', 'kimberly_px_lim@spf.gov.sg', 'lim_jian_xiong@spf.gov.sg' ]
 Count:    3 (Expected: 3) -> ✅ PASS

Test: Comma-delimited string
 Input:     Jaymann_WONG@spf.gov.sg, Kimberly_PX_LIM@spf.gov.sg, LIM_Jian_Xiong@spf.gov.sg
 Output:    [ 'jaymann_wong@spf.gov.sg', 'kimberly_px_lim@spf.gov.sg', 'lim_jian_xiong@spf.gov.sg' ]
 Count:    3 (Expected: 3) -> ✅ PASS

Test: Array containing concatenated semicolon strings
 Input:     [ 'Jaymann_WONG@spf.gov.sg; Kimberly_PX_LIM@spf.gov.sg', 'LIM_Jian_Xiong@spf.gov.sg' ]
 Output:    [ 'jaymann_wong@spf.gov.sg', 'kimberly_px_lim@spf.gov.sg', 'lim_jian_xiong@spf.gov.sg' ]
 Count:    3 (Expected: 3) -> ✅ PASS

Test: Name + angle brackets format
 Input:     Jaymann WONG <Jaymann_WONG@spf.gov.sg>; Lim Jian Xiong <LIM_Jian_Xiong@spf.gov.sg>
 Output:    [ 'jaymann_wong@spf.gov.sg', 'lim_jian_xiong@spf.gov.sg' ]
 Count:    2 (Expected: 2) -> ✅ PASS

Test: Duplicates and trailing spaces
 Input:     Jaymann_WONG@spf.gov.sg; JAYMANN_WONG@SPF.GOV.SG ;  Kimberly_PX_LIM@spf.gov.sg 
 Output:    [ 'jaymann_wong@spf.gov.sg', 'kimberly_px_lim@spf.gov.sg' ]
 Count:    2 (Expected: 2) -> ✅ PASS

================================================================
🎉 ALL RECIPIENT NORMALIZATION TESTS PASSED SUCCESSFULLY!
================================================================
```

- **Backend TypeScript Compilation (`npx tsc --noEmit`)**: Clean build with **0 errors**.
- **Backend Production Build (`npm run build`)**: Clean build with **0 errors**.
- **Git Status**: **Uncommitted and unpushed** per user instruction ("dont commit or push it yet").
