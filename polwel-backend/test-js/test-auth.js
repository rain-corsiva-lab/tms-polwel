const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Replicate the exact same environment loading as your main app
const NODE_ENV = process.env.NODE_ENV || 'development';
const envFile = `.env.${NODE_ENV}`;

console.log('🔧 Loading environment...');
console.log('🔧 NODE_ENV:', NODE_ENV);
console.log('🔧 ENV File:', envFile);

// Load environment exactly like your main app
dotenv.config({ path: path.resolve(process.cwd(), envFile) });
dotenv.config(); // Fallback to .env

console.log('🔧 After loading - DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@'));

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function testAuthFlow() {
    console.log('🔍 Testing auth flow exactly like the route...');
    
    try {
        // Test the exact same query as in auth.ts line 51
        console.log('📡 Testing prisma.user.findUnique...');
        const user = await prisma.user.findUnique({
            where: { email: 'john.tan@polwel.org' },
            include: {
                organization: true
            }
        });

        console.log('✅ User found:', user ? `${user.name} (${user.email})` : 'No user found');

        // Test if this is the exact error from your auth route
        console.log('📡 Testing the auth route pattern...');
        const testEmail = 'john.tan@polwel.org';
        const authUser = await prisma.user.findUnique({
            where: { email: testEmail },
            include: {
                organization: true
            }
        });

        if (!authUser) {
            console.log(`❌ Auth test - User not found: ${testEmail}`);
        } else {
            console.log(`✅ Auth test - User found: ${authUser.name}`);
        }

    } catch (error) {
        console.error('❌ Auth test failed:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        
        // Check if this is the same error as in staging
        if (error.message.includes('Authentication failed against database server')) {
            console.error('🚨 THIS IS THE SAME ERROR AS YOUR STAGING ISSUE!');
            console.error('🔍 The issue is in the Prisma client initialization or connection pooling');
        }
    } finally {
        await prisma.$disconnect();
    }
}

testAuthFlow();
