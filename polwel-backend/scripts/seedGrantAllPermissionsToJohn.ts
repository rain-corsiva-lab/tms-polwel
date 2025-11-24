import { PrismaClient } from '@prisma/client';
import { PERMISSIONS } from './upsertMissingPermissions';

const prisma = new PrismaClient();

async function main() {
  const targetEmails = [
    'kukuhthewow@gmail.com',
    'celine.ng@corsivalab.com',
    'nazirah_beevi@polwel.org.sg',
    'stanley_huang@polwel.org.sg',
    'chunhua_woo@polwel.org.sg',
    'syirain_saifi@polwel.org.sg',
    'zhengwei_lee@polwel.org.sg',
    'lenghong_goh@polwel.org.sg',
  ];

  for (const email of targetEmails) {
    console.log(`Granting all permissions to ${email}...`);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`User with email ${email} not found`);
      // continue to next email instead of exiting so other targets can proceed
      continue;
    }

  const canonicalNames = new Set(PERMISSIONS.map((p) => p.name));
  const perms = await prisma.permission.findMany({
    where: { name: { in: Array.from(canonicalNames) } },
    orderBy: { name: 'asc' }
  });
  if (!perms || perms.length === 0) {
    console.error('No permissions found in DB. Run seedPermissions first.');
    process.exit(1);
  }

  const missing = Array.from(canonicalNames).filter((name) => !perms.some((p) => p.name === name));
  if (missing.length > 0) {
    console.warn('⚠️ Missing canonical permissions in DB, please run upsertMissingPermissions:', missing);
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
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
