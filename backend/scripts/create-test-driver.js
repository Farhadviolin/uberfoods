const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function createTestDriver() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set!');
  }

  const prisma = new PrismaClient({ log: ['error', 'warn'] });

  try {
    await prisma.$connect();

    const testDriverPassword = process.env.TEST_DRIVER_PASSWORD || 'password123';

    // Hash the password
    const hashedPassword = await bcrypt.hash(testDriverPassword, 10);

    // Create a test driver
    const driver = await prisma.driver.create({
      data: {
        email: 'testdriver@example.com',
        password: hashedPassword,
        name: 'Test Driver',
        phone: '+1234567890',
        currentStatus: 'AVAILABLE',
        isActive: true,
      }
    });

    console.log('Test driver created:', driver.id);
    console.log('Email: testdriver@example.com');
    console.log('Password: [configured test password]');
  } finally {
    await prisma.$disconnect();
  }
}

createTestDriver().catch((error) => {
  console.error('Failed to create test driver:', error);
  process.exitCode = 1;
});
