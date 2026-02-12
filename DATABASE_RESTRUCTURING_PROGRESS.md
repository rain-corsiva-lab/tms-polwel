# Database Restructuring: Moving Organization Data to CourseRunLearner

## Completed ✅

### 1. Database Schema Changes
- **Learner Model**: Removed `clientOrganizationId`, `department Name`, and `trainingCoordinatorId` fields
- **CourseRunLearner Model**: Added these fields:
  - `clientOrganizationId` (String?)
  - `trainingCoordinatorId` (String?)
  - `departmentName` (String?)
  - `division` (String?) - organization type
  - `buNumber` (String?)
- **Relations Updated**:
  - User model: Changed from `learnersAsTrainingCoordinator` to `courseRunLearnersAsCoordinator`
  - Organization model: Changed from `learners` to `courseRunLearners`

### 2. Data Migration
- Successfully migrated existing data from Learner table to CourseRunLearner table
- All learner-organization associations preserved
- Old columns dropped from Learner table

### 3. Backend Controller Updates (courseRunController.ts)
- **enrollLearner**: Now stores organization data in CourseRunLearner instead of Learner
- **enrollLearners**: Group enrollment updated to use new structure
- **importLearners**: Import from CSV updated to store data correctly
- **updateEnrollment**: Edit endpoint now updates organization data in CourseRunLearner
- **getLearners**: Query updated to fetch organization from CourseRunLearner with proper relations
- **getAll**: Course run list query updated to include clientOrganization and trainingCoordinator from CourseRunLearner

---

## Still Needs Completion ⚠️

### 4. Frontend Dialog Updates
**Files to Update**:
- `/home/kukuh/webprojects/polwel/src/components/AddLearnersDialog.tsx`
- `/home/kukuh/webprojects/polwel/src/components/EditLearnerDialog.tsx`

**Changes Needed**:
1. Remove `disabled={!!data.selectedLearnerId}` from:
   - Organization Name select field
   - Division/Organization Type field
   - Training Coordinator select field
2. These fields should be ENABLED even when selecting existing learners
3. This allows the same learner to have different organizations/coordinators per course run

**Example in SingleRegistrationForm component** (around line 1500-1600):
```typescript
// BEFORE (disabled when learner selected):
<SearchableSelect
  value={data.division}
  onValueChange={(value) => onOrganizationChange(value)}
  options={organizationOptions}
  placeholder="Select organization"
  disabled={!data.organizationType || !!data.selectedLearnerId} // ❌ Remove selectedLearnerId check
  className="w-full"
/>

// AFTER (always enabled):
<SearchableSelect
  value={data.division}
  onValueChange={(value) => onOrganizationChange(value)}
  options={organizationOptions}
  placeholder="Select organization"
  disabled={!data.organizationType} // ✅ Only check organizationType
  className="w-full"
/>
```

### 5. Client Organization Detail Page
**File**: `/home/kukuh/webprojects/polwel/src/pages/ClientOrganisationDetail.tsx`

**Changes Needed**:
The "Participants" tab currently shows learners directly. This needs to change because learners are now associated through CourseRunLearners.

**Current Structure** (Learners tab):
```typescript
// Shows learners where clientOrganizationId = organizationId
const fetchLearners = async () => {
  const response = await api.get(`/api/organizations/${id}/learners`);
  setLearners(response.data.learners);
};
```

**New Structure** (should show course run enrollments):
```typescript
// Show courseRunLearners where clientOrganizationId = organizationId
const fetchEnrollments = async () => {
  const response = await api.get(`/api/course-run-learners?organizationId=${id}`);
  // Response includes: learner, courseRun, enrollment details
  setEnrollments(response.data.enrollments);
};
```

**Backend Endpoint Needed**:
Create new endpoint in `organizationsController.ts`:
```typescript
async getOrganizationEnrollments(req: Request, res: Response) {
  const { id } = req.params;
  const enrollments = await prisma.courseRunLearner.findMany({
    where: {
      clientOrganizationId: id,
      deletedAt: null,
    },
    include: {
      learner: true,
      courseRun: {
        include: {
          course: true,
        },
      },
      trainingCoordinator: true,
    },
  });
  
  res.json({ success: true, enrollments });
}
```

### 6. Organization Dashboard
**File**: `/home/kukuh/webprojects/polwel/src/pages/OrganizationDashboard.tsx`

