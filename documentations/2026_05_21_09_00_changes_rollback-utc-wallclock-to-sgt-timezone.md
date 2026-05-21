# Timezone Rollback: UTC Wall-Clock → Singapore Time (SGT)

**Date:** 2026-05-21  
**Status:** COMPLETE  
**DB Migration Required:** No  
**Affects:** Frontend display, backend import, backend services

---

## 1. Root Cause

A previous session introduced a **UTC wall-clock** storage strategy:

- Excel `9:00 AM` → stored as `T09:00:00Z` (literal wall-clock UTC)
- Display used `timeZone: 'UTC'` → `T09:00:00Z` showed as `09:00` ✓

**However,** all existing production data was stored using the **correct SGT→UTC convention:**
- `9:00 AM SGT` → stored as `T01:00:00Z` (subtract 8 hours)

So with the wall-clock UTC display code:
- `T01:00:00Z` + `timeZone:'UTC'` → displayed as `01:00` ❌ (client saw "01:00–09:00" instead of "09:00–17:00")

---

## 2. Correct Strategy (Implemented)

| Aspect | Approach |
|--------|----------|
| **Storage** | UTC representing SGT: `9 AM SGT` = `T01:00:00Z` |
| **Display** | `timeZone: 'Asia/Singapore'` → `T01:00:00Z` renders as `09:00` ✓ |
| **Import (Excel)** | Times treated as SGT, stored via `new Date("...T09:00:00+08:00")` → `T01:00:00Z` |
| **Form input** | Extract SGT value using `toSGTDateInputValue()` / `toSGTTimeInputValue()` |
| **Form submit** | Build via `buildSGTDatetime(date, time)` → `"${date}T${time}:00+08:00"` |

---

## 3. No Database Changes Needed

Existing records with `T01:00:00Z` are already the **correct** UTC representation of `9:00 AM SGT`. No data migration or modification was required.

---

## 4. Files Changed

### Backend

#### `polwel-backend/src/controllers/importController.ts`

- **`buildDatetime()` function:** Changed from `Date.UTC(y, mo, d, hours, minutes)` to:
  ```typescript
  const sgtStr = `${y}-${mo}-${d}T${hours}:${minutes}:00+08:00`;
  return new Date(sgtStr);
  ```
- **Default fallback hours:** Changed from `0` (midnight UTC) to `9` (09:00 SGT)
- **Learner import day boundaries:** Changed from `Date.UTC()` to:
  ```typescript
  const dayStart = new Date(`${sgtDateStr}T00:00:00+08:00`);
  const dayEnd   = new Date(`${sgtDateStr}T23:59:59.999+08:00`);
  ```
- **Course Run Learner 2 day boundaries:** Same SGT fix applied
- **`parseExcelDate()` comment:** Updated to reflect SGT strategy

#### `polwel-backend/src/services/emailService.ts`

- All `timeZone: 'UTC'` → `timeZone: 'Asia/Singapore'` (4 sections)
- `UTCTZ` const renamed to `SGT`
- `isSameDayLocal`, `isSameCalendarDay`, `isSameDay` comparisons use `Asia/Singapore`
- `formatDateWithDay`, `formatDateForSubject`, `formatTime` helpers updated

#### `polwel-backend/src/services/certificateService.ts`

- `isSameDay` comparison changed from `getUTCDate/Month/Year` to `.toLocaleDateString('en-CA', {timeZone:'Asia/Singapore'})`
- `SGT` const added
- All `timeZone: 'UTC'` → `timeZone: 'Asia/Singapore'`

#### `polwel-backend/src/controllers/courseRunController.ts`

- XLSX export (lines ~5436–5439): `timeZone: 'UTC'` → `timeZone: 'Asia/Singapore'`
- CSV export (lines ~6280–6284): same

---

### Frontend

#### `src/lib/date.ts`

Complete replacement of UTC helpers with SGT equivalents:

