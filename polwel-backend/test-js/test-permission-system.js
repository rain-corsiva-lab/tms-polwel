const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNewPermissionSystem() {
  try {
    console.log('=== Testing New Permission System ===\n');
    
    // Check current user permissions with new schema
    console.log('Current user permissions in database:');
    const userPerms = await prisma.userPermission.findMany({
      include: {
        user: { select: { name: true, email: true } }
      }
    });
    
    userPerms.forEach(up => {
      console.log(`✅ UserID: ${up.userId}`);
      console.log(`   Permission: ${up.permissionName} (Human Readable!)`);
      console.log(`   User: ${up.user.name || up.user.email}`);
      console.log(`   Granted: ${up.granted}`);
      console.log('');
    });
    
    console.log(`Total permissions stored: ${userPerms.length}`);
    
    // Test permission mapping
    console.log('\n=== Testing Permission Mapping ===');
    const frontendPerms = ['polwel-users:view', 'course-run:approve', 'billing-reports:delete', 'user-management-polwel:view'];
    const mapping = {
      'polwel-users:view': 'users.view',
      'polwel-users:create': 'users.create',
      'polwel-users:edit': 'users.edit',
      'polwel-users:update': 'users.edit',
      'polwel-users:delete': 'users.delete',
  'course-run:view': 'course-run.view',
  'course-run:create': 'course-run.create',
  'course-run:edit': 'course-run.edit',
  'course-run:update': 'course-run.edit',
  'course-run:delete': 'course-run.delete',
  'course-run:approve': 'course-run.approve',
      'billing-reports:view': 'bookings.view',
      'billing-reports:create': 'bookings.create',
      'billing-reports:edit': 'bookings.edit',
      'billing-reports:update': 'bookings.edit',
      'billing-reports:delete': 'bookings.delete',
      // Legacy key check
      'user-management-polwel:view': 'users.view'
    };
    
    frontendPerms.forEach(fp => {
      const mapped = mapping[fp];
      console.log(`Frontend: "${fp}" → Database: "${mapped}"`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewPermissionSystem();
