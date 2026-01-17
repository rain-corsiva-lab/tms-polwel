const { PrismaClient } = require('@prisma/client');

async function testDatabase() {
    console.log('🔍 Testing database connection...');
    console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔧 DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@'));
    
    const prisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
    });

    try {
        // Test basic connection
        console.log('📡 Testing database connection...');
        await prisma.$connect();
        console.log('✅ Database connected successfully!');

        // Test a simple query
        console.log('🔍 Testing user count query...');
        const userCount = await prisma.user.count();
        console.log(`✅ User count: ${userCount}`);

        // Test finding a user by email
        console.log('🔍 Testing user findUnique...');
        const testUser = await prisma.user.findFirst({
            select: { id: true, email: true, name: true }
        });
        console.log('✅ Test user found:', testUser);

    } catch (error) {
        console.error('❌ Database test failed:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error meta:', error.meta);
    } finally {
        await prisma.$disconnect();
        console.log('🔌 Database disconnected');
    }
}

testDatabase();
