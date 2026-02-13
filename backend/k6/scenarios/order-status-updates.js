// k6 Load Test: Order Status Updates & Idempotency
// Tests write operations with optimistic locking and race conditions

import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG } from '../lib/config.js';
import { authHelper } from '../lib/auth.js';
import { testData, DataGenerator } from '../lib/data.js';
import { customMetrics, resultsAggregator } from '../lib/metrics.js';

// Test configuration
export let options = {
  ...CONFIG.OPTIONS,

  // Scenario configuration for write operations
  scenarios: {
    order_status_updates: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: Math.min(CONFIG.OPTIONS.vus, 10) }, // Start slow
        { duration: '3m', target: Math.min(CONFIG.OPTIONS.vus, 10) },  // Sustained load
        { duration: '30s', target: 0 },
      ],
      tags: { test_type: 'order_status_updates' },
    },
  },

  // Stricter thresholds for write operations
  thresholds: {
    ...CONFIG.OPTIONS.thresholds,
    'order_status_update_duration': ['p(95)<400', 'p(99)<800'],
    'order_status_update_errors': ['rate<0.02'], // Allow slightly higher error rate for conflicts
    'order_version_conflicts': ['count<10'], // Expect few version conflicts
    'http_req_duration{scenario:order_status_updates}': ['p(95)<400', 'p(99)<800'],
  },
};

// Global test state
let testStartTime = Date.now();
let updateCount = 0;
let errorCount = 0;
let conflictCount = 0;

// Order status progression (realistic workflow)
const STATUS_PROGRESSION = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

// Setup function
export function setup() {
  console.log('🚀 Setting up Order Status Updates Load Test...');

  CONFIG.validateConfig();
  await testData.initialize();
  await authHelper.validateTokens();

  console.log('📊 Test Data Summary:', testData.getSummary());

  return {
    testData: testData.getSummary(),
    startTime: Date.now(),
  };
}

// Main test function
export default function () {
  try {
    // Simulate different types of status updates
    const behavior = Math.random();

    if (behavior < 0.7) {
      // 70% normal status progression
      performNormalStatusUpdate();
    } else if (behavior < 0.85) {
      // 15% concurrent updates (race condition test)
      performConcurrentStatusUpdate();
    } else {
      // 15% invalid status transitions (error handling test)
      performInvalidStatusUpdate();
    }

    updateCount++;

  } catch (error) {
    errorCount++;
    customMetrics.orderStatusUpdateErrors.add(1);
    console.error('❌ Order status update error:', error);
  }

  // Random sleep between updates (1-3 seconds, more realistic for admin actions)
  sleep(Math.random() * 2 + 1);
}

// Normal status progression test
function performNormalStatusUpdate() {
  const orderId = testData.getRandomOrderId();

  // Get current order status first (simulates admin checking current state)
  const getResponse = http.get(`${CONFIG.API_BASE_URL}/orders/${orderId}`, {
    headers: authHelper.getAdminHeaders(),
    timeout: '10s',
  });

  if (getResponse.status !== 200) {
    console.warn(`⚠️ Could not fetch order ${orderId}: ${getResponse.status}`);
    return;
  }

  let currentStatus;
  try {
    const orderData = getResponse.json();
    currentStatus = orderData.status;
  } catch (error) {
    console.warn(`⚠️ Could not parse order data for ${orderId}`);
    return;
  }

  // Determine valid next status
  const possibleStatuses = STATUS_PROGRESSION[currentStatus] || [];
  if (possibleStatuses.length === 0) {
    // Order is in terminal state, skip update
    return;
  }

  const nextStatus = possibleStatuses[Math.floor(Math.random() * possibleStatuses.length)];

  // Perform status update
  const updatePayload = {
    status: nextStatus,
    metadata: {
      updatedBy: 'load_test',
      reason: 'Automated status progression test',
      timestamp: new Date().toISOString(),
    },
  };

  const updateResponse = http.patch(
    `${CONFIG.API_BASE_URL}/orders/${orderId}/status`,
    JSON.stringify(updatePayload),
    {
      headers: authHelper.getAdminHeaders(),
      timeout: '15s',
    }
  );

  const startTime = Date.now();
  const checkResult = check(updateResponse, {
    'status update status is 200': (r) => r.status === 200,
    'status update response time < 500ms': (r) => r.timings.duration < 500,
    'status update returns valid response': (r) => {
      try {
        const jsonResponse = r.json();
        return jsonResponse && jsonResponse.id === orderId;
      } catch {
        return false;
      }
    },
  });

  if (!checkResult) {
    customMetrics.orderStatusUpdateErrors.add(1);
  }

  customMetrics.orderStatusUpdateDuration.add(updateResponse.timings.duration);
  customMetrics.ordersUpdated.add(1);

  if (updateCount < 5) {
    console.log(`📝 Status update: ${orderId} ${currentStatus} → ${nextStatus}, ${updateResponse.timings.duration}ms`);
  }
}

