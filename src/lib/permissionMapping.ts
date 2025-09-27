// Frontend helper to map UI permission keys (module:action) to canonical dot-style names
const permissionNameMapping: Record<string, string> = {
  // POLWEL users module
  'polwel-users:view': 'users.view',
  'polwel-users:create': 'users.create',
  'polwel-users:edit': 'users.edit',
  'polwel-users:delete': 'users.delete',

  // Trainers & partners module
  'trainers-partners:view': 'trainers.view',
  'trainers-partners:create': 'trainers.create',
  'trainers-partners:edit': 'trainers.edit',
  'trainers-partners:delete': 'trainers.delete',

  // Client organisations module
  'client-organizations:view': 'clients.view',
  'client-organizations:create': 'clients.create',
  'client-organizations:edit': 'clients.edit',
  'client-organizations:delete': 'clients.delete',

  // Course module
  'course:view': 'courses.view',
  'course:create': 'courses.create',
  'course:edit': 'courses.edit',
  'course:delete': 'courses.delete',

  // Course run module (shares backend permissions with courses)
  'course-run:view': 'courses.view',
  'course-run:create': 'courses.create',
  'course-run:edit': 'courses.edit',
  'course-run:delete': 'courses.delete',
  'course-run:approve': 'courses.approve',

  // Venue module
  'venue:view': 'venues.view',
  'venue:create': 'venues.create',
  'venue:edit': 'venues.edit',
  'venue:delete': 'venues.delete',

  // Post course run module (maps to reporting)
  'post-course-run:view': 'reports.view',
  'post-course-run:create': 'reports.create',
  'post-course-run:edit': 'reports.edit',
  'post-course-run:delete': 'reports.delete',

  // Billing reports module (maps to finance/bookings)
  'billing-reports:view': 'bookings.view',
  'billing-reports:create': 'bookings.create',
  'billing-reports:edit': 'bookings.edit',
  'billing-reports:delete': 'bookings.delete',
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
