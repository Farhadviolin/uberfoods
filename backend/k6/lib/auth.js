// Authentication helpers for k6 load tests

import http from 'k6/http';
import { CONFIG } from './config.js';

/**
 * Authentication helper class for k6 tests
 */
export class AuthHelper {
  constructor() {
    this.adminToken = CONFIG.AUTH.adminToken;
    this.customerTokens = CONFIG.AUTH.customerTokens;
    this.driverTokens = CONFIG.AUTH.driverTokens;
  }

  /**
   * Get admin authentication headers
   */
  getAdminHeaders() {
    return {
      'Authorization': `Bearer ${this.adminToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get customer authentication headers (random customer)
   */
  getCustomerHeaders() {
    const token = this.customerTokens.length > 0
      ? this.customerTokens[Math.floor(Math.random() * this.customerTokens.length)]
      : this.adminToken; // Fallback to admin token

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get driver authentication headers (random driver)
   */
  getDriverHeaders() {
    const token = this.driverTokens.length > 0
      ? this.driverTokens[Math.floor(Math.random() * this.driverTokens.length)]
      : this.adminToken; // Fallback to admin token

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Validate authentication tokens
   */
  async validateTokens() {
    console.log('🔐 Validating authentication tokens...');

    // Test admin token
    const adminResponse = http.get(`${CONFIG.API_BASE_URL}/health`, {
      headers: this.getAdminHeaders(),
    });

    if (adminResponse.status !== 200) {
      throw new Error(`Admin token validation failed: ${adminResponse.status}`);
    }

    console.log('✅ Admin token validated');

    // Test customer tokens (if any)
    if (this.customerTokens.length > 0) {
      const customerResponse = http.get(`${CONFIG.API_BASE_URL}/health`, {
        headers: this.getCustomerHeaders(),
      });

      if (customerResponse.status !== 200) {
        console.warn('⚠️ Customer token validation failed, using admin token as fallback');
      } else {
        console.log('✅ Customer tokens validated');
      }
    }

    // Test driver tokens (if any)
    if (this.driverTokens.length > 0) {
      const driverResponse = http.get(`${CONFIG.API_BASE_URL}/health`, {
        headers: this.getDriverHeaders(),
      });

      if (driverResponse.status !== 200) {
        console.warn('⚠️ Driver token validation failed, using admin token as fallback');
      } else {
        console.log('✅ Driver tokens validated');
      }
    }
  }

  /**
   * Generate test tokens for load testing
   * In production, this would authenticate against the real API
   */
  static generateTestTokens(count, type = 'customer') {
    const tokens = [];

    for (let i = 0; i < count; i++) {
      // Generate mock JWT-like tokens for testing
      // In a real scenario, you'd authenticate users through the API
      const mockToken = `mock_${type}_token_${i}_${Date.now()}`;
      tokens.push(mockToken);
    }

    return tokens;
  }

  /**
   * Refresh authentication tokens if needed
   */
  async refreshTokens() {
    // Implementation would depend on your authentication system
    // For now, just validate existing tokens
    await this.validateTokens();
  }
}

// Export singleton instance
export const authHelper = new AuthHelper();

/**
 * HTTP request wrapper with automatic authentication
 */
export class AuthenticatedHttp {
  constructor(private authHelper) {}

  /**
   * GET request with admin authentication
   */
  getAdmin(url, options = {}) {
    return http.get(url, {
      ...options,
      headers: {
        ...this.authHelper.getAdminHeaders(),
        ...options.headers,
      },
    });
  }

  /**
   * GET request with customer authentication
   */
  getCustomer(url, options = {}) {
    return http.get(url, {
      ...options,
      headers: {
        ...this.authHelper.getCustomerHeaders(),
        ...options.headers,
      },
    });
  }

  /**
   * GET request with driver authentication
   */
  getDriver(url, options = {}) {
    return http.get(url, {
      ...options,
      headers: {
        ...this.authHelper.getDriverHeaders(),
        ...options.headers,
      },
    });
  }

  /**
   * POST request with admin authentication
   */
  postAdmin(url, data, options = {}) {
    return http.post(url, JSON.stringify(data), {
      ...options,
      headers: {
        ...this.authHelper.getAdminHeaders(),
        ...options.headers,
      },
    });
  }

  /**
   * PATCH request with admin authentication
   */
  patchAdmin(url, data, options = {}) {
    return http.patch(url, JSON.stringify(data), {
      ...options,
      headers: {
        ...this.authHelper.getAdminHeaders(),
        ...options.headers,
      },
    });
  }

  /**
   * DELETE request with admin authentication
   */
  deleteAdmin(url, options = {}) {
    return http.del(url, {
      ...options,
      headers: {
        ...this.authHelper.getAdminHeaders(),
        ...options.headers,
      },
    });
  }
}

// Export authenticated HTTP helper
export const httpAuth = new AuthenticatedHttp(authHelper);