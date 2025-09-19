// Frontend helper to map UI permission keys (module:action) to canonical dot-style names
const permissionNameMapping: Record<string, string> = {
  'user-management-polwel:view': 'users.view',
  'user-management-polwel:create': 'users.create',
  'user-management-polwel:edit': 'users.edit',
  'user-management-polwel:delete': 'users.delete',

  'user-management-trainers:view': 'trainers.view',
  'user-management-trainers:create': 'trainers.create',
  'user-management-trainers:edit': 'trainers.edit',
  'user-management-trainers:delete': 'trainers.delete',

  'user-management-client-orgs:view': 'clients.view',
  'user-management-client-orgs:create': 'clients.create',
  'user-management-client-orgs:edit': 'clients.edit',
  'user-management-client-orgs:delete': 'clients.delete',

  'course-runs-operations:view': 'courses.view',
  'course-runs-operations:create': 'courses.create',
  'course-runs-operations:edit': 'courses.edit',
  'course-runs-operations:delete': 'courses.delete',

  'course-venue-setup:view': 'venues.view',
  'course-venue-setup:create': 'venues.create',
  'course-venue-setup:edit': 'venues.edit',
  'course-venue-setup:delete': 'venues.delete',

  'email-reporting-library:view': 'reports.view',
  'email-reporting-library:create': 'reports.create',
  'email-reporting-library:edit': 'reports.edit',
  'email-reporting-library:delete': 'reports.delete',

  'finance-activity:view': 'bookings.view',
  'finance-activity:create': 'bookings.create',
  'finance-activity:edit': 'bookings.edit',
  'finance-activity:delete': 'bookings.delete',
};

export function mapFrontendPermissions(frontendPerms: string[]) {
  const mapped: string[] = [];
  for (const p of frontendPerms) {
    if (!p) continue;
    const key = String(p);
    const direct = permissionNameMapping[key];
    if (direct) {
      mapped.push(direct);
      continue;
    }

    // heuristic: replace ':' and '-' with '.'
    const heuristic = key.toLowerCase().replace(/:/g, '.').replace(/-/g, '.');
    mapped.push(heuristic);
  }
  return mapped;
}

export function toCanonicalPermission(name: string) {
  const direct = permissionNameMapping[name];
  if (direct) return direct;
  return String(name).toLowerCase().replace(/:/g, '.').replace(/-/g, '.');
}
