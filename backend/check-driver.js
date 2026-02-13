process.env.DATABASE_URL = 'postgresql://postgres:postgres123@localhost:5432/uberfoods';

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDriver() {
  try {
    const driver = await prisma.driver.findUnique({
      where: { email: 'driver@uberfoods.local' },
      select: {
        id: true,
        email: true,
        password: true,
        isActive: true
      }
    });

    if (driver) {
      console.log('Driver found:', {
        id: driver.id,
        email: driver.email,
        hasPassword: !!driver.password,
        passwordLength: driver.password ? driver.password.length : 0,
        isActive: driver.isActive
      });
    } else {
      console.log('Driver not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDriver();