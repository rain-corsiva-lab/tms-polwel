# Partner-Based Contract Fees Implementation

## Overview
Implemented the distinction between two training scenarios:
1. **Associate Trainers (Scenario 1)**: Individual trainer fees calculated from trainer assignments
2. **Training Partners (Scenario 2)**: Contract fees from course definition (includes trainer + venue costs)

## Changes Summary

### Frontend Changes (`/polwel/src/pages/CourseRunDetail.tsx`)

#### 1. Added State for Course Contract Fees
```typescript
const [courseContractFees, setCourseContractFees] = useState<number>(0); // Store course contract fees for partner scenario
```

#### 2. Updated loadTrainersAndPartners Function
- Now fetches and stores `course.contractFees` when loading course data
- This value represents the bundled contract fee (trainer + venue) for partner scenarios

```typescript
// Store course contract fees for partner scenario
if (course && course.contractFees !== undefined) {
  setCourseContractFees(Number(course.contractFees) || 0);
}
```

#### 3. Updated handleSaveTrainerAssignments Logic
- Now intelligently determines which contract fees to use:
  - **If partners selected**: Uses `courseContractFees` from the course (includes trainer + venue)
  - **If only trainers selected**: Uses calculated trainer fees from individual assignments

```typescript
// Determine contract fees based on selected scenario:
// - If partners are selected: use course contract fees (includes trainer + venue)
// - If only trainers selected: use calculated trainer fees
const hasSelectedPartners = selectedPartners.length > 0;
const contractFeesToUse = hasSelectedPartners ? courseContractFees : calculateDynamicContractFees();

// Update contract fees based on selected scenario
if (contractFeesToUse > 0 || hasSelectedPartners) {
  await courseRunsApi.update(courseRun.id, {
    contractFees: contractFeesToUse,
  });
}
```

#### 4. Updated Partner Summary Display
- Changed from "No fees for partners" to displaying the actual contract fees
- Shows clear indication that fees include both trainer and venue costs

```typescript
<div className="text-2xl font-bold text-green-800">{currency(courseContractFees)}</div>
<div className="text-sm text-green-600">Contract Fees (includes trainer + venue)</div>
```

### Backend - Already Correctly Implemented

The backend already handles partner email routing correctly:

#### Email Routing (`/polwel-backend/src/controllers/courseRunController.ts`)
- Partner emails are sent to `partner.pointOfContactEmail` (TC Email) or fallback to `partner.email`
- Trainer emails are sent to individual `trainer.email` addresses
- This distinction is already properly implemented in `sendTrainerAssignmentEmail` method (lines 2950-3220)

```typescript
// Send emails to partners using their TC Email (pointOfContactEmail)
const partnerEmailTasks = (courseRun.courseRunPartners || []).map(async (partnerAssignment) => {
  const partner = partnerAssignment.partner;
  const partnerEmail = partner?.pointOfContactEmail?.trim() || partner?.email?.trim();
  const partnerName = partner?.name || 'Training Partner';
  // ... sends to partner email
});
```

## Database Schema (Reference)

### Course Table
```prisma
model Course {
  contractFees       Float           @default(0)  // Used when partners selected
  venueFee           Float?                        // Used when trainers selected (separate)
  // ... other fields
}
```

### Partner Table
```prisma
model Partner {
  id                  String             @id @default(cuid())
  name                String
  email               String?            // Fallback email
  pointOfContactEmail String?            // TC Email (preferred)
  // ... other fields
}
```

### CourseRunPartner Junction Table
```prisma
model CourseRunPartner {
  id                String    @id @default(cuid())
  courseRunId       String
  partnerId         String
  selectedTrainerIds Json?    // Array of partner trainer IDs selected
  // ... other fields
}
```

## User Workflow

### Scenario 1: Associate Trainers
1. User selects individual trainers from the course trainer list
2. User enters base fees and additional costs for each trainer
3. System calculates total trainer fees dynamically (considering PER_PAX vs PER_CLASS)
4. Contract fees = Sum of all trainer fees
5. Venue fees are handled separately (not included in contract fees)
6. Emails sent to individual trainer email addresses

### Scenario 2: Training Partners
1. User selects training partners from the course partner list
2. User can optionally select which partner trainers will be involved
3. System uses `course.contractFees` (pre-defined in course setup)
4. Contract fees = course.contractFees (includes trainer + venue costs)
5. Additional Cost Exceeding Capacity field handles capacity overruns
6. Email sent to `partner.pointOfContactEmail` (or `partner.email` as fallback)

## Key Business Logic

### Contract Fees Calculation Priority
```
IF (partners selected) THEN
  contractFees = course.contractFees  // Bundled fee (trainer + venue)
ELSE
  contractFees = SUM(trainer fees)    // Individual trainer fees only
```

### Email Recipient Determination
```
IF (trainer scenario) THEN
  Send to: trainer.email (one email per trainer)
ELSE IF (partner scenario) THEN
  Send to: partner.pointOfContactEmail || partner.email (one email to partner TC)
```

### Venue Fee Handling
- **Trainer Scenario**: Venue fee charged separately (not in contract fees)
- **Partner Scenario**: Venue fee included in `course.contractFees` (set to 0 separately)
- Additional capacity charges go to "Additional Cost Exceeding Capacity" field

## Testing Checklist

✅ Frontend builds successfully
✅ Partner selection shows course contract fees in summary
✅ Trainer selection shows calculated trainer fees in summary
✅ Save assigns correct contract fees based on selection type
✅ Backend email routing already correctly implemented
✅ Database schema supports both scenarios

## Files Modified

1. `/polwel/src/pages/CourseRunDetail.tsx`
   - Added `courseContractFees` state (line ~188)
   - Updated `loadTrainersAndPartners` to fetch course contract fees (line ~945)
   - Updated `handleSaveTrainerAssignments` with scenario-based logic (line ~1028)
   - Updated partner summary display to show contract fees (line ~2405)

## Notes

- The backend email service (`/polwel-backend/src/services/emailService.ts`) and controller (`/polwel-backend/src/controllers/courseRunController.ts`) already correctly handle partner vs trainer email routing
- No backend changes were required - only frontend logic needed updating
- The implementation maintains backward compatibility with existing trainer assignments
- Contract fees are stored in `courseRun.contractFees` field regardless of scenario
- The distinction is in HOW the value is calculated (from course vs from trainers)

## Future Considerations

1. Venue fee should be automatically set to 0 when partners are selected (currently manual)
2. Consider adding UI indicators to show which scenario is active
3. May want to add validation to prevent mixing trainers and partners
4. Consider adding reporting to distinguish partner vs trainer revenue
