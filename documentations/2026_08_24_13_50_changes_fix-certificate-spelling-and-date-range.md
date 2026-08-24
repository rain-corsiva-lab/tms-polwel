# Certificate Spelling & Date Consistency Fixes in Completion Emails and TMS

**Date**: August 24, 2026  
**Status**: Implemented & Verified Locally (Pending Review / Commit / Push)

---

## 1. Executive Summary & Root Cause Analysis

### Issue 1: Certificate Duration Spelling ("2-day" instead of "2-days")
- **PM Observation**: 
  - *"1. spelling: 2-day instead of 2-days for 2 day courses"*
  - Showing image of Certificate of Participation with text: `"Having successfully completed the 2-days course"`
- **Root Cause**:
  - In `polwel-backend/src/services/certificateService.ts` (`generateCertificateHTML`), the duration formatting logic was:
    ```typescript
    const durationNum = Number(data.duration);
    const baseType = data.durationType.toLowerCase().trim().replace(/s$/, '');
    const durationTypeFormatted = durationNum === 1 ? baseType : baseType + 's';
    const durationText = `${data.duration}-${durationTypeFormatted}`.trim();
    ```
  - For a 2-day course, `durationNum` was 2, which appended `'s'`, resulting in `2-days` (`"Having successfully completed the 2-days course"`).
  - In English grammar, when a duration acts as a compound modifier preceding a noun (e.g. `"2-day course"`, `"1-day course"`, `"3-day course"`, `"4-hour course"`), the unit noun is singular.
- **Fix Applied**:
  - Updated `generateCertificateHTML` to always use the singular normalized base unit (`baseType`, e.g. `day`, `hour`, `month`) when creating the hyphenated compound adjective before `"course"`, ensuring correct grammar across all durations (`1-day`, `2-day`, `3-day`, `4-hour`, `0.5-day`, etc.).

---

### Issue 2: Certificate Date Discrepancy Between Email Attachment and TMS Download
- **PM Observation**: 
  - *"2. certificate attached in course completion email is different from the one in the TMS."*
  - *"3. in email --> only shows 1 date"*
  - *"4. in system --> shows 2 dates inclusive"*
- **Root Cause**:
  - In `polwel-backend/src/controllers/courseRunController.ts` within the `sendCertificatesToLearners` handler (line 6229):
    ```typescript
    const certData = {
      learnerName: learner?.fullname || 'Learner',
      courseName: courseRun.course?.title || 'POLWEL Course',
      duration: Number(courseRun.course?.duration) || 1,
      durationType: courseRun.course?.durationType || 'days',
      endDate: courseRun.endDatetime ? new Date(courseRun.endDatetime) : new Date(),
      courseCode: courseRun.course?.courseCode ?? '',
    };
    certPdfBuffer = await buildCertificatePDFBuffer(certData);
    ```
  - `startDate` was completely missing from `certData` when generating the attached certificate PDF in `sendCertificatesToLearners`.
  - Consequently, `certificateService.ts` received `startDate: undefined` and fell back to formatting only `endDate` (e.g. `21 AUGUST 2026`).
  - Meanwhile, downloading single certificates (`generateCertificatePDF`) or bulk ZIPs (`generateCertificatesZIP`) in TMS passed `startDate: new Date(courseRun.startDatetime)`, which formatted as a multi-day range (e.g. `20 AUGUST - 21 AUGUST 2026`).
- **Fix Applied**:
  - Passed `startDate: courseRun.startDatetime ? new Date(courseRun.startDatetime) : undefined` into `certData` across `sendCertificatesToLearners` in `courseRunController.ts`.
  - Added robust date parsing and validation in `certificateService.ts` to cleanly format multi-day ranges (`startDate - endDate`) or single-day events (`endDate`) across both email attachments and TMS downloads.

---

## 2. Modified Files Summary

| File | Changes |
| :--- | :--- |
| `polwel-backend/src/services/certificateService.ts` | • Fixed duration compound modifier to use singular unit (`${durationVal}-${baseType}`, e.g. `2-day`, `1-day`).<br>• Enhanced date parsing and validation for multi-day inclusive ranges vs single-day courses. |
| `polwel-backend/src/controllers/courseRunController.ts` | • Added `startDate` to `certData` in `sendCertificatesToLearners` so certificate PDFs attached to emails match TMS downloads.<br>• Ensured safe null/undefined start date handling in `generateCertificatePDF`, `generateCertificatesZIP`, and `downloadCertificatePublic`. |

---

## 3. Verification & Build Integrity

- **Automated Formatting Test (`ts-node`)**:
  - Tested 2-day course: `"Having successfully completed the 2-day course"` & `"20 AUGUST - 21 AUGUST 2026"` $\rightarrow$ **PASS**
  - Tested 1-day course: `"Having successfully completed the 1-day course"` & `"20 AUGUST 2026"` $\rightarrow$ **PASS**
- **Backend Typecheck**: `polwel-backend/` (`npx tsc --noEmit`) $\rightarrow$ **0 errors (PASSED)**
- **Frontend Production Build**: Root workspace (`npm run build`) $\rightarrow$ **Clean build (PASSED)**
