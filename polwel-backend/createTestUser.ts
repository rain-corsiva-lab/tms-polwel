import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createTestPolwelUser() {
  try {
    console.log('Creating test POLWEL user...');

    // Generate password
    const password = 'testpass123';
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: 'Test POLWEL User',
        email: 'test@polwel.org',
        password: hashedPassword,
        role: UserRole.POLWEL,
        status: UserStatus.ACTIVE,
        passwordExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true
      }
    });

    console.log('Test POLWEL user created successfully:');
    console.log(`ID: ${user.id}`);
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Password: ${password}`);
    console.log(`Role: ${user.role}`);
    console.log(`Status: ${user.status}`);

    // Create some permissions for this user
    const permissions = await prisma.permission.findMany({
      take: 3 // Get first 3 permissions for testing
    });

    if (permissions.length > 0) {
      await prisma.userPermission.createMany({
        data: permissions.map(permission => ({
          userId: user.id,
          permissionId: permission.id,
          granted: true
        }))
      });
      console.log(`Added ${permissions.length} permissions to the user`);
    }

    // Create some audit log entries for testing
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'User Login',
        actionType: 'LOGIN',
        details: 'Test login entry for audit trail testing',
        performedBy: user.id,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Browser',
        timestamp: new Date()
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'Profile Update',
        actionType: 'UPDATE',
        details: 'Test profile update entry for audit trail testing',
        performedBy: user.id,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Browser',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      }
    });

    console.log('Created test audit log entries');

  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestPolwelUser();
