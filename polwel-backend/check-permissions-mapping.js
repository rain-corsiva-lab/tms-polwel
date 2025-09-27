const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPermissionsMapping() {
  try {
    const permissions = await prisma.permission.findMany({
      select: { id: true, name: true, module: true, action: true }
    });
    
    console.log('Available permissions in database:');
    permissions.forEach(p => {
      console.log(`ID: ${p.id}, Name: '${p.name}', Module: ${p.module}, Action: ${p.action}`);
    });
    
    console.log('\nTotal permissions:', permissions.length);
    
    // Test mapping
    const frontendPerms = ['polwel-users:view', 'course-run:approve', 'billing-reports:edit'];
    const mapping = {
      'polwel-users:view': 'users.view',
      'polwel-users:create': 'users.create',
      'polwel-users:edit': 'users.edit',
      'polwel-users:update': 'users.edit',
      'polwel-users:delete': 'users.delete',
      'course-run:approve': 'courses.approve',
      'course-run:view': 'courses.view',
      'course-run:create': 'courses.create',
      'course-run:edit': 'courses.edit',
      'course-run:update': 'courses.edit',
      'course-run:delete': 'courses.delete',
      'billing-reports:view': 'bookings.view',
      'billing-reports:create': 'bookings.create',
      'billing-reports:edit': 'bookings.edit',
      'billing-reports:update': 'bookings.edit',
      'billing-reports:delete': 'bookings.delete'
    };
    
    console.log('\nTesting mapping:');
    frontendPerms.forEach(fp => {
      const mapped = mapping[fp];
      const found = permissions.find(p => p.name === mapped);
      console.log(`Frontend: '${fp}' -> Database: '${mapped}' -> Found: ${found ? 'YES (ID: ' + found.id + ')' : 'NO'}`);
    });
    
    // Check what's actually in user_permissions table
    console.log('\nCurrent user_permissions entries:');
    const userPerms = await prisma.userPermission.findMany({
      include: {
        permission: true,
        user: { select: { name: true, email: true } }
      }
    });
    
    userPerms.forEach(up => {
      console.log(`UserID: ${up.userId}, PermissionID: ${up.permissionId}, Permission: '${up.permission.name}', User: ${up.user.name}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPermissionsMapping();
