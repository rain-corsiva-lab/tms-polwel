# Quick Start Guide - Duplicate Course Run Feature

## For Administrators

### How to Duplicate a Course Run

1. **Navigate** to Course Runs Management page
   - URL: `/course-runs`

2. **Click** the blue "Add from Post Run" button
   - Located next to "Create Course Run" button

3. **Search** for the course run you want to duplicate
   - Type course name, code, or serial number in the search box
   - Dropdown shows matching results automatically

4. **Select** a course run from the dropdown
   - Click on the desired course run
   - Overview will appear showing course details

5. **Set new dates**
   - Choose new start date using the calendar picker
   - Choose new end date using the calendar picker
   - Set start time (default: 09:00)
   - Set end time (default: 17:00)

6. **Review** the information note
   - All participants will be copied
   - All trainers will be copied
   - All partners will be copied
   - Fees will use CURRENT rates
   - Status will be DRAFT

7. **Click** "Create Duplicated Run"
   - Wait for confirmation
   - You'll be redirected to the new course run detail page

### What Gets Copied?

✅ **Course Information**
- Course reference
- Venue and location
- Class size limits
- Registration requirements

✅ **Trainers**
- All assigned trainers
- Updated fees (current rates from course_trainers table)
- Remarks

✅ **Partners**
- All assigned training partners

✅ **Participants**
- All enrolled learners
- Updated course fee (current rate from courses table)
- Discount information
- Department and payment details

❌ **What Does NOT Get Copied**
- Attendance records
- Certificate history
- Billing information
- Email history
- Waiver/withdrawal records

### After Duplication

The new course run will:
- Start with **DRAFT** status
- Have a new auto-generated serial number
- Have all email statuses set to PENDING
- Be ready for you to review and activate

### Tips

💡 **Best Practice**: Always review the duplicated course run before activating it

💡 **Fee Updates**: The system automatically uses current fees, so check if any fees have changed

💡 **Multiple Runs**: You can duplicate the same course run multiple times with different dates

💡 **Bulk Creation**: For 10 runs of the same course, duplicate 10 times with sequential dates

---

## For Developers

### API Endpoint

```bash
POST /api/course-runs/duplicate
Content-Type: application/json
Authorization: Bearer {token}

{
  "courseRunId": "crun_abc123",
  "startDatetime": "2026-01-20T09:00:00.000Z",
  "endDatetime": "2026-01-22T17:00:00.000Z"
}
```

### Frontend Component

```tsx
import { DuplicateCourseRunDialog } from '@/components/DuplicateCourseRunDialog';

<DuplicateCourseRunDialog
  open={isOpen}
  onClose={() => setIsOpen(false)}
  onSuccess={(newCourseRunId) => {
    // Refresh list
    fetchCourseRuns();
    // Navigate to new run
    navigate(`/course-runs/${newCourseRunId}`);
  }}
/>
```

### Testing Checklist

#### Backend Testing
```bash
# Test API endpoint
curl -X POST http://localhost:3001/api/course-runs/duplicate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "courseRunId": "VALID_ID",
    "startDatetime": "2026-01-20T09:00:00.000Z",
    "endDatetime": "2026-01-22T17:00:00.000Z"
  }'

# Verify in database
SELECT * FROM course_runs WHERE id = 'NEW_ID';
SELECT * FROM course_run_trainers WHERE courseRunId = 'NEW_ID';
SELECT * FROM course_run_learners WHERE courseRunId = 'NEW_ID';
```

#### Frontend Testing
- [ ] Open dialog
- [ ] Search for course runs
- [ ] Select a course run
- [ ] Set dates
- [ ] Submit form
- [ ] Verify success message
- [ ] Verify navigation
- [ ] Check new course run details

---

## Troubleshooting

### "No course runs found"
- Check if there are any COMPLETED or PENDING_BILLING course runs
- Verify the API is returning data
- Check network console for errors

### "Failed to duplicate"
- Verify dates are valid (end must be after start)
- Check if you have permission to create course runs
- Verify the original course run exists
- Check backend logs for detailed errors

### Fees Not Updated
- This is expected! The system intentionally uses CURRENT fees
- Check `courses.defaultCourseFee` for course fee
- Check `course_trainers.feePerRun` for trainer fees
- If fees haven't changed, duplicated run will have same fees

### Navigation Not Working
- Check if `onSuccess` callback is properly implemented
- Verify course run ID is returned in API response
- Check React Router configuration

---

## Quick Reference

### Serial Number Format
`{courseCode}-{DD}{MM}{YY}`

Example: `WSH-200126` for course starting 20 Jan 2026

### Default Times
- Start: 09:00
- End: 17:00

### Initial Status
All duplicated course runs start with: `DRAFT`

### Permissions Required
- `course-run.create` permission

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Check backend logs: `tail -f polwel-backend/logs/*.log`
3. Verify database state
4. Review API response in network tab
5. Contact development team with:
   - Course run ID being duplicated
   - Error message
   - Screenshot of the issue
   - Browser console output

---

**Last Updated**: January 14, 2026  
**Feature Version**: 1.0.0
