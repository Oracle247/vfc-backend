import { PrismaClient } from '@prisma/client';

// Add prisma client to the NodeJS global type
// Helps with managing connections in development with HMR
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClient = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prismaClient;
}

process.on('beforeExit', async () => {
  await prismaClient.$disconnect();
});

export default prismaClient;