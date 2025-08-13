const { PrismaClient } = require('@prisma/client');

async function checkPermissions() {
  const prisma = new PrismaClient();

  try {
    console.log('Checking existing permissions...');
    const permissions = await prisma.permission.findMany();
    
    console.log(`Found ${permissions.length} permissions:`);
    permissions.forEach(p => {
      console.log(`- ${p.name} (${p.module}.${p.action}): ${p.description}`);
    });

    if (permissions.length === 0) {
      console.log('\nNo permissions found. Creating basic permissions...');
      
      const basicPermissions = [
        { name: 'users.create', module: 'users', action: 'create', description: 'Create users' },
        { name: 'users.read', module: 'users', action: 'read', description: 'Read users' },
        { name: 'users.update', module: 'users', action: 'update', description: 'Update users' },
        { name: 'users.delete', module: 'users', action: 'delete', description: 'Delete users' },
        { name: 'courses.create', module: 'courses', action: 'create', description: 'Create courses' },
        { name: 'courses.read', module: 'courses', action: 'read', description: 'Read courses' },
        { name: 'courses.update', module: 'courses', action: 'update', description: 'Update courses' },
        { name: 'courses.delete', module: 'courses', action: 'delete', description: 'Delete courses' },
        { name: 'venues.create', module: 'venues', action: 'create', description: 'Create venues' },
        { name: 'venues.read', module: 'venues', action: 'read', description: 'Read venues' },
        { name: 'venues.update', module: 'venues', action: 'update', description: 'Update venues' },
        { name: 'venues.delete', module: 'venues', action: 'delete', description: 'Delete venues' },
        { name: 'bookings.create', module: 'bookings', action: 'create', description: 'Create bookings' },
        { name: 'bookings.read', module: 'bookings', action: 'read', description: 'Read bookings' },
        { name: 'bookings.update', module: 'bookings', action: 'update', description: 'Update bookings' },
        { name: 'bookings.delete', module: 'bookings', action: 'delete', description: 'Delete bookings' },
        { name: 'admin.all', module: 'admin', action: 'all', description: 'Full administrative access' }
      ];

      await prisma.permission.createMany({
        data: basicPermissions,
        skipDuplicates: true
      });

      console.log(`Created ${basicPermissions.length} basic permissions.`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPermissions();
