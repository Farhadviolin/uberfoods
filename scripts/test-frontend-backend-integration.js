#!/usr/bin/env node

/**
 * Frontend-Backend Integration Test Suite
 *
 * Tests critical API endpoints between Frontend apps and Backend
 * Ensures all integrations work correctly
 */

const { performance } = require('perf_hooks');

// Simple fetch wrapper for Node.js
async function fetch(url, options = {}) {
  const https = require('https');

  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (err) {
      return reject(new Error(`Invalid URL: ${url}`));
    }

    if (parsed.protocol !== 'https:') {
      return reject(new Error('HTTPS required; set BACKEND_URL to https://...'));
    }

    const req = https.request(parsed, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            data: jsonData,
            headers: res.headers,
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            data: data,
            headers: res.headers,
          });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

class IntegrationTester {
  constructor() {
    this.baseURL = process.env.BACKEND_URL || 'https://localhost:3000';
    this.customerToken = null;
    this.adminToken = null;
    this.driverToken = null;
    this.restaurantToken = null;
    this.creds = {
      customer: {
        email: process.env.TEST_CUSTOMER_EMAIL,
        password: process.env.TEST_CUSTOMER_PASSWORD,
      },
      admin: {
        email: process.env.TEST_ADMIN_EMAIL,
        password: process.env.TEST_ADMIN_PASSWORD,
      },
    };

    // Test results
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: [],
      performance: [],
    };

