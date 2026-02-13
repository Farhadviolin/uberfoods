// k6 Load Test: Dashboard Aggregations
// Tests admin dashboard statistics endpoints under load

import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG } from '../lib/config.js';
import { authHelper } from '../lib/auth.js';
import { DataGenerator } from '../lib/data.js';
import { customMetrics, resultsAggregator } from '../lib/metrics.js';

// Test configuration
export let options = {
  ...CONFIG.OPTIONS,

  // Scenario configuration
  scenarios: {
    dashboard_aggregations: {
      executor: 'constant-vus',
      vus: Math.min(CONFIG.OPTIONS.vus, 20), // Limit to 20 concurrent users for dashboard
      duration: CONFIG.OPTIONS.duration,
      tags: { test_type: 'dashboard_aggregations' },
    },
  },

  // Custom thresholds for dashboard endpoints
  thresholds: {
    ...CONFIG.OPTIONS.thresholds,
    'dashboard_aggregation_duration': ['p(95)<800', 'p(99)<1500'],
    'dashboard_aggregation_errors': ['rate<0.01'],
    'http_req_duration{scenario:dashboard_aggregations}': ['p(95)<800', 'p(99)<1500'],
  },
};

// Global test state
let testStartTime = Date.now();
let requestCount = 0;
let errorCount = 0;
let dashboardViewCount = 0;

// Setup function
export function setup() {
  console.log('🚀 Setting up Dashboard Aggregations Load Test...');

  CONFIG.validateConfig();
  await authHelper.validateTokens();

  return {
    startTime: Date.now(),
  };
}

// Main test function
export default function () {
  dashboardViewCount++;

  try {
    // Simulate realistic admin dashboard usage
    // Most admins view multiple metrics simultaneously
    simulateDashboardLoad();

    requestCount++;

  } catch (error) {
    errorCount++;
    customMetrics.dashboardAggregationErrors.add(1);
    console.error('❌ Dashboard aggregation error:', error);
  }

  // Longer sleep for dashboard (admins don't refresh as frequently)
  sleep(Math.random() * 3 + 2); // 2-5 seconds between dashboard loads
}

// Simulate comprehensive dashboard load
function simulateDashboardLoad() {
  const timePeriod = DataGenerator.getRandomTimePeriod();

  // Group concurrent dashboard requests (like a real dashboard loads multiple charts)
  const dashboardRequests = [
    // Core statistics
    {
      name: 'dashboard_stats',
      request: () => http.get(`${CONFIG.API_BASE_URL}/admin/statistics/dashboard?period=${timePeriod}`, {
        headers: authHelper.getAdminHeaders(),
        timeout: '30s',
      }),
    },
    // Revenue data
    {
      name: 'revenue_data',
      request: () => http.get(`${CONFIG.API_BASE_URL}/admin/statistics/revenue?period=${timePeriod}`, {
        headers: authHelper.getAdminHeaders(),
        timeout: '30s',
      }),
    },
    // Top restaurants
    {
      name: 'top_restaurants',
      request: () => http.get(`${CONFIG.API_BASE_URL}/admin/statistics/top-restaurants?limit=10`, {
        headers: authHelper.getAdminHeaders(),
        timeout: '30s',
      }),
    },
    // Driver performance
    {
      name: 'driver_performance',
      request: () => http.get(`${CONFIG.API_BASE_URL}/admin/statistics/driver-performance?period=${timePeriod}`, {
        headers: authHelper.getAdminHeaders(),
        timeout: '30s',
      }),
    },
  ];

  // Execute requests concurrently (like browser loading multiple dashboard components)
  const responses = {};

  // Use Promise.all for concurrent execution simulation
  dashboardRequests.forEach(({ name, request }) => {
    const response = request();
    responses[name] = response;
  });

  // Validate all responses
  let totalDuration = 0;
  let hasErrors = false;

  Object.entries(responses).forEach(([name, response]) => {
    totalDuration += response.timings.duration;

    const isValid = check(response, {
      [`${name} status is 200`]: (r) => r.status === 200,
      [`${name} response time acceptable`]: (r) => r.timings.duration < 2000,
      [`${name} has valid data`]: (r) => {
        try {
          const jsonResponse = r.json();
          return jsonResponse && (jsonResponse.data || jsonResponse);
        } catch {
          return false;
        }
      },
    });

    if (!isValid) {
      hasErrors = true;
      console.warn(`⚠️ Dashboard ${name} failed: ${response.status}, ${response.timings.duration}ms`);
    }

    // Record individual endpoint metrics
    customMetrics.dashboardAggregationDuration.add(response.timings.duration);
  });

  if (hasErrors) {
    customMetrics.dashboardAggregationErrors.add(1);
  }

  // Record dashboard view metric
  customMetrics.dashboardViews.add(1);

  // Log sample dashboard loads
  if (dashboardViewCount % 10 === 0) {
    const avgDuration = totalDuration / dashboardRequests.length;
    console.log(`📊 Dashboard load #${dashboardViewCount}: ${dashboardRequests.length} requests, avg ${Math.round(avgDuration)}ms`);
  }
}

