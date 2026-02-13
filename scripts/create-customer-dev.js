const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function createCustomer() {
  const prisma = new PrismaClient();

  try {
    const customerEmail = 'testcustomer@example.com';
    const customerPassword = 'TestPassword123!';

    const hashedPassword = await bcrypt.hash(customerPassword, 10);

    const customer = await prisma.customer.upsert({
      where: { email: customerEmail },
      update: {
        password: hashedPassword,
        isActive: true,
        emailVerified: true
      },
      create: {
        name: 'Test Customer',
        email: customerEmail,
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'Customer',
        phone: '+43 123 456 789',
        address: 'Test Street 123, 1010 Vienna',
        isActive: true,
        emailVerified: true
      }
    });

    console.log('✅ Customer created/updated:', customer.email);
    console.log('   ID:', customer.id);
  } finally {
    await prisma.$disconnect();
  }
}

createCustomer().catch(console.error);