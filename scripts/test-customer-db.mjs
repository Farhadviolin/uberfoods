/**
 * Simple E2E Customer Database Test
 * Tests if customer exists in E2E database directly
 */

import { PrismaClient } from '@prisma/client';

async function testCustomerInDB() {
  console.log('🧪 Testing Customer in E2E Database...');

  const prisma = new PrismaClient();

  try {
    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { email: 'testcustomer@example.com' }
    });

    if (customer) {
      console.log('✅ Customer found in database:');
      console.log(`   ID: ${customer.id}`);
      console.log(`   Email: ${customer.email}`);
      console.log(`   Name: ${customer.name}`);
      console.log(`   Active: ${customer.isActive}`);
      console.log(`   Verified: ${customer.emailVerified}`);
      return { success: true, message: 'Customer exists in database' };
    } else {
      console.log('❌ Customer not found in database');
      return { success: false, message: 'Customer does not exist in database' };
    }

  } catch (error) {
    console.log('❌ Database test failed:', error.message);
    return { success: false, message: `Database error: ${error.message}`, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCustomerInDB()
  .then(result => {
    console.log('\n' + '='.repeat(50));
    console.log('🧪 DATABASE TEST RESULT:', result.success ? 'PASS' : 'FAIL');
    console.log('   Message:', result.message);
    console.log('='.repeat(50));

    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });