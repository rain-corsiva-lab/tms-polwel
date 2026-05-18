# Fix: Excel Import Datetime — UTC Wall-Clock Storage

**Date:** 2026-05-18  
**Type:** Bug Fix — Full Stack (Import / Storage / Display)

---

## Problem

Course run `startDatetime` and `endDatetime` imported from Excel were shifted by the server's UTC offset.

**Root cause:** The old `buildDatetime` function called `setHours()` which applies the **server's local timezone** (Indonesia UTC+7). So Excel `8:00 AM` was stored as `T01:00:00.000Z` (UTC midnight+1). Singapore clients then displayed `09:00 SGT` — one hour too late.

A prior attempt stored the value as `T08:00:00+08:00` (SGT offset), which converts to `T00:00:00Z` — effectively midnight UTC — still wrong.

---

## Solution: Wall-Clock UTC Storage

Store the Excel time value **literally** in UTC with no timezone conversion. Excel `8:00 AM` → `T08:00:00.000Z`. All display code uses `timeZone: 'UTC'` so the rendered value always matches the stored value, regardless of where the server or browser runs.

### Key principle

> Never convert course run datetimes between timezones. Store as UTC wall-clock, display as UTC wall-clock.

---

## Changes by File

### `polwel-backend/src/controllers/importController.ts`

**`buildDatetime` function** — Changed from local `setHours()` to `Date.UTC()`:

```typescript
// BEFORE: applied server local timezone
date.setHours(hours, minutes, 0, 0);
return date;

// AFTER: pure UTC — Excel "08:00" → T08:00:00.000Z
const y = date.getUTCFullYear();
const mo = date.getUTCMonth();
const d = date.getUTCDate();
return new Date(Date.UTC(y, mo, d, hours, minutes, 0, 0));
```

**`parseExcelDate` function** — Returns `Date.UTC()` midnight (UTC calendar date from Excel serial number). No change needed in this session; was fixed in previous session.

**Learner day boundaries** — Changed from local date methods to UTC:

```typescript
// AFTER: pure UTC day range [00:00Z, 23:59:59.999Z]
const y = startDateRaw.getUTCFullYear();
const mo = startDateRaw.getUTCMonth();
const day = startDateRaw.getUTCDate();
const dayStart = new Date(Date.UTC(y, mo, day, 0, 0, 0, 0));
const dayEnd   = new Date(Date.UTC(y, mo, day, 23, 59, 59, 999));
```

---

### `src/lib/date.ts`

Six new UTC utility functions added:

| Function | Purpose |
|---|---|
| `formatDateUTC(d)` | `DD/MM/YYYY` using UTC components |
| `formatTimeUTC(d)` | `HH:MM` 24h using UTC components |
| `formatDateTimeUTC(d)` | `DD/MM/YYYY HH:MM` using UTC components |
| `toUTCDateInputValue(d)` | `YYYY-MM-DD` for `<input type="date">` |
| `toUTCTimeInputValue(d)` | `HH:MM` for `<input type="time">` |
| `buildUTCDatetime(dateStr, timeStr)` | Combines date/time into ISO UTC string: `"${dateStr}T${timeStr}:00Z"` |

---

### `src/pages/CourseRunDetail.tsx`

- **`initEditData`:** Changed from `getFullYear()/getMonth()/getDate()` to `toUTCDateInputValue()` / `toUTCTimeInputValue()` so the form fields show the stored wall-clock value.
- **Form submission:** Changed from `new Date(\`${date}T${time}\`)` (local time parse) to `buildUTCDatetime(date, time)` which appends `Z` directly.
- **Static display:** Changed from `toLocaleDateString("en-GB")` to `formatDateUTC()` / `formatTimeUTC()`.
- **Header metadata and courseRunDetails prop:** Added `{ timeZone: 'UTC' }` to all `Intl.DateTimeFormat` / `toLocaleDateString` calls.

