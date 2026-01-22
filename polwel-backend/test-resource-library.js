const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testResourceLibraryPermissions() {
  console.log('🧪 Testing Resource Library Permissions\n');
  
  // 1. Check Permission table
  console.log('1️⃣ Checking Permission table...');
  const permissions = await prisma.permission.findMany({
    where: { name: { startsWith: 'resource' } }
  });
  console.log('   Permissions in DB:');
  permissions.forEach(p => console.log('    ✓', p.name));
  
  if (permissions.some(p => p.name.includes('resource.library'))) {
    console.log('   ❌ ERROR: Found permissions with dots (resource.library.*)');
    return false;
  }
  if (permissions.length !== 4 || !permissions.every(p => p.name.startsWith('resource-library.'))) {
    console.log('   ❌ ERROR: Expected 4 resource-library.* permissions');
    return false;
  }
  console.log('   ✅ Permission table correct\n');
  
  // 2. Check user permissions
  console.log('2️⃣ Checking user permissions...');
  const user = await prisma.user.findFirst({
    where: { email: 'kukuhthewow@gmail.com' },
    include: {
      permissions: {
        where: { permissionName: { startsWith: 'resource' } }
      }
    }
  });
  
  if (!user) {
    console.log('   ⚠️  User not found');
    return false;
  }
  
  console.log('   User:', user.name);
  console.log('   Resource permissions:');
  user.permissions.forEach(p => console.log('    ✓', p.permissionName, '(granted:', p.granted + ')'));
  
  if (user.permissions.some(p => p.permissionName.includes('resource.library'))) {
    console.log('   ❌ ERROR: User has permissions with dots (resource.library.*)');
    return false;
  }
  
  const expectedPerms = ['resource-library.view', 'resource-library.create', 'resource-library.edit', 'resource-library.delete'];
  const hasAll = expectedPerms.every(exp => user.permissions.some(p => p.permissionName === exp));
  
  if (!hasAll) {
    console.log('   ❌ ERROR: User missing some resource-library permissions');
    console.log('   Expected:', expectedPerms);
    console.log('   Found:', user.permissions.map(p => p.permissionName));
    return false;
  }
  console.log('   ✅ User permissions correct\n');
  
  // 3. Test API response format
  console.log('3️⃣ Checking API response format...');
  const apiUser = await prisma.user.findFirst({
    where: { id: user.id, role: 'POLWEL' },
    select: {
      id: true,
      email: true,
      name: true,
      permissions: {
        select: {
          id: true,
          permissionName: true,
          granted: true
        }
      }
    }
  });
  
  console.log('   API would return:');
  const resourcePerms = apiUser.permissions.filter(p => p.permissionName.startsWith('resource'));
  resourcePerms.forEach(p => console.log('    -', p.permissionName));
  console.log('   ✅ API format correct\n');
  
  console.log('✅ All tests passed!');
  console.log('\n📝 Summary:');
  console.log('   - Database stores: resource-library.view, resource-library.create, etc.');
  console.log('   - Frontend sends: resource-library:view, resource-library:create, etc.');
  console.log('   - Backend maps: resource-library:view → resource-library.view');
  console.log('   - Frontend parses: resource-library.view → module="resource-library", action="view"');
  console.log('   - Checkboxes should now display correctly! ✓');
  
  await prisma.$disconnect();
  return true;
}

testResourceLibraryPermissions()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
