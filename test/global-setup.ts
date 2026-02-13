// Global setup for integration tests
export default async function globalSetup() {
  console.log('🚀 Setting up integration test environment...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:testpassword@localhost:5432/uberfoods_test';
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

  // Verify database connection
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    await prisma.$connect();
    console.log('✅ Database connection established');

    // Clean up any existing test data
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
    await prisma.restaurant.deleteMany();
    await prisma.driver.deleteMany();

    await prisma.$disconnect();
    console.log('✅ Test database cleaned');
  } catch (error) {
    console.warn('⚠️  Database setup failed:', error.message);
    console.warn('Integration tests may fail if database is not available');
  }

  console.log('✅ Integration test environment ready');
}
