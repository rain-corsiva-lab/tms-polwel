import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'john.tan@polwel.org' },
      include: { permissions: true }
    });

    if (!user) {
      console.error('User not found');
      return;
    }

    const courseRelated = user.permissions
      .map((p) => p.permissionName)
      .filter((name) => name.startsWith('course'))
      .sort();

    console.log('Course-related permissions for John Tan:', courseRelated);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