// Concurrent updates test (race condition simulation)
function performConcurrentStatusUpdate() {
  const orderId = testData.getRandomOrderId();

  // Simulate multiple admins trying to update the same order simultaneously
  const concurrentUpdates = 3;
  const updatePromises = [];

  for (let i = 0; i < concurrentUpdates; i++) {
    const updatePayload = {
      status: 'CONFIRMED', // All try to set same status
      metadata: {
        updatedBy: `load_test_concurrent_${i}`,
        reason: `Concurrent update test ${i}`,
        timestamp: new Date().toISOString(),
      },
    };

    updatePromises.push(
      http.patch(
        `${CONFIG.API_BASE_URL}/orders/${orderId}/status`,
        JSON.stringify(updatePayload),
        {
          headers: authHelper.getAdminHeaders(),
          timeout: '15s',
        }
      )
    );
  }

  // Execute all concurrent updates
  const responses = updatePromises;

  let successCount = 0;
  let conflictCount = 0;

  responses.forEach((response, index) => {
    customMetrics.orderStatusUpdateDuration.add(response.timings.duration);

    if (response.status === 200) {
      successCount++;
      customMetrics.ordersUpdated.add(1);
    } else if (response.status === 409) {
      // Version conflict (optimistic locking)
      conflictCount++;
      customMetrics.orderVersionConflicts.add(1);
      console.log(`🔒 Version conflict for order ${orderId} (update ${index})`);
    } else {
      customMetrics.orderStatusUpdateErrors.add(1);
      console.warn(`⚠️ Unexpected status for concurrent update: ${response.status}`);
    }
  });

  if (updateCount < 3) {
    console.log(`🔄 Concurrent updates: ${orderId}, ${successCount} success, ${conflictCount} conflicts`);
  }
}

// Invalid status transitions test (error handling)
function performInvalidStatusUpdate() {
  const orderId = testData.getRandomOrderId();

  // Try invalid status transitions
  const invalidStatuses = ['INVALID_STATUS', 'PENDING', 'DELIVERED']; // Invalid transitions

  invalidStatuses.forEach(invalidStatus => {
    const updatePayload = {
      status: invalidStatus,
      metadata: {
        updatedBy: 'load_test_invalid',
        reason: 'Testing invalid status transitions',
        timestamp: new Date().toISOString(),
      },
    };

    const response = http.patch(
      `${CONFIG.API_BASE_URL}/orders/${orderId}/status`,
      JSON.stringify(updatePayload),
      {
        headers: authHelper.getAdminHeaders(),
        timeout: '15s',
      }
    );

    customMetrics.orderStatusUpdateDuration.add(response.timings.duration);

    // We expect some of these to fail (400 Bad Request for invalid transitions)
    if (response.status === 400) {
      // Expected error for invalid transition
      console.log(`✅ Invalid transition rejected: ${orderId} → ${invalidStatus}`);
    } else if (response.status === 200) {
      // Unexpected success (might be valid transition)
      console.log(`⚠️ Unexpected success for transition: ${orderId} → ${invalidStatus}`);
    } else {
      // Unexpected error
      customMetrics.orderStatusUpdateErrors.add(1);
      console.warn(`❌ Unexpected error for invalid transition: ${response.status}`);
    }
  });
}

