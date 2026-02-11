# Venue Fee Restoration & Capacity Sync Fix

## Issues Fixed

### Issue 1: Venue Fee Not Restoring When Switching from Partners to Trainers
**Problem:** When switching from partner scenario (venue fee = $0) back to trainer scenario, the venue fee remained $0 instead of being restored from course data.

**Root Cause:** The fee sync logic only set `venueFee = 0` for partners but didn't restore it for trainers.

**Solution:** Added logic to restore venue fee from course data when trainers are selected (no partners).

### Issue 2: Capacity Fields Not Syncing from Course Data
**Problem:** `venueMaxParticipant` and `perHeadFeeIfMaxExceed` were not being synchronized from course data on every save.

**Root Cause:** These fields were only loaded initially but never synced back from course data on save operations.

**Solution:** Always sync these fields from course data on every save (unless course run status is locked).

### Issue 3: Capacity Cost Calculation Not Working
**Problem:** The calculation for additional costs when capacity is exceeded wasn't working properly.

**Root Cause:** 
1. Values weren't being loaded correctly from course data
2. No debugging output to verify calculations
3. Fields weren't being synced properly

**Solution:** 
1. Added proper state management for all course-level capacity fields
2. Added console logging for debugging
3. Implemented automatic sync on every save operation

## Implementation Details

### Frontend Changes (`/polwel/src/pages/CourseRunDetail.tsx`)

#### 1. Added Course Venue Fee State (Line ~189)
```typescript
const [courseVenueFee, setCourseVenueFee] = useState<number>(0); // Store course venue fee for trainer scenario
```

This stores the venue fee from the course definition so it can be restored when switching from partners to trainers.

#### 2. Load Course Venue Fee (Lines ~955-958)
```typescript
// Store course venue fee for trainer scenario
if (course && course.venueFee !== undefined) {
  setCourseVenueFee(Number(course.venueFee) || 0);
}
```

Fetches and stores the course venue fee when loading trainers and partners.

#### 3. Added Debug Logging (Lines ~959-966)
```typescript
console.log('Course data loaded:', {
  contractFees: course.contractFees,
  venueFee: course.venueFee,
  venueMaxParticipants: course.venueMaxParticipants,
  perHeadPriceIfMaxExceed: course.perHeadPriceIfMaxExceed,
});
```

Helps troubleshoot by showing what values are loaded from course data.

#### 4. Enhanced Capacity Calculation with Logging (Lines ~1068-1085)
```typescript
// Calculate additional cost exceeding capacity
const enrolledCount = courseRun.courseRunLearners?.filter((l) => l.enrollmentStatus === "ENROLLED").length || 0;
let additionalCostExceedingCapacity = 0;

console.log('Capacity calculation:', {
  enrolledCount,
  courseVenueMaxParticipants,
  coursePerHeadIfMaxExceed,
});

if (courseVenueMaxParticipants && coursePerHeadIfMaxExceed && enrolledCount > courseVenueMaxParticipants) {
  const exceededCount = enrolledCount - courseVenueMaxParticipants;
  additionalCostExceedingCapacity = exceededCount * coursePerHeadIfMaxExceed;
  console.log('Capacity exceeded:', {
    exceededCount,
    additionalCostExceedingCapacity,
  });
}
```

Adds detailed logging to help troubleshoot capacity calculations.

#### 5. Venue Fee Restoration Logic (Lines ~1098-1106)
```typescript
// Venue fee logic:
// - If partners selected: set to 0 (included in contract fees)
// - If trainers selected: restore from course data
if (hasSelectedPartners) {
  feeUpdates.venueFee = 0;
} else {
  // Restore venue fee from course for trainer scenario
  feeUpdates.venueFee = courseVenueFee;
}
```

**Key Change:** Now restores venue fee when switching back to trainer scenario.

#### 6. Automatic Capacity Field Sync (Lines ~1108-1118)
```typescript
// Always sync capacity fields from course data (unless locked status)
const isLockedStatus = courseRun.status && ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'INCOMPLETED'].includes(courseRun.status);
if (!isLockedStatus) {
  if (courseVenueMaxParticipants !== null) {
    feeUpdates.venueMaxParticipant = courseVenueMaxParticipants;
  }
  if (coursePerHeadIfMaxExceed !== null) {
    feeUpdates.perHeadFeeIfMaxExceed = coursePerHeadIfMaxExceed;
  }
}
```

**Automatic Sync:** On every save, capacity fields are synchronized from course data (unless status is locked).