---

### `src/pages/CourseRuns.tsx`

- **`formatRange` function:** Added `const UTZ = { timeZone: 'UTC' } as const` and applied to all `toLocaleDateString` / `toLocaleTimeString` calls. Same-day comparison uses UTC-aware date string.
- **Trainer approval dialog, confirmation email dialog, trainer email dialog:** Added `{ timeZone: 'UTC' }` to all date format calls.

---

### `src/pages/PostRunManagement.tsx`

- **`formatDateRange` function:** Rewritten with `const UTZ = { timeZone: 'UTC' } as const` applied to all date/time formatting.

---

### `src/pages/Home.tsx`

- Course run export: added `{ timeZone: 'UTC' }` to `toLocaleDateString("en-GB")` calls.

---

### `src/pages/reporting/QuarterDetailsDialog.tsx`

- Export date columns: added `{ timeZone: 'UTC' }` to both `toLocaleDateString("en-GB")` calls.

---

### `src/lib/billingExport.ts` and `src/lib/consolidatedBillingExport.ts`

- Date range display in billing exports: added `{ timeZone: 'UTC' }` to `toLocaleDateString('en-GB')` calls.

---

### `polwel-backend/src/services/emailService.ts`

Changed all course run date/time formatting from `timeZone: 'Asia/Singapore'` to `timeZone: 'UTC'` in:

- **`buildTrainerAssignmentEmailHtml`** — `formatDate` (weekday/day/month/year) and `formatTime` (start/end HH:MM).
- **`buildLearnerCourseConfirmationEmailHtml`** — `isSameDayLocal` comparison, `formatDateWithDay`, `formatDateForSubject`, `formatTime` (including registration time offset).
- **`buildCertificateIssuanceEmailHtml`** — `formatDate` (day/month/year), `isSameCalendarDay` comparison.
- **`buildCourseCompletionEmailHtml`** — `SGT` constant renamed to `UTCTZ`, `formatDateFull`, `isSameDay`.

> **Did NOT change:** Waiver notification and waiver review emails. Those format `submissionDate` (an admin wall-clock timestamp in local time) and must remain as-is.

---

### `polwel-backend/src/services/certificateService.ts`

- **`isSameDay` comparison:** Changed from `getDate()/getMonth()/getFullYear()` to `getUTCDate()/getUTCMonth()/getUTCFullYear()`.
- **`toLocaleDateString` calls:** Added `timeZone: 'UTC'` to start and end date formatting for certificate date range text.

---

### `polwel-backend/src/controllers/courseRunController.ts`

- **XLSX participants export (lines ~5436–5439):** Added `timeZone: 'UTC'` to `toLocaleDateString` and `toLocaleTimeString` for start/end date and time columns.
- **CSV export (lines ~6280–6284):** Added `{ timeZone: 'UTC' }` to `toLocaleDateString('en-GB')` for start/end date columns.

---

## Verification

**Smoke test:**

| Step | Value |
|---|---|
| Excel input | `8:00 AM` |
| Stored UTC | `2025-01-15T08:00:00.000Z` |
| Frontend display (UTC tz) | `08:00` ✓ |
| Email display (UTC tz) | `0800 hrs` ✓ |
| Certificate display (UTC tz) | `15 JANUARY 2025` ✓ |

**Build checks:**
- `cd polwel-backend && npx tsc --noEmit` — no errors ✓
- `npm run build` — builds successfully ✓

---

## Re-importing Existing Records

If previously imported records have wrong times stored, re-import the same Excel file. The update path in `importController.ts` includes `startDatetime` and `endDatetime` in the Prisma `update` payload, so existing course runs will be corrected.

---

## Do Not Revert

Do **not** revert any `timeZone: 'UTC'` change in course run date formatting. The storage strategy is now wall-clock UTC. Reverting to local timezone methods or `Asia/Singapore` will cause dates to shift again.
