# Resource Library - Permission System Implementation

## Overview
Complete implementation of permission-based access control for the Resource Library module, following CASL best practices and consistent with the existing permission system.

## Implementation Date
January 19, 2026

## Changes Made

### 1. Permission Mapping (`src/lib/permissionMapping.ts`)

Added resource-library permission mappings:
```typescript
// Resource library module
'resource-library:view': 'resource-library.view',
'resource-library:create': 'resource-library.create',
'resource-library:edit': 'resource-library.edit',
'resource-library:delete': 'resource-library.delete',
```

**Purpose**: Maps frontend permission keys (used in UI forms) to canonical backend permission names.

### 2. CASL Type Definitions (`src/lib/casl/types.ts`)

#### Added ResourceLibrary Subject
```typescript
export type Subject = 
  | 'User'              // POLWEL users
  | 'Trainer'           // Trainers & Partners
  | 'Client'            // Client Organisations
  | 'CourseVenue'       // Courses & Venues combined
  | 'CourseRun'         // Course Runs
  | 'PostCourseRun'     // Post Course Run artefacts
  | 'Report'            // Billing & Reports
  | 'Waiver'            // Waiver Requests
  | 'ResourceLibrary'   // Resource Library ← NEW
  | 'Calendar'          // Training calendar
  | 'all';              // special subject: applies to all resources
```

#### Added Module-to-Subject Mapping
```typescript
export const MODULE_TO_SUBJECT: Record<string, Subject> = {
  'users': 'User',
  'trainers': 'Trainer',
  'clients': 'Client',
  'course-venue': 'CourseVenue',
  'course-run': 'CourseRun',
  'post-course-run': 'PostCourseRun',
  'reports': 'Report',
  'waiver': 'Waiver',
  'resource-library': 'ResourceLibrary', // ← NEW
  'calendar': 'Calendar',
};
```

**Purpose**: Enables CASL to understand and enforce resource-library permissions using the `Can` component and ability checks.

### 3. Add POLWEL User Dialog (`src/components/AddPolwelUserDialog.tsx`)

#### Added to ModuleKey Type
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
  | "resource-library"; // ← NEW
```

#### Added to Module Configuration
```typescript
const moduleConfig: Record<ModuleKey, { label: string; supportsApprove?: boolean }> = {
  "polwel-users": { label: "POLWEL Users" },
  "trainers-partners": { label: "Trainers & Partners" },
  "client-organizations": { label: "Client Organisations" },
  "course-venue": { label: "Course & Venue" },
  "course-run": { label: "Course Run", supportsApprove: true },
  "post-course-run": { label: "Post Course Run" },
  "billing-reports": { label: "Billing Reports" },
  waiver: { label: "Waiver Requests" },
  "resource-library": { label: "Resource Library" }, // ← NEW
};
```

#### Added to Default Permissions
```typescript
const createDefaultPermissions = (): UserPermissions => ({
  "polwel-users": { view: false, create: false, edit: false, delete: false },
  "trainers-partners": { view: false, create: false, edit: false, delete: false },
  "client-organizations": { view: false, create: false, edit: false, delete: false },
  "course-venue": { view: false, create: false, edit: false, delete: false },
  "course-run": { view: false, create: false, edit: false, delete: false, approve: false },
  "post-course-run": { view: false, create: false, edit: false, delete: false },
  "billing-reports": { view: false, create: false, edit: false, delete: false },
  waiver: { view: false, create: false, edit: false, delete: false },
  "resource-library": { view: false, create: false, edit: false, delete: false }, // ← NEW
});
```

**Purpose**: Allows administrators to grant resource-library permissions when creating new POLWEL users.

### 4. Edit POLWEL User Dialog (`src/components/EditPolwelUserDialog.tsx`)

Same updates as AddPolwelUserDialog:
- Added "resource-library" to ModuleKey type
- Added to moduleConfig with label "Resource Library"
- Added to createDefaultPermissions

**Purpose**: Allows administrators to edit resource-library permissions for existing POLWEL users.

### 5. Sidebar Navigation (`src/components/Sidebar.tsx`)

#### Updated Permission Check
```typescript
{/* Resource Library - Standalone Menu Item */}
{postRunManagementVisible && (
  <Can I="view" a="ResourceLibrary"> {/* Changed from PostCourseRun to ResourceLibrary */}
    <NavItem to="/resource-library" icon={Library} label="Resource Library" />
  </Can>
)}
```

**Purpose**: Menu item only appears for users with `resource-library.view` permission.

### 6. Route Protection (`src/App.tsx`)

#### Updated Route Permission
```typescript
{/* Resource Library */}
<Route
  path="resource-library"
  element={
    <ProtectedRoute requiredPermissions={["resource-library.view"]}> {/* Changed from post-course-run.view */}
      <ResourceLibrary />
    </ProtectedRoute>
  }
