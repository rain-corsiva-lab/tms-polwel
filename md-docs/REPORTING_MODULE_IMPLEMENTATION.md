# Reporting Module Implementation Guide

This document outlines the complete implementation of the Reporting module based on the 7 design images provided.

## Overview

The Reporting module consists of:
1. **Index Page** - Dashboard with 6 report type cards
2. **Board Report** - Quarterly performance summary
3. **Runs by Organisation** - Course runs grouped by client organization
4. **Runs by Trainer** - Course runs grouped by trainer
5. **Runs by Status** - Course runs filtered by status
6. **Runs by Period** - Course runs grouped by time period (month/year)
7. **Runs by Venue** - Course runs grouped by venue with utilization stats

## Backend Implementation ✅ COMPLETED

### Files Created:
- `/polwel-backend/src/controllers/reportingController.ts` - All 8 controller functions
- `/polwel-backend/src/routes/reporting.ts` - API routes

### API Endpoints:
```
GET /api/reporting/board-report
GET /api/reporting/runs-by-organisation?organizationId=&status=&search=&page=&limit=
GET /api/reporting/runs-by-trainer?trainerId=&status=&search=&page=&limit=
GET /api/reporting/runs-by-status?status=&organizationId=&trainerId=&search=&page=&limit=
GET /api/reporting/runs-by-period?period=&status=&organizationId=&search=&page=&limit=
GET /api/reporting/runs-by-venue?venueId=&status=&search=&page=&limit=
GET /api/reporting/run-details/:id
GET /api/reporting/filter-options
```

## Next Steps

### Step 1: Add Route to Main Index
File: `/polwel-backend/src/index.ts`

Add import:
```typescript
import reportingRoutes from './routes/reporting';
```

Add route:
```typescript
app.use('/api/reporting', reportingRoutes);
```

### Step 2: Update Permissions

#### A. upsertMissingPermissions.ts
Add to PERMISSIONS array:
```typescript
// Reporting module
{ name: 'reporting.view', description: 'View reports', module: 'Reporting', action: 'read' },
{ name: 'reporting.create', description: 'Create reports', module: 'Reporting', action: 'create' },
{ name: 'reporting.edit', description: 'Edit reports', module: 'Reporting', action: 'update' },
{ name: 'reporting.delete', description: 'Delete reports', module: 'Reporting', action: 'delete' },
```

#### B. Backend Permission Mapping
File: `/polwel-backend/src/controllers/polwelUsersController.ts`

Add to `permissionNameMapping`:
```typescript
// Reporting module
'reporting:view': 'reporting.view',
'reporting:create': 'reporting.create',
'reporting:edit': 'reporting.edit',
'reporting:update': 'reporting.edit',
'reporting:delete': 'reporting.delete',
```

#### C. Frontend Permission Dialogs
Files: `AddPolwelUserDialog.tsx`, `EditPolwelUserDialog.tsx`

Add `"reporting"` to ModuleKey type:
```typescript
type ModuleKey =
  | "polwel-users"
  | "trainers-partners"
  | "client-organizations"
  | "course-venue"
  | "course-run"
  | "post-course-run"
  | "billing-reports"
  | "waiver"
  | "resource-library"
  | "reporting";  // ADD THIS
```

Add to moduleConfig:
```typescript
reporting: { label: "Reporting" },
```

Add to createDefaultPermissions():
```typescript
reporting: { view: false, create: false, edit: false, delete: false },
```

Add to moduleMapping in EditPolwelUserDialog:
```typescript
reports: "reporting",
reporting: "reporting",
```

#### D. Frontend CASL Types
File: `/polwel-backend/src/lib/casl/types.ts`

Add to Subject type:
```typescript
export type Subject = 
  | 'User'
  | 'Trainer'
  | 'Client'
  | 'CourseVenue'
  | 'CourseRun'
  | 'PostCourseRun'
  | 'BillingReports'
  | 'Waiver'
  | 'ResourceLibrary'
  | 'Reporting'  // ADD THIS
  | 'all';
```

