import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPermissions() {
  const permissions = await prisma.permission.findMany({
    orderBy: { name: 'asc' }
  });
  
  console.log('Available permissions:');
  permissions.forEach(p => console.log(`- ${p.name}: ${p.description}`));
  
  console.log(`\nTotal permissions: ${permissions.length}`);
}

checkPermissions()
  .finally(() => prisma.$disconnect());