/>
```

**Purpose**: Route is protected and only accessible to users with `resource-library.view` permission.

### 7. ResourceLibrary Component (`src/pages/ResourceLibrary.tsx`)

#### Added Permission Checks
```typescript
import { useAuth } from "@/hooks/useAuth";

export default function ResourceLibrary() {
  const { ability } = useAuth();

  // Check permissions
  const canCreate = ability?.can("create", "ResourceLibrary") ?? false;
  const canEdit = ability?.can("edit", "ResourceLibrary") ?? false;
  const canDelete = ability?.can("delete", "ResourceLibrary") ?? false;
  
  // ... rest of component
}
```

#### Conditional Upload Form
```typescript
{/* Upload Form - Only show if user has create or edit permission */}
{(canCreate || canEdit) && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <FileUp className="h-5 w-5" />
        {editingId ? "Edit Resource" : "Upload New Resource"}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {/* Form content */}
    </CardContent>
  </Card>
)}
```

#### Conditional Action Buttons
```typescript
<TableCell className="text-right">
  <div className="flex items-center justify-end gap-2">
    {/* Download is always available */}
    <Button variant="ghost" size="sm" onClick={() => handleDownload(resource)} title="Download">
      <Download className="h-4 w-4" />
    </Button>
    
    {/* Edit button - only if user has edit permission */}
    {canEdit && (
      <Button variant="ghost" size="sm" onClick={() => handleEdit(resource)} title="Edit">
        <Edit2 className="h-4 w-4" />
      </Button>
    )}
    
    {/* Status toggle - only if user has edit permission */}
    {canEdit && (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleToggleStatus(resource)}
        title={resource.status === "PUBLISHED" ? "Set to Draft" : "Publish"}
      >
        {resource.status === "PUBLISHED" ? (
          <XCircle className="h-4 w-4 text-yellow-600" />
        ) : (
          <CheckCircle className="h-4 w-4 text-green-600" />
        )}
      </Button>
    )}
    
    {/* Delete button - only if user has delete permission */}
    {canDelete && (
      <Button variant="ghost" size="sm" onClick={() => handleDelete(resource.id)} title="Remove">
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    )}
  </div>
