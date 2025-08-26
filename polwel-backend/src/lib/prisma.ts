import { PrismaClient } from '@prisma/client';

// Create a single shared Prisma instance
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Ensure proper cleanup on app termination
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
