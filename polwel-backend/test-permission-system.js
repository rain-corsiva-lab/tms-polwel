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
    const frontendPerms = ['user-management-polwel:view', 'user-management-polwel:create', 'user-management-polwel:edit'];
    const mapping = {
      'user-management-polwel:view': 'users.view',
      'user-management-polwel:create': 'users.create', 
      'user-management-polwel:edit': 'users.edit',
      'user-management-polwel:update': 'users.edit',
      'user-management-polwel:delete': 'users.delete'
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
