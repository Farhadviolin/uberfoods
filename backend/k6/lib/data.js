// Test data helpers for k6 load tests

import http from 'k6/http';
import { CONFIG, randomFromArray, randomInt } from './config.js';
import { httpAuth } from './auth.js';

/**
 * Test data management for load tests
 */
export class TestDataManager {
  constructor() {
    this.initialized = false;
    this.restaurantIds = [];
    this.customerIds = [];
    this.driverIds = [];
    this.orderIds = [];
    this.totalOrders = 0;
  }

  /**
   * Initialize test data by fetching from API
   */
  async initialize() {
    if (this.initialized) return;

    console.log('📊 Initializing test data...');

    try {
      // Fetch restaurants
      const restaurantsResponse = httpAuth.getAdmin(`${CONFIG.API_BASE_URL}/admin/restaurants?limit=100`);
      if (restaurantsResponse.status === 200) {
        const restaurants = this.parseResponseData(restaurantsResponse);
        this.restaurantIds = restaurants.map(r => r.id);
        console.log(`✅ Loaded ${this.restaurantIds.length} restaurants`);
      }

      // Fetch customers (sample)
      const customersResponse = httpAuth.getAdmin(`${CONFIG.API_BASE_URL}/admin/customers?limit=100`);
      if (customersResponse.status === 200) {
        const customers = this.parseResponseData(customersResponse);
        this.customerIds = customers.map(c => c.id);
        console.log(`✅ Loaded ${this.customerIds.length} customers`);
      }

      // Fetch drivers
      const driversResponse = httpAuth.getAdmin(`${CONFIG.API_BASE_URL}/admin/drivers?limit=50`);
      if (driversResponse.status === 200) {
        const drivers = this.parseResponseData(driversResponse);
        this.driverIds = drivers.map(d => d.id);
        console.log(`✅ Loaded ${this.driverIds.length} drivers`);
      }

      // Fetch sample orders to get cursor
      const ordersResponse = httpAuth.getAdmin(`${CONFIG.API_BASE_URL}/orders?limit=10`);
      if (ordersResponse.status === 200) {
        const ordersData = this.parseResponseData(ordersResponse);
        this.orderIds = ordersData.map(o => o.id);
        this.totalOrders = this.estimateTotalOrders();
        console.log(`✅ Loaded ${this.orderIds.length} sample orders, estimated total: ${this.totalOrders}`);
      }

      this.initialized = true;
      console.log('🎉 Test data initialization complete');
    } catch (error) {
      console.error('❌ Failed to initialize test data:', error);
      throw error;
    }
  }

  /**
   * Parse API response data
   */
  parseResponseData(response) {
    try {
      const jsonResponse = response.json();

      // Handle different response formats
      if (jsonResponse.data && Array.isArray(jsonResponse.data)) {
        return jsonResponse.data;
      }
      if (Array.isArray(jsonResponse)) {
        return jsonResponse;
      }

      return [];
    } catch (error) {
      console.warn('Failed to parse response data:', error);
      return [];
    }
  }

  /**
   * Estimate total orders from sample data
   */
  estimateTotalOrders() {
    // Based on test data size configuration
    const estimates = {
      small: 1000,
      medium: 10000,
      large: 100000,
    };

    return estimates[CONFIG.TEST_DATA_SIZE] || estimates.medium;
  }

  /**
   * Get random restaurant ID
   */
  getRandomRestaurantId() {
    return randomFromArray(this.restaurantIds);
  }

  /**
   * Get random customer ID
   */
  getRandomCustomerId() {
    return randomFromArray(this.customerIds);
  }

  /**
   * Get random driver ID
   */
  getRandomDriverId() {
    return randomFromArray(this.driverIds);
  }

  /**
   * Get random order ID
   */
  getRandomOrderId() {
    return randomFromArray(this.orderIds);
  }

  /**
   * Generate random cursor for pagination testing
   */
  generateRandomCursor() {
    // Generate a cursor that looks realistic
    // Format: base64(timestamp:id)
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - randomInt(0, 30)); // Last 30 days

    const id = `ck${randomInt(100000, 999999)}0000${randomInt(100000, 999999)}`;
    const cursorData = `${timestamp.toISOString()}:${id}`;

    return Buffer.from(cursorData).toString('base64');
  }

  /**
   * Generate random order status for testing
   */
  getRandomOrderStatus() {
    const statuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];
    return randomFromArray(statuses);
  }

  /**
   * Generate random location for driver testing
   */
  generateRandomLocation() {
    // Vienna area coordinates
    return {
      lat: 48.2082 + (Math.random() - 0.5) * 0.01,
      lng: 16.3738 + (Math.random() - 0.5) * 0.01,
    };
  }

  /**
   * Get test data summary
   */
  getSummary() {
    return {
      restaurants: this.restaurantIds.length,
      customers: this.customerIds.length,
      drivers: this.driverIds.length,
      sampleOrders: this.orderIds.length,
      estimatedTotalOrders: this.totalOrders,
      initialized: this.initialized,
    };
  }
}

// Export singleton instance
export const testData = new TestDataManager();

/**
 * Data generation helpers for test payloads
 */
export class DataGenerator {
  /**
   * Generate order creation payload
   */
  static generateOrderPayload(restaurantId, customerId) {
    return {
      restaurantId,
      customerId,
      items: this.generateOrderItems(),
      deliveryAddress: this.generateAddress(),
      phone: this.generatePhoneNumber(),
      notes: Math.random() > 0.7 ? 'Extra spicy please' : undefined,
    };
  }

  /**
   * Generate random order items
   */
  static generateOrderItems() {
    const itemCount = randomInt(1, 5);
    const items = [];

    for (let i = 0; i < itemCount; i++) {
      items.push({
        dishId: `dish_${randomInt(1, 100)}`,
        quantity: randomInt(1, 3),
        price: randomInt(800, 2500), // cents
        specialInstructions: Math.random() > 0.8 ? 'No onions please' : undefined,
      });
    }

    return items;
  }

  /**
   * Generate random address
   */
  static generateAddress() {
    const streets = ['Hauptstraße', 'Kirchweg', 'Bahnhofstraße', 'Schulweg', 'Marktplatz'];
    const cities = ['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt'];

    return `${randomFromArray(streets)} ${randomInt(1, 200)}, ${randomFromArray(cities)}`;
  }

  /**
   * Generate random phone number
   */
  static generatePhoneNumber() {
    return `+49 ${randomInt(100, 999)} ${randomInt(1000000, 9999999)}`;
  }

  /**
   * Generate realistic time periods for dashboard testing
   */
  static getRandomTimePeriod() {
    const periods = ['1h', '24h', '7d', '30d'];
    return randomFromArray(periods);
  }
}