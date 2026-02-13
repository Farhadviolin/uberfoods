import { PrismaClient } from './backend/node_modules/@prisma/client/index.js';
import bcrypt from './backend/node_modules/bcrypt/bcrypt.js';

async function seedE2E() {
  const prisma = new PrismaClient();

  try {
    // E2E Test Customer (matches test-data-factory.ts and auth-identity-audit.mjs)
    const customerEmail = process.env.E2E_CUSTOMER_EMAIL || 'testcustomer@example.com';
    const customerPassword = process.env.E2E_CUSTOMER_PASSWORD || 'TestPassword123!';

    await prisma.customer.upsert({
      where: { email: customerEmail },
      update: { password: await bcrypt.hash(customerPassword, 10), isActive: true },
      create: {
        name: 'Test Customer',
        email: customerEmail,
        password: await bcrypt.hash(customerPassword, 10),
        firstName: 'Test',
        lastName: 'Customer',
        phone: '+43 123 456 789',
        address: 'Test Street 123, 1010 Vienna',
        isActive: true,
        emailVerified: true
      }
    });

    console.log('✅ E2E seed complete');
  } finally {
    await prisma.$disconnect();
  }
}

seedE2E().catch(console.error);