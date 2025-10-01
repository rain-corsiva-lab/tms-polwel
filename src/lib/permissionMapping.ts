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

  // Combined course & venue module (new canonical)
  'course-venue:view': 'course-venue.view',
  'course-venue:create': 'course-venue.create',
  'course-venue:edit': 'course-venue.edit',
  'course-venue:delete': 'course-venue.delete',

  // Course run module (distinct canonical permissions)
  'course-run:view': 'course-run.view',
  'course-run:create': 'course-run.create',
  'course-run:edit': 'course-run.edit',
  'course-run:delete': 'course-run.delete',
  'course-run:approve': 'course-run.approve',

  // Legacy course module keys -> map to combined canonical
  'course:view': 'course-venue.view',
  'course:create': 'course-venue.create',
  'course:edit': 'course-venue.edit',
  'course:delete': 'course-venue.delete',

  // Legacy venue module keys -> map to combined canonical
  'venue:view': 'course-venue.view',
  'venue:create': 'course-venue.create',
  'venue:edit': 'course-venue.edit',
  'venue:delete': 'course-venue.delete',

  // Post course run module → post-course-run.* permissions
  'post-course-run:view': 'post-course-run.view',
  'post-course-run:create': 'post-course-run.create',
  'post-course-run:edit': 'post-course-run.edit',
  'post-course-run:delete': 'post-course-run.delete',

  // Billing reports module → reports.* permissions
  'billing-reports:view': 'reports.view',
  'billing-reports:create': 'reports.create',
  'billing-reports:edit': 'reports.edit',
  'billing-reports:delete': 'reports.delete',
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
