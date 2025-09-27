import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Perm = { name: string; description: string; module: string; action: string };

const PERMISSIONS: Perm[] = [
  // Users
  { name: 'users.view', description: 'View POLWEL users', module: 'POLWEL Users', action: 'read' },
  { name: 'users.create', description: 'Create POLWEL users', module: 'POLWEL Users', action: 'create' },
  { name: 'users.edit', description: 'Edit POLWEL users', module: 'POLWEL Users', action: 'update' },
  { name: 'users.delete', description: 'Delete POLWEL users', module: 'POLWEL Users', action: 'delete' },

  // Trainers
  { name: 'trainers.view', description: 'View trainers & partners', module: 'Trainers & Partners', action: 'read' },
  { name: 'trainers.create', description: 'Create trainers & partners', module: 'Trainers & Partners', action: 'create' },
  { name: 'trainers.edit', description: 'Edit trainers & partners', module: 'Trainers & Partners', action: 'update' },
  { name: 'trainers.delete', description: 'Delete trainers & partners', module: 'Trainers & Partners', action: 'delete' },

  // Clients (Training Coordinators & Learners)
  { name: 'clients.view', description: 'View client organisations & users', module: 'Client Organisations', action: 'read' },
  { name: 'clients.create', description: 'Create client organisations & users', module: 'Client Organisations', action: 'create' },
  { name: 'clients.edit', description: 'Edit client organisations & users', module: 'Client Organisations', action: 'update' },
  { name: 'clients.delete', description: 'Delete client organisations & users', module: 'Client Organisations', action: 'delete' },

  // Courses
  { name: 'courses.view', description: 'View courses', module: 'Course', action: 'read' },
  { name: 'courses.create', description: 'Create courses', module: 'Course', action: 'create' },
  { name: 'courses.edit', description: 'Edit courses', module: 'Course', action: 'update' },
  { name: 'courses.approve', description: 'Approve course runs', module: 'Course Run', action: 'approve' },
  { name: 'courses.delete', description: 'Delete courses', module: 'Course', action: 'delete' },

  // Venues
  { name: 'venues.view', description: 'View venues', module: 'Venue', action: 'read' },
  { name: 'venues.create', description: 'Create venues', module: 'Venue', action: 'create' },
  { name: 'venues.edit', description: 'Edit venues', module: 'Venue', action: 'update' },
  { name: 'venues.delete', description: 'Delete venues', module: 'Venue', action: 'delete' },

  // Bookings / Finance
  { name: 'bookings.view', description: 'View billing & finance', module: 'Billing & Reports', action: 'read' },
  { name: 'bookings.create', description: 'Create billing & finance entries', module: 'Billing & Reports', action: 'create' },
  { name: 'bookings.edit', description: 'Edit billing & finance entries', module: 'Billing & Reports', action: 'update' },
  { name: 'bookings.delete', description: 'Delete billing & finance entries', module: 'Billing & Reports', action: 'delete' },

  // Reports / Library / Email
  { name: 'reports.view', description: 'View post course run artefacts', module: 'Post Course Run', action: 'read' },
  { name: 'reports.create', description: 'Create post course run artefacts', module: 'Post Course Run', action: 'create' },
  { name: 'reports.edit', description: 'Edit post course run artefacts', module: 'Post Course Run', action: 'update' },
  { name: 'reports.delete', description: 'Delete post course run artefacts', module: 'Post Course Run', action: 'delete' },

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
