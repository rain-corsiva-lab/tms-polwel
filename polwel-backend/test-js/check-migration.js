const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMigration() {
  try {
    console.log('Checking user permissions after migration:');
    const userPerms = await prisma.userPermission.findMany({
      include: {
        user: { select: { name: true, email: true } }
      }
    });
    
    userPerms.forEach(up => {
      console.log(`UserID: ${up.userId}, PermissionName: '${up.permissionName}', User: ${up.user.name}`);
    });
    
    console.log('\nTotal user permissions:', userPerms.length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMigration();
