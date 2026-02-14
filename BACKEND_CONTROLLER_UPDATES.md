# Backend Controller Updates for Many-to-Many Relationship

## Summary
This document tracks all backend controllers that need updates after moving `clientOrganizationId` and `trainingCoordinatorId` from the Learner model to the CourseRunLearner model.

## ✅ Completed Updates

### 1. courseRunController.ts
- `enrollLearner` - Creates learner without org fields, stores in enrollment ✅
- `enrollLearners` - Group enrollment updated ✅
- `importLearners` - CSV import stores org in enrollment ✅
- `updateEnrollment` - Updates enrollment with org fields ✅
- `getLearners` - Includes clientOrganization and trainingCoordinator relations ✅
- `getAll` - Updated course runs list query ✅

### 2. organizationsController.ts
- `getOrganizationById` - Changed `learners` to `courseRunLearners` ✅
- `getOrganizationEnrollments` - NEW endpoint to fetch enrollments for organization ✅

### 3. clientOrganizationsController.ts (Partially Complete)
- `getOrganizationLearnersSelf` - Coordinator learners endpoint updated ✅
- `getClientOrganizationById` - Fixed learner counts and course run queries ✅
- `getAllLearners` - **NEEDS UPDATE** (lines 1016-1120) ⚠️

## ⚠️ Pending Updates

### clientOrganizationsController.ts
- **getAllLearners** (line 1016): Currently queries `clientOrganizationId` from Learner model
  - Need to query unique learners from CourseRunLearner
  - Show each learner with their most recent enrollment's organization
  - Update formatting to handle learners with multiple orgs/coordinators

### organizationAnalyticsController.ts
- Line 93: `clientOrganizationId: organizationId`
- Line 112: `clientOrganizationId: organizationId`
- Line 192: `clientOrganizationId: organizationId`
- **Action**: Need to update analytics queries to use CourseRunLearner

### reportingController.ts
- Line 370: `where.clientOrganizationId = organizationId`
- Line 598: `where.clientOrganizationId = organizationId`
- **Action**: Update report queries to filter through CourseRunLearner

### waiverController.ts
- Line 47: `clientOrganizationId: organizationId as string`
- **Action**: Update waiver queries to use CourseRunLearner clientOrganizationId

## Frontend Updates Completed

### ✅ Dialog Components
- `AddLearnersDialog.tsx` - Organization fields now enabled for existing learners ✅
- `EditLearnerDialog.tsx` - Already allows organization changes ✅

### ✅ Organization Pages
- `ClientOrganisationDetail.tsx` - Now displays enrollments with course info ✅
  - New columns: Course, Course Run, Coordinator
  - Links to course runs instead of learner details only

### ⚠️ Dashboard
- `OrganizationDashboard.tsx` - Uses `getCoordinatorLearners` which is now fixed ✅
  - Displays total/active learners (calculated from enrollments) ✅

## Next Steps

1. **Update getAllLearners in clientOrganizationsController.ts**
   - Modify query to get unique learners from CourseRunLearner
   - Aggregate organization/coordinator data from their enrollments
   - Consider showing most recent or primary enrollment info

2. **Update organizationAnalyticsController.ts**
   - All analytics should query through CourseRunLearner
   - Update enrollment status tracking
   - Verify completion rate calculations

3. **Update reportingController.ts**
   - Modify report generation to use CourseRunLearner
   - Ensure exports include correct organization context

4. **Update waiverController.ts**
   - Query waivers through CourseRunLearner
   - Maintain organization filtering capability

5. **Comprehensive Testing**
   - Test all enrollment flows
   - Verify organization dashboards
   - Check coordinator self-service features
   - Test analytics and reports
   - Verify waiver system functionality

## Technical Notes

### Query Pattern Change
**Old Pattern:**
```typescript
prisma.learner.findMany({
  where: { clientOrganizationId: orgId }
})
```

**New Pattern:**
```typescript
// Get unique learners from enrollments
const enrollments = await prisma.courseRunLearner.findMany({
  where: { clientOrganizationId: orgId },
  select: { learnerId: true },
  distinct: ['learnerId']
});

const learnerIds = enrollments.map(e => e.learnerId);

const learners = await prisma.learner.findMany({
  where: { id: { in: learnerIds } },
  include: {
    courseRunLearners: {
      where: { clientOrganizationId: orgId }
    }
  }
});
```

### Counting Pattern
**Old:**
```typescript
await prisma.learner.count({ where: { clientOrganizationId: orgId } })
```

**New:**
```typescript
const enrollments = await prisma.courseRunLearner.findMany({
  where: { clientOrganizationId: orgId, deletedAt: null },
  select: { learnerId: true },
  distinct: ['learnerId']
});
const count = enrollments.length;
```

## Database Schema Reference

### CourseRunLearner (Pivot Table)
```prisma
model CourseRunLearner {
  id                      String        @id @default(cuid())
  courseRunId             String
  learnerId               String
  clientOrganizationId    String?       // Moved from Learner
  trainingCoordinatorId   String?       // Moved from Learner
  departmentName          String?       // Moved from Learner
  division                String?
  buNumber                String?
  status                  String        @default("ENROLLED")
  // ... other fields
  
  courseRun               CourseRun     @relation(...)
  learner                 Learner       @relation(...)
  clientOrganization      Organization? @relation(...)
  trainingCoordinator     User?         @relation(...)
}
```

### Learner (Simplified)
```prisma
model Learner {
  id                  String              @id @default(cuid())
  fullname            String
  email               String
  designation         String?
  contactNumber       String?
  // clientOrganizationId   REMOVED
  // trainingCoordinatorId  REMOVED
  // departmentName         REMOVED
  
  courseRunLearners   CourseRunLearner[]
}
```

