import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const permissions = [
  // User Management - POLWEL Users
  { name: 'user-management-polwel:view', description: 'View POLWEL users', module: 'user-management-polwel', action: 'view' },
  { name: 'user-management-polwel:create', description: 'Create POLWEL users', module: 'user-management-polwel', action: 'create' },
  { name: 'user-management-polwel:edit', description: 'Edit POLWEL users', module: 'user-management-polwel', action: 'edit' },
  { name: 'user-management-polwel:delete', description: 'Delete POLWEL users', module: 'user-management-polwel', action: 'delete' },

  // User Management - Trainers & Partners
  { name: 'user-management-trainers:view', description: 'View trainers & partners', module: 'user-management-trainers', action: 'view' },
  { name: 'user-management-trainers:create', description: 'Create trainers & partners', module: 'user-management-trainers', action: 'create' },
  { name: 'user-management-trainers:edit', description: 'Edit trainers & partners', module: 'user-management-trainers', action: 'edit' },
  { name: 'user-management-trainers:delete', description: 'Delete trainers & partners', module: 'user-management-trainers', action: 'delete' },

  // User Management - Client Organisations
  { name: 'user-management-client-orgs:view', description: 'View client organisations', module: 'user-management-client-orgs', action: 'view' },
  { name: 'user-management-client-orgs:create', description: 'Create client organisations', module: 'user-management-client-orgs', action: 'create' },
  { name: 'user-management-client-orgs:edit', description: 'Edit client organisations', module: 'user-management-client-orgs', action: 'edit' },
  { name: 'user-management-client-orgs:delete', description: 'Delete client organisations', module: 'user-management-client-orgs', action: 'delete' },

  // Course & Venue Setup
  { name: 'course-venue-setup:view', description: 'View courses & venues', module: 'course-venue-setup', action: 'view' },
  { name: 'course-venue-setup:create', description: 'Create courses & venues', module: 'course-venue-setup', action: 'create' },
  { name: 'course-venue-setup:edit', description: 'Edit courses & venues', module: 'course-venue-setup', action: 'edit' },
  { name: 'course-venue-setup:delete', description: 'Delete courses & venues', module: 'course-venue-setup', action: 'delete' },

  // Course Runs & Operations
  { name: 'course-runs-operations:view', description: 'View course runs & operations', module: 'course-runs-operations', action: 'view' },
  { name: 'course-runs-operations:create', description: 'Create course runs & operations', module: 'course-runs-operations', action: 'create' },
  { name: 'course-runs-operations:edit', description: 'Edit course runs & operations', module: 'course-runs-operations', action: 'edit' },
  { name: 'course-runs-operations:delete', description: 'Delete course runs & operations', module: 'course-runs-operations', action: 'delete' },

  // Email, Reporting and Resource Library
  { name: 'email-reporting-library:view', description: 'View email, reporting & resources', module: 'email-reporting-library', action: 'view' },
  { name: 'email-reporting-library:create', description: 'Create email, reporting & resources', module: 'email-reporting-library', action: 'create' },
  { name: 'email-reporting-library:edit', description: 'Edit email, reporting & resources', module: 'email-reporting-library', action: 'edit' },
  { name: 'email-reporting-library:delete', description: 'Delete email, reporting & resources', module: 'email-reporting-library', action: 'delete' },

  // Finance and Activity
  { name: 'finance-activity:view', description: 'View finance & activity', module: 'finance-activity', action: 'view' },
  { name: 'finance-activity:create', description: 'Create finance & activity', module: 'finance-activity', action: 'create' },
  { name: 'finance-activity:edit', description: 'Edit finance & activity', module: 'finance-activity', action: 'edit' },
  { name: 'finance-activity:delete', description: 'Delete finance & activity', module: 'finance-activity', action: 'delete' },
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