Add to MODULE_TO_SUBJECT:
```typescript
'reporting': 'Reporting',
```

### Step 3: Frontend Implementation

#### A. Create Reporting Index Page
File: `/src/pages/Reporting.tsx`

6 cards linking to:
- /reporting/board-report
- /reporting/runs-by-organisation
- /reporting/runs-by-trainer
- /reporting/runs-by-status
- /reporting/runs-by-period
- /reporting/runs-by-venue

#### B. Create Report Pages
Files:
- `/src/pages/reporting/BoardReport.tsx`
- `/src/pages/reporting/RunsByOrganisation.tsx`
- `/src/pages/reporting/RunsByTrainer.tsx`
- `/src/pages/reporting/RunsByStatus.tsx`
- `/src/pages/reporting/RunsByPeriod.tsx`
- `/src/pages/reporting/RunsByVenue.tsx`

Each page needs:
- Data table with filters
- Search functionality
- Pagination
- View details button (opens popup)
- Export to Excel button
- Proper styling matching the design

#### C. Update App Router
File: `/src/App.tsx`

Add routes:
```tsx
<Route path="/reporting" element={
  <ProtectedRoute>
    <Reporting />
  </ProtectedRoute>
} />
<Route path="/reporting/board-report" element={
  <ProtectedRoute>
    <BoardReport />
  </ProtectedRoute>
} />
// ... add other 5 routes
```

#### D. Update Sidebar
File: `/src/components/Sidebar.tsx`

Add menu item:
```tsx
{(isPolwelUser || can("view", "Reporting")) && (
  <NavItem to="/reporting" icon={BarChart3} label="Reporting" />
)}
```

Add import:
```tsx
import { BarChart3 } from "lucide-react";
```

### Step 4: API Client Functions
File: `/src/lib/api.ts`

Add reporting API functions:
```typescript
reporting: {
  getBoardReport: () => apiRequest('/reporting/board-report'),
  getRunsByOrganisation: (params: any) => apiRequest('/reporting/runs-by-organisation', { params }),
  getRunsByTrainer: (params: any) => apiRequest('/reporting/runs-by-trainer', { params }),
  getRunsByStatus: (params: any) => apiRequest('/reporting/runs-by-status', { params }),
  getRunsByPeriod: (params: any) => apiRequest('/reporting/runs-by-period', { params }),
  getRunsByVenue: (params: any) => apiRequest('/reporting/runs-by-venue', { params }),
  getRunDetails: (id: string) => apiRequest(`/reporting/run-details/${id}`),
  getFilterOptions: () => apiRequest('/reporting/filter-options'),
},
```

### Step 5: Excel Export Utility
Create `/src/utils/excelExport.ts` for XLSX export functionality

### Step 6: Fix seed.ts
The seed file needs to match current schema. Key issues:
- Remove deprecated fields
- Match current table structures
- Ensure foreign keys are correct

## Implementation Order

1. ✅ Backend controllers and routes created
2. ⏳ Add reporting routes to main index.ts
3. ⏳ Update all permission files
4. ⏳ Create frontend pages
5. ⏳ Update API client
6. ⏳ Update Sidebar
7. ⏳ Fix seed.ts
8. ⏳ Test everything

## Database Tables Used

All reports query these tables:
- `course_runs` (main table)
- `courses`
- `organizations`
- `venues`
- `trainers`
- `course_run_trainers`
- `partners`
- `course_run_partners`
- `learners`
- `course_run_learners`
- `course_run_learner_attendance`
- `course_run_billings`
- `course_run_billing_entries`

## Notes

- All endpoints include proper error handling
- Pagination supported on all list endpoints
- Search and filtering on all relevant pages
- Permission checks via CASL on frontend
- Excel export functionality needed for all report pages
- Popup view details component can be shared across pages
