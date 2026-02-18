# Course Run Workflow Automation System

## Overview
The POLWEL system includes an automated workflow engine that manages course run lifecycle transitions based on date/time triggers. This document explains the complete automation concept and how status transitions work.

## Automated Status Transitions

The `courseRunWorkflowService.evaluateStatuses()` function runs periodically (typically via cron job or scheduled task) to automatically update course run statuses based on current date/time and course run dates.

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Cron Job / Scheduled Task                  │
│              (Runs periodically, e.g., hourly)              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│     courseRunWorkflowService.evaluateStatuses()            │
│     - Checks all course runs                               │
│     - Applies automated transitions                        │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┬────────────────┐
        ▼                         ▼                ▼
  ┌──────────┐            ┌──────────┐     ┌──────────┐
  │ INCOMPLETE│            │TRANSITION│     │TRANSITION│
  │ CHECK    │            │TO START  │     │TO BILLING│
  └──────────┘            └──────────┘     └──────────┘
```

## Three Automated Transitions

### 1. INCOMPLETED Status (Missed Activation)
**Trigger**: Start date has passed, but course was never activated

**Affected Statuses**:
- DRAFT
- PENDING
- CONFIRMED_PENDING_TA_APPROVAL
- CONFIRMED_PENDING_CONFIRMATION_EMAILS

**Logic**:
```typescript
IF (now > startDatetime) 
   AND status IN [pre-activation statuses]
THEN
   status = 'INCOMPLETED'
   cancelReason = "Course run automatically marked as incompleted..."
   cancelledAt = now
```

**Use Case**: A course was scheduled but never properly activated. This prevents courses from sitting in pending states indefinitely after their start date has passed.

**Example**:
- Course scheduled for Dec 15, 2025 at 09:00
- Status is DRAFT
- System runs on Dec 16, 2025 at 00:00
- **Result**: Status changed to INCOMPLETED with cancel reason explaining it was never activated

---

### 2. IN_PROGRESS Status (Course Starting)
**Trigger**: Current time reaches start date/time

**Affected Statuses**:
- CONFIRMED
- CONFIRMED_PENDING_CONFIRMATION_EMAILS
- ACTIVE

**Logic**:
```typescript
IF (now >= startDatetime) 
   AND (now < endDatetime)
   AND status IN ['CONFIRMED', 'ACTIVE', ...]
THEN
   status = 'IN_PROGRESS'
```

**Use Case**: Automatically marks courses as "currently running" when they start.

**Example**:
- Course scheduled for Dec 15, 2025 09:00 - Dec 17, 2025 17:00
- Status is ACTIVE
- System runs on Dec 15, 2025 at 09:30
- **Result**: Status changed to IN_PROGRESS (course is now running)

---

### 3. PENDING_BILLING Status (Course Completed)
**Trigger**: Midnight (00:00) of the day after end date

**Affected Status**:
- IN_PROGRESS

**Logic**:
```typescript
todayMidnight = now.setHours(0, 0, 0, 0)

IF (endDatetime < todayMidnight) 
   AND status = 'IN_PROGRESS'
THEN
   status = 'PENDING_BILLING'
```

**Important**: This transition happens at **midnight** (00:00), not immediately when the course ends.

**Use Case**: Gives a grace period for any last-minute updates or data entry before moving to billing workflow. The course officially "ends" at midnight the next day.

**Example Scenario**:
- Course runs: Dec 15, 2025 09:00 → Dec 19, 2025 19:00 (ends at 7:00 PM)
- Status during course: IN_PROGRESS
- On Dec 19, 2025 at 23:59: Still IN_PROGRESS (course just ended)
- On Dec 20, 2025 at 00:00 (midnight): Transitions to PENDING_BILLING

**Why Midnight?**
1. **Grace Period**: Allows trainers/admins to complete attendance, update final details on the same day
2. **Business Logic**: The course is considered "complete" at the end of the calendar day it finished
3. **Billing Workflow**: Ensures all data is finalized before generating invoices/reports
4. **Consistent Cutoff**: Clear boundary - all courses ending on the same day transition together at midnight

---

## Complete Status Flow Diagram

```
DRAFT/PENDING
     │
     ├─> [Start date passed] ──> INCOMPLETED ❌
     │
     └─> [Approved & Ready] ──> CONFIRMED/ACTIVE
                                      │
                                      ├─> [Start date passed] ──> INCOMPLETED ❌
                                      │
                                      └─> [Start time reached] ──> IN_PROGRESS
                                                                        │
                                                                        └─> [Midnight after end date] ──> PENDING_BILLING
                                                                                                                │
                                                                                                                └─> [Manual completion] ──> COMPLETED ✓
