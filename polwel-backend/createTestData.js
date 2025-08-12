import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Create a test POLWEL user
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const testUser = await prisma.user.create({
      data: {
        name: 'Test Admin',
        email: 'admin@polwel.com',
        password: hashedPassword,
        role: UserRole.POLWEL,
        status: UserStatus.ACTIVE,
        department: 'IT',
        permissionLevel: 'ADMIN'
      }
    });

    console.log('Test user created:', testUser);

    // Create a test trainer
    const testTrainer = await prisma.user.create({
      data: {
        name: 'Test Trainer',
        email: 'trainer@polwel.com',
        password: hashedPassword,
        role: UserRole.TRAINER,
        status: UserStatus.ACTIVE,
        availabilityStatus: 'AVAILABLE',
        partnerOrganization: 'Test Training Company',
        bio: 'Experienced trainer in technology',
        specializations: ['JavaScript', 'React', 'Node.js'],
        certifications: ['AWS Certified', 'React Certified'],
        experience: '5 years'
      }
    });

    console.log('Test trainer created:', testTrainer);

    // Create a test organization
    const testOrg = await prisma.organization.create({
      data: {
        name: 'Test Client Organization',
        displayName: 'Test Client Org',
        industry: 'Technology',
        status: UserStatus.ACTIVE,
        address: '123 Test Street, Singapore',
        contactEmail: 'contact@testorg.com',
        contactPhone: '+65 1234 5678',
        buNumber: 'BU001'
      }
    });

    console.log('Test organization created:', testOrg);

    console.log('✅ All test data created successfully!');
  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
