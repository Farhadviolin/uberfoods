const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

async function createTestDriver() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5434/uberfoods';
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);

  const prisma = new PrismaClient({ adapter });

  try {
    const driver = await prisma.driver.create({
      data: {
        id: 'driver-test-real-001',
        name: 'Test Driver',
        email: 'driver.test@uberfoods.com',
        phone: '+1234567890',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('Created driver:', JSON.stringify(driver, null, 2));
  } catch (error) {
    console.log('Driver creation error:', error.message);

    // Try to find existing driver
    try {
      const existingDriver = await prisma.driver.findUnique({
        where: { id: 'driver-test-real-001' }
      });
      if (existingDriver) {
        console.log('Driver already exists:', JSON.stringify(existingDriver, null, 2));
      }
    } catch (findError) {
      console.log('Find error:', findError.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestDriver();
