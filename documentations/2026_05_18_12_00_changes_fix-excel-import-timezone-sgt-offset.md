# Fix: Excel Import Timezone SGT Offset

**Date:** 2026-05-18  
**File Changed:** `polwel-backend/src/controllers/importController.ts`  
**Impact:** Course run and learner XLSX imports now store correct Singapore Time (SGT UTC+8) values

---

## Problem

When importing course run data from an Excel file, all datetime values were stored +1 hour ahead of what was in the file.

**Example:**
- Excel file shows: `8:00 AM` start, `5:00 PM` end
- Database stored: `9:00 AM` / `6:00 PM`
- Singapore client sees the wrong times in the UI

**Root cause chain:**

1. **Server timezone is Indonesia (UTC+7)** — the development/production server's `process.env.TZ` / OS timezone is `Asia/Jakarta`.
2. **`buildDatetime` used `setHours()`** — which sets hours in the *local server timezone*, not UTC. So `setHours(8, 0, 0, 0)` on a bare date meant "8:00 AM Jakarta time" = `01:00 UTC`.
3. **Singapore client (UTC+8) reads 01:00 UTC as 09:00 SGT** — one hour ahead of the intended 08:00.
4. **Excel fractional time values not handled** — Excel stores time as a fractional day (e.g., `0.333333` for 8:00 AM). The old code passed this as a string to a regex that expected `HH:MM`, so fractional times fell back to midnight, compounding the error.

---

## Fixes Applied

### 1. `parseExcelDate` — UTC-based date parsing

**Old:**
```typescript
return new Date(d.y, d.m - 1, d.d); // local midnight (UTC+7 = wrong UTC)
```

**New:**
```typescript
return new Date(Date.UTC(d.y, d.m - 1, d.d)); // explicit UTC midnight
```

Also added robust string format support (ISO `YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`, `DD-MM-YYYY`) using `Date.UTC()` for each, and removed the unreliable `new Date(trimmed)` fallback.

For combined date+time Excel serials (fractional numbers ≥ 1), integer part is extracted with `Math.floor()` to get only the date component.

---

### 2. `buildDatetime` — SGT ISO string construction

**Old:**
```typescript
const result = new Date(date);
result.setHours(hours, minutes, 0, 0); // local server time — WRONG
return result;
```

**New:**
```typescript
const isoStr = `${y}-${pad(mo)}-${pad(d)}T${pad(hours)}:${pad(minutes)}:00+08:00`;
return new Date(isoStr); // explicit SGT offset — timezone-safe
```

JavaScript's `Date` constructor with an ISO string that includes `+08:00` converts to UTC correctly **regardless of the server's local timezone**. So `T08:00:00+08:00` always stores as `00:00 UTC`.

Also added handling for Excel fractional day times (e.g., `0.333333` → `08:00 AM`):
```typescript
if (typeof timeStr === 'number' && timeStr >= 0 && timeStr < 1) {
  const totalMinutes = Math.round(timeStr * 24 * 60);
  hours = Math.floor(totalMinutes / 60) % 24;
  minutes = totalMinutes % 60;
}
```

---

### 3. Learner import day boundaries — SGT-aware window

When importing learners, course runs are looked up by matching the Excel start date. The old code used `setHours(0,0,0,0)` / `setHours(23,59,59,999)` which created local-timezone boundaries.

**Old:**
```typescript
const dayStart = new Date(startDateRaw);
dayStart.setHours(0, 0, 0, 0);  // 00:00 UTC+7 = 17:00 prev day UTC — WRONG
const dayEnd = new Date(startDateRaw);
dayEnd.setHours(23, 59, 59, 999); // 23:59 UTC+7 = 16:59 UTC — WRONG
```

**New:**
```typescript
// startDateRaw is UTC midnight of the SGT calendar date (from parseExcelDate)
// SGT midnight = UTC - 8h; SGT 23:59:59 = UTC + 16h - 1ms
const dayStart = new Date(startDateRaw.getTime() - 8 * 60 * 60 * 1000);
const dayEnd = new Date(startDateRaw.getTime() + 16 * 60 * 60 * 1000 - 1);
```

This correctly finds all course runs that start on that calendar day in Singapore.

---

### 4. Course run update — `startDatetime` now included

When re-importing the same Excel file (upsert mode), the existing course run update payload previously omitted `startDatetime`, meaning old wrong times could never be corrected by re-import.

**Old:**
```typescript
data: {
  venueId, venueType, courseRunType, status, baseCourseFee,
  feeType, endDatetime, specifiedLocation, individualRegistrationRequired,
}
```

**New:**
```typescript
data: {
  startDatetime: startDatetime,  // <-- added
  venueId, venueType, courseRunType, status, baseCourseFee,
  feeType, endDatetime, specifiedLocation, individualRegistrationRequired,
}
```

This enables re-importing the same file to correct previously mis-stored times.

**Note on ±1 hour matching window:** The course run import finds existing records using a ±1 hour window around `startDatetime`. Old broken records stored at `01:00 UTC` (was 8:00 UTC+7) are still within the window of the corrected value `00:00 UTC` (8:00 SGT), so they will be found and updated on re-import.

---

### 5. Preview formatting — human-readable display

Two new helper functions added:

```typescript
/** Format fractional Excel time (e.g., 0.333333) or "HH:MM" string as "8:00 AM" */
function fmtTimeForPreview(value: unknown): string

/** Format Excel date serial or string as "DD/MM/YYYY" */
function fmtDateForPreview(value: unknown): string
```

Both `previewCourseRuns` and `previewLearners` now use these helpers instead of passing raw cell values as strings. This prevents preview tables from showing Excel serial numbers like `45671` or `0.333333` instead of readable date/time values.

---

## Verification

Logic smoke test (Node.js):
```
Input Excel time:   8:00 AM Singapore
Stored UTC:         2025-01-15T00:00:00.000Z
SGT display (UTC+8): 15/01/2025, 08:00:00   ✓
WIB display (UTC+7): 15/01/2025, 07:00:00   ✓ (no +1 ghost hour)
```

TypeScript: `npx tsc --noEmit` — no errors  
Frontend build: `npm run build` — success

---

## Summary

| Fix | Root Cause | Before | After |
|-----|-----------|--------|-------|
| `parseExcelDate` | `new Date(y, m, d)` = local midnight | UTC offset by 7h | `Date.UTC()` = true midnight |
| `buildDatetime` | `setHours()` = local timezone | 8:00 UTC+7 stored, SGT shows 9:00 | ISO `+08:00` string = 8:00 SGT always |
| Learner day boundaries | `setHours()` = local timezone | Wrong UTC window | SGT-relative window |
| Course run update | `startDatetime` missing in payload | Re-import couldn't fix times | Re-import now corrects times |
| Preview formatting | Raw Excel values passed as strings | Shows `45671`, `0.333` | Shows `15/01/2025`, `8:00 AM` |
