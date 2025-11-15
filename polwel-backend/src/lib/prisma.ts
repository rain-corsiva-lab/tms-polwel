import { PrismaClient } from '@prisma/client';

// Declare global type for Prisma to prevent multiple instances in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create a single shared Prisma instance
// Use global variable in development to prevent hot reload from creating new connections
const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Store in global in development to reuse connection across hot reloads
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Test database connection on initialization
prisma.$connect()
  .then(() => {
    console.log('✅ Database connected successfully');
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    console.error('💡 Tip: Check your DATABASE_URL in .env file');
  });

// Handle connection errors gracefully
prisma.$on('error' as never, (e: any) => {
  console.error('❌ Prisma connection error:', e);
});

// Ensure proper cleanup on app termination
const cleanup = async () => {
  console.log('🔄 Disconnecting from database...');
  await prisma.$disconnect();
  console.log('✅ Database disconnected');
};

process.on('beforeExit', cleanup);
process.on('SIGINT', async () => {
  await cleanup();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});

export default prisma;
