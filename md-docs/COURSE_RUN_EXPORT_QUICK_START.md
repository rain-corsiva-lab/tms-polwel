# Course Run History Export - Quick Reference

## 🚀 Feature Summary

Export all course run data for a specific course to Excel (.xlsx) format.

---

## 📍 How to Use

### As a User
1. Go to any Course Detail page
2. Scroll to "Export Course Run History" section (below Additional Information)
3. Click "Export Run History" button
4. Wait for file to download

### File Structure
- **Filename**: `COURSE_CODE_Course_Run_History_2026-01-22.xlsx`
- **Multiple Sheets**: One per course run, named "11Jan24", "13Mar24", etc.
- **Each Sheet Contains**:
  - Active Learners table
  - Withdrawn Learners table
  - Totals for fees

---

## 🗂️ Excel Columns

1. Name
2. Department
3. Designation
4. SPF Email Address
5. Contact Number
6. Retiring Officer *(empty - not in schema)*
7. Payment Mode
8. Fees before GST
9. Fees Remarks
10. Invoice/PO Number
11. Business Unit Number
12. Training Officer's Name
13. Training Officer's Email
14. Training Officer's Contact Number
15. Remarks

---

## 🔧 Technical Details

### API Endpoint
```
GET /api/courses/:id/runs/export
```

**Required Permission**: `course-venue.view`

### Frontend Implementation

**Button Location**: [CourseDetail.tsx](../src/pages/CourseDetail.tsx) - Line ~236

**API Function**: [api.ts](../src/lib/api.ts) - `coursesApi.exportRunHistory()`

**Handler**: Downloads Excel file automatically via blob

### Backend Implementation

**Controller**: [courseRunExportController.ts](../polwel-backend/src/controllers/courseRunExportController.ts)

**Route**: [courses.ts](../polwel-backend/src/routes/courses.ts) - Line 14

**Library**: ExcelJS (already installed)

---

## 📊 Data Sources

### Queries
- `course` - Course details
- `course_runs` - All runs for the course
- `course_run_learners` - Enrollment data
- `learners` - Personal info
- `organizations` - Department/BU info
- `course_run_trainers` - Trainer assignments
- `users` (trainers) - Trainer details
- `course_run_billing_entries` - Billing info

### Key Logic
- **Active Learners**: All where `enrollmentStatus !== 'WITHDRAWN'`
- **Withdrawn Learners**: All where `enrollmentStatus === 'WITHDRAWN'`
- **Primary Trainer**: First trainer in `courseRunTrainers` array
- **Training Officer**: Learner's training coordinator OR primary trainer

---

## ✅ Testing

### Quick Test Steps
1. Navigate to a course with multiple runs
2. Click export button
3. Verify:
   - ✅ File downloads
   - ✅ Multiple sheets present
   - ✅ Sheet names formatted as "11Jan24"
   - ✅ Active learners in first table
   - ✅ Withdrawn learners in second table
   - ✅ Totals calculate correctly
   - ✅ All data fields populate

### Edge Cases to Test
- Course with no runs (should show error)
- Course with 1 run
- Course with 10+ runs
- Run with no learners
- Run with all withdrawn learners
- Run with no trainer assigned

---

## 🐛 Known Limitations

1. **Retiring Officer**: Column empty (not in database schema)
2. **POLWEL Staff**: Both totals show same value (no filtering logic yet)
3. **Large Exports**: May take time for courses with 50+ runs
4. **Sheet Names**: Duplicate dates get auto-numbered by Excel

---

## 🔄 Future Enhancements

- [ ] Add POLWEL staff filtering logic
- [ ] Add waitlist support
- [ ] Include attendance data
- [ ] Add certificate generation status
- [ ] Export date range filter
- [ ] CSV format option
- [ ] Progress indicator for large exports

---

## 📞 Support

**Documentation**: See [COURSE_RUN_EXPORT_FEATURE.md](COURSE_RUN_EXPORT_FEATURE.md) for full details

**Files Modified**:
- Backend: `courseRunExportController.ts`, `courses.ts`
- Frontend: `api.ts`, `CourseDetail.tsx`

**Status**: ✅ Production Ready (Jan 22, 2026)
