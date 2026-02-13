// k6 Load Test: Orders Cursor Pagination
// Tests the new cursor-based pagination for orders listing

import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG } from '../lib/config.js';
import { authHelper } from '../lib/auth.js';
import { testData } from '../lib/data.js';
import { customMetrics, resultsAggregator } from '../lib/metrics.js';

// Test configuration
export let options = {
  ...CONFIG.OPTIONS,

  // Scenario configuration
  scenarios: {
    orders_pagination: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: CONFIG.OPTIONS.vus },
        { duration: '5m', target: CONFIG.OPTIONS.vus },
        { duration: '30s', target: 0 },
      ],
      tags: { test_type: 'orders_pagination' },
    },
  },

  // Custom thresholds for this test
  thresholds: {
    ...CONFIG.OPTIONS.thresholds,
    'orders_pagination_duration': ['p(95)<500', 'p(99)<1000'],
    'orders_pagination_errors': ['rate<0.01'],
    'http_req_duration{scenario:orders_pagination}': ['p(95)<500', 'p(99)<1000'],
  },
};

// Global test state
let testStartTime = Date.now();
let requestCount = 0;
let errorCount = 0;

// Setup function - runs before the test starts
export function setup() {
  console.log('🚀 Setting up Orders Pagination Load Test...');

  // Validate configuration
  CONFIG.validateConfig();

  // Initialize test data
  await testData.initialize();

  // Validate authentication
  await authHelper.validateTokens();

  console.log('📊 Test Data Summary:', testData.getSummary());

  return {
    testData: testData.getSummary(),
    startTime: Date.now(),
  };
}

// Main test function - runs for each virtual user
export default function (data) {
  const startTime = Date.now();

  try {
    // Simulate realistic user behavior for orders browsing
    const behavior = Math.random();

    if (behavior < CONFIG.LOAD_PATTERNS.ORDERS_RECENT_PERCENTAGE) {
      // 80% of users browse recent orders with status filter
      browseRecentOrders();
    } else if (behavior < CONFIG.LOAD_PATTERNS.ORDERS_RECENT_PERCENTAGE + CONFIG.LOAD_PATTERNS.ORDERS_FILTERED_PERCENTAGE) {
      // 15% of users search with restaurant filter
      browseOrdersByRestaurant();
    } else {
      // 5% of users do deep pagination (stress test)
      browseDeepPagination();
    }

    requestCount++;

  } catch (error) {
    errorCount++;
    customMetrics.ordersPaginationErrors.add(1);
    console.error('❌ Orders pagination error:', error);
  }

  // Random sleep between requests (0.5-2 seconds)
  sleep(Math.random() * 1.5 + 0.5);
}

// Browse recent orders with status filter
function browseRecentOrders() {
  const statuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

  const params = new URLSearchParams({
    status: randomStatus,
    limit: '50',
  });

  const url = `${CONFIG.API_BASE_URL}/orders?${params}`;

  const response = http.get(url, {
    headers: authHelper.getAdminHeaders(),
    timeout: '30s',
  });

  const checkResult = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has data array': (r) => {
      try {
        const jsonResponse = r.json();
        return jsonResponse.data && Array.isArray(jsonResponse.data);
      } catch {
        return false;
      }
    },
    'has nextCursor or no more data': (r) => {
      try {
        const jsonResponse = r.json();
        return jsonResponse.nextCursor || jsonResponse.data.length < 50;
      } catch {
        return false;
      }
    },
  });

  if (!checkResult) {
    customMetrics.ordersPaginationErrors.add(1);
  }

  // Record custom metrics
  customMetrics.ordersPaginationDuration.add(response.timings.duration);

  // Log first few requests for debugging
  if (requestCount < 5) {
    console.log(`📄 Recent orders (${randomStatus}): ${response.status}, ${response.timings.duration}ms`);
  }
}

// Browse orders filtered by restaurant
function browseOrdersByRestaurant() {
  const restaurantId = testData.getRandomRestaurantId();

  const params = new URLSearchParams({
    restaurantId,
    limit: '25',
  });

  const url = `${CONFIG.API_BASE_URL}/orders?${params}`;

  const response = http.get(url, {
    headers: authHelper.getAdminHeaders(),
    timeout: '30s',
  });

  const checkResult = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 800ms': (r) => r.timings.duration < 800,
    'has data array': (r) => {
      try {
        const jsonResponse = r.json();
        return jsonResponse.data && Array.isArray(jsonResponse.data);
      } catch {
        return false;
      }
    },
  });

  if (!checkResult) {
    customMetrics.ordersPaginationErrors.add(1);
  }

  customMetrics.ordersPaginationDuration.add(response.timings.duration);

  if (requestCount < 5) {
    console.log(`🏪 Restaurant orders (${restaurantId.slice(-8)}): ${response.status}, ${response.timings.duration}ms`);
  }
}

// Deep pagination stress test
function browseDeepPagination() {
  // Generate a cursor that simulates deep pagination
  const cursor = testData.generateRandomCursor();

  const params = new URLSearchParams({
    cursor,
    limit: '100', // Larger page size for deep pagination
  });

  const url = `${CONFIG.API_BASE_URL}/orders?${params}`;

  const response = http.get(url, {
    headers: authHelper.getAdminHeaders(),
    timeout: '45s', // Longer timeout for deep pagination
  });

  const checkResult = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
    'has data array': (r) => {
      try {
        const jsonResponse = r.json();
        return jsonResponse.data && Array.isArray(jsonResponse.data);
      } catch {
        return false;
      }
    },
  });

  if (!checkResult) {
    customMetrics.ordersPaginationErrors.add(1);
  }

  customMetrics.ordersPaginationDuration.add(response.timings.duration);

  if (requestCount < 3) {
    console.log(`🔍 Deep pagination: ${response.status}, ${response.timings.duration}ms`);
  }
}

// Teardown function - runs after the test completes
export function teardown(data) {
  console.log('🏁 Orders Pagination Load Test completed');

  // Calculate and log final metrics
  const duration = Date.now() - testStartTime;
  const errorRate = errorCount / requestCount;
  const throughput = requestCount / (duration / 1000);

  console.log(`📊 Final Results:`);
  console.log(`   Duration: ${Math.round(duration / 1000)}s`);
  console.log(`   Total Requests: ${requestCount}`);
  console.log(`   Errors: ${errorCount} (${(errorRate * 100).toFixed(2)}%)`);
  console.log(`   Throughput: ${throughput.toFixed(1)} req/s`);

  // Add results to aggregator
  resultsAggregator.addScenarioResults('orders_pagination', {
    totalRequests: requestCount,
    successfulRequests: requestCount - errorCount,
    failedRequests: errorCount,
    errorRate: errorRate * 100,
    throughput,
    avgResponseTime: 0, // Calculated by k6
    p95ResponseTime: 0,  // Calculated by k6
    p99ResponseTime: 0,  // Calculated by k6
  });
}