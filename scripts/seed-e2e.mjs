#!/usr/bin/env node

/**
 * E2E Test Data Seeder
 *
 * Seeds minimal data required for E2E tests:
 * - Admin user for login tests
 * - Basic restaurants and dishes for UI tests
 * - Test data that's idempotent
 */

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

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

async function main() {
  console.log('🌱 Seeding E2E test data...');

  // E2E Admin User
  const adminEmail = process.env.TEST_ADMIN_EMAIL || process.env.E2E_ADMIN_EMAIL || 'admin@uberfoods.com';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || process.env.E2E_ADMIN_PASSWORD || 'admin123';
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedAdminPassword,
      isActive: true,
      role: 'ADMIN'
    },
    create: {
      email: adminEmail,
      password: hashedAdminPassword,
      name: 'E2E Admin',
      isActive: true,
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin user created/updated:', admin.email);

  // Basic restaurant for UI tests
  const restaurant = await prisma.restaurant.upsert({
    where: { email: 'test-restaurant@uberfoods.com' },
    update: {},
    create: {
      name: 'Test Restaurant',
      description: 'Restaurant for E2E testing',
      address: 'Test Street 1, 12345 Berlin',
      phone: '+49 30 123456789',
      email: 'test-restaurant@uberfoods.com',
      password: await bcrypt.hash('test123', 10),
      isActive: true,
    },
  });

  // Add some dishes for the restaurant
  const dishes = [
    { id: 'e2e-pizza', name: 'E2E Pizza', price: 12.99, category: 'Pizza' },
    { id: 'e2e-burger', name: 'E2E Burger', price: 9.99, category: 'Burger' },
    { id: 'e2e-sushi', name: 'E2E Sushi', price: 15.99, category: 'Sushi' },
  ];

  for (const dish of dishes) {
    await prisma.dish.upsert({
      where: { id: dish.id },
      update: {},
      create: {
        id: dish.id,
        restaurantId: restaurant.id,
        name: dish.name,
        description: `Test ${dish.name} for E2E`,
        price: dish.price,
        category: dish.category,
        isAvailable: true,
      },
    });
  }

  console.log('✅ Restaurant and dishes created for E2E tests');

  // Create a test driver
  const driver = await prisma.driver.upsert({
    where: { email: 'test-driver@uberfoods.com' },
    update: {},
    create: {
      name: 'Test Driver',
      email: 'test-driver@uberfoods.com',
      password: await bcrypt.hash('driver123', 10),
      phone: '+49 151 123456789',
      isActive: true,
    },
  });

  console.log('✅ Test driver created');

  // E2E Customer User for auth.setup.ts
  const customerEmail = process.env.E2E_CUSTOMER_EMAIL || 'testcustomer@example.com';
  const customerPassword = process.env.E2E_CUSTOMER_PASSWORD || 'TestPassword123!';
  const hashedCustomerPassword = await bcrypt.hash(customerPassword, 10);

  const customer = await prisma.customer.upsert({
    where: { email: customerEmail },
    update: {
      password: hashedCustomerPassword,
      isActive: true,
    },
    create: {
      email: customerEmail,
      password: hashedCustomerPassword,
      firstName: 'Test',
      lastName: 'Customer',
      phone: '+43 123 456 789',
      isActive: true,
      address: 'Test Address 123, 1010 Vienna',
    },
  });

  console.log('✅ Customer user created/updated:', customer.email);

  console.log('🎉 E2E seed complete!');
  console.log(`   - Admin: ${adminEmail} / ${adminPassword}`);
  console.log(`   - Customer: ${customerEmail} / ${customerPassword}`);
  console.log(`   - Restaurant: ${restaurant.name}`);
  console.log(`   - Driver: ${driver.name}`);
}

main()
  .catch((e) => {
    console.error('❌ E2E seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
