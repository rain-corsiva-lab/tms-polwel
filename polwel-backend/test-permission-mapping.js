const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPermissionMappings() {
  try {
    console.log('=== Frontend to Database Permission Mapping Test ===\n');
    
    const testPermissions = [
      'user-management-polwel:view',
      'user-management-polwel:create',
      'user-management-polwel:edit',
      'user-management-trainers:create',
      'user-management-client-orgs:create',
      'course-venue-setup:edit'
    ];
    
    // Permission name mapping
    const permissionNameMapping = {
      // User Management - POLWEL
      'user-management-polwel:view': 'users.view',
      'user-management-polwel:create': 'users.create', 
      'user-management-polwel:edit': 'users.edit',
      'user-management-polwel:update': 'users.edit',
      'user-management-polwel:delete': 'users.delete',
      
      // User Management - Trainers
      'user-management-trainers:view': 'trainers.view',
      'user-management-trainers:create': 'trainers.create',
      'user-management-trainers:edit': 'trainers.edit',
      'user-management-trainers:update': 'trainers.edit',
      'user-management-trainers:delete': 'trainers.delete',
      
      // User Management - Client Organizations
      'user-management-client-orgs:view': 'clients.view',
      'user-management-client-orgs:create': 'clients.create',
      'user-management-client-orgs:edit': 'clients.edit',
      'user-management-client-orgs:update': 'clients.edit',
      'user-management-client-orgs:delete': 'clients.delete',
      
      // Course Management
      'course-management:view': 'courses.view',
      'course-management:create': 'courses.create',
      'course-management:edit': 'courses.edit',
      'course-management:update': 'courses.edit', 
      'course-management:delete': 'courses.delete',
      
      // Course & Venue Setup
      'course-venue-setup:view': 'venues.view',
      'course-venue-setup:create': 'venues.create',
      'course-venue-setup:edit': 'venues.edit',
      'course-venue-setup:update': 'venues.edit',
      'course-venue-setup:delete': 'venues.delete'
    };
    
    console.log('Testing permission mappings:');
    testPermissions.forEach(fp => {
      const mapped = permissionNameMapping[fp];
      console.log(`Frontend: "${fp}" → Database: "${mapped || 'NOT MAPPED'}"`);
    });
    
    console.log('\n=== Database Permissions Check ===');
    const dbPermissions = await prisma.permission.findMany({
      select: { name: true, module: true, action: true }
    });
    
    console.log('Available database permissions:');
    dbPermissions.forEach(p => {
      console.log(`Name: "${p.name}", Module: ${p.module}, Action: ${p.action}`);
    });
    
    console.log('\n=== Mapping Validation ===');
    const mappedNames = testPermissions.map(fp => permissionNameMapping[fp]).filter(Boolean);
    const missingInDb = mappedNames.filter(name => !dbPermissions.find(p => p.name === name));
    
    if (missingInDb.length > 0) {
      console.log('⚠️ Permissions missing in database:');
      missingInDb.forEach(name => console.log(`  - ${name}`));
    } else {
      console.log('✅ All mapped permissions exist in database');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPermissionMappings();
