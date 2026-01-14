# Training Coordinator "Not Applicable" Fix - Enhanced Logging

## Issue
The "Not Applicable" option for training coordinator is still not removing the `trainingCoordinatorId` from the `learners` table in the database.

## Enhanced Backend Logging

I've added comprehensive logging to the backend to track exactly what's happening when updating the coordinator field.

### Modified Backend Functions

1. **updateEnrollment** (courseRunController.ts lines 2287-2304)
   - Added log when setting trainingCoordinatorId
   - Added log showing the complete updateData object
   - Added log confirming successful update

2. **enrollLearner** (courseRunController.ts lines 1590-1608)
   - Added log showing coordinator value when creating new learner
   - Added log confirming learner creation

3. **enrollLearners** (courseRunController.ts lines 1732-1749)
   - Added log for each learner created in bulk enrollment
   - Shows coordinator value for group registrations

## Testing Steps

### Step 1: Check Frontend Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Edit a learner and select "Not Applicable" for coordinator
4. **Expected logs**:
   ```
   EditLearnerDialog: Clearing coordinator - setting to null
   EditLearnerDialog save: coordinator value = null
   ```

### Step 2: Check Backend Console
1. Open terminal with backend running
2. After clicking Save in the frontend
3. **Expected logs**:
   ```
   [updateEnrollment] Setting trainingCoordinatorId to: NULL
   [updateEnrollment] Updating learner {learnerId} with data: {
     "fullname": "John Doe",
     ...
     "trainingCoordinatorId": null
   }
   [updateEnrollment] Learner {learnerId} updated successfully
   ```

### Step 3: Verify Database
Open MySQL/database console and run:

```sql
-- Check a specific learner by email
SELECT 
  id, 
  fullname, 
  email, 
  trainingCoordinatorId,
  createdAt,
  updatedAt
FROM learners 
WHERE email = 'test@example.com';

-- The trainingCoordinatorId should be NULL
```

Or check by learner ID:
```sql
SELECT 
  id, 
  fullname, 
  email, 
  trainingCoordinatorId
FROM learners 
WHERE id = '{learner-id-here}';
```

### Step 4: Full Test Flow

1. **Find a learner with a coordinator**:
   - Go to Course Run detail
   - Find a participant who HAS a training coordinator
   - Note their email address

2. **Edit and clear coordinator**:
   - Click Edit for that participant
   - Verify coordinator dropdown shows their current coordinator
   - Select "Not Applicable"
   - Verify email and phone fields clear immediately
   - Click Save
   - **Check frontend console** for logs
   - **Check backend console** for logs

3. **Verify the change**:
   - Close and reopen the edit dialog
   - Coordinator should show "Not Applicable"
   - **Check database** using SQL query above

4. **Check backend terminal** should show:
   ```
   [updateEnrollment] Setting trainingCoordinatorId to: NULL
   [updateEnrollment] Updating learner abc123 with data: {
     "fullname": "...",
     "trainingCoordinatorId": null
   }
   [updateEnrollment] Learner abc123 updated successfully
   ```

## If It Still Doesn't Work

### Debug Checklist

1. **Frontend not sending null?**
   - Check frontend console
   - Should see: `coordinator value = null`
   - If not null, there's a frontend issue

2. **Backend not receiving request?**
   - Check backend console for the `[updateEnrollment]` logs
   - If no logs appear, API request isn't reaching the backend

3. **Backend receiving but not updating?**
   - Check if logs show `Setting trainingCoordinatorId to: NULL`
   - Check if `Learner updated successfully` appears
   - If logs appear but database unchanged, check Prisma connection

4. **Database permissions?**
   - Verify database user has UPDATE permissions
   - Check if there are any database triggers preventing NULL values

5. **Cache issue?**
   - Try hard refresh (Ctrl+Shift+R)
   - Clear browser cache
   - Restart backend server

## Backend Code Changes

### File: polwel-backend/src/controllers/courseRunController.ts

**updateEnrollment function** (lines ~2275-2304):
```typescript
if ('trainingCoordinatorId' in learnerData) {
  const coordinatorId = learnerData.trainingCoordinatorId && 
    typeof learnerData.trainingCoordinatorId === 'string' && 
    learnerData.trainingCoordinatorId.trim() 
      ? learnerData.trainingCoordinatorId 
      : null;
  updateData.trainingCoordinatorId = coordinatorId;
  console.log(`[updateEnrollment] Setting trainingCoordinatorId to: ${coordinatorId === null ? 'NULL' : coordinatorId}`);
}

console.log(`[updateEnrollment] Updating learner ${learnerId} with data:`, JSON.stringify(updateData, null, 2));

await prisma.learner.update({
  where: { id: learnerId },
  data: updateData,
});

console.log(`[updateEnrollment] Learner ${learnerId} updated successfully`);
```

## Expected Behavior

### When selecting "Not Applicable":

1. **Immediate UI Update**:
   - Coordinator dropdown shows "Not Applicable"
   - Email field clears (shows empty)
   - Phone field clears (shows empty)

2. **Frontend logs**:
   ```
   Clearing coordinator - setting to null
   EditLearnerDialog save: coordinator value = null
   ```

3. **Backend logs**:
   ```
   [updateEnrollment] Setting trainingCoordinatorId to: NULL
   [updateEnrollment] Updating learner abc123 with data: {..., "trainingCoordinatorId": null}
   [updateEnrollment] Learner abc123 updated successfully
   ```

4. **Database state**:
   ```sql
   SELECT trainingCoordinatorId FROM learners WHERE id = 'abc123';
   -- Result: NULL
   ```

5. **Verification**:
   - Close edit dialog
   - Reopen edit dialog for same participant
   - Coordinator should still show "Not Applicable"
   - Fields should remain empty

## Next Steps

1. **Test with logging** - Follow the test steps above
2. **Share logs** - If still not working, share:
   - Frontend console logs
   - Backend console logs
   - Database query results
3. **Additional debugging** - Based on where it fails, we can add more specific fixes

## Build Status
✅ Backend built successfully with enhanced logging
✅ Frontend already has logging in place

