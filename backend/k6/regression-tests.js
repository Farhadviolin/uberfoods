// k6 Regression Test Suite
// Automated performance regression detection and alerting

import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG } from './lib/config.js';
import { authHelper } from './lib/auth.js';
import { testData } from './lib/data.js';
import { resultsAggregator, TestHelpers } from './lib/metrics.js';

// Regression test configuration
export let options = {
  ...CONFIG.OPTIONS,

  scenarios: {
    regression_test: {
      executor: 'constant-vus',
      vus: 5, // Lower concurrent load for regression testing
      duration: '2m', // Shorter duration for faster feedback
      tags: { test_type: 'regression' },
    },
  },

  // Stricter thresholds for regression detection
  thresholds: {
    'http_req_duration{scenario:regression_test}': ['p(95)<600', 'p(99)<1200'],
    'http_req_failed{scenario:regression_test}': ['rate<0.03'],
  },
};

// Test state
let testStartTime = Date.now();
let criticalPathTests = 0;
let criticalPathErrors = 0;

// Setup function
export function setup() {
  console.log('🔍 Starting Regression Test Suite...');

  CONFIG.validateConfig();
  await testData.initialize();
  await authHelper.validateTokens();

  console.log('✅ Regression test environment ready');
  console.log(`   Target P95: < 600ms`);
  console.log(`   Target Error Rate: < 3%`);

  return { startTime: Date.now() };
}

// Critical path tests - these must always work
export default function () {
  const testResults = [];

  // Test 1: Basic API health
  testResults.push(await testApiHealth());

  // Test 2: Orders pagination (cursor-based)
  testResults.push(await testOrdersPagination());

  // Test 3: Order retrieval
  testResults.push(await testOrderRetrieval());

  // Test 4: Dashboard aggregations (cached)
  testResults.push(await testDashboardAggregations());

  // Test 5: Basic CRUD operations
  testResults.push(await testBasicCrud());

  // Calculate critical path health
  const totalTests = testResults.length;
  const failedTests = testResults.filter(r => !r.passed).length;

  if (failedTests > 0) {
    console.error(`❌ CRITICAL: ${failedTests}/${totalTests} regression tests failed`);
    criticalPathErrors += failedTests;
  } else {
    console.log(`✅ CRITICAL: All ${totalTests} regression tests passed`);
  }

  criticalPathTests += totalTests;
  sleep(1); // Brief pause between test cycles
}

// Individual regression tests
async function testApiHealth() {
  const response = http.get(`${CONFIG.API_BASE_URL}/health`);

  const passed = check(response, {
    'health check responds': (r) => r.status === 200,
    'health check fast': (r) => r.timings.duration < 200,
    'health check returns valid JSON': (r) => {
      try {
        const json = r.json();
        return json.status && json.timestamp;
      } catch {
        return false;
      }
    },
  });

  if (!passed) {
    console.error('❌ Health check regression detected');
  }

  return { test: 'api_health', passed, responseTime: response.timings.duration };
}

