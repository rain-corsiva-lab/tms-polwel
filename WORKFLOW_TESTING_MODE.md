# Course Run Workflow - TESTING MODE (5 Minute Delay)

## 🚨 IMPORTANT: TESTING CONFIGURATION ACTIVE

The workflow automation is currently in **TESTING MODE** with a **5-minute delay** for the PENDING_BILLING transition.

## Current Testing Behavior

### PENDING_BILLING Transition (Modified for Testing)
**Testing Mode**: Course transitions 5 minutes after end time

**Example**:
```
Course: "Leadership Training"
Start: Feb 16, 2026 09:00
End:   Feb 16, 2026 10:00

Timeline:
09:00 → Status: IN_PROGRESS (course starts)
10:00 → Course ends, still IN_PROGRESS
10:05 → Status: PENDING_BILLING (auto) ✅ 5 minutes after end
```

### How to Test

1. **Create a test course run**:
   - Set end date/time to current time + 10 minutes
   - Activate the course (move to IN_PROGRESS)

2. **Wait for automatic transition**:
   - The `evaluateStatuses()` function should run every 5 minutes
   - After course ends, wait 5 minutes
   - Course should automatically transition to PENDING_BILLING

3. **Monitor logs**:
   ```bash
   # Backend logs will show:
   "Course Run Status Evaluation: {
     incompleted: 0,
     started: 0,
     pendingBilling: 1,  // Your test course
     evaluatedAt: '2026-02-16T10:05:00.000Z'
   }"
   ```

## Restoring Production Behavior

When testing is complete, restore the original midnight transition:

### Step 1: Edit courseRunWorkflowService.ts

**Location**: `/polwel-backend/src/services/courseRunWorkflowService.ts`

**Find this TESTING CONFIGURATION section** (around line 550):
```typescript
// --- TESTING CONFIGURATION (5 MINUTE DELAY) ---
// Check if end date + 5 minutes has passed
const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
const billingTransitionTime = fiveMinutesAgo; // Use 5 minutes ago as threshold
// --- END TESTING CONFIGURATION ---
```

**Comment it out**:
```typescript
// --- TESTING CONFIGURATION (5 MINUTE DELAY) ---
// const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
// const billingTransitionTime = fiveMinutesAgo;
// --- END TESTING CONFIGURATION ---
```

### Step 2: Uncomment Production Configuration

**Find this PRODUCTION CONFIGURATION section**:
```typescript
// --- PRODUCTION CONFIGURATION (MIDNIGHT TRANSITION) ---
// Uncomment these lines to restore original behavior:
// const todayMidnight = new Date(now);
// todayMidnight.setHours(0, 0, 0, 0);
// const billingTransitionTime = todayMidnight;
// --- END PRODUCTION CONFIGURATION ---
```

**Uncomment it**:
```typescript
// --- PRODUCTION CONFIGURATION (MIDNIGHT TRANSITION) ---
const todayMidnight = new Date(now);
todayMidnight.setHours(0, 0, 0, 0);
const billingTransitionTime = todayMidnight;
// --- END PRODUCTION CONFIGURATION ---
```

### Step 3: Rebuild and Deploy

```bash
# Backend
cd polwel-backend
npm run build

# Restart backend service
pm2 restart polwel-backend
# OR if using systemctl:
# sudo systemctl restart polwel-backend
```

### Step 4: Verify Restoration

After deployment, the production behavior will be:
```
Course ends: Feb 16 10:00
Transitions: Feb 17 00:00 (midnight next day)
```

## Production Behavior Reference

### Original Midnight Transition Logic
```
Course: "Leadership Training"
Start: Feb 16, 2026 09:00
End:   Feb 16, 2026 19:00 (7:00 PM)

Timeline:
09:00 → Status: IN_PROGRESS (starts)
19:00 → Course ends, still IN_PROGRESS
23:59 → Still IN_PROGRESS (grace period)
00:00 (Feb 17) → Status: PENDING_BILLING (midnight transition) ✅
```

