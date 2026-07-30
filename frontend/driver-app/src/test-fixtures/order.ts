import type { Order } from '../types';

export function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-123',
    status: 'IN_TRANSIT',
    totalAmount: 25.5,
    address: 'Delivery St. 2',
    phone: '+49123456789',
    createdAt: '2026-07-30T00:00:00.000Z',
    restaurant: {
      id: 'restaurant-123',
      name: 'Test Restaurant',
      address: 'Test St. 1',
    },
    customer: {
      id: 'customer-123',
      name: 'Test Customer',
      phone: '+49123456789',
    },
    items: [{ dish: { name: 'Pizza' }, quantity: 1, price: 25.5 }],
    ...overrides,
  };
}