```

## Timing Examples

### Example 1: Normal Course Flow
```
Course: "Leadership Training"
Start: Jan 10, 2026 09:00
End:   Jan 12, 2026 17:00

Timeline:
Jan 9, 10:00   → Status: ACTIVE
Jan 10, 09:00  → Status: IN_PROGRESS (auto)
Jan 12, 17:00  → Course ends, still IN_PROGRESS
Jan 12, 23:00  → Still IN_PROGRESS (grace period)
Jan 13, 00:00  → Status: PENDING_BILLING (auto)
Jan 13, 10:00  → Admin marks COMPLETED (manual)
```

### Example 2: Single-Day Course
```
Course: "Safety Briefing"
Start: Feb 5, 2026 09:00
End:   Feb 5, 2026 12:00

Timeline:
Feb 5, 09:00  → Status: IN_PROGRESS (auto)
Feb 5, 12:00  → Course ends, still IN_PROGRESS
Feb 5, 23:59  → Still IN_PROGRESS (grace period)
Feb 6, 00:00  → Status: PENDING_BILLING (auto)
```

### Example 3: Missed Activation
```
Course: "Excel Workshop"
Start: Mar 1, 2026 09:00
Status: PENDING (never activated)

Timeline:
Mar 1, 09:00  → Should have been activated
Mar 2, 00:00  → Status: INCOMPLETED (auto)
                Reason: "Start date passed without activation"
```

## Implementation Details

### Cron Schedule
The `evaluateStatuses()` function should run:
- **Frequency**: Every hour (recommended) or more frequently for time-sensitive operations
- **Optimal**: Every 15-30 minutes for near-real-time transitions
- **Minimum**: Once per hour to catch transitions within reasonable timeframes

### System Configuration
```javascript
// Typical cron expression
// Run every hour at minute 0
0 * * * * // "At minute 0 of every hour"

// Or run every 15 minutes
*/15 * * * * // "Every 15 minutes"
```

## Business Rules Summary

| Transition | Trigger Time | Grace Period | Reason |
|------------|--------------|--------------|---------|
| INCOMPLETED | Immediately when checked after start | None | Course was never activated |
| IN_PROGRESS | Exactly at start time | None | Course is now running |
| PENDING_BILLING | Midnight after end date | Until midnight | Allow same-day completion tasks |

## Benefits of Midnight Transition

1. **Administrative Convenience**: Staff have the entire end day to finalize details
2. **Data Accuracy**: Ensures attendance, evaluation forms completed before billing
3. **Clear Audit Trail**: Day-based grouping for reports
4. **Predictable Behavior**: All courses ending Monday transition at Monday midnight
5. **Human-Friendly**: Aligns with business day concepts

## Monitoring & Logging

The `evaluateStatuses()` function returns:
```typescript
{
  incompleted: number,      // Count of courses marked INCOMPLETED
  started: number,          // Count of courses moved to IN_PROGRESS
  pendingBilling: number,   // Count of courses moved to PENDING_BILLING
  evaluatedAt: Date         // Timestamp of evaluation
}
```

## Related Documentation

- See `courseRunWorkflowService.ts` for complete implementation
- Status definitions in Prisma schema: `CourseStatus` enum
- Manual workflow actions available via `performAction()` method

---

**Last Updated**: February 16, 2026
**Automation Status**: Active and operational
