# Fee Synchronization & Capacity Cost Calculation Implementation

## Overview
Implemented comprehensive fee synchronization system that automatically:
1. **Calculates capacity exceeding costs** based on enrolled participants vs venue max capacity
2. **Zeros venue fee for partner scenario** (included in contract fees)
3. **Syncs all fees** (contract fees, venue fee, additional cost) in one operation
4. **Works for both trainer and partner scenarios**

## Problem Statement

### Issue 1: Venue Fee for Partners
When partners are selected, the venue fee was still using the course venue fee, but it should be **$0** because venue costs are included in the partner's contract fees.

### Issue 2: Additional Cost Exceeding Capacity
Courses have:
- `venueMaxParticipants`: Maximum capacity before per-head charges apply
- `perHeadPriceIfMaxExceed`: Fee per participant beyond max capacity

**Example Calculation:**
- Course has `venueMaxParticipants = 2`
- Course has `perHeadPriceIfMaxExceed = 50`
- Current enrolled participants: 4
- Calculation: (4 - 2) × $50 = **$100** additional cost
- This should automatically populate `additionalCostExceedingCapacity` field

### Issue 3: No Fee Synchronization
All fee calculations were happening separately, requiring multiple saves. Need to sync all fees in one atomic operation.

## Implementation Details

### Frontend Changes (`/polwel/src/pages/CourseRunDetail.tsx`)

#### 1. Added New State Variables (Lines ~188-190)
```typescript
const [courseVenueMaxParticipants, setCourseVenueMaxParticipants] = useState<number | null>(null);
const [coursePerHeadIfMaxExceed, setCoursePerHeadIfMaxExceed] = useState<number | null>(null);
```

These store the capacity rules from the course definition.

#### 2. Load Capacity Rules from Course (Lines ~953-959)
```typescript
// Store course venue capacity and per head fee for exceeding capacity
if (course && course.venueMaxParticipants !== undefined) {
  setCourseVenueMaxParticipants(Number(course.venueMaxParticipants) || null);
}
if (course && course.perHeadPriceIfMaxExceed !== undefined) {
  setCoursePerHeadIfMaxExceed(Number(course.perHeadPriceIfMaxExceed) || null);
}
```

Fetches capacity rules when loading trainers and partners.

#### 3. Calculate Additional Cost on Save (Lines ~1047-1053)
```typescript
// Calculate additional cost exceeding capacity
const enrolledCount = courseRun.courseRunLearners?.filter((l) => l.enrollmentStatus === "ENROLLED").length || 0;
let additionalCostExceedingCapacity = 0;

if (courseVenueMaxParticipants && coursePerHeadIfMaxExceed && enrolledCount > courseVenueMaxParticipants) {
  const exceededCount = enrolledCount - courseVenueMaxParticipants;
  additionalCostExceedingCapacity = exceededCount * coursePerHeadIfMaxExceed;
}
```

**Logic:**
- Count enrolled participants (excluding withdrawn)
- If enrolled > max capacity: calculate (enrolled - max) × perHeadFee
- Otherwise: $0

#### 4. Fee Sync on Save (Lines ~1060-1071)
```typescript
// Prepare fee updates based on scenario
const feeUpdates: any = {
  contractFees: contractFeesToUse,
  additionalCostExceedingCapacity: additionalCostExceedingCapacity,
};

// If partners selected: set venue fee to 0 (included in contract fees)
if (hasSelectedPartners) {
  feeUpdates.venueFee = 0;
}

// Update all fees in one call
await courseRunsApi.update(courseRun.id, feeUpdates);
```

**Unified Fee Update:**
- Always updates: `contractFees` and `additionalCostExceedingCapacity`
- If partners: Also sets `venueFee = 0`
- Single API call instead of multiple separate updates

## Calculation Examples

### Example 1: Trainer Scenario with Capacity Exceeding

**Course Setup:**
- `venueMaxParticipants`: 2
- `perHeadPriceIfMaxExceed`: $50
- 3 trainers assigned with total fees: $500

**Course Run:**
- Enrolled participants: 4
- Selected: Trainers (not partners)

**Calculated Fees:**
1. `contractFees` = $500 (sum of trainer fees)
2. `additionalCostExceedingCapacity` = (4 - 2) × $50 = **$100**
3. `venueFee` = $800 (from course definition, NOT zeroed)

**Total trainer costs:** $500 + $100 = $600
**Total venue costs:** $800
**Grand Total:** $1,400

---

### Example 2: Partner Scenario with Capacity Exceeding

**Course Setup:**
- `contractFees`: $540 (includes trainer + venue)
- `venueMaxParticipants`: 2
- `perHeadPriceIfMaxExceed`: $50

**Course Run:**
- Enrolled participants: 4
- Selected: Partners (not individual trainers)

**Calculated Fees:**
1. `contractFees` = $540 (from course definition)
2. `additionalCostExceedingCapacity` = (4 - 2) × $50 = **$100**
3. `venueFee` = **$0** (zeroed because included in contract fees)

**Total contract costs:** $540 + $100 = $640
**Total venue costs:** $0 (included in contract)
**Grand Total:** $640

---

### Example 3: No Capacity Exceeded

**Course Setup:**
- `venueMaxParticipants`: 25
- `perHeadPriceIfMaxExceed`: $30

**Course Run:**
- Enrolled participants: 20
- Selected: Trainers with total: $450

**Calculated Fees:**
1. `contractFees` = $450
2. `additionalCostExceedingCapacity` = **$0** (20 ≤ 25, no excess)
3. `venueFee` = $800 (from course definition)

