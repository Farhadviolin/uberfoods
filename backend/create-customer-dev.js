// Simple .env parser
function parseEnvFile(filePath) {
  try {
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex).trim();
          const value = trimmed.substring(equalIndex + 1).trim().replace(/^["']|["']$/g, '');
          env[key] = value;
        }
      }
    }

    return env;
  } catch (error) {
    console.warn('Could not read .env file:', error.message);
    return {};
  }
}

async function createCustomer() {
  // Load environment variables
  const envPath = './.env';
  const envVars = parseEnvFile(envPath);
  Object.assign(process.env, envVars);

  const { PrismaClient } = require('@prisma/client');
  const bcrypt = require('bcrypt');
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