| Old (UTC) | New (SGT) | Purpose |
|-----------|-----------|---------|
| `formatDateUTC()` | `formatDateSGT()` | Format date in SGT |
| `formatTimeUTC()` | `formatTimeSGT()` | Format time in SGT |
| `formatDateTimeUTC()` | `formatDateTimeSGT()` | Format date+time in SGT |
| `toUTCDateInputValue()` | `toSGTDateInputValue()` | YYYY-MM-DD for input |
| `toUTCTimeInputValue()` | `toSGTTimeInputValue()` | HH:MM for input |
| `buildUTCDatetime()` | `buildSGTDatetime()` | Build ISO with +08:00 |

Legacy aliases kept for backward compatibility:
```typescript
export const formatDateUTC = formatDateSGT;
export const toUTCDateInputValue = toSGTDateInputValue;
// ...etc
```

Key implementation details:
- `buildSGTDatetime`: `"${dateStr}T${timeStr}:00+08:00"` (was `"...Z"`)
- `toSGTDateInputValue`: uses `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore' })` → `YYYY-MM-DD`
- `toSGTTimeInputValue`: uses `toLocaleTimeString('en-GB', { timeZone: 'Asia/Singapore', ... })`

#### `src/pages/CourseRunDetail.tsx`

- Import updated to use new SGT function names
- `initEditData` form init: `toUTCDateInputValue` → `toSGTDateInputValue`, `toUTCTimeInputValue` → `toSGTTimeInputValue`
- Duration string: `timeZone: "UTC"` → `timeZone: "Asia/Singapore"`
- Form submit: `buildUTCDatetime` → `buildSGTDatetime`
- Static display `<Input>` fields: `formatDateUTC` → `formatDateSGT`, `formatTimeUTC` → `formatTimeSGT`
- Second form init (line ~3154): `formatDateUTC` → `formatDateSGT`

#### `src/pages/CourseRuns.tsx`

- `const UTZ = { timeZone: "UTC" }` → `const SGT = { timeZone: "Asia/Singapore" }`
- All `...UTZ` spread → `...SGT`
- 6 inline `timeZone: "UTC"` → `timeZone: "Asia/Singapore"` (trainer approval, confirmation email, trainer email dialogs)

#### `src/pages/PostRunManagement.tsx`

- `const UTZ = { timeZone: "UTC" }` → `const SGT = { timeZone: "Asia/Singapore" }` in `formatDateRange()`
- All `...UTZ` spread → `...SGT`

#### `src/pages/Home.tsx`

- 2 occurrences: `timeZone: "UTC"` → `timeZone: "Asia/Singapore"` (course run export section)

#### `src/pages/reporting/QuarterDetailsDialog.tsx`

- 2 occurrences: `timeZone: "UTC"` → `timeZone: "Asia/Singapore"`

#### `src/lib/billingExport.ts`

- 1 occurrence: `timeZone: 'UTC'` → `timeZone: 'Asia/Singapore'`

#### `src/lib/consolidatedBillingExport.ts`

- 1 occurrence: `timeZone: 'UTC'` → `timeZone: 'Asia/Singapore'`

---

## 5. Verification

### TypeScript (Backend)
```bash
cd polwel-backend && npx tsc --noEmit
# Result: no errors
```

### Frontend Build
```bash
npm run build
# Result: ✓ built in 16.40s (3518 modules transformed, no TypeScript errors)
```

---

## 6. How to Verify Correct Display

For a course run with `startDatetime = "2025-01-15T01:00:00.000Z"` (stored UTC):

| Old (broken) | New (correct) |
|---|---|
| `timeZone:'UTC'` → `01:00` | `timeZone:'Asia/Singapore'` → `09:00` |

This matches how the data was originally entered: 9:00 AM SGT.

---

## 7. Import Fix Details

When importing course runs from Excel with a time cell value of `9.00` (representing 9:00 AM):

**Before (broken):**
```typescript
// Date.UTC(y, mo, d, 9, 0) = T09:00:00Z
// New imports stored as 09:00Z, old data was 01:00Z → inconsistent
```

**After (correct):**
```typescript
const sgtStr = `${y}-${mo}-${d}T09:00:00+08:00`;
const dt = new Date(sgtStr); // → T01:00:00Z
// Consistent with all existing production data
```
