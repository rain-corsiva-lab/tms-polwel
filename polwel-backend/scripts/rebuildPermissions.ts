/**
 * Complete Permission System Rebuild Script
 * 
 * This script:
 * 1. Cleans up the permissions table with canonical module names
 * 2. Updates all user_permissions to use canonical format
 * 3. Verifies CASL mapping works correctly
 * 
 * Run with: npx tsx scripts/rebuildPermissions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Canonical permission definitions matching CASL MODULE_TO_SUBJECT
const CANONICAL_PERMISSIONS = [
  // POLWEL Users module
  { name: 'users.view', description: 'View POLWEL users', module: 'users', action: 'view' },
  { name: 'users.create', description: 'Create POLWEL users', module: 'users', action: 'create' },
  { name: 'users.edit', description: 'Edit POLWEL users', module: 'users', action: 'edit' },
  { name: 'users.delete', description: 'Delete POLWEL users', module: 'users', action: 'delete' },

  // Trainers & Partners module
  { name: 'trainers.view', description: 'View trainers & partners', module: 'trainers', action: 'view' },
  { name: 'trainers.create', description: 'Create trainers & partners', module: 'trainers', action: 'create' },
  { name: 'trainers.edit', description: 'Edit trainers & partners', module: 'trainers', action: 'edit' },
  { name: 'trainers.delete', description: 'Delete trainers & partners', module: 'trainers', action: 'delete' },

  // Client Organisations module
  { name: 'clients.view', description: 'View client organisations & users', module: 'clients', action: 'view' },
  { name: 'clients.create', description: 'Create client organisations & users', module: 'clients', action: 'create' },
  { name: 'clients.edit', description: 'Edit client organisations & users', module: 'clients', action: 'edit' },
  { name: 'clients.delete', description: 'Delete client organisations & users', module: 'clients', action: 'delete' },

  // Course & Venue module (combined)
  { name: 'course-venue.view', description: 'View courses and venues', module: 'course-venue', action: 'view' },
  { name: 'course-venue.create', description: 'Create courses and venues', module: 'course-venue', action: 'create' },
  { name: 'course-venue.edit', description: 'Edit courses and venues', module: 'course-venue', action: 'edit' },
  { name: 'course-venue.delete', description: 'Delete courses and venues', module: 'course-venue', action: 'delete' },

  // Course Run module
  { name: 'course-run.view', description: 'View course runs', module: 'course-run', action: 'view' },
  { name: 'course-run.create', description: 'Create course runs', module: 'course-run', action: 'create' },
  { name: 'course-run.edit', description: 'Edit course runs', module: 'course-run', action: 'edit' },
  { name: 'course-run.delete', description: 'Delete course runs', module: 'course-run', action: 'delete' },
  { name: 'course-run.approve', description: 'Approve course runs', module: 'course-run', action: 'approve' },

  // Post Course Run module (FIXED: using hyphens not dots)
  { name: 'post-course-run.view', description: 'View post course run artefacts', module: 'post-course-run', action: 'view' },
  { name: 'post-course-run.create', description: 'Create post course run artefacts', module: 'post-course-run', action: 'create' },
  { name: 'post-course-run.edit', description: 'Edit post course run artefacts', module: 'post-course-run', action: 'edit' },
  { name: 'post-course-run.delete', description: 'Delete post course run artefacts', module: 'post-course-run', action: 'delete' },

  // Billing & Reports module
  { name: 'reports.view', description: 'View billing & reports', module: 'reports', action: 'view' },
  { name: 'reports.create', description: 'Create billing & reports entries', module: 'reports', action: 'create' },
  { name: 'reports.edit', description: 'Edit billing & reports entries', module: 'reports', action: 'edit' },
  { name: 'reports.delete', description: 'Delete billing & reports entries', module: 'reports', action: 'delete' },

  // Training Calendar module
  { name: 'calendar.view', description: 'View training calendar', module: 'calendar', action: 'view' },
  { name: 'calendar.create', description: 'Create calendar entries', module: 'calendar', action: 'create' },
  { name: 'calendar.edit', description: 'Edit calendar entries', module: 'calendar', action: 'edit' },
  { name: 'calendar.delete', description: 'Delete calendar entries', module: 'calendar', action: 'delete' },
];

// Old permission name mapping for migration
const PERMISSION_MIGRATION_MAP: Record<string, string> = {
  // Old venue-specific permissions → course-venue
  'venues.view': 'course-venue.view',
  'venues.create': 'course-venue.create',
  'venues.edit': 'course-venue.edit',
  'venues.delete': 'course-venue.delete',
  
  // Old courses permissions → course-venue
  'courses.view': 'course-venue.view',
  'courses.create': 'course-venue.create',
  'courses.edit': 'course-venue.edit',
  'courses.delete': 'course-venue.delete',
  'courses.approve': 'course-run.approve', // Approve is for runs, not courses
  
  // Legacy bookings → reports (if any)
  'bookings.view': 'reports.view',
  'bookings.create': 'reports.create',
  'bookings.edit': 'reports.edit',
  'bookings.delete': 'reports.delete',
  
  // Malformed post.course.run → post-course-run
  'post.course.run.view': 'post-course-run.view',
  'post.course.run.create': 'post-course-run.create',
  'post.course.run.edit': 'post-course-run.edit',
  'post.course.run.delete': 'post-course-run.delete',
};

async function rebuildPermissions() {
  console.log('🔧 Starting Permission System Rebuild...\n');

  try {
    // Step 1: Backup user permissions before migration
    console.log('📦 Step 1: Backing up current user permissions...');
    const allUserPerms = await prisma.userPermission.findMany({
      select: {
        userId: true,
        permissionName: true,
        granted: true
      }
    });
    console.log(`✅ Backed up ${allUserPerms.length} user permission entries\n`);

    // Step 2: Clear and rebuild permissions table
    console.log('🗑️  Step 2: Clearing old permissions table...');
    await prisma.permission.deleteMany({});
    console.log('✅ Cleared permissions table\n');

    console.log('📝 Step 3: Creating canonical permissions...');
    for (const perm of CANONICAL_PERMISSIONS) {
      await prisma.permission.create({
        data: perm
      });
      console.log(`  ✅ Created: ${perm.name}`);
    }
    console.log(`✅ Created ${CANONICAL_PERMISSIONS.length} canonical permissions\n`);

    // Step 4: Migrate user permissions
    console.log('🔄 Step 4: Migrating user permissions to canonical format...');
    
    const userPermsByUser = new Map<string, Set<string>>();
    
    // Group permissions by user
    for (const userPerm of allUserPerms) {
      if (!userPerm.granted) continue; // Skip revoked permissions
      
      let canonicalName = userPerm.permissionName.toLowerCase().trim();
      
      // Apply migration mapping if exists
      if (PERMISSION_MIGRATION_MAP[canonicalName]) {
        canonicalName = PERMISSION_MIGRATION_MAP[canonicalName];
        console.log(`  🔄 Migrating: ${userPerm.permissionName} → ${canonicalName}`);
      }
      
      // Check if this is a valid canonical permission
      const isValid = CANONICAL_PERMISSIONS.some(p => p.name === canonicalName);
      if (!isValid) {
        console.warn(`  ⚠️  Unknown permission: ${userPerm.permissionName} (skipping)`);
        continue;
      }
      
      if (!userPermsByUser.has(userPerm.userId)) {
        userPermsByUser.set(userPerm.userId, new Set());
      }
      userPermsByUser.get(userPerm.userId)!.add(canonicalName);
    }

    // Step 5: Clear and recreate user_permissions table
    console.log('\n🗑️  Step 5: Clearing user_permissions table...');
    await prisma.userPermission.deleteMany({});
    console.log('✅ Cleared user_permissions table\n');

    console.log('📝 Step 6: Creating clean user permissions...');
    let totalCreated = 0;
    
    for (const [userId, permissions] of userPermsByUser.entries()) {
      for (const permissionName of permissions) {
        await prisma.userPermission.create({
          data: {
            userId,
            permissionName,
            granted: true
          }
        });
        totalCreated++;
      }
      console.log(`  ✅ User ${userId}: ${permissions.size} permissions`);
    }
    
    console.log(`✅ Created ${totalCreated} user permission entries\n`);

    // Step 7: Verify the migration
    console.log('🔍 Step 7: Verifying migration...\n');
    
    const finalPermissions = await prisma.permission.findMany({
      orderBy: { name: 'asc' }
    });
    
    const finalUserPerms = await prisma.userPermission.findMany({
      where: { granted: true },
      select: {
        userId: true,
        permissionName: true
      }
    });
    
    console.log('📊 Migration Summary:');
    console.log(`  - Permissions in database: ${finalPermissions.length}`);
    console.log(`  - User permission entries: ${finalUserPerms.length}`);
    console.log(`  - Users with permissions: ${userPermsByUser.size}`);
    
    // Check for any invalid user permissions
    const validPermNames = new Set(CANONICAL_PERMISSIONS.map(p => p.name));
    const invalidUserPerms = finalUserPerms.filter(up => !validPermNames.has(up.permissionName));
    
    if (invalidUserPerms.length > 0) {
      console.warn('\n⚠️  Warning: Found invalid user permissions:');
      invalidUserPerms.forEach(up => {
        console.warn(`  - ${up.permissionName} (user: ${up.userId})`);
      });
    } else {
      console.log('\n✅ All user permissions are valid!');
    }
    
    console.log('\n📋 Final Permission List:');
    finalPermissions.forEach(p => {
      console.log(`  ${p.name} (${p.module}.${p.action})`);
    });

  } catch (error) {
    console.error('\n❌ Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
rebuildPermissions()
  .then(() => {
    console.log('\n✅ Permission system rebuild completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Clear browser localStorage: localStorage.clear(); location.reload();');
    console.log('  2. Login again and verify sidebar shows correct menus');
    console.log('  3. Check console for CASL debug logs');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