**Changes Needed**:
Update learner fetching to get learners through CourseRunLearner enrollments:
```typescript
// Current: Direct learner query
const fetchLearners = async () => {
  const response = await api.get(`/api/learners?organizationId=${organizationId}`);
};

// Updated: Get unique learners from course run enrollments
const fetchLearners = async () => {
  const response = await api.get(`/api/course-run-learners/by-organization/${organizationId}`);
  // Backend returns unique learners with their enrollment counts
};
```

### 7. Course Run Detail Page
**File**: `/home/kukuh/webprojects/polwel/src/pages/CourseRunDetail.tsx`

**Status**: Should be mostly working since it already queries courseRunLearners
**Verify**: Make sure organization and coordinator data displays correctly from enrollment object

---

## Next Steps (Priority Order)

1. **Update Frontend Dialogs** (High Priority)
   - Enable organization fields in AddLearnersDialog
   - Enable organization fields in EditLearnerDialog
   - Test adding learners to different course runs with different organizations

2. **Update ClientOrganisationDetail** (High Priority)
   - Create backend endpoint for organization enrollments
   - Update frontend to show enrollments instead of direct learners
   - Update data table columns to include course run information

3. **Update OrganizationDashboard** (Medium Priority)
   - Update learner queries to use enrollments
   - Ensure statistics are calculated correctly

4. **Update Other Controllers** (Medium Priority)
   - `organizationAnalyticsController.ts` - Update queries
   - `waiverController.ts` - Update organization queries
   - `courseRunExportController.ts` - Update export queries
   - `reportingController.ts` - Update report queries

5. **Comprehensive Testing** (High Priority)
   - Test adding single learner to course run
   - Test adding group learners to course run
   - Test importing learners from CSV
   - Test editing learner enrollment
   - Test same learner in multiple course runs with different organizations
   - Test organization participant lists
   - Test coordinator filtering

---

## Key Concept: Many-to-Many Relationship

**Before**: Learner → Organization (One-to-One)
- A learner had ONE organization
- A learner had ONE training coordinator
- Problem: Same learner in different course runs must have same organization

**After**: Learner ← CourseRunLearner → Organization (Many-to-Many)
- A learner can have DIFFERENT organizations per course run
- A learner can have DIFFERENT coordinators per course run
- Solution: Same learner (Kukuh) can be:
  - In Math course with Organization ABC, Coordinator Dean
  - In Science course with Organization XYZ, Coordinator John

---

## Testing Checklist

Once all updates are complete, test these scenarios:

- [ ] Add new learner to course run (single registration)
- [ ] Add existing learner to course run with different organization
- [ ] Add group of learners to course run
- [ ] Import learners from CSV file
- [ ] Edit learner organization in course run
- [ ] Edit learner training coordinator in course run
- [ ] View organization participants tab
- [ ] View organization dashboard learners
- [ ] Export course run participants
- [ ] Generate certificates (should still work)
- [ ] Training coordinator can see their learners
- [ ] Reports show correct organization data

---

## Technical Notes

### Backend Query Pattern
When querying courseRunLearners, always include:
```typescript
include: {
  learner: true,
  clientOrganization: true,
  trainingCoordinator: true,
}
```

### Frontend Data Access Pattern
Organization data is now accessed from enrollment, not learner:
```typescript
// ❌ OLD: enrollment.learner.clientOrganization
// ✅ NEW: enrollment.clientOrganization

// ❌ OLD: enrollment.learner.trainingCoordinatorId
// ✅ NEW: enrollment.trainingCoordinatorId
```

### Database Indexes
Indexes added to CourseRunLearner:
- `clientOrganizationId`
- `trainingCoordinatorId`

These ensure fast queries when filtering by organization or coordinator.

---

## Files Modified So Far

1. `/home/kukuh/webprojects/polwel/polwel-backend/prisma/schema.prisma`
2. `/home/kukuh/webprojects/polwel/polwel-backend/src/controllers/courseRunController.ts`
3. Database via SQL migration scripts

## Files Still To Modify

1. `/home/kukuh/webprojects/polwel/src/components/AddLearnersDialog.tsx`
2. `/home/kukuh/webprojects/polwel/src/components/EditLearnerDialog.tsx`
3. `/home/kukuh/webprojects/polwel/src/pages/ClientOrganisationDetail.tsx`
4. `/home/kukuh/webprojects/polwel/src/pages/OrganizationDashboard.tsx`
5. `/home/kukuh/webprojects/polwel/polwel-backend/src/controllers/organizationsController.ts`
6. Multiple other controllers as listed in section 4

---

*Last Updated: February 12, 2026*
*Status: 50% Complete - Database and primary backend endpoints done*
*Next: Frontend dialog updates*
