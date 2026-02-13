// Test setup for integration tests
import { jest } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:testpassword@localhost:5432/uberfoods_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

// Mock external services for integration tests
jest.mock('../backend/src/common/services/email.service', () => ({
  EmailService: {
    sendWelcomeEmail: jest.fn(),
    sendPasswordReset: jest.fn(),
    sendOrderConfirmation: jest.fn(),
  },
}));

jest.mock('../backend/src/common/services/sms.service', () => ({
  SmsService: {
    sendOrderNotification: jest.fn(),
    sendDriverAssignment: jest.fn(),
  },
}));

jest.mock('../backend/src/common/services/payment.service', () => ({
  PaymentService: {
    processPayment: jest.fn(),
    refundPayment: jest.fn(),
  },
}));

// Global test utilities
global.testUtils = {
  createTestUser: (overrides = {}) => ({
    id: 'test-user-' + Date.now(),
    email: 'test@example.com',
    name: 'Test User',
    role: 'customer',
    ...overrides,
  }),

  createTestOrder: (overrides = {}) => ({
    id: 'test-order-' + Date.now(),
    customerId: 'test-customer',
    restaurantId: 'test-restaurant',
    status: 'pending',
    totalAmount: 25.50,
    ...overrides,
  }),

  createTestRestaurant: (overrides = {}) => ({
    id: 'test-restaurant-' + Date.now(),
    name: 'Test Restaurant',
    cuisine: 'Italian',
    isOpen: true,
    ...overrides,
  }),

  createTestDriver: (overrides = {}) => ({
    id: 'test-driver-' + Date.now(),
    name: 'Test Driver',
    email: 'driver@example.com',
    status: 'online',
    ...overrides,
  }),
};

// Clean up after each test
afterEach(async () => {
  // Clean up database state if needed
  // This would be implemented based on your database setup
});

// Clean up after all tests
afterAll(async () => {
  // Close database connections
  // Clean up test data
});
