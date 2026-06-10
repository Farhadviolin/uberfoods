/**
 * Deterministic Test Data Factory for UI-E2E Tests
 * Generates consistent, predictable test data across all frontend apps
 */

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'customer' | 'restaurant' | 'driver' | 'admin';
}

export interface TestOrder {
  id: string;
  customerId: string;
  restaurantId: string;
  items: TestOrderItem[];
  totalAmount: number;
  status: string;
  deliveryAddress: TestAddress;
}

export interface TestOrderItem {
  name: string;
  price: number;
  quantity: number;
}

export interface TestAddress {
  street: string;
  city: string;
  zipCode: string;
  phone: string;
}

export interface TestRestaurant {
  id: string;
  name: string;
  cuisine: string;
  address: TestAddress;
  phone: string;
}

export class TestDataFactory {
  private static instance: TestDataFactory;
  private seed = Date.now();

  private constructor() {}

  static getInstance(): TestDataFactory {
    if (!TestDataFactory.instance) {
      TestDataFactory.instance = new TestDataFactory();
    }
    return TestDataFactory.instance;
  }

  // Deterministic ID generation
  private generateId(prefix: string, suffix?: string): string {
    const timestamp = this.seed;
    const randomPart = Math.abs(Math.sin(timestamp)).toString(36).substr(2, 9);
    return `${prefix}_${timestamp}_${randomPart}${suffix ? `_${suffix}` : ''}`;
  }

  // Test Users
  getTestCustomer(): TestUser {
    return {
      id: this.generateId('customer', 'e2e'),
      email: process.env.E2E_CUSTOMER_EMAIL || 'customer@uberfoods.local',
      password: 'test123',
      name: 'Test Customer',
      phone: '+43 123 456 789',
      role: 'customer'
    };
  }

  getTestRestaurant(): TestUser {
    return {
      id: this.generateId('restaurant', 'e2e'),
      email: 'testrestaurant@example.com',
      password: 'TestPassword123!',
      name: 'Test Restaurant',
      phone: '+43 987 654 321',
      role: 'restaurant'
    };
  }

  getTestDriver(): TestUser {
    return {
      id: this.generateId('driver', 'e2e'),
      email: 'testdriver@example.com',
      password: 'TestPassword123!',
      name: 'Test Driver',
      phone: '+43 555 123 456',
      role: 'driver'
    };
  }

  getTestAdmin(): TestUser {
    return {
      id: this.generateId('admin', 'e2e'),
      email: 'testadmin@example.com',
      password: 'TestPassword123!',
      name: 'Test Admin',
      phone: '+43 111 222 333',
      role: 'admin'
    };
  }

  // Test Addresses
  getTestDeliveryAddress(): TestAddress {
    return {
      street: 'Test Street 123',
      city: 'Vienna',
      zipCode: '1010',
      phone: '+43 123 456 789'
    };
  }

  getTestRestaurantAddress(): TestAddress {
    return {
      street: 'Restaurant Street 456',
      city: 'Vienna',
      zipCode: '1020',
      phone: '+43 987 654 321'
    };
  }

  // Test Restaurant
  getTestRestaurantData(): TestRestaurant {
    return {
      id: this.generateId('restaurant', 'e2e'),
      name: 'Test Italian Restaurant',
      cuisine: 'Italian',
      address: this.getTestRestaurantAddress(),
      phone: '+43 987 654 321'
    };
  }

  // Test Order
  getTestOrder(): TestOrder {
    const customer = this.getTestCustomer();
    const restaurant = this.getTestRestaurantData();

    return {
      id: this.generateId('order', 'e2e'),
      customerId: customer.id,
      restaurantId: restaurant.id,
      items: [
        { name: 'Margherita Pizza', price: 12.99, quantity: 2 },
        { name: 'Spaghetti Carbonara', price: 14.99, quantity: 1 },
        { name: 'Tiramisu', price: 6.99, quantity: 1 }
      ],
      totalAmount: 47.96, // Calculated: (12.99*2) + 14.99 + 6.99
      status: 'PENDING',
      deliveryAddress: this.getTestDeliveryAddress()
    };
  }

  // API Endpoints (consistent across tests)
  getApiEndpoints() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000/api';

    return {
      // Auth
      login: `${baseUrl}/auth/login`,
      register: `${baseUrl}/auth/register`,

      // Orders
      orders: `${baseUrl}/orders`,
      orderById: (id: string) => `${baseUrl}/orders/${id}`,

      // Restaurants
      restaurants: `${baseUrl}/restaurants`,
      restaurantById: (id: string) => `${baseUrl}/restaurants/${id}`,
      restaurantOrders: (restaurantId: string) => `${baseUrl}/restaurants/${restaurantId}/orders`,
      updateOrderStatus: (orderId: string) => `${baseUrl}/restaurants/orders/${orderId}/status`,

      // Drivers
      driverOrders: `${baseUrl}/drivers/orders`,
      driverOrderById: (id: string) => `${baseUrl}/drivers/orders/${id}`,
      acceptOrder: (id: string) => `${baseUrl}/drivers/orders/${id}/accept`,
      updateOrderStatus: (id: string) => `${baseUrl}/drivers/orders/${id}/status`,

      // Admin
      adminOrders: `${baseUrl}/admin/orders`,
      adminOrderById: (id: string) => `${baseUrl}/admin/orders/${id}`,

      // Health
      health: `${baseUrl}/health`
    };
  }

  // Frontend URLs
  getFrontendUrls() {
    return {
      customer: process.env.BASE_URL || process.env.CUSTOMER_URL || 'http://127.0.0.1:3002',
      restaurant: process.env.RESTAURANT_URL || 'http://127.0.0.1:3003',
      driver: process.env.DRIVER_URL || 'http://127.0.0.1:3004',
      admin: process.env.ADMIN_URL || 'http://127.0.0.1:3002'
    };
  }

  // Reset seed for consistent test runs
  resetSeed(newSeed?: number) {
    this.seed = newSeed || Date.now();
  }

  // Wait helpers for UI stability
  async waitForStablePage(page: any, timeout = 5000) {
    await page.waitForLoadState('networkidle', { timeout });
    await page.waitForTimeout(500); // Additional buffer for UI rendering
  }

  // Common UI selectors (consistent across tests)
  getSelectors() {
    return {
      // Auth forms
      emailInput: 'input[type="email"], input[name="email"], input[placeholder*="email"]',
      passwordInput: 'input[type="password"], input[name="password"], input[placeholder*="password"]',
      loginButton: 'button[type="submit"], button:has-text("Login"), button:has-text("Sign In")',
      registerButton: 'button[type="submit"], button:has-text("Register")',

      // Navigation
      navOrders: 'a[href*="orders"], nav a:has-text("Orders")',
      navDashboard: 'a[href*="dashboard"], nav a:has-text("Dashboard")',

      // Order management
      orderCard: '[data-testid="order-card"], .order-card',
      orderStatus: '[data-testid="order-status"], .order-status',
      acceptOrderBtn: 'button[data-testid="accept-order"], button:has-text("Accept")',
      markDeliveredBtn: 'button[data-testid="mark-delivered"], button:has-text("Delivered")',

      // Restaurant management
      readyForPickupBtn: 'button[data-testid="ready-pickup"], button:has-text("Ready")',

      // Admin
      adminOrdersTable: '[data-testid="orders-table"], .orders-table',
      adminOrderRow: '[data-testid="order-row"], .order-row'
    };
  }
}

// Export singleton instance
export const testDataFactory = TestDataFactory.getInstance();