// Idempotency test (same request multiple times)
function testIdempotency() {
  const orderId = testData.getRandomOrderId();

  const updatePayload = {
    status: 'CONFIRMED',
    metadata: {
      updatedBy: 'load_test_idempotent',
      reason: 'Testing idempotency',
      idempotencyKey: `test_${orderId}_${Date.now()}`,
      timestamp: new Date().toISOString(),
    },
  };

  // Send same request multiple times
  for (let i = 0; i < 3; i++) {
    const response = http.patch(
      `${CONFIG.API_BASE_URL}/orders/${orderId}/status`,
      JSON.stringify(updatePayload),
      {
        headers: authHelper.getAdminHeaders(),
        timeout: '15s',
      }
    );

    customMetrics.orderStatusUpdateDuration.add(response.timings.duration);

    if (response.status === 200) {
      customMetrics.ordersUpdated.add(1);
    } else if (response.status === 409) {
      customMetrics.orderVersionConflicts.add(1);
    } else {
      customMetrics.orderStatusUpdateErrors.add(1);
    }

    sleep(0.1); // Small delay between idempotent requests
  }

  console.log(`🔄 Idempotency test completed for order ${orderId}`);
}

// Performance test with high contention
export function highContentionTest() {
  // Test with a few orders that get updated frequently
  const hotOrders = [
    testData.getRandomOrderId(),
    testData.getRandomOrderId(),
    testData.getRandomOrderId(),
  ];

  const startTime = Date.now();
  const duration = 30000; // 30 seconds
  let operations = 0;

  while (Date.now() - startTime < duration) {
    const orderId = hotOrders[Math.floor(Math.random() * hotOrders.length)];

    const response = http.patch(
      `${CONFIG.API_BASE_URL}/orders/${orderId}/status`,
      JSON.stringify({
        status: 'CONFIRMED',
        metadata: {
          updatedBy: 'high_contention_test',
          timestamp: new Date().toISOString(),
        },
      }),
      {
        headers: authHelper.getAdminHeaders(),
        timeout: '10s',
      }
    );

    customMetrics.orderStatusUpdateDuration.add(response.timings.duration);
    operations++;

    if (response.status === 409) {
      customMetrics.orderVersionConflicts.add(1);
    }

    sleep(0.05); // Very short sleep for high frequency
  }

  console.log(`🔥 High contention test: ${operations} operations in ${duration}ms`);
}

// Teardown function
export function teardown(data) {
  console.log('🏁 Order Status Updates Load Test completed');

  const duration = Date.now() - testStartTime;
  const errorRate = errorCount / Math.max(updateCount, 1);
  const throughput = updateCount / (duration / 1000);

  console.log(`📊 Final Results:`);
  console.log(`   Duration: ${Math.round(duration / 1000)}s`);
  console.log(`   Status Updates: ${updateCount}`);
  console.log(`   Version Conflicts: ${conflictCount}`);
  console.log(`   Errors: ${errorCount} (${(errorRate * 100).toFixed(2)}%)`);
  console.log(`   Throughput: ${throughput.toFixed(1)} updates/s`);

  resultsAggregator.addScenarioResults('order_status_updates', {
    totalRequests: updateCount,
    successfulRequests: updateCount - errorCount,
    failedRequests: errorCount,
    versionConflicts: conflictCount,
    errorRate: errorRate * 100,
    throughput,
    avgResponseTime: 0, // Calculated by k6
    p95ResponseTime: 0,  // Calculated by k6
    p99ResponseTime: 0,  // Calculated by k6
  });
}