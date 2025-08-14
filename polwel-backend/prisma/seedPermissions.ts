import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const permissions = [
  // User Management
  { name: 'users.view', description: 'View users', module: 'User Management', action: 'read' },
  { name: 'users.create', description: 'Create users', module: 'User Management', action: 'create' },
  { name: 'users.edit', description: 'Edit users', module: 'User Management', action: 'update' },
  { name: 'users.delete', description: 'Delete users', module: 'User Management', action: 'delete' },

  // Trainer Management
  { name: 'trainers.view', description: 'View trainers', module: 'Trainer Management', action: 'read' },
  { name: 'trainers.create', description: 'Create trainers', module: 'Trainer Management', action: 'create' },
  { name: 'trainers.edit', description: 'Edit trainers', module: 'Trainer Management', action: 'update' },
  { name: 'trainers.delete', description: 'Delete trainers', module: 'Trainer Management', action: 'delete' },

  // Client Management
  { name: 'clients.view', description: 'View clients', module: 'Client Management', action: 'read' },
  { name: 'clients.create', description: 'Create clients', module: 'Client Management', action: 'create' },
  { name: 'clients.edit', description: 'Edit clients', module: 'Client Management', action: 'update' },
  { name: 'clients.delete', description: 'Delete clients', module: 'Client Management', action: 'delete' },

  // Course Management
  { name: 'courses.view', description: 'View courses', module: 'Course Management', action: 'read' },
  { name: 'courses.create', description: 'Create courses', module: 'Course Management', action: 'create' },
  { name: 'courses.edit', description: 'Edit courses', module: 'Course Management', action: 'update' },
  { name: 'courses.delete', description: 'Delete courses', module: 'Course Management', action: 'delete' },

  // Venue Management
  { name: 'venues.view', description: 'View venues', module: 'Venue Management', action: 'read' },
  { name: 'venues.create', description: 'Create venues', module: 'Venue Management', action: 'create' },
  { name: 'venues.edit', description: 'Edit venues', module: 'Venue Management', action: 'update' },
  { name: 'venues.delete', description: 'Delete venues', module: 'Venue Management', action: 'delete' },

  // Booking Management
  { name: 'bookings.view', description: 'View bookings', module: 'Booking Management', action: 'read' },
  { name: 'bookings.create', description: 'Create bookings', module: 'Booking Management', action: 'create' },
  { name: 'bookings.edit', description: 'Edit bookings', module: 'Booking Management', action: 'update' },
  { name: 'bookings.delete', description: 'Delete bookings', module: 'Booking Management', action: 'delete' },

  // Calendar Management
  { name: 'calendar.view', description: 'View calendar', module: 'Calendar Management', action: 'read' },
  { name: 'calendar.create', description: 'Create calendar events', module: 'Calendar Management', action: 'create' },
  { name: 'calendar.edit', description: 'Edit calendar events', module: 'Calendar Management', action: 'update' },
  { name: 'calendar.delete', description: 'Delete calendar events', module: 'Calendar Management', action: 'delete' },

  // Reports Management
  { name: 'reports.view', description: 'View reports', module: 'Reports Management', action: 'read' },
  { name: 'reports.create', description: 'Create reports', module: 'Reports Management', action: 'create' },
  { name: 'reports.edit', description: 'Edit reports', module: 'Reports Management', action: 'update' },
  { name: 'reports.delete', description: 'Delete reports', module: 'Reports Management', action: 'delete' },
];

async function seedPermissions() {
  console.log('🌱 Seeding permissions...');

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }

  console.log('✅ Permissions seeded successfully');
  await prisma.$disconnect();
}

seedPermissions().catch((e) => {
  console.error('❌ Error seeding permissions:', e);
  process.exit(1);
});
