const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  console.log('🔧 Fixing resource-library permissions...\n');
  
  // 1. Find all users with resource.library.* permissions
  const usersWithBadPerms = await prisma.userPermission.findMany({
    where: { permissionName: { startsWith: 'resource.library' } },
    include: { user: true }
  });
  
  console.log('Found', usersWithBadPerms.length, 'user permissions with incorrect format');
  
  // 2. For each user, replace resource.library.* with resource-library.*
  for (const up of usersWithBadPerms) {
    const correctName = up.permissionName.replace('resource.library', 'resource-library');
    console.log('Updating user', up.user.name, ':', up.permissionName, '->', correctName);
    
    // Delete the wrong one
    await prisma.userPermission.delete({ where: { id: up.id } });
    
    // Create the correct one if it doesn't exist
    const existing = await prisma.userPermission.findFirst({
      where: { userId: up.userId, permissionName: correctName }
    });
    
    if (!existing) {
      await prisma.userPermission.create({
        data: {
          userId: up.userId,
          permissionName: correctName,
          granted: up.granted
        }
      });
      console.log('  ✅ Created correct permission:', correctName);
    } else {
      console.log('  ℹ️  Correct permission already exists:', correctName);
    }
  }
  
  // 3. Delete the duplicate Permission records with dots
  const badPermissions = await prisma.permission.findMany({
    where: { name: { startsWith: 'resource.library' } }
  });
  
  console.log('\n🗑️  Deleting', badPermissions.length, 'duplicate permission records');
  for (const p of badPermissions) {
    await prisma.permission.delete({ where: { id: p.id } });
    console.log('  Deleted:', p.name);
  }
  
  // 4. Verify the fix
  console.log('\n📋 Verification:');
  const remainingBad = await prisma.permission.count({
    where: { name: { startsWith: 'resource.library' } }
  });
  const correct = await prisma.permission.count({
    where: { name: { startsWith: 'resource-library' } }
  });
  console.log('  Bad format (resource.library.*): ', remainingBad);
  console.log('  Correct format (resource-library.*): ', correct);
  
  console.log('\n✅ Fix complete!');
  await prisma.$disconnect();
}

fix().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
