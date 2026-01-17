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
        { name: 'users.create', module: 'POLWEL Users', action: 'create', description: 'Create users' },
        { name: 'users.read', module: 'POLWEL Users', action: 'read', description: 'Read users' },
        { name: 'users.update', module: 'POLWEL Users', action: 'update', description: 'Update users' },
        { name: 'users.delete', module: 'POLWEL Users', action: 'delete', description: 'Delete users' },
        { name: 'course-venue.view', module: 'Course & Venue', action: 'read', description: 'View courses & venues' },
        { name: 'course-venue.create', module: 'Course & Venue', action: 'create', description: 'Create courses & venues' },
        { name: 'course-venue.edit', module: 'Course & Venue', action: 'update', description: 'Edit courses & venues' },
        { name: 'course-venue.delete', module: 'Course & Venue', action: 'delete', description: 'Delete courses & venues' },
        { name: 'course-run.view', module: 'Course Run', action: 'read', description: 'View course runs' },
        { name: 'course-run.create', module: 'Course Run', action: 'create', description: 'Create course runs' },
        { name: 'course-run.edit', module: 'Course Run', action: 'update', description: 'Edit course runs' },
        { name: 'course-run.delete', module: 'Course Run', action: 'delete', description: 'Delete course runs' },
        { name: 'course-run.approve', module: 'Course Run', action: 'approve', description: 'Approve course runs' },
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
