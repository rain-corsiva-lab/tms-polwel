import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Perm = { name: string; description: string; module: string; action: string };

export const PERMISSIONS: Perm[] = [
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

  // Canonical Course & Venue combined (new)
  { name: 'course-venue.view', description: 'View courses and venues', module: 'Course & Venue', action: 'read' },
  { name: 'course-venue.create', description: 'Create courses and venues', module: 'Course & Venue', action: 'create' },
  { name: 'course-venue.edit', description: 'Edit courses and venues', module: 'Course & Venue', action: 'update' },
  { name: 'course-venue.delete', description: 'Delete courses and venues', module: 'Course & Venue', action: 'delete' },

  // Course Runs (distinct from course-venue) - CRUD mapping if needed, plus approve
  { name: 'course-run.view', description: 'View course runs', module: 'Course Run', action: 'read' },
  { name: 'course-run.create', description: 'Create course runs', module: 'Course Run', action: 'create' },
  { name: 'course-run.edit', description: 'Edit course runs', module: 'Course Run', action: 'update' },
  { name: 'course-run.delete', description: 'Delete course runs', module: 'Course Run', action: 'delete' },
  { name: 'course-run.approve', description: 'Approve course runs', module: 'Course Run', action: 'approve' },

  // Billing & Reports module → reports.* permissions
  { name: 'reports.view', description: 'View billing & reports', module: 'Billing & Reports', action: 'read' },
  { name: 'reports.create', description: 'Create billing & reports entries', module: 'Billing & Reports', action: 'create' },
  { name: 'reports.edit', description: 'Edit billing & reports entries', module: 'Billing & Reports', action: 'update' },
  { name: 'reports.delete', description: 'Delete billing & reports entries', module: 'Billing & Reports', action: 'delete' },

  // Post Course Run module → post-course-run.* permissions
  { name: 'post-course-run.view', description: 'View post course run artefacts', module: 'Post Course Run', action: 'read' },
  { name: 'post-course-run.create', description: 'Create post course run artefacts', module: 'Post Course Run', action: 'create' },
  { name: 'post-course-run.edit', description: 'Edit post course run artefacts', module: 'Post Course Run', action: 'update' },
  { name: 'post-course-run.delete', description: 'Delete post course run artefacts', module: 'Post Course Run', action: 'delete' },

];

async function main() {
  console.log('� Syncing permissions...');

  const desiredNames = new Set(PERMISSIONS.map((p) => p.name));
  const existing = await prisma.permission.findMany({ select: { name: true } });
  const toRemove = existing.filter((p) => !desiredNames.has(p.name)).map((p) => p.name);

  if (toRemove.length > 0) {
    console.log('🗑️ Removing obsolete permissions:', toRemove);
    await prisma.permission.deleteMany({ where: { name: { in: toRemove } } });
  }

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

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('❌ Error upserting permissions:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
