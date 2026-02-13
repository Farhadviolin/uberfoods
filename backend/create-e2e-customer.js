const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fs = require('fs');

// Simple .env parser
function parseEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex).trim();
          const value = trimmed.substring(equalIndex + 1).trim().replace(/^["']|["']|["']$/g, '');
          env[key] = value;
        }
      }
    }

    return env;
  } catch (error) {
    console.warn('Could not read .env.e2e file:', error.message);
    return {};
  }
}

async function createE2ECustomer() {
  // Load environment variables from .env.e2e FIRST (absolute path from script location)
  const scriptDir = __dirname;
  const envPath = `${scriptDir}/.env.e2e`;
  console.log('Loading .env.e2e from:', envPath);
  const envVars = parseEnvFile(envPath);

  const databaseUrl = envVars.DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not found in .env.e2e or environment');
  }

  // Override process.env with loaded vars
  Object.assign(process.env, envVars);

  // Log effective environment for E2E
  const fs = require('fs');
  const path = require('path');
  const envEffectiveLog = path.join(scriptDir, '..', 'artifacts', 'e2e-customer', 'env-effective.log');
  const envLog = [
    `Timestamp: ${new Date().toISOString()}`,
    `Script: create-e2e-customer.js`,
    `NODE_ENV: ${process.env.NODE_ENV}`,
    `DATABASE_URL: ${process.env.DATABASE_URL}`,
    `DEFAULT_DRIVER_PASSWORD: ${process.env.DEFAULT_DRIVER_PASSWORD ? 'SET' : 'NOT SET'}`,
    `Env file loaded: .env.e2e (${Object.keys(envVars).length} vars)`,
    `---`
  ].join('\n');

  fs.writeFileSync(envEffectiveLog, envLog, { flag: 'a' }); // append

  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Normalize email like AuthService does
    const rawEmail = envVars.E2E_CUSTOMER_EMAIL || envVars.TEST_CUSTOMER_EMAIL || 'testcustomer@example.com';
    const customerEmail = rawEmail.toLowerCase().trim();

    const customerPassword = envVars.E2E_CUSTOMER_PASSWORD || envVars.TEST_CUSTOMER_PASSWORD || 'TestPassword123!';

    console.log(`Using password from ENV: ${envVars.E2E_CUSTOMER_PASSWORD ? 'E2E_CUSTOMER_PASSWORD' : envVars.TEST_CUSTOMER_PASSWORD ? 'TEST_CUSTOMER_PASSWORD' : 'fallback (TestPassword123!)'}`);
    console.log(`Actual password value (first 3 chars): ${customerPassword.substring(0, 3)}...`);
    console.log(`Normalized email: ${customerEmail}`);

    // Use same bcrypt rounds as AuthService (10)
    const hashedPassword = await bcrypt.hash(customerPassword, 10);
    console.log(`Generated bcrypt hash (first 10 chars): ${hashedPassword.substring(0, 10)}...`);

    // CRITICAL: Clean up any conflicting records in other auth tables first
    // This prevents validateUser() from matching wrong entity type
    console.log(`🧹 Cleaning up conflicting records with email: ${customerEmail}`);

    try {
      const adminDeleted = await prisma.admin.deleteMany({
        where: { email: customerEmail }
      });
      if (adminDeleted.count > 0) {
        console.log(`   Deleted ${adminDeleted.count} admin record(s) with conflicting email`);
      }

      const restaurantDeleted = await prisma.restaurant.deleteMany({
        where: { email: customerEmail }
      });
      if (restaurantDeleted.count > 0) {
        console.log(`   Deleted ${restaurantDeleted.count} restaurant record(s) with conflicting email`);
      }

      const driverDeleted = await prisma.driver.deleteMany({
        where: { email: customerEmail }
      });
      if (driverDeleted.count > 0) {
        console.log(`   Deleted ${driverDeleted.count} driver record(s) with conflicting email`);
      }

      console.log('✅ Email conflicts cleaned up');
    } catch (cleanupError) {
      console.log(`⚠️  Cleanup warning (non-fatal): ${cleanupError.message}`);
    }

    const customer = await prisma.customer.upsert({
      where: { email: customerEmail },
      update: {
        password: hashedPassword,
        isActive: true,
        emailVerified: true,
        status: 'ACTIVE'
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
        emailVerified: true,
        status: 'ACTIVE'
      }
    });

    console.log('✅ E2E Customer created/updated:', customer.email);
    console.log('   ID:', customer.id);
  } finally {
    await prisma.$disconnect();
  }
}

createE2ECustomer().catch(console.error);