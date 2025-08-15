import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedLearners() {
  console.log('🌱 Starting learner seeding...');

  try {
    // Get all organizations
    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true }
    });

    if (organizations.length === 0) {
      console.log('❌ No organizations found. Please create organizations first.');
      return;
    }

    console.log(`📋 Found ${organizations.length} organizations`);

    // Hash password for all learners
    const hashedPassword = await bcrypt.hash('learner123', 10);

    // Create 3 learners for each organization
    for (const org of organizations) {
      console.log(`👥 Creating learners for ${org.name}...`);

      const learners = [
        {
          name: 'Alice Johnson',
          email: `alice.johnson+${org.id}@example.com`,
          password: hashedPassword,
          role: 'LEARNER' as const,
          status: 'ACTIVE' as const,
          organizationId: org.id,
          department: 'Engineering',
          contactNumber: '+65 9123 4567',
          emailVerified: true,
        },
        {
          name: 'Bob Smith',
          email: `bob.smith+${org.id}@example.com`,
          password: hashedPassword,
          role: 'LEARNER' as const,
          status: 'ACTIVE' as const,
          organizationId: org.id,
          department: 'Marketing',
          contactNumber: '+65 9234 5678',
          emailVerified: true,
        },
        {
          name: 'Carol Williams',
          email: `carol.williams+${org.id}@example.com`,
          password: hashedPassword,
          role: 'LEARNER' as const,
          status: 'ACTIVE' as const,
          organizationId: org.id,
          department: 'Human Resources',
          contactNumber: '+65 9345 6789',
          emailVerified: true,
        }
      ];

      // Create learners one by one to handle duplicates
      for (const learnerData of learners) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: learnerData.email }
          });

          if (!existingUser) {
            await prisma.user.create({
              data: learnerData
            });
            console.log(`  ✅ Created learner: ${learnerData.name} (${learnerData.email})`);
          } else {
            console.log(`  ⚠️  Learner already exists: ${learnerData.name} (${learnerData.email})`);
          }
        } catch (error: any) {
          console.error(`  ❌ Error creating learner ${learnerData.name}:`, error.message);
        }
      }
    }

    // Display summary
    const totalLearners = await prisma.user.count({
      where: { role: 'LEARNER' }
    });

    console.log(`🎉 Learner seeding completed!`);
    console.log(`📊 Total learners in database: ${totalLearners}`);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedLearners();