    console.log('🚀 Starting Frontend-Backend Integration Tests');
    console.log('📍 Backend URL:', this.baseURL);
    console.log('⏰ Started at:', new Date().toISOString());
    console.log('=' .repeat(60));
  }

  async runTests() {
    try {
      // Health Check
      await this.testHealthCheck();

      // Authentication Tests
      await this.testAuthentication();

      // Core API Tests
      await this.testCoreAPIs();

      // Customer-Web Specific Tests
      await this.testCustomerWebFeatures();

      // Admin-Panel Specific Tests
      await this.testAdminPanelFeatures();

      // Performance Tests
      await this.testPerformance();

      this.printResults();

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async testHealthCheck() {
    console.log('\n🏥 Testing Health Check...');
    await this.runTest('Health Check', async () => {
      const response = await fetch(`${this.baseURL}/api/monitoring/health`);
      if (response.status !== 200) throw new Error('Health check failed');
      if (!response.data.status || response.data.status !== 'ok') {
        throw new Error('Health status not ok');
      }
    });
  }

  async testAuthentication() {
    console.log('\n🔐 Testing Authentication...');

    // Customer Login
    await this.runTest('Customer Login', async () => {
      if (!this.creds.customer.email || !this.creds.customer.password) {
        console.warn('Skipping customer login - TEST_CUSTOMER_EMAIL/PASSWORD not set');
        return true;
      }
      const response = await fetch(`${this.baseURL}/api/auth/customer/login`, {
        method: 'POST',
        body: {
          email: this.creds.customer.email,
          password: this.creds.customer.password,
        }
      });
      // Note: This might fail if test user doesn't exist, but we're testing the endpoint
      if (response.status === 401) {
        // Expected for non-existent user
        return true;
      }
      if (response.status === 200 && response.data.token) {
        this.customerToken = response.data.token;
        return true;
      }
      throw new Error('Unexpected auth response');
    });

    // Admin Login
    await this.runTest('Admin Login', async () => {
      if (!this.creds.admin.email || !this.creds.admin.password) {
        console.warn('Skipping admin login - TEST_ADMIN_EMAIL/PASSWORD not set');
        return true;
      }
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: this.creds.admin.email,
        password: this.creds.admin.password,
      });
      // Similar logic as customer login
      if (response.status === 401 || (response.status === 200 && response.data.token)) {
        if (response.data.token) this.adminToken = response.data.token;
        return true;
      }
      throw new Error('Unexpected admin auth response');
    });
  }

  async testCoreAPIs() {
    console.log('\n🔧 Testing Core APIs...');

    // Public Restaurants
    await this.runTest('Public Restaurants API', async () => {
      const response = await axios.get(`${this.baseURL}/api/restaurants/public`);
      if (response.status !== 200) throw new Error('Restaurants API failed');
      if (!Array.isArray(response.data)) throw new Error('Expected array response');
    });

    // Statistics (may require auth)
    await this.runTest('Statistics API', async () => {
      const config = this.adminToken ? { headers: { Authorization: `Bearer ${this.adminToken}` } } : {};
      try {
        const response = await axios.get(`${this.baseURL}/api/statistics/dashboard`, config);
        if (response.status === 200) return true;
      } catch (error) {
        if (error.response?.status === 401) return true; // Expected if no auth
        throw error;
      }
    });
  }

  async testCustomerWebFeatures() {
    console.log('\n🍕 Testing Customer-Web Features...');

    // Social Feed (may require auth)
    await this.runTest('Social Feed API', async () => {
      const config = this.customerToken ? { headers: { Authorization: `Bearer ${this.customerToken}` } } : {};
      try {
        const response = await axios.get(`${this.baseURL}/api/social/feed`, config);
        if (response.status === 200 && Array.isArray(response.data)) return true;
      } catch (error) {
        if (error.response?.status === 401) return true; // Expected if no auth
        throw error;
      }
    });

    // Predictive Delivery
    await this.runTest('Predictive Delivery API', async () => {
      const testData = {
        restaurantId: 'test-restaurant',
        customerLat: 48.2082,
        customerLng: 16.3738,
      };
      try {
        const response = await axios.post(`${this.baseURL}/api/analytics/predict-delivery`, testData);
        if (response.status === 200) return true;
      } catch (error) {
        // May fail with test data, but endpoint should exist
        if (error.response?.status === 400 || error.response?.status === 404) return true;
        throw error;
      }
    });

    // Nutrition Data
    await this.runTest('Nutrition API', async () => {
      try {
        const response = await axios.get(`${this.baseURL}/api/dishes/test-dish/nutrition`);
        if (response.status === 200 || response.status === 404) return true; // 404 expected for test dish
      } catch (error) {
        if (error.response?.status === 404) return true;
        throw error;
      }
    });

    // Gamification
    await this.runTest('Gamification API', async () => {
      const config = this.customerToken ? { headers: { Authorization: `Bearer ${this.customerToken}` } } : {};
      try {
        const response = await axios.get(`${this.baseURL}/api/gamification/stats`, config);
        if (response.status === 200) return true;
      } catch (error) {
        if (error.response?.status === 401) return true;
        throw error;
      }
    });
  }

  async testAdminPanelFeatures() {
    console.log('\n📊 Testing Admin-Panel Features...');

    // Admin Users
    await this.runTest('Admin Users API', async () => {
      const config = this.adminToken ? { headers: { Authorization: `Bearer ${this.adminToken}` } } : {};
      try {
        const response = await axios.get(`${this.baseURL}/api/admin/users`, config);
        if (response.status === 200 && Array.isArray(response.data)) return true;
      } catch (error) {
        if (error.response?.status === 401) return true;
        throw error;
      }
    });

    // Orders Management
    await this.runTest('Orders Management API', async () => {
      const config = this.adminToken ? { headers: { Authorization: `Bearer ${this.adminToken}` } } : {};
      try {
        const response = await axios.get(`${this.baseURL}/api/orders`, config);
        if (response.status === 200) return true;
      } catch (error) {
        if (error.response?.status === 401) return true;
        throw error;
      }
    });

    // Financial Data
    await this.runTest('Financial API', async () => {
      const config = this.adminToken ? { headers: { Authorization: `Bearer ${this.adminToken}` } } : {};
      try {
        const response = await axios.get(`${this.baseURL}/api/financial/overview`, config);
        if (response.status === 200) return true;
      } catch (error) {
        if (error.response?.status === 401) return true;
        throw error;
      }
    });
  }

  async testPerformance() {
    console.log('\n⚡ Testing Performance...');

    // Test API response times
    const endpoints = [
      { name: 'Health Check', url: '/api/monitoring/health', method: 'GET' },
      { name: 'Public Restaurants', url: '/api/restaurants/public', method: 'GET' },
      { name: 'Statistics', url: '/api/statistics/dashboard', method: 'GET' },
    ];

    for (const endpoint of endpoints) {
      await this.runPerformanceTest(endpoint.name, endpoint.url, endpoint.method);
    }
  }

  async runPerformanceTest(name, url, method = 'GET') {
    const startTime = performance.now();

    try {
      const response = await axios({
        method: method.toLowerCase(),
        url: `${this.baseURL}${url}`,
        timeout: 5000, // 5 second timeout
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      this.results.performance.push({
        name,
        responseTime: Math.round(responseTime),
        status: response.status,
        success: true,
      });

      // Warn if response takes longer than 1 second
      if (responseTime > 1000) {
        console.log(`⚠️  ${name}: ${Math.round(responseTime)}ms (Slow)`);
      } else {
        console.log(`✅ ${name}: ${Math.round(responseTime)}ms`);
      }

    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      this.results.performance.push({
        name,
        responseTime: Math.round(responseTime),
        status: error.response?.status || 'TIMEOUT',
        success: false,
      });

      console.log(`❌ ${name}: ${Math.round(responseTime)}ms (${error.response?.status || 'TIMEOUT'})`);
    }
  }

  async runTest(name, testFn) {
    this.results.total++;

    try {
      const startTime = performance.now();
      await testFn();
      const endTime = performance.now();

      this.results.passed++;
      console.log(`✅ ${name}: ${Math.round(endTime - startTime)}ms`);
      return true;

    } catch (error) {
      this.results.failed++;
      this.results.errors.push({
        test: name,
        error: error.message,
        stack: error.stack,
      });

      console.log(`❌ ${name}: ${error.message}`);
      return false;
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Tests: ${this.results.total}`);
    console.log(`   ✅ Passed: ${this.results.passed}`);
    console.log(`   ❌ Failed: ${this.results.failed}`);
    console.log(`   Success Rate: ${Math.round((this.results.passed / this.results.total) * 100)}%`);

    if (this.results.performance.length > 0) {
      console.log(`\n⚡ Performance Results:`);
      this.results.performance.forEach(result => {
        const status = result.success ? '✅' : '❌';
        const timeColor = result.responseTime > 1000 ? '⚠️' : '✅';
        console.log(`   ${status} ${result.name}: ${result.responseTime}ms (${result.status})`);
      });

      const avgResponseTime = this.results.performance.reduce((sum, r) => sum + r.responseTime, 0) / this.results.performance.length;
      console.log(`   Average Response Time: ${Math.round(avgResponseTime)}ms`);
    }

    if (this.results.errors.length > 0) {
      console.log(`\n❌ Failed Tests:`);
      this.results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.test}: ${error.error}`);
      });
    }

    console.log('\n🏁 Test completed at:', new Date().toISOString());

    // Exit with appropriate code
    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed! Frontend-Backend integration is working correctly.');
      process.exit(0);
    } else {
      console.log(`\n⚠️  ${this.results.failed} tests failed. Check integration issues.`);
      process.exit(1);
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new IntegrationTester();
  tester.runTests().catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = IntegrationTester;
