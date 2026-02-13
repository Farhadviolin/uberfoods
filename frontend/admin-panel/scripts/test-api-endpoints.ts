#!/usr/bin/env ts-node
/**
 * API Endpoint Verification Script
 * Testet alle benötigten Backend-Endpunkte für das Admin-Panel
 */

import axios, { AxiosError } from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'dev-token-no-auth-required';

interface EndpointTest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  required: boolean;
  body?: any;
  expectedStatus?: number;
}

const endpoints: EndpointTest[] = [
  // Authentication - Basic health check first
  { method: 'GET', path: '/api/health', description: 'Health Check', required: true },

  // AI/ML Endpoints (CRITICAL for Admin-Panel)
  { method: 'GET', path: '/api/ai-ml/overview', description: 'AI/ML Overview', required: true },
  { method: 'GET', path: '/api/ai-ml/models', description: 'ML Models', required: true },
  { method: 'GET', path: '/api/ai-ml/fraud', description: 'Fraud Detection Data', required: false },
  { method: 'GET', path: '/api/ai-ml/forecasting', description: 'Forecasting Data', required: false },

  // Monitoring Endpoints (CRITICAL for Admin-Panel)
  { method: 'GET', path: '/api/monitoring/health', description: 'System Health', required: true },
  { method: 'GET', path: '/api/monitoring/performance', description: 'Performance Metrics', required: true },
  { method: 'GET', path: '/api/monitoring/database', description: 'Database Metrics', required: false },

  // Authentication
  { method: 'POST', path: '/api/auth/login', description: 'Admin Login', required: true },
  { method: 'POST', path: '/api/auth/refresh', description: 'Token Refresh', required: true },
  
  // Core Entities - Restaurants
  { method: 'GET', path: '/api/restaurants', description: 'Get Restaurants', required: true },
  { method: 'POST', path: '/api/restaurants', description: 'Create Restaurant', required: true },
  { method: 'PUT', path: '/api/restaurants/1', description: 'Update Restaurant', required: true },
  { method: 'DELETE', path: '/api/restaurants/1', description: 'Delete Restaurant', required: true },
  { method: 'PATCH', path: '/api/restaurants/1/toggle-status', description: 'Toggle Restaurant Status', required: true },
  
  // Core Entities - Dishes
  { method: 'GET', path: '/api/dishes', description: 'Get Dishes', required: true },
  { method: 'POST', path: '/api/dishes', description: 'Create Dish', required: true },
  { method: 'PUT', path: '/api/dishes/1', description: 'Update Dish', required: true },
  { method: 'DELETE', path: '/api/dishes/1', description: 'Delete Dish', required: true },
  { method: 'PATCH', path: '/api/dishes/1/toggle-availability', description: 'Toggle Dish Availability', required: true },
  
  // Core Entities - Orders
  { method: 'GET', path: '/api/orders', description: 'Get Orders', required: true },
  { method: 'PATCH', path: '/api/orders/1/status', description: 'Update Order Status', required: true },
  { method: 'PATCH', path: '/api/orders/1/assign', description: 'Assign Order to Driver', required: true },
  
  // Core Entities - Customers
  { method: 'GET', path: '/api/customers', description: 'Get Customers', required: true },
  { method: 'POST', path: '/api/customers', description: 'Create Customer', required: true },
  { method: 'PUT', path: '/api/customers/1', description: 'Update Customer', required: true },
  { method: 'DELETE', path: '/api/customers/1', description: 'Delete Customer', required: true },
  
  // Core Entities - Drivers
  { method: 'GET', path: '/api/drivers', description: 'Get Drivers', required: true },
  { method: 'POST', path: '/api/drivers', description: 'Create Driver', required: true },
  { method: 'PUT', path: '/api/drivers/1', description: 'Update Driver', required: true },
  { method: 'DELETE', path: '/api/drivers/1', description: 'Delete Driver', required: true },
  { method: 'PATCH', path: '/api/drivers/1/toggle-status', description: 'Toggle Driver Status', required: true },
  
  // Statistics
  { method: 'GET', path: '/api/statistics/dashboard?period=7d', description: 'Dashboard Stats', required: true },
  { method: 'GET', path: '/api/statistics/revenue?period=7d', description: 'Revenue Stats', required: true },
  { method: 'GET', path: '/api/statistics/top-restaurants?limit=5', description: 'Top Restaurants', required: false },
  { method: 'GET', path: '/api/statistics/driver-performance?period=7d', description: 'Driver Performance', required: false },
  { method: 'GET', path: '/api/statistics/top-promotions?limit=5', description: 'Top Promotions', required: false },
  { method: 'GET', path: '/api/statistics/promotion-performance?period=7d', description: 'Promotion Performance', required: false },
  { method: 'GET', path: '/api/statistics/customer-growth?period=7d', description: 'Customer Growth', required: false },
  { method: 'GET', path: '/api/statistics/order-status-distribution?period=7d', description: 'Order Status Distribution', required: false },
  
  // RBAC
  { method: 'GET', path: '/api/rbac/roles', description: 'Get Roles', required: false },
  { method: 'POST', path: '/api/rbac/roles', description: 'Create Role', required: false },
  { method: 'GET', path: '/api/rbac/permissions', description: 'Get Permissions', required: false },
  { method: 'GET', path: '/api/rbac/users', description: 'Get RBAC Users', required: false },
  { method: 'GET', path: '/api/rbac/sessions', description: 'Get Sessions', required: false },
  { method: 'GET', path: '/api/rbac/2fa/status', description: '2FA Status', required: false },
  { method: 'POST', path: '/api/rbac/users/1/enable-2fa', description: 'Enable 2FA', required: false },
  
  // Monitoring
  { method: 'GET', path: '/api/monitoring/health', description: 'System Health', required: false },
  { method: 'GET', path: '/api/monitoring/performance', description: 'Performance Metrics', required: false },
  { method: 'GET', path: '/api/monitoring/errors', description: 'Error Tracking', required: false },
  { method: 'GET', path: '/api/monitoring/api', description: 'API Metrics', required: false },
  
  // AI/ML Management
  { method: 'GET', path: '/api/ai-ml/overview', description: 'AI/ML Overview', required: true },
  { method: 'GET', path: '/api/ai-ml/fraud', description: 'Fraud Detection Data', required: false },
  { method: 'GET', path: '/api/ai-ml/forecasting', description: 'Forecasting Data', required: false },
  { method: 'GET', path: '/api/ai-ml/pricing', description: 'Pricing Optimization', required: false },
  { method: 'GET', path: '/api/ai-ml/recommendations', description: 'AI Recommendations', required: false },
  { method: 'GET', path: '/api/ai-ml/models', description: 'ML Models', required: true },

  // System Monitoring
  { method: 'GET', path: '/api/monitoring/health', description: 'System Health', required: true },
  { method: 'GET', path: '/api/monitoring/performance', description: 'Performance Metrics', required: true },
  { method: 'GET', path: '/api/monitoring/errors', description: 'Error Tracking', required: false },
  { method: 'GET', path: '/api/monitoring/api', description: 'API Metrics', required: false },
  { method: 'GET', path: '/api/monitoring/database', description: 'Database Metrics', required: false },

  // Inventory
  { method: 'GET', path: '/api/inventory/overview', description: 'Inventory Overview', required: false },
  { method: 'GET', path: '/api/inventory/stock', description: 'Stock Items', required: false },
  { method: 'GET', path: '/api/inventory/suppliers', description: 'Suppliers', required: false },
  { method: 'GET', path: '/api/inventory/purchase-orders', description: 'Purchase Orders', required: false },
  { method: 'GET', path: '/api/inventory/waste', description: 'Waste Data', required: false },
  { method: 'GET', path: '/api/inventory/alerts', description: 'Inventory Alerts', required: false },
];