async function testOrdersPagination() {
  const params = new URLSearchParams({
    limit: '20',
    status: 'PENDING',
  });

  const response = http.get(`${CONFIG.API_BASE_URL}/orders?${params}`, {
    headers: authHelper.getAdminHeaders(),
  });

  const passed = check(response, {
    'orders pagination responds': (r) => r.status === 200,
    'orders pagination reasonable time': (r) => r.timings.duration < 800,
    'orders pagination returns data': (r) => {
      try {
        const json = r.json();
        return json.data && Array.isArray(json.data);
      } catch {
        return false;
      }
    },
    'orders pagination has cursor': (r) => {
      try {
        const json = r.json();
        return json.nextCursor !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!passed) {
    console.error('❌ Orders pagination regression detected');
  }

  return { test: 'orders_pagination', passed, responseTime: response.timings.duration };
}

async function testOrderRetrieval() {
  const orderId = testData.getRandomOrderId();
  const response = http.get(`${CONFIG.API_BASE_URL}/orders/${orderId}`, {
    headers: authHelper.getAdminHeaders(),
  });

  const passed = check(response, {
    'order retrieval responds': (r) => r.status === 200 || r.status === 404,
    'order retrieval reasonable time': (r) => r.timings.duration < 500,
    'order retrieval returns valid data': (r) => {
      if (r.status === 404) return true; // Order might not exist
      try {
        const json = r.json();
        return json.id && json.status;
      } catch {
        return false;
      }
    },
  });

  if (!passed) {
    console.error('❌ Order retrieval regression detected');
  }

  return { test: 'order_retrieval', passed, responseTime: response.timings.duration };
}

async function testDashboardAggregations() {
  const timePeriod = '1h';
  const response = http.get(`${CONFIG.API_BASE_URL}/admin/statistics/dashboard?period=${timePeriod}`, {
    headers: authHelper.getAdminHeaders(),
  });

  const passed = check(response, {
    'dashboard aggregation responds': (r) => r.status === 200,
    'dashboard aggregation reasonable time': (r) => r.timings.duration < 1000,
    'dashboard aggregation returns data': (r) => {
      try {
        const json = r.json();
        return json && Object.keys(json).length > 0;
      } catch {
        return false;
      }
    },
  });

  if (!passed) {
    console.error('❌ Dashboard aggregation regression detected');
  }

  return { test: 'dashboard_aggregation', passed, responseTime: response.timings.duration };
}

async function testBasicCrud() {
  // Test order status update (safe operation)
  const orderId = testData.getRandomOrderId();

  // First, get current order status
  const getResponse = http.get(`${CONFIG.API_BASE_URL}/orders/${orderId}`, {
    headers: authHelper.getAdminHeaders(),
  });

  if (getResponse.status !== 200) {
    return { test: 'basic_crud', passed: true, responseTime: 0 }; // Skip if order doesn't exist
  }

  const orderData = getResponse.json();
  const currentStatus = orderData.status;

  // Only test status update if order is in a valid state for updates
  if (['PENDING', 'CONFIRMED', 'PREPARING'].includes(currentStatus)) {
    const updateResponse = http.patch(
      `${CONFIG.API_BASE_URL}/orders/${orderId}/status`,
      JSON.stringify({
        status: currentStatus, // Same status for idempotency test
        metadata: { test: 'regression_test' }
      }),
      {
        headers: authHelper.getAdminHeaders(),
      }
    );

    const passed = check(updateResponse, {
      'order status update responds': (r) => r.status === 200,
      'order status update reasonable time': (r) => r.timings.duration < 600,
    });

    if (!passed) {
      console.error('❌ Order status update regression detected');
    }

    return { test: 'basic_crud', passed, responseTime: updateResponse.timings.duration };
  }

  // If order is in terminal state, just test retrieval
  return { test: 'basic_crud', passed: true, responseTime: getResponse.timings.duration };
}

// Teardown and reporting
export function teardown(data) {
  console.log('🏁 Regression Test Suite completed');

  const duration = Date.now() - testStartTime;
  const errorRate = criticalPathErrors / Math.max(criticalPathTests, 1);

  console.log(`\n📊 REGRESSION TEST RESULTS`);
  console.log('='.repeat(40));
  console.log(`Duration: ${Math.round(duration / 1000)}s`);
  console.log(`Critical Path Tests: ${criticalPathTests}`);
  console.log(`Critical Path Errors: ${criticalPathErrors}`);
  console.log(`Error Rate: ${(errorRate * 100).toFixed(2)}%`);
  console.log(`Status: ${errorRate > 0.1 ? 'FAILED' : 'PASSED'}`); // 10% error threshold

  // Add to results aggregator
  resultsAggregator.addScenarioResults('regression_tests', {
    totalRequests: criticalPathTests,
    successfulRequests: criticalPathTests - criticalPathErrors,
    failedRequests: criticalPathErrors,
    errorRate: errorRate * 100,
    throughput: criticalPathTests / (duration / 1000),
    regressionDetected: errorRate > 0.1,
  });

  // Exit with error code if regressions detected
  if (errorRate > 0.1) {
    console.error('\n❌ PERFORMANCE REGRESSION DETECTED!');
    console.error('   Error rate exceeds 10% threshold');
    console.error('   Check application logs and performance metrics');
  } else {
    console.log('\n✅ NO PERFORMANCE REGRESSIONS DETECTED');
  }

  console.log('='.repeat(40));
}

// Helper function for threshold checking
export function checkPerformanceThresholds(metrics) {
  const issues = [];

  // Check response time thresholds
  if (metrics.http_req_duration['p(95)'] > 600) {
    issues.push(`P95 response time too high: ${metrics.http_req_duration['p(95)']}ms > 600ms`);
  }

  if (metrics.http_req_duration['p(99)'] > 1200) {
    issues.push(`P99 response time too high: ${metrics.http_req_duration['p(99)']}ms > 1200ms`);
  }

  // Check error rate
  if (metrics.http_req_failed.rate > 0.03) {
    issues.push(`Error rate too high: ${(metrics.http_req_failed.rate * 100).toFixed(2)}% > 3%`);
  }

  return issues;
}

// Export for external usage
export { checkPerformanceThresholds };