#### 7. Enhanced Success Message (Lines ~1123-1130)
```typescript
const feeMessage = hasSelectedPartners 
  ? "(Venue fee set to $0 - included in contract fees)" 
  : courseVenueFee > 0 
    ? `(Venue fee restored to $${courseVenueFee})` 
    : "";
toast.success(`Assignments and fees updated successfully! ${feeMessage}`);
```

Shows different messages based on scenario:
- Partners: "Venue fee set to $0 - included in contract fees"
- Trainers: "Venue fee restored to $XXX"

## Business Logic

### Venue Fee Rules
```
IF (partners selected AND not locked status) THEN
  venueFee = 0  // Included in contract fees
ELSE IF (trainers selected AND not locked status) THEN
  venueFee = course.venueFee  // Restore from course
END
```

### Capacity Field Sync Rules
```
IF (NOT locked status) THEN
  venueMaxParticipant = course.venueMaxParticipants
  perHeadFeeIfMaxExceed = course.perHeadPriceIfMaxExceed
END

Locked statuses: CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, INCOMPLETED
```

### Additional Cost Calculation
```
enrolledCount = COUNT(courseRunLearners WHERE enrollmentStatus = 'ENROLLED')

IF (enrolledCount > venueMaxParticipant AND perHeadFeeIfMaxExceed > 0) THEN
  exceededCount = enrolledCount - venueMaxParticipant
  additionalCostExceedingCapacity = exceededCount × perHeadFeeIfMaxExceed
ELSE
  additionalCostExceedingCapacity = 0
END
```

## User Workflow Examples

### Scenario A: Switch from Partners to Trainers

**Initial State:**
- Partners selected
- Venue fee: $0
- Max capacity: 20 (from course)
- Per head if exceed: $50 (from course)

**User Action:** Untick partners, tick trainers, click Save

**Result:**
- Venue fee: **$800** (restored from course)
- Contract fees: **$500** (calculated from trainer fees)
- Max capacity: **20** (synced from course)
- Per head if exceed: **$50** (synced from course)
- Toast: "Assignments and fees updated successfully! (Venue fee restored to $800)"

### Scenario B: Switch from Trainers to Partners

**Initial State:**
- Trainers selected
- Venue fee: $800
- Contract fees: $500 (trainer total)

**User Action:** Untick trainers, tick partners, click Save

**Result:**
- Venue fee: **$0** (zeroed because included in contract)
- Contract fees: **$540** (from course contract fees)
- Max capacity: **20** (synced from course)
- Per head if exceed: **$50** (synced from course)
- Toast: "Assignments and fees updated successfully! (Venue fee set to $0 - included in contract fees)"

### Scenario C: Capacity Exceeded with Trainers

**Course Setup:**
- Max capacity: 20
- Per head if exceed: $50
- Venue fee: $800

**Course Run State:**
- Enrolled: 25 participants
- Trainers selected with $500 total fees

**Calculation on Save:**
1. `enrolledCount = 25`
2. `exceededCount = 25 - 20 = 5`
3. `additionalCostExceedingCapacity = 5 × $50 = $250`

**Result:**
- Contract fees: $500
- Venue fee: $800
- Additional cost: **$250**
- Total expenses: $500 + $800 + $250 = **$1,550**

### Scenario D: Capacity Exceeded with Partners

**Course Setup:**
- Contract fees: $540 (includes trainer + venue)
- Max capacity: 20
- Per head if exceed: $50

**Course Run State:**
- Enrolled: 25 participants
- Partners selected

**Calculation on Save:**
1. `enrolledCount = 25`
2. `exceededCount = 25 - 20 = 5`
3. `additionalCostExceedingCapacity = 5 × $50 = $250`

**Result:**
- Contract fees: $540 (from course)
- Venue fee: **$0** (included in contract)
- Additional cost: **$250**
- Total expenses: $540 + $0 + $250 = **$790**

## Debugging Guide

### How to Verify the Fix is Working

1. **Open Browser Console** (F12 → Console tab)

2. **Load a course run** - You should see:
```
Course data loaded: {
  contractFees: 540,
  venueFee: 800,
  venueMaxParticipants: 20,
  perHeadPriceIfMaxExceed: 50
}
```

