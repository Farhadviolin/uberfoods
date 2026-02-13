const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');

async function createTestDriver() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set!');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });

  try {
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
    console.log('Password: password123');
  } catch (error) {
    console.error('Error creating test driver:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestDriver();
