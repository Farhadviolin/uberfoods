const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({ log: ['error', 'warn'] });

async function main() {
  const email = process.env.ADMIN_TEST_EMAIL;
  const password = process.env.ADMIN_TEST_PASSWORD;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  if (!email || !password) {
    throw new Error('ADMIN_TEST_EMAIL and ADMIN_TEST_PASSWORD are required');
  }

  await prisma.$connect();

  const hashedPassword = await bcrypt.hash(password, 10);
  const admin = await prisma.admin.upsert({
    where: { email: email.toLowerCase().trim() },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: 'CI Test Admin',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log(`Test admin created or updated: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error('Failed to create test admin:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
