import { randomUUID } from 'crypto';

/**
 * Test utility functions for generating deterministic test data
 */

export function getTestEmail(prefix?: string): string {
  const basePrefix = prefix ? `${prefix.toLowerCase()}-` : 'test-';
  return process.env.TEST_ADMIN_EMAIL ?? `${basePrefix}${randomUUID()}@example.com`;
}

export function getTestPassword(): string {
  return process.env.TEST_ADMIN_PASSWORD ?? `test-${randomUUID()}`;
}

export function getTestDriverEmail(): string {
  return process.env.TEST_DRIVER_EMAIL ?? `driver-${randomUUID()}@example.com`;
}

export function getTestDriverPassword(): string {
  return process.env.TEST_DRIVER_PASSWORD ?? `driver-${randomUUID()}`;
}

export function getTestRestaurantEmail(): string {
  return process.env.TEST_RESTAURANT_EMAIL ?? `restaurant-${randomUUID()}@example.com`;
}

export function getTestRestaurantPassword(): string {
  return process.env.TEST_RESTAURANT_PASSWORD ?? `restaurant-${randomUUID()}`;
}

export function getTestCustomerEmail(): string {
  return process.env.TEST_CUSTOMER_EMAIL ?? `customer-${randomUUID()}@example.com`;
}

export function getTestCustomerPassword(): string {
  return process.env.TEST_CUSTOMER_PASSWORD ?? `customer-${randomUUID()}`;
}
