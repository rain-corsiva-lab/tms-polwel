// Quick test of permission mapping logic (mirror of controller mapping)

const permissionNameMapping: Record<string, string> = {
  'polwel-users:view': 'users.view',
  'polwel-users:create': 'users.create',
  'polwel-users:edit': 'users.edit',
  'polwel-users:update': 'users.edit',
  'polwel-users:delete': 'users.delete',

  'trainers-partners:view': 'trainers.view',
  'trainers-partners:create': 'trainers.create',
  'trainers-partners:edit': 'trainers.edit',
  'trainers-partners:update': 'trainers.edit',
  'trainers-partners:delete': 'trainers.delete',

  'client-organizations:view': 'clients.view',
  'client-organizations:create': 'clients.create',
  'client-organizations:edit': 'clients.edit',
  'client-organizations:update': 'clients.edit',
  'client-organizations:delete': 'clients.delete',

  'course:view': 'course-venue.view',
  'course:create': 'course-venue.create',
  'course:edit': 'course-venue.edit',
  'course:update': 'course-venue.edit',
  'course:delete': 'course-venue.delete',

  'course-venue:view': 'course-venue.view',
  'course-venue:create': 'course-venue.create',
  'course-venue:edit': 'course-venue.edit',
  'course-venue:update': 'course-venue.edit',
  'course-venue:delete': 'course-venue.delete',
  'course-venue.view': 'course-venue.view',
  'course-venue.create': 'course-venue.create',
  'course-venue.edit': 'course-venue.edit',
  'course-venue.delete': 'course-venue.delete',

  'course-run:view': 'course-run.view',
  'course-run:create': 'course-run.create',
  'course-run:edit': 'course-run.edit',
  'course-run:update': 'course-run.edit',
  'course-run:delete': 'course-run.delete',
  'course-run:approve': 'course-run.approve',
  'course-run.view': 'course-run.view',
  'course-run.create': 'course-run.create',
  'course-run.edit': 'course-run.edit',
  'course-run.update': 'course-run.edit',
  'course-run.delete': 'course-run.delete',
  'course-run.approve': 'course-run.approve',
  'course.run.view': 'course-run.view',
  'course.run.create': 'course-run.create',
  'course.run.edit': 'course-run.edit',
  'course.run.update': 'course-run.edit',
  'course.run.delete': 'course-run.delete',
  'course.run.approve': 'course-run.approve',

  'venue:view': 'venues.view',
  'venue:create': 'venues.create',
  'venue:edit': 'venues.edit',
  'venue:update': 'venues.edit',
  'venue:delete': 'venues.delete',

  'post-course-run:view': 'reports.view',
  'post-course-run:create': 'reports.create',
  'post-course-run:edit': 'reports.edit',
  'post-course-run:update': 'reports.edit',
  'post-course-run:delete': 'reports.delete',

  'billing-reports:view': 'bookings.view',
  'billing-reports:create': 'bookings.create',
  'billing-reports:edit': 'bookings.edit',
  'billing-reports:update': 'bookings.edit',
  'billing-reports:delete': 'bookings.delete'
};

function mapPermissionNames(frontendPermissions: string[]): string[] {
  return frontendPermissions.map(permission => {
    const mapped = permissionNameMapping[permission];
    if (mapped) return mapped;
    const norm = String(permission).toLowerCase();
    const dot1 = norm.replace(/:/g, '.').replace(/-/g, '.');
    if (dot1.includes('.')) return dot1;
    return permission;
  });
}

const samples = [
  ['course-run:view', 'course-run:approve', 'course-venue:view', 'course:view', 'venue:create'],
  ['course-run:create', 'course-venue.create', 'course:delete', 'courses.view', 'course.run.approve'],
  ['course-venue:edit', 'course-run.update', 'venue:edit']
];

for (const s of samples) {
  console.log('Input:', s);
  console.log('Mapped:', mapPermissionNames(s));
  console.log('---');
}
