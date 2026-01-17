# CASL Permission System Implementation Guide

## ✅ What's Been Completed

### 1. CASL Packages Installed
- **Frontend**: `@casl/ability`, `@casl/react`
- **Backend**: `@casl/ability`

### 2. Core CASL Files Created

#### Frontend (`src/lib/casl/`)
- `types.ts` - Permission types and subject mappings
- `ability.ts` - Ability factory for creating permission instances
- `Can.tsx` - React context and Can component for conditional rendering
- `index.ts` - Central export point

#### Backend (`polwel-backend/src/lib/casl/`)
- `types.ts` - Same permission types as frontend
- `ability.ts` - Ability factory for backend
- `index.ts` - Central export point

#### Backend Middleware (`polwel-backend/src/middleware/`)
- `casl.ts` - New middleware for CASL-based permission checks
  - `loadAbility` - Loads user permissions and creates ability
  - `requireAbility(action, subject)` - Check single permission
  - `requireAnyAbility([permissions])` - Check if user has any of the permissions
  - `requireAllAbilities([permissions])` - Check if user has all permissions

### 3. Frontend Integration Started
- Updated `src/hooks/useAuth.tsx` to:
  - Import CASL ability
  - Create ability from user data
  - Provide ability in context
  - Wrap children with `AbilityContext.Provider`

- Created new `src/hooks/usePermission.tsx` with CASL-based API:
  ```typescript
  const { can, cannot, canAny, canAll, ability } = usePermission();
  
  // Usage examples:
  can('view', 'User')  // Check single permission
  canAny([['view', 'User'], ['edit', 'User']])  // Check multiple
  ```

## 📋 Subject (Resource) Mappings

CASL uses semantic names for resources instead of dot-notation strings:

| Database Permission | CASL Subject | CASL Check Example |
|---------------------|--------------|-------------------|
| `users.view` | `User` | `can('view', 'User')` |
| `trainers.view` | `Trainer` | `can('view', 'Trainer')` |
| `clients.view` | `Client` | `can('view', 'Client')` |
| `course-venue.view` | `CourseVenue` | `can('view', 'CourseVenue')` |
| `course-run.view` | `CourseRun` | `can('view', 'CourseRun')` |
| `post-course-run.view` | `PostCourseRun` | `can('view', 'PostCourseRun')` |
| `reports.view` | `Report` | `can('view', 'Report')` |
| `calendar.view` | `Calendar` | `can('view', 'Calendar')` |

## 🔧 Next Steps to Complete Implementation

### Step 1: Update Sidebar.tsx with CASL

Replace the current permission checks with CASL:

```tsx
import { Can } from "@/lib/casl";
import { usePermission } from "@/hooks/usePermission";

const Sidebar = () => {
  const { can } = usePermission();
  const { user } = useAuth();
  
  const isPolwelUser = user?.role === "POLWEL";
  
  // Group visibility using CASL
  const userManagementVisible = isPolwelUser || 
    can('view', 'User') || 
    can('view', 'Trainer') || 
    can('view', 'Client');

  return (
    <nav>
      {/* Use Can component for conditional rendering */}
      <Can I="view" a="User">
        <NavLink to="/polwel-users">POLWEL Users</NavLink>
      </Can>
      
      <Can I="view" a="Trainer">
        <NavLink to="/trainers">Trainers</NavLink>
      </Can>
      
      <Can I="view" a="Client">
        <NavLink to="/client-organisations">Clients</NavLink>
      </Can>
      
      <Can I="view" a="CourseVenue">
        <NavLink to="/course-creation">Course Creation</NavLink>
      </Can>
      
      <Can I="view" a="CourseRun">
        <NavLink to="/course-runs">Course Runs</NavLink>
      </Can>
    </nav>
  );
};
```

### Step 2: Update Backend Routes

Replace old `requirePermissions` with new CASL middleware:

**Before:**
```typescript
router.get('/polwel-users', 
  authenticateToken, 
  requirePermissions(['users.view']), 
  getPolwelUsers
);
```

**After:**
```typescript
import { loadAbility, requireAbility } from '../middleware/casl';

router.get('/polwel-users', 
  authenticateToken,
  loadAbility,  // Load user permissions first
  requireAbility('view', 'User'),  // Check permission
  getPolwelUsers
);
```

### Step 3: Update All Backend Controllers

Find and replace in `polwel-backend/src/routes/`:

1. Add `loadAbility` middleware after `authenticateToken`
2. Replace `requirePermissions('users.view')` → `requireAbility('view', 'User')`
3. Replace `requirePermissions('trainers.edit')` → `requireAbility('edit', 'Trainer')`
4. etc.

### Step 4: Update Other Frontend Components

Replace manual permission checks:

**Before:**
```tsx
{hasPermission('users.view') && <Component />}
```

**After:**
```tsx
<Can I="view" a="User">
  <Component />
</Can>
```

Or use the hook:
```tsx
const { can } = usePermission();
if (can('view', 'User')) {
  // render something
}
```

### Step 5: Test the System

1. **Frontend Testing:**
   - Login as a user with limited permissions
   - Check browser console for CASL debug logs
   - Verify Sidebar shows/hides correctly
   - Verify ability.rules contains correct permissions

2. **Backend Testing:**
   - Test API endpoints with different users
   - Verify 403 errors for insufficient permissions
   - Check that POLWEL users have full access

## 🎯 Benefits of CASL

1. **Type Safety**: TypeScript knows about all subjects and actions
2. **Centralized Logic**: One place to define permissions
3. **Semantic API**: `can('view', 'User')` is clearer than `has('users.view')`
4. **Battle-tested**: Used by thousands of apps
5. **Flexible**: Supports field-level permissions, conditions, etc.
6. **Consistent**: Same API on frontend and backend

## 🐛 Debugging

CASL provides excellent debugging:

```typescript
// See all rules
console.log(ability.rules);

// Check specific permission
console.log(ability.can('view', 'User'));

// See why a permission was denied
console.log(ability.relevantRuleFor('view', 'User'));
```

## 📚 Resources

- CASL Docs: https://casl.js.org/v6/en/
- CASL React: https://casl.js.org/v6/en/package/casl-react

## ⚠️ Important Notes

1. **POLWEL Role**: Automatically gets `can('manage', 'all')` - full access to everything
2. **TRAINER Role**: Currently only gets `can('view', 'Calendar')`
3. **Database Format**: Permissions in DB remain as `module.action` (e.g., `users.view`)
4. **Parsing**: CASL automatically parses DB permissions to subject tuples

## 🚀 Quick Implementation Commands

Run these to complete the implementation:

```powershell
# 1. Update Sidebar (manual - use the example above)
# Edit: c:\laragon\www\polwel\src\components\Sidebar.tsx

# 2. Find all backend routes that need updating
cd c:\laragon\www\polwel\polwel-backend
Select-String -Path "src/routes/*.ts" -Pattern "requirePermissions" -List

# 3. Update each route file found
# Add: import { loadAbility, requireAbility } from '../middleware/casl';
# Replace requirePermissions with requireAbility

# 4. Test frontend
cd c:\laragon\www\polwel
npm run dev

# 5. Test backend
cd polwel-backend
npm run dev
```

Would you like me to continue with implementing these changes, or would you prefer to review what's been set up first?