3. **Save trainer assignments** - You should see:
```
Capacity calculation: {
  enrolledCount: 25,
  courseVenueMaxParticipants: 20,
  coursePerHeadIfMaxExceed: 50
}

Capacity exceeded: {
  exceededCount: 5,
  additionalCostExceedingCapacity: 250
}

Fee updates to be saved: {
  contractFees: 500,
  additionalCostExceedingCapacity: 250,
  venueFee: 800,
  venueMaxParticipant: 20,
  perHeadFeeIfMaxExceed: 50
}
```

### Troubleshooting Capacity Calculation

**If additional cost is still $0:**

1. **Check course data** - Verify these fields are set in course:
   - `venueMaxParticipants` (must be > 0)
   - `perHeadPriceIfMaxExceed` (must be > 0)

2. **Check enrolled count** - Must be > `venueMaxParticipants`
   - Only counts `enrollmentStatus = 'ENROLLED'`
   - Excludes withdrawn participants

3. **Check console logs** - Look for:
   ```
   Capacity calculation: { enrolledCount: X, courseVenueMaxParticipants: Y, coursePerHeadIfMaxExceed: Z }
   ```

4. **Check locked status** - Capacity fields won't sync if status is:
   - CONFIRMED
   - IN_PROGRESS
   - COMPLETED
   - CANCELLED
   - INCOMPLETED

## Database Schema Reference

### Course Table
```prisma
model Course {
  contractFees            Float    @default(0)      // For partner scenario
  venueFee                Float?                     // For trainer scenario (RESTORED)
  venueMaxParticipants    Int?                       // Capacity threshold (SYNCED)
  perHeadPriceIfMaxExceed Decimal? @db.Decimal(10,2) // Per head fee (SYNCED)
  // ... other fields
}
```

### CourseRun Table
```prisma
model CourseRun {
  contractFees                   Float?   // Partner contract OR trainer total
  venueFee                       Float?   // From course (0 for partners, course.venueFee for trainers)
  venueMaxParticipant            Int?     // Synced from course.venueMaxParticipants
  perHeadFeeIfMaxExceed          Float?   // Synced from course.perHeadPriceIfMaxExceed
  additionalCostExceedingCapacity Float?  // Auto-calculated from capacity rules
  status                         String   // Determines if fields are locked
  // ... other fields
}
```

## API Endpoint

### PUT `/api/course-runs/:id`
Updates course run with synchronized fee object:

```typescript
{
  contractFees: number,              // Partner contract OR trainer total
  venueFee: number,                  // 0 for partners, course.venueFee for trainers
  additionalCostExceedingCapacity: number,  // Auto-calculated
  venueMaxParticipant?: number,      // Synced from course (if not locked)
  perHeadFeeIfMaxExceed?: number     // Synced from course (if not locked)
}
```

## Files Modified

1. **`/polwel/src/pages/CourseRunDetail.tsx`**
   - Added `courseVenueFee` state (line ~189)
   - Load venue fee from course (lines ~955-958)
   - Added debug logging (lines ~959-966, ~1070-1085, ~1120)
   - Restore venue fee for trainers (lines ~1098-1106)
   - Sync capacity fields from course (lines ~1108-1118)
   - Enhanced success message (lines ~1123-1130)

## Build Status

✅ **Frontend builds successfully**
- No TypeScript errors
- No runtime errors
- Bundle size: 3,549.33 kB (gzipped: 985.88 kB)

## Benefits

1. **Accurate Fee Management**: Venue fee correctly switches between $0 (partners) and course value (trainers)
2. **Automatic Sync**: Capacity fields always reflect course data
3. **Transparent Debugging**: Console logs show exactly what's being calculated
4. **Clear User Feedback**: Toast messages indicate what changed
5. **Data Integrity**: Capacity fields match course definition unless status is locked

## Testing Checklist

### Venue Fee Restoration
- [x] Switch from partners to trainers → venue fee restores from course
- [x] Switch from trainers to partners → venue fee sets to $0
- [x] Toast message shows correct fee action

### Capacity Field Sync
- [x] Save with unlocked status → fields sync from course
- [x] Save with locked status (CONFIRMED, etc.) → fields don't change
- [x] Capacity fields match course values after save

### Capacity Calculation
- [x] Enrolled ≤ max → additional cost = $0
- [x] Enrolled > max → additional cost = (excess × perHead)
- [x] Console shows calculation details
- [x] Works for both trainer and partner scenarios

### Edge Cases
- [x] Course has no capacity rules → additional cost = $0
- [x] Course has no venue fee → restores to $0
- [x] Multiple scenario switches → always correct values
- [x] Locked status → capacity fields don't change
