/**
 * Fix Malformed Permissions Script
 * 
 * Fixes malformed permission names in user_permissions table:
 * - "post.course.run.*" → "post-course-run.*"
 * 
 * Run with: npx tsx scripts/fixMalformedPermissions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMalformedPermissions() {
  console.log('🔍 Scanning for malformed permissions...\n');

  try {
    // Find all permissions with malformed pattern "post.course.run.*"
    // Note: Using contains instead of startsWith to catch all variations
    const malformedPerms = await prisma.userPermission.findMany({
      where: {
        OR: [
          { permissionName: { contains: 'post.course.run.' } },
          { permissionName: { startsWith: 'post.course.run.' } }
        ]
      }
    });

    if (malformedPerms.length === 0) {
      console.log('✅ No malformed permissions found!');
      return;
    }

    console.log(`Found ${malformedPerms.length} malformed permissions:\n`);

    // Group by permission name to show count
    const countByName: Record<string, number> = {};
    malformedPerms.forEach(p => {
      countByName[p.permissionName] = (countByName[p.permissionName] || 0) + 1;
    });

    Object.entries(countByName).forEach(([name, count]) => {
      const fixed = name.replace(/^post\.course\.run\./i, 'post-course-run.');
      console.log(`  ${name} → ${fixed} (${count} users)`);
    });

    console.log('\n🔧 Fixing permissions...\n');

    let updatedCount = 0;
    
    for (const perm of malformedPerms) {
      const fixedName = perm.permissionName.replace(/^post\.course\.run\./i, 'post-course-run.');
      
      try {
        // Check if the correct permission already exists for this user
        const existing = await prisma.userPermission.findUnique({
          where: {
            userId_permissionName: {
              userId: perm.userId,
              permissionName: fixedName
            }
          }
        });

        if (existing) {
          // Correct permission exists, just delete the malformed one
          await prisma.userPermission.delete({
            where: { id: perm.id }
          });
          console.log(`  ✅ Deleted duplicate malformed: ${perm.permissionName} for user ${perm.userId}`);
        } else {
          // Update to correct format
          await prisma.userPermission.update({
            where: { id: perm.id },
            data: { permissionName: fixedName }
          });
          console.log(`  ✅ Fixed: ${perm.permissionName} → ${fixedName} for user ${perm.userId}`);
        }
        
        updatedCount++;
      } catch (error: any) {
        console.error(`  ❌ Error fixing ${perm.permissionName} for user ${perm.userId}:`, error.message);
      }
    }

    console.log(`\n✅ Successfully processed ${updatedCount} permissions!`);

    // Verify the fix
    const remainingMalformed = await prisma.userPermission.findMany({
      where: {
        permissionName: {
          startsWith: 'post.course.run.'
        }
      }
    });

    if (remainingMalformed.length === 0) {
      console.log('✅ All malformed permissions have been fixed!');
    } else {
      console.log(`⚠️  ${remainingMalformed.length} malformed permissions still remain`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixMalformedPermissions()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
