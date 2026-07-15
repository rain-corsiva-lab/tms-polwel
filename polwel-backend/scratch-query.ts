import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: { contains: 'nazirah_beevi+PTC' } },
      include: {
        organizations: true
      }
    });

    console.log('User found:', user);

    if (user) {
      // Find waivers submitted or linked to their organizations
      const orgIds = user.organizations.map(o => o.organizationId);
      if (user.organizationId) orgIds.push(user.organizationId);

      const waivers = await prisma.courseRunLearner.findMany({
        where: {
          clientOrganizationId: { in: orgIds },
          waiverSubmittedAt: { not: null }
        },
        include: {
          learner: true,
          clientOrganization: true
        }
      });
      console.log('Waivers for their organization:', waivers);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
