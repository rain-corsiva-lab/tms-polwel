import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Perm = { name: string; description: string; module: string; action: string };

const PERMISSIONS: Perm[] = [
  // Users
  { name: 'users.view', description: 'View users', module: 'User Management', action: 'read' },
  { name: 'users.create', description: 'Create users', module: 'User Management', action: 'create' },
  { name: 'users.edit', description: 'Edit users', module: 'User Management', action: 'update' },
  { name: 'users.delete', description: 'Delete users', module: 'User Management', action: 'delete' },

  // Trainers
  { name: 'trainers.view', description: 'View trainers & partners', module: 'Trainer Management', action: 'read' },
  { name: 'trainers.create', description: 'Create trainers & partners', module: 'Trainer Management', action: 'create' },
  { name: 'trainers.edit', description: 'Edit trainers & partners', module: 'Trainer Management', action: 'update' },
  { name: 'trainers.delete', description: 'Delete trainers & partners', module: 'Trainer Management', action: 'delete' },

  // Clients (Training Coordinators & Learners)
  { name: 'clients.view', description: 'View client organisations & users', module: 'Client Management', action: 'read' },
  { name: 'clients.create', description: 'Create client organisations & users', module: 'Client Management', action: 'create' },
  { name: 'clients.edit', description: 'Edit client organisations & users', module: 'Client Management', action: 'update' },
  { name: 'clients.delete', description: 'Delete client organisations & users', module: 'Client Management', action: 'delete' },

  // Courses
  { name: 'courses.view', description: 'View courses', module: 'Course Management', action: 'read' },
  { name: 'courses.create', description: 'Create courses', module: 'Course Management', action: 'create' },
  { name: 'courses.edit', description: 'Edit courses', module: 'Course Management', action: 'update' },
  { name: 'courses.approve', description: 'Approve course runs', module: 'Course Management', action: 'approve' },
  { name: 'courses.delete', description: 'Delete courses', module: 'Course Management', action: 'delete' },

  // Venues
  { name: 'venues.view', description: 'View venues', module: 'Venue Management', action: 'read' },
  { name: 'venues.create', description: 'Create venues', module: 'Venue Management', action: 'create' },
  { name: 'venues.edit', description: 'Edit venues', module: 'Venue Management', action: 'update' },
  { name: 'venues.delete', description: 'Delete venues', module: 'Venue Management', action: 'delete' },

  // Bookings / Finance
  { name: 'bookings.view', description: 'View bookings & finance', module: 'Booking Management', action: 'read' },
  { name: 'bookings.create', description: 'Create bookings & finance entries', module: 'Booking Management', action: 'create' },
  { name: 'bookings.edit', description: 'Edit bookings & finance entries', module: 'Booking Management', action: 'update' },
  { name: 'bookings.delete', description: 'Delete bookings & finance entries', module: 'Booking Management', action: 'delete' },

  // Reports / Library / Email
  { name: 'reports.view', description: 'View reports/library/email', module: 'Reporting', action: 'read' },
  { name: 'reports.create', description: 'Create reports/library/email', module: 'Reporting', action: 'create' },
  { name: 'reports.edit', description: 'Edit reports/library/email', module: 'Reporting', action: 'update' },
  { name: 'reports.delete', description: 'Delete reports/library/email', module: 'Reporting', action: 'delete' },

  // Calendar
  { name: 'calendar.view', description: 'View training calendar', module: 'Calendar', action: 'read' },
  { name: 'calendar.create', description: 'Create calendar entries', module: 'Calendar', action: 'create' },
  { name: 'calendar.edit', description: 'Edit calendar entries', module: 'Calendar', action: 'update' },
  { name: 'calendar.delete', description: 'Delete calendar entries', module: 'Calendar', action: 'delete' },
];

async function main() {
  console.log('🔐 Upserting missing permissions...');
  let upserts = 0;
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: { description: p.description, module: p.module, action: p.action },
      create: p,
    });
    upserts++;
  }
  console.log(`✅ Upserted ${upserts} permissions.`);
}

main()
  .catch((e) => {
    console.error('❌ Error upserting permissions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
