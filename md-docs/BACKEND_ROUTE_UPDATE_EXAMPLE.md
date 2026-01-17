# Backend Route Update Example

## Example: Updating clientOrganizations.ts

### Before (Old Permission System)

```typescript
import { authenticateToken, authorizeRoles, requirePermissions } from '../middleware/auth';
import { getClientOrganizations, getAllLearners, getClientOrganizationById } from '../controllers/clientOrganizationsController';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all client organizations
router.get('/', 
  authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), 
  requirePermissions('clients.view'),  // ← Old string-based check
  getClientOrganizations
);

// Get all learners
router.get('/learners', 
  authorizeRoles('POLWEL'), 
  requirePermissions('clients.view'),  // ← Old string-based check
  getAllLearners
);

// Get specific client organization
router.get('/:id', 
  authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), 
  authorizeOrganization, 
  requirePermissions('clients.view'),  // ← Old string-based check
  getClientOrganizationById
);

// Create new client organization
router.post('/', 
  authorizeRoles('POLWEL'), 
  requirePermissions('clients.create'),  // ← Old string-based check
  createClientOrganization
);

// Update client organization
router.put('/:id', 
  authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), 
  authorizeOrganization, 
  requirePermissions('clients.edit'),  // ← Old string-based check
  updateClientOrganization
);

// Delete client organization
router.delete('/:id', 
  authorizeRoles('POLWEL'), 
  requirePermissions('clients.delete'),  // ← Old string-based check
  deleteClientOrganization
);
```

### After (CASL Permission System)

```typescript
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { loadAbility, requireAbility } from '../middleware/casl';  // ← NEW CASL middleware
import { getClientOrganizations, getAllLearners, getClientOrganizationById } from '../controllers/clientOrganizationsController';

const router = express.Router();

// All routes require authentication and ability loading
router.use(authenticateToken);
router.use(loadAbility);  // ← NEW: Load CASL abilities for all routes

// Get all client organizations
router.get('/', 
  authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), 
  requireAbility('view', 'Client'),  // ← NEW CASL check
  getClientOrganizations
);

// Get all learners
router.get('/learners', 
  authorizeRoles('POLWEL'), 
  requireAbility('view', 'Client'),  // ← NEW CASL check
  getAllLearners
);

// Get specific client organization
router.get('/:id', 
  authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), 
  authorizeOrganization, 
  requireAbility('view', 'Client'),  // ← NEW CASL check
  getClientOrganizationById
);

// Create new client organization
router.post('/', 
  authorizeRoles('POLWEL'), 
  requireAbility('create', 'Client'),  // ← NEW CASL check
  createClientOrganization
);

// Update client organization
router.put('/:id', 
  authorizeRoles('POLWEL', 'TRAINING_COORDINATOR'), 
  authorizeOrganization, 
  requireAbility('edit', 'Client'),  // ← NEW CASL check
  updateClientOrganization
);

// Delete client organization
router.delete('/:id', 
  authorizeRoles('POLWEL'), 
  requireAbility('delete', 'Client'),  // ← NEW CASL check
  deleteClientOrganization
);
```

## Quick Reference: Permission Mapping

| Old String | New CASL Subject | Actions |
|------------|------------------|---------|
| `'users.view'` | `('view', 'User')` | view, create, edit, delete |
| `'trainers.view'` | `('view', 'Trainer')` | view, create, edit, delete |
| `'clients.view'` | `('view', 'Client')` | view, create, edit, delete |
| `'course-venue.view'` | `('view', 'CourseVenue')` | view, create, edit, delete |
| `'course-run.view'` | `('view', 'CourseRun')` | view, create, edit, delete, approve |
| `'post-course-run.view'` | `('view', 'PostCourseRun')` | view, create, edit, delete |
| `'reports.view'` | `('view', 'Report')` | view, create, edit, delete |
| `'calendar.view'` | `('view', 'Calendar')` | view, create, edit, delete |

## Steps to Update Each Route File

1. **Add CASL import:**
   ```typescript
   import { loadAbility, requireAbility } from '../middleware/casl';
   ```

2. **Add loadAbility middleware** (after authenticateToken):
   ```typescript
   router.use(authenticateToken);
   router.use(loadAbility);  // Add this
   ```

3. **Replace requirePermissions** with requireAbility:
   - Find: `requirePermissions('clients.view')`
   - Replace: `requireAbility('view', 'Client')`
   
   - Find: `requirePermissions('users.create')`
   - Replace: `requireAbility('create', 'User')`

4. **Test the endpoints** with different user permissions

## Files to Update

Run this command to find all files that need updating:

```powershell
cd c:\laragon\www\polwel\polwel-backend
Select-String -Path "src/routes/*.ts" -Pattern "requirePermissions" -List
```

Common files:
- `src/routes/clientOrganizations.ts`
- `src/routes/polwelUsers.ts`
- `src/routes/trainers.ts`
- `src/routes/courses.ts`
- `src/routes/courseRuns.ts`
- `src/routes/venues.ts`

## Benefits

✅ **Type Safety**: Compiler catches typos in subjects/actions  
✅ **Semantic API**: More readable `requireAbility('view', 'Client')`  
✅ **Consistent**: Same API as frontend  
✅ **Flexible**: Easy to add field-level permissions later  
✅ **Battle-Tested**: Industry-standard library
