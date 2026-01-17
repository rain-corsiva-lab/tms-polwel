const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPermissionMappings() {
  try {
    console.log('=== Frontend to Database Permission Mapping Test ===\n');
    
    const testPermissions = [
      'polwel-users:view',
      'trainers-partners:create',
      'client-organizations:edit',
      'course-run:approve',
      'venue:delete',
      'post-course-run:create',
      'billing-reports:view',
      // legacy key should still map
      'user-management-polwel:view'
    ];
    
    // Permission name mapping
    const permissionNameMapping = {
      // New module keys
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

  'course-run:view': 'course-run.view',
  'course-run:create': 'course-run.create',
  'course-run:edit': 'course-run.edit',
  'course-run:update': 'course-run.edit',
  'course-run:delete': 'course-run.delete',
  'course-run:approve': 'course-run.approve',

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
      'billing-reports:delete': 'bookings.delete',

      // Legacy keys - keep for compatibility
      'user-management-polwel:view': 'users.view',
      'user-management-polwel:create': 'users.create',
      'user-management-polwel:edit': 'users.edit',
      'user-management-polwel:update': 'users.edit',
      'user-management-polwel:delete': 'users.delete',

      'user-management-trainers:view': 'trainers.view',
      'user-management-trainers:create': 'trainers.create',
      'user-management-trainers:edit': 'trainers.edit',
      'user-management-trainers:update': 'trainers.edit',
      'user-management-trainers:delete': 'trainers.delete',

      'user-management-client-orgs:view': 'clients.view',
      'user-management-client-orgs:create': 'clients.create',
      'user-management-client-orgs:edit': 'clients.edit',
      'user-management-client-orgs:update': 'clients.edit',
      'user-management-client-orgs:delete': 'clients.delete',

  'course-management:view': 'course-venue.view',
  'course-management:create': 'course-venue.create',
  'course-management:edit': 'course-venue.edit',
  'course-management:update': 'course-venue.edit',
  'course-management:delete': 'course-venue.delete',

  'course-venue-setup:view': 'course-venue.view',
  'course-venue-setup:create': 'course-venue.create',
  'course-venue-setup:edit': 'course-venue.edit',
  'course-venue-setup:update': 'course-venue.edit',
  'course-venue-setup:delete': 'course-venue.delete'
    };
    
    console.log('Testing permission mappings:');
    testPermissions.forEach(fp => {
      const mapped = permissionNameMapping[fp];
      console.log(`Frontend: "${fp}" → Database: "${mapped || 'NOT MAPPED'}"`);
    });
    
    console.log('\n=== Database Permissions Check ===');
    const dbPermissions = await prisma.permission.findMany({
      select: { name: true, module: true, action: true }
    });
    
    console.log('Available database permissions:');
    dbPermissions.forEach(p => {
      console.log(`Name: "${p.name}", Module: ${p.module}, Action: ${p.action}`);
    });
    
    console.log('\n=== Mapping Validation ===');
    const mappedNames = testPermissions.map(fp => permissionNameMapping[fp]).filter(Boolean);
    const missingInDb = mappedNames.filter(name => !dbPermissions.find(p => p.name === name));
    
    if (missingInDb.length > 0) {
      console.log('⚠️ Permissions missing in database:');
      missingInDb.forEach(name => console.log(`  - ${name}`));
    } else {
      console.log('✅ All mapped permissions exist in database');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPermissionMappings();