// Additional stress test: High-frequency dashboard polling
export function highFrequencyDashboardTest() {
  // Simulate monitoring dashboard with frequent refreshes
  const startTime = Date.now();
  const duration = 30000; // 30 seconds

  while (Date.now() - startTime < duration) {
    const response = http.get(`${CONFIG.API_BASE_URL}/admin/statistics/dashboard?period=1h`, {
      headers: authHelper.getAdminHeaders(),
      timeout: '10s',
    });

    check(response, {
      'high frequency status is 200': (r) => r.status === 200,
      'high frequency response time < 500ms': (r) => r.timings.duration < 500,
    });

    customMetrics.dashboardAggregationDuration.add(response.timings.duration);

    // Very short sleep for high frequency
    sleep(0.1); // 100ms between requests
  }
}

// Test data export functionality (occasional heavy operation)
function testDataExport() {
  // Simulate CSV export (heavy operation done occasionally)
  if (Math.random() < 0.05) { // 5% of dashboard loads include export
    const response = http.get(`${CONFIG.API_BASE_URL}/admin/orders?limit=1000&export=csv`, {
      headers: authHelper.getAdminHeaders(),
      timeout: '60s', // Longer timeout for export
    });

    check(response, {
      'export status is 200': (r) => r.status === 200,
      'export response time acceptable': (r) => r.timings.duration < 30000, // 30s for export
    });

    console.log(`📤 Data export: ${response.status}, ${response.timings.duration}ms`);
  }
}

// Test cache performance (repeated requests to same endpoint)
function testCachePerformance() {
  const timePeriod = '24h';
  const endpoints = [
    `/admin/statistics/dashboard?period=${timePeriod}`,
    `/admin/statistics/revenue?period=${timePeriod}`,
    `/admin/statistics/top-restaurants?limit=10`,
  ];

  // Make multiple requests to same endpoints to test caching
  for (let i = 0; i < 3; i++) {
    endpoints.forEach(endpoint => {
      const response = http.get(`${CONFIG.API_BASE_URL}${endpoint}`, {
        headers: authHelper.getAdminHeaders(),
        timeout: '30s',
      });

      check(response, {
        'cache test status is 200': (r) => r.status === 200,
        'cache test response time < 1000ms': (r) => r.timings.duration < 1000,
      });

      customMetrics.dashboardAggregationDuration.add(response.timings.duration);
    });

    sleep(1); // Short pause between iterations
  }
}

// Teardown function
export function teardown(data) {
  console.log('🏁 Dashboard Aggregations Load Test completed');

  const duration = Date.now() - testStartTime;
  const errorRate = errorCount / Math.max(requestCount, 1);
  const throughput = requestCount / (duration / 1000);

  console.log(`📊 Final Results:`);
  console.log(`   Duration: ${Math.round(duration / 1000)}s`);
  console.log(`   Dashboard Loads: ${dashboardViewCount}`);
  console.log(`   Total Requests: ${requestCount * 4}`); // 4 requests per dashboard load
  console.log(`   Errors: ${errorCount} (${(errorRate * 100).toFixed(2)}%)`);
  console.log(`   Throughput: ${throughput.toFixed(1)} dashboard loads/s`);

  resultsAggregator.addScenarioResults('dashboard_aggregations', {
    totalRequests: requestCount * 4, // Account for multiple requests per dashboard load
    successfulRequests: (requestCount * 4) - errorCount,
    failedRequests: errorCount,
    errorRate: errorRate * 100,
    throughput,
    dashboardLoads: dashboardViewCount,
    avgResponseTime: 0, // Calculated by k6
    p95ResponseTime: 0,  // Calculated by k6
    p99ResponseTime: 0,  // Calculated by k6
  });
}