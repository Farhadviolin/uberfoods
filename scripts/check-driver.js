const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function checkDriver() {
  try {
    const driver = await prisma.driver.findUnique({
      where: { email: 'driver@uberfoods.local' }
    });

    if (driver) {
      console.log('Driver found:', {
        id: driver.id,
        email: driver.email,
        name: driver.name,
        hasPassword: !!driver.password,
        passwordLength: driver.password ? driver.password.length : 0,
        isActive: driver.isActive
      });

      // Test password
      const testPassword = 'Driver123!';
      const isValid = await bcrypt.compare(testPassword, driver.password);
      console.log('Password test result:', isValid);
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