**Why Midnight?**
1. **Grace Period**: Staff have entire end day to finalize attendance/certificates
2. **Data Accuracy**: Ensures all data entry complete before billing
3. **Business Logic**: Day-based grouping for reports
4. **Predictable**: All courses ending same day transition together

## Cron Schedule Configuration

### Current Production Schedule
The cron job runs at **midnight daily** (00:00):
```bash
# Default: 0 0 * * * (midnight)
# Set via: COURSE_RUN_STATUS_CRON environment variable
```

### Change to Testing Schedule (5 Minutes)

To test the 5-minute delay properly, update the cron schedule:

#### Option 1: Environment Variable (Recommended)
Edit your `.env` file:
```bash
# For testing - run every 5 minutes
COURSE_RUN_STATUS_CRON="*/5 * * * *"
```

Then restart the backend:
```bash
pm2 restart polwel-backend
```

#### Option 2: Direct Code Change
Edit `/polwel-backend/src/jobs/courseRunStatusJob.ts`:
```typescript
// Change this line:
const DEFAULT_CRON = process.env.COURSE_RUN_STATUS_CRON || '0 0 * * *'; // Midnight daily

// To:
const DEFAULT_CRON = process.env.COURSE_RUN_STATUS_CRON || '*/5 * * * *'; // Every 5 minutes
```

### Restore Production Schedule
When testing is complete:
```bash
# Remove or comment out from .env:
# COURSE_RUN_STATUS_CRON="*/5 * * * *"

# Or set back to midnight:
COURSE_RUN_STATUS_CRON="0 0 * * *"
```

Restart backend to apply changes.

## Testing Workflow

### Complete Testing Setup

1. **Update Cron Schedule** (see above)
   - Set to `*/5 * * * *` (every 5 minutes)

2. **Restart Backend**
   ```bash
   pm2 restart polwel-backend
   # Check logs to confirm: "Course run status job scheduled (*/5 * * * *)"
   ```

3. **Create Test Course Run**
   - Start: Current time + 2 minutes
   - End: Current time + 7 minutes
   - Activate to IN_PROGRESS status

4. **Monitor Transitions**
   - At start time: Should auto-transition to IN_PROGRESS
   - At end time + 5 mins: Should auto-transition to PENDING_BILLING

5. **Check Backend Logs**
   ```bash
   pm2 logs polwel-backend
   
   # Look for:
   # "📅 Course run status job: 0 incompleted, 1 started, 0 pending billing"
   # "📅 Course run status job: 0 incompleted, 0 started, 1 pending billing"
   ```

### Manual Testing
You can also trigger the evaluation manually via API (if endpoint exists) or directly in code:
```typescript
import { evaluateCourseRunStatusesNow } from './jobs/courseRunStatusJob';

// Call manually
await evaluateCourseRunStatusesNow();
```

## Cron Schedule Reminder

For testing, the cron job should run **every 5 minutes**:
```bash
*/5 * * * * # Every 5 minutes
```

For production, recommended schedule is **hourly**:
```bash
0 * * * * # Every hour at minute 0
```

## Status Transitions Summary

| Transition | Testing Mode | Production Mode |
|------------|--------------|-----------------|
| INCOMPLETED | Immediate | Immediate |
| IN_PROGRESS | At start time | At start time |
| PENDING_BILLING | **5 mins after end** | **Midnight after end** |

## Files Modified for Testing

1. `/polwel-backend/src/services/courseRunWorkflowService.ts`
   - Lines ~545-580: Added testing configuration with clear restoration instructions

## Documentation Files

- `COURSE_RUN_WORKFLOW_AUTOMATION.md` - Full production workflow documentation
- `WORKFLOW_TESTING_MODE.md` - This file (testing instructions)

---

**Testing Active Since**: February 16, 2026
**Remember to restore production behavior** after testing is complete!
**Production Configuration Preserved**: Yes, commented out in code with clear instructions
