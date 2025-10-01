/**
 * CASL Ability Factory - Backend
 * 
 * Creates ability instances from user permissions
 */

import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import type { Action, Subject, RawPermission } from './types';
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
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  // POLWEL users get full access (superadmin)
  if (role === 'POLWEL') {
    can('manage', 'all');
    return build();
  }

  // TRAINER role: only access to their own dashboard/calendar
  if (role === 'TRAINER') {
    can('view', 'Calendar');
    return build();
  }

  // Parse and grant permissions from database
  if (Array.isArray(permissions) && permissions.length > 0) {
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
      }
    });
  }

  return build();
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