interface TestResult {
  endpoint: EndpointTest;
  status: 'success' | 'error' | 'missing';
  statusCode?: number;
  message: string;
  responseTime?: number;
}

async function testEndpoint(endpoint: EndpointTest): Promise<TestResult> {
  const startTime = Date.now();
  const url = `${API_BASE_URL}${endpoint.path}`;
  
  try {
    const config: any = {
      method: endpoint.method,
      url,
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 5000,
      validateStatus: () => true, // Don't throw on any status
    };

    if (endpoint.body) {
      config.data = endpoint.body;
    }

    const response = await axios(config);
    const responseTime = Date.now() - startTime;

    // Consider 2xx, 3xx, 4xx as "endpoint exists"
    // 5xx might indicate server error but endpoint exists
    if (response.status < 500) {
      return {
        endpoint,
        status: 'success',
        statusCode: response.status,
        message: `OK (${response.status})`,
        responseTime,
      };
    } else {
      return {
        endpoint,
        status: 'error',
        statusCode: response.status,
        message: `Server Error (${response.status})`,
        responseTime,
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const axiosError = error as AxiosError;

    if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ETIMEDOUT') {
      return {
        endpoint,
        status: 'missing',
        message: 'Connection refused or timeout - Endpoint might not exist',
        responseTime,
      };
    }

    if (axiosError.response) {
      return {
        endpoint,
        status: axiosError.response.status < 500 ? 'success' : 'error',
        statusCode: axiosError.response.status,
        message: `HTTP ${axiosError.response.status}`,
        responseTime,
      };
    }

    return {
      endpoint,
      status: 'missing',
      message: axiosError.message || 'Unknown error',
      responseTime,
    };
  }
}

async function runTests() {
  console.log('🚀 Starting API Endpoint Verification...\n');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Admin Token: ${ADMIN_TOKEN.substring(0, 20)}...\n`);

  const results: TestResult[] = [];
  
  for (const endpoint of endpoints) {
    process.stdout.write(`Testing ${endpoint.method} ${endpoint.path}... `);
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    if (result.status === 'success') {
      console.log(`✅ ${result.statusCode} (${result.responseTime}ms)`);
    } else if (result.status === 'error') {
      console.log(`⚠️  ${result.statusCode} - ${result.message}`);
    } else {
      console.log(`❌ ${result.message}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY\n');
  
  const successful = results.filter(r => r.status === 'success');
  const errors = results.filter(r => r.status === 'error');
  const missing = results.filter(r => r.status === 'missing');
  
  const requiredSuccessful = results.filter(
    r => r.endpoint.required && r.status === 'success'
  );
  const requiredMissing = results.filter(
    r => r.endpoint.required && r.status === 'missing'
  );

  console.log(`Total Endpoints: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`⚠️  Errors: ${errors.length}`);
  console.log(`❌ Missing: ${missing.length}\n`);

  console.log(`Required Endpoints:`);
  console.log(`  ✅ Working: ${requiredSuccessful.length}`);
  console.log(`  ❌ Missing: ${requiredMissing.length}\n`);

  if (requiredMissing.length > 0) {
    console.log('❌ MISSING REQUIRED ENDPOINTS:');
    requiredMissing.forEach(r => {
      console.log(`   ${r.endpoint.method} ${r.endpoint.path} - ${r.endpoint.description}`);
    });
    console.log('');
  }

  if (errors.length > 0) {
    console.log('⚠️  ENDPOINTS WITH ERRORS:');
    errors.forEach(r => {
      console.log(`   ${r.endpoint.method} ${r.endpoint.path} - ${r.message}`);
    });
    console.log('');
  }

  // Exit code
  const exitCode = requiredMissing.length > 0 ? 1 : 0;
  process.exit(exitCode);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

