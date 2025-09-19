import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'john.tan@polwel.org';
  console.log(`Granting all permissions to ${email}...`);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`User with email ${email} not found`);
    process.exit(1);
  }

  const perms = await prisma.permission.findMany();
  if (!perms || perms.length === 0) {
    console.error('No permissions found in DB. Run seedPermissions first.');
    process.exit(1);
  }

  // Delete existing userPermission rows for the user to avoid duplicates
  await prisma.userPermission.deleteMany({ where: { userId: user.id } });

  const creates = perms.map(p => ({
    userId: user.id,
    permissionName: p.name,
    granted: true,
  }));

  // Create many
  for (const c of creates) {
    await prisma.userPermission.create({ data: c });
  }

  console.log(`Granted ${creates.length} permissions to ${email}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