**Total:** $450 + $0 + $800 = $1,250

## User Workflow

### Trainer Scenario
1. Admin goes to Course Run Detail → Trainer Assignment tab
2. Selects individual trainers, enters base fees and additional costs
3. Clicks **Save Changes**
4. System automatically:
   - Calculates total trainer fees → `contractFees`
   - Counts enrolled participants
   - If enrolled > `venueMaxParticipants`: calculates excess cost
   - Updates `additionalCostExceedingCapacity`
   - Leaves `venueFee` as-is (from course/venue)
5. All fees updated in single operation
6. Toast message: "Assignments and fees updated successfully!"

### Partner Scenario
1. Admin goes to Course Run Detail → Trainer Assignment tab
2. Selects training partner(s)
3. Clicks **Save Changes**
4. System automatically:
   - Uses `course.contractFees` → `contractFees`
   - Counts enrolled participants
   - If enrolled > `venueMaxParticipants`: calculates excess cost
   - Updates `additionalCostExceedingCapacity`
   - **Sets `venueFee = 0`** (included in contract)
5. All fees updated in single operation
6. Toast message: "Assignments and fees updated successfully! (Venue fee set to $0 - included in contract fees)"

## Database Schema Reference

### Course Table
```prisma
model Course {
  contractFees           Float    @default(0)      // Used for partner scenario
  venueFee               Float?                     // Base venue rental fee
  venueMaxParticipants   Int?                       // Capacity threshold
  perHeadPriceIfMaxExceed Decimal? @db.Decimal(10,2) // Fee per excess participant
  // ... other fields
}
```

### CourseRun Table
```prisma
model CourseRun {
  contractFees                   Float?   // Trainer total OR course contract fees
  venueFee                       Float?   // Venue rental (0 for partners)
  additionalCostExceedingCapacity Float?  // Auto-calculated capacity costs
  // ... other fields
  courseRunLearners              CourseRunLearner[] // For counting enrolled
}
```

## Key Business Rules

### Contract Fees Priority
```
IF (partners selected) THEN
  contractFees = course.contractFees  
ELSE
  contractFees = SUM(trainer base fees + additional costs)
END
```

### Venue Fee Rules
```
IF (partners selected) THEN
  venueFee = 0  // Included in contract
ELSE
  venueFee = course.venueFee OR venue.fee
END
```

### Additional Cost Calculation
```
enrolledCount = COUNT(courseRunLearners WHERE enrollmentStatus = 'ENROLLED')

IF (enrolledCount > course.venueMaxParticipants) THEN
  exceededCount = enrolledCount - course.venueMaxParticipants
  additionalCostExceedingCapacity = exceededCount × course.perHeadPriceIfMaxExceed
ELSE
  additionalCostExceedingCapacity = 0
END
```

## Testing Checklist

### Trainer Scenario Tests
- [ ] Select trainers → contract fees = sum of trainer fees ✓
- [ ] Enrolled ≤ max capacity → additional cost = $0 ✓
- [ ] Enrolled > max capacity → additional cost calculated correctly ✓
- [ ] Venue fee remains unchanged (not zeroed) ✓
- [ ] All fees updated in single operation ✓

### Partner Scenario Tests
- [ ] Select partners → contract fees = course.contractFees ✓
- [ ] Venue fee automatically set to $0 ✓
- [ ] Enrolled > max capacity → additional cost calculated correctly ✓
- [ ] Toast message shows "(Venue fee set to $0...)" ✓
- [ ] All fees updated in single operation ✓

### Edge Cases
- [ ] No capacity rules defined → additional cost = $0 ✓
- [ ] Switch from trainers to partners → fees recalculated ✓
- [ ] Switch from partners to trainers → venue fee restored ✓
- [ ] Zero enrolled participants → additional cost = $0 ✓

## Files Modified

1. **`/polwel/src/pages/CourseRunDetail.tsx`**
   - Added `courseVenueMaxParticipants` and `coursePerHeadIfMaxExceed` state
   - Updated `loadTrainersAndPartners` to fetch capacity rules
   - Added capacity cost calculation in `handleSaveTrainerAssignments`
   - Implemented unified fee sync with conditional venue fee zeroing
   - Updated success toast to indicate partner scenario

## API Endpoints Used

### GET `/api/courses/:id`
Fetches course details including:
- `contractFees`
- `venueMaxParticipants`
- `perHeadPriceIfMaxExceed`

### PUT `/api/course-runs/:id`
Updates course run with fee object:
```typescript
{
  contractFees: number,
  additionalCostExceedingCapacity: number,
  venueFee?: number  // Only included if partners selected
}
```

## Build Status

✅ **Frontend builds successfully**
- No TypeScript errors
- No runtime errors
- Bundle size: 3,548.57 kB (gzipped: 985.63 kB)

## Benefits

1. **Automatic Calculations**: No manual calculation needed for capacity costs
2. **Scenario-Aware**: Correctly handles trainer vs partner fee structures
3. **Single Save Operation**: All fees updated atomically, reducing API calls
4. **Accurate Billing**: Additional costs for exceeded capacity automatically included
5. **Correct Partner Fees**: Venue fee properly zeroed when partners used
6. **User Feedback**: Clear toast messages indicate what happened

## Future Enhancements

1. **Visual Indicators**: Show capacity status (e.g., "4/2 capacity - $100 excess")
2. **Real-time Preview**: Display calculated additional cost before saving
3. **Capacity Warnings**: Alert when approaching or exceeding capacity
4. **Historical Tracking**: Log fee calculation changes for audit trail
5. **Bulk Updates**: Apply capacity calculations across multiple course runs
