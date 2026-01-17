/**
 * CASL Ability Factory - Frontend
 * 
 * Creates ability instances from user permissions
 */

import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import type { Action, Subject, RawPermission, Permission } from './types';
import { parsePermission } from './types';

// Define the ability type
export type AppAbility = MongoAbility<[Action, Subject]>;

/**
 * Define abilities for a user based on their role and permissions
 */
export function defineAbilityFor(
  role: string | undefined,
  permissions: RawPermission[] | string[] | undefined
): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (import.meta.env.MODE === 'development') {
    console.log('[CASL defineAbilityFor] Starting ability creation:');
    console.log('  Role:', role);
    console.log('  Permissions:', permissions);
  }

  // POLWEL users get full access (superadmin)
  // if (role === 'POLWEL') {
  //   can('manage', 'all');
  //   if (import.meta.env.MODE === 'development') {
  //     console.log('[CASL defineAbilityFor] ✅ POLWEL role detected - granting manage all');
  //   }
  //   return build();
  // }

  // TRAINER role: only access to their own dashboard/calendar (not implemented in this version)
  if (role === 'TRAINER') {
    can('view', 'Calendar');
    return build();
  }

  // Parse and grant permissions from database
  if (Array.isArray(permissions) && permissions.length > 0) {
    if (import.meta.env.MODE === 'development') {
      console.log('[CASL ability] Parsing permissions:', permissions);
    }
    
    permissions.forEach((perm) => {
      // Handle both string and object formats
      let permName: string = '';
      let granted = true;

      if (typeof perm === 'string') {
        // Direct string permission
        permName = perm;
      } else if (perm && typeof perm === 'object') {
        // Object with permissionName property
        permName = (perm as RawPermission).permissionName || '';
        granted = (perm as RawPermission).granted !== false;
      }

      // Skip if not granted or no permission name
      if (!granted || !permName) return;

      const parsed = parsePermission(permName);
      if (parsed) {
        const [action, subject] = parsed;
        can(action, subject);
        
        if (import.meta.env.MODE === 'development') {
          console.log(`[CASL ability] ✅ Granted: can('${action}', '${subject}') from "${permName}"`);
        }
      } else if (import.meta.env.MODE === 'development') {
        console.warn(`[CASL ability] ❌ Failed to parse permission: "${permName}"`);
      }
    });
  }

  const ability = build();
  
  if (import.meta.env.MODE === 'development') {
    console.log('[CASL defineAbilityFor] ✅ Ability created with', ability.rules.length, 'rules:', ability.rules);
  }
  
  return ability;
}

/**
 * Create ability from user object (convenience helper)
 */
export function createAbility(user: { role?: string; permissions?: any[] } | null | undefined): AppAbility {
  if (!user) {
    return createMongoAbility<AppAbility>();
  }
  return defineAbilityFor(user.role, user.permissions);
}