</TableCell>
```

**Purpose**: 
- Upload form hidden for users without create/edit permissions
- Action buttons conditionally rendered based on user permissions
- Download always available (view permission required to access page)

## Permission Hierarchy

### Permission Levels

1. **resource-library.view** (Required for all actions)
   - Access the Resource Library page
   - View list of resources
   - Download resources

2. **resource-library.create** (Requires view)
   - Upload new resources
   - See upload form

3. **resource-library.edit** (Requires view)
   - Edit existing resources
   - Toggle resource status (DRAFT ↔ PUBLISHED)
   - See edit buttons in table
   - Access upload form for editing

4. **resource-library.delete** (Requires view)
   - Soft delete resources
   - See delete buttons in table

### Typical Role Assignments

**POLWEL Administrator:**
- ✅ resource-library.view
- ✅ resource-library.create
- ✅ resource-library.edit
- ✅ resource-library.delete

**POLWEL Content Manager:**
- ✅ resource-library.view
- ✅ resource-library.create
- ✅ resource-library.edit
- ❌ resource-library.delete

**POLWEL Viewer:**
- ✅ resource-library.view
- ❌ resource-library.create
- ❌ resource-library.edit
- ❌ resource-library.delete

## Best Practices Implemented

### 1. **Consistent Permission Naming**
- Frontend keys: `resource-library:action` (kebab-case with colon)
- Backend canonical: `resource-library.action` (kebab-case with dot)
- CASL subjects: `ResourceLibrary` (PascalCase)

### 2. **Granular Permission Checks**
- Component-level checks using `useAuth().ability`
- UI element-level checks for buttons and forms
- Route-level checks using `ProtectedRoute`
- Menu-level checks using `<Can>` component

### 3. **Graceful Degradation**
- Users without create/edit see view-only interface
- No error messages for missing permissions
- Download always available (requires view only)
- Clean UI without disabled buttons

### 4. **Defense in Depth**
- Frontend permission checks (UX)
- Route protection (Navigation)
- Backend API permission checks (Security)
- Three layers of validation

### 5. **Type Safety**
- TypeScript types for all permission-related code
- CASL Subject types properly defined
- ModuleKey union types for exhaustive checks
- No `any` types in permission logic

## Backend Permission Validation

The backend already implements permission checks in the controller:

```typescript
// polwel-backend/src/routes/resourceLibrary.ts
router.get('/', authenticate, requirePermissions('resource-library.view'), controller.getAll);
router.get('/:id', authenticate, requirePermissions('resource-library.view'), controller.getById);
router.post('/', authenticate, requirePermissions('resource-library.create'), controller.create);
router.put('/:id', authenticate, requirePermissions('resource-library.edit'), controller.update);
router.patch('/:id/status', authenticate, requirePermissions('resource-library.edit'), controller.updateStatus);
router.delete('/:id', authenticate, requirePermissions('resource-library.delete'), controller.delete);
```

## Testing Checklist

### Permission Assignment
- [ ] Grant resource-library.view to user → User can access page and download
- [ ] Grant resource-library.create → User can see upload form
- [ ] Grant resource-library.edit → User can edit and toggle status
- [ ] Grant resource-library.delete → User can delete resources
- [ ] Revoke all permissions → User cannot access page (403)

### UI Visibility
- [ ] User with view only → No upload form, no action buttons (except download)
- [ ] User with create → Upload form visible
- [ ] User with edit → Edit and status toggle buttons visible
- [ ] User with delete → Delete button visible

### Route Protection
- [ ] Access /resource-library without permission → Redirected to 403
- [ ] Access /resource-library with view permission → Success
- [ ] Menu item hidden without permission

### Backend API
- [ ] POST without create permission → 403 Forbidden
- [ ] PUT without edit permission → 403 Forbidden
- [ ] DELETE without delete permission → 403 Forbidden
- [ ] GET with view permission → Success

## Database Setup

Run the following SQL to insert the permissions into the database:

```sql
-- Insert resource-library permissions
INSERT INTO `Permission` (`id`, `permissionName`, `description`, `createdAt`, `updatedAt`)
VALUES
  (CONCAT('perm_', UUID()), 'resource-library.view', 'View resource library resources', NOW(), NOW()),
  (CONCAT('perm_', UUID()), 'resource-library.create', 'Create new resource library resources', NOW(), NOW()),
  (CONCAT('perm_', UUID()), 'resource-library.edit', 'Edit resource library resources', NOW(), NOW()),
  (CONCAT('perm_', UUID()), 'resource-library.delete', 'Delete resource library resources', NOW(), NOW());

-- Grant all resource-library permissions to POLWEL role
INSERT INTO `RolePermission` (`roleId`, `permissionId`, `createdAt`, `updatedAt`)
SELECT 
  r.id as roleId,
  p.id as permissionId,
  NOW() as createdAt,
  NOW() as updatedAt
FROM `Role` r
CROSS JOIN `Permission` p
WHERE r.name = 'POLWEL' 
AND p.permissionName LIKE 'resource-library.%'
AND NOT EXISTS (
  SELECT 1 FROM `RolePermission` rp 
  WHERE rp.roleId = r.id AND rp.permissionId = p.id
);
```

## Files Modified

### Frontend
1. `/src/lib/permissionMapping.ts` - Added permission mappings
2. `/src/lib/casl/types.ts` - Added ResourceLibrary subject
3. `/src/components/AddPolwelUserDialog.tsx` - Added resource-library module
4. `/src/components/EditPolwelUserDialog.tsx` - Added resource-library module
5. `/src/components/Sidebar.tsx` - Fixed permission check
6. `/src/App.tsx` - Fixed route protection
7. `/src/pages/ResourceLibrary.tsx` - Added permission-based UI

### Backend
No changes required - permissions already implemented in routes.

## Build Status

✅ **Frontend Build**: Success (no errors)
✅ **TypeScript Compilation**: Success
✅ **Permission System**: Fully integrated
✅ **CASL Integration**: Complete

## Summary

The Resource Library module now has comprehensive permission-based access control following these best practices:

1. ✅ **Consistent** with existing permission system
2. ✅ **Granular** permissions (view, create, edit, delete)
3. ✅ **Secure** with frontend + backend validation
4. ✅ **Type-safe** with full TypeScript support
5. ✅ **User-friendly** with graceful UI degradation
6. ✅ **CASL compliant** using proper subjects and actions

Users will now see only the UI elements they have permission to use, and all actions are validated both on the frontend (for UX) and backend (for security).
