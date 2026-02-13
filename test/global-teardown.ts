// Global teardown for integration tests
export default async function globalTeardown() {
  console.log('🧹 Cleaning up integration test environment...');

  try {
    // Clean up database connections
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    await prisma.$connect();

    // Clean up test data
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
    await prisma.restaurant.deleteMany();
    await prisma.driver.deleteMany();
    await prisma.auditLog.deleteMany();

    await prisma.$disconnect();
    console.log('✅ Test database cleaned up');
  } catch (error) {
    console.warn('⚠️  Database cleanup failed:', error.message);
  }

  console.log('✅ Integration test environment cleaned up');
}
