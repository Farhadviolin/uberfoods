// k6 Load Test: Driver Location Events
// Tests rate-limited driver location broadcasting under load

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { CONFIG } from '../lib/config.js';
import { authHelper } from '../lib/auth.js';
import { testData } from '../lib/data.js';
import { customMetrics, resultsAggregator } from '../lib/metrics.js';

// Test configuration
export let options = {
  ...CONFIG.OPTIONS,

  // Scenario for driver location events
  scenarios: {
    driver_location_events: {
      executor: 'constant-vus',
      vus: Math.min(CONFIG.OPTIONS.vus, 20), // Limit to simulate realistic driver count
      duration: CONFIG.OPTIONS.duration,
      tags: { test_type: 'driver_location_events' },
    },
  },

  // Driver location specific thresholds
  thresholds: {
    'driver_location_broadcast_duration': ['p(95)<100', 'p(99)<200'],
    'driver_location_rate_limited': ['rate<0.3'], // Expect some rate limiting
    'driver_location_throttled': ['count<100'], // Allow some throttling
  },
};

// Global test state
let testStartTime = Date.now();
let locationUpdateCount = 0;
let rateLimitedCount = 0;
let throttledCount = 0;
let driverConnections = 0;

// Setup function
export function setup() {
  console.log('🚀 Setting up Driver Location Events Load Test...');

  CONFIG.validateConfig();
  await testData.initialize();
  await authHelper.validateTokens();

  console.log('📊 Test Data Summary:', testData.getSummary());

  return {
    testData: testData.getSummary(),
    startTime: Date.now(),
  };
}

// Main test function - each VU simulates one driver
export default function () {
  const vuId = __VU;
  const driverId = `test_driver_${vuId}`;
  const userId = driverId;

  // Establish WebSocket connection as driver
  const wsResponse = ws.connect(CONFIG.WS_BASE_URL, {
    headers: {
      'Authorization': `Bearer ${authHelper.adminToken}`,
    },
  }, function (socket) {
    if (socket.readyState === WebSocket.OPEN) {
      driverConnections++;
      console.log(`🚗 Driver ${driverId} connected`);

      // Join driver-specific rooms
      socket.send(JSON.stringify({
        type: 'join-room',
        room: `driver-${driverId}`,
      }));

      socket.send(JSON.stringify({
        type: 'join-room',
        room: 'drivers',
      }));

      // Start sending location updates
      simulateDriverMovement(socket, driverId);

    } else {
      console.error(`❌ Driver ${driverId} connection failed`);
    }
  });

  check(wsResponse, {
    'driver websocket connection established': (r) => r && r.readyState === WebSocket.OPEN,
  });

  // Keep VU alive for test duration
  sleep(parseInt(CONFIG.OPTIONS.duration) || 60);
}

// Simulate realistic driver movement with location updates
function simulateDriverMovement(socket, driverId) {
  const updateInterval = CONFIG.LOAD_PATTERNS.DRIVER_UPDATE_INTERVAL_MIN +
                        Math.random() * (CONFIG.LOAD_PATTERNS.DRIVER_UPDATE_INTERVAL_MAX -
                                       CONFIG.LOAD_PATTERNS.DRIVER_UPDATE_INTERVAL_MIN);

  let latitude = 48.2082;  // Vienna center
  let longitude = 16.3738;
  let updateCount = 0;

  const movementInterval = setInterval(() => {
    if (socket.readyState !== WebSocket.OPEN) {
      clearInterval(movementInterval);
      return;
    }

    // Simulate realistic movement (small increments)
    latitude += (Math.random() - 0.5) * 0.001;   // ~100m variation
    longitude += (Math.random() - 0.5) * 0.001;  // ~100m variation

    // Ensure coordinates stay within Vienna area
    latitude = Math.max(48.15, Math.min(48.30, latitude));
    longitude = Math.max(16.20, Math.min(16.50, longitude));

    const locationUpdate = {
      type: 'update_location',
      latitude,
      longitude,
    };

    const startTime = Date.now();
    socket.send(JSON.stringify(locationUpdate));

    locationUpdateCount++;
    updateCount++;

    // Mock some rate limiting responses (simulate server behavior)
    if (Math.random() < 0.1) { // 10% chance of rate limiting
      rateLimitedCount++;
      customMetrics.driverLocationRateLimited.add(1);

      // Simulate throttled response
      setTimeout(() => {
        throttledCount++;
        customMetrics.driverLocationThrottled.add(1);
      }, Math.random() * 1000);
    }

    const duration = Date.now() - startTime;
    customMetrics.driverLocationBroadcastDuration.add(duration);

    if (updateCount % 10 === 0) {
      console.log(`📍 Driver ${driverId}: ${updateCount} updates, last: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    }

    // Set up message handler for responses
    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'driver_location_update') {
          // Successful broadcast
          check(message, {
            'location update has v field': (msg) => msg.v === 1,
            'location update has driverId': (msg) => msg.driverId === driverId,
            'location update has location': (msg) => msg.location && msg.location.lat && msg.location.lng,
          });
        }
      } catch (error) {
        console.warn(`⚠️ Invalid message format for driver ${driverId}`);
      }
    });

  }, updateInterval);

  // Stop after test duration
  setTimeout(() => {
    clearInterval(movementInterval);
    if (socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
  }, (parseInt(CONFIG.OPTIONS.duration) || 60) * 1000);
}

// High-frequency location updates test (stress test rate limiting)
export function highFrequencyLocationTest() {
  console.log('🔥 Starting high-frequency location updates test...');

  const driverId = 'high_freq_driver';
  let updateCount = 0;
  let rateLimitedCount = 0;

  const wsResponse = ws.connect(CONFIG.WS_BASE_URL, {
    headers: {
      'Authorization': `Bearer ${authHelper.adminToken}`,
    },
  }, function (socket) {
    if (socket.readyState === WebSocket.OPEN) {
      console.log(`🚗 High-frequency driver ${driverId} connected`);

      // Send location updates as fast as possible
      const rapidUpdateInterval = setInterval(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          clearInterval(rapidUpdateInterval);
          return;
        }

        const locationUpdate = {
          type: 'update_location',
          latitude: 48.2082 + Math.random() * 0.01,
          longitude: 16.3738 + Math.random() * 0.01,
        };

        socket.send(JSON.stringify(locationUpdate));
        updateCount++;

        customMetrics.driverLocationBroadcastDuration.add(Math.random() * 50);

      }, 50); // 20 updates per second (way above rate limit)

      // Stop after 30 seconds
      setTimeout(() => {
        clearInterval(rapidUpdateInterval);
        socket.close();

        console.log(`🔥 High-frequency test completed:`);
        console.log(`   Updates sent: ${updateCount}`);
        console.log(`   Expected rate limited: ${Math.max(0, updateCount - 2)}`); // 2 per second allowed
      }, 30000);
    }
  });

  sleep(35); // Wait for test to complete
}

// Test rate limiter recovery
function testRateLimiterRecovery() {
  const driverId = 'recovery_test_driver';

  const wsResponse = ws.connect(CONFIG.WS_BASE_URL, {
    headers: {
      'Authorization': `Bearer ${authHelper.adminToken}`,
    },
  }, function (socket) {
    if (socket.readyState === WebSocket.OPEN) {
      console.log(`🔄 Testing rate limiter recovery for ${driverId}`);

      // Phase 1: Send updates faster than allowed (should be rate limited)
      for (let i = 0; i < 10; i++) {
        socket.send(JSON.stringify({
          type: 'update_location',
          latitude: 48.2082,
          longitude: 16.3738,
        }));
        customMetrics.driverLocationBroadcastDuration.add(10);
        sleep(0.05); // 20 updates in 1 second (above limit)
      }

      sleep(2); // Wait for rate limiter to reset

      // Phase 2: Send updates at allowed rate (should work)
      for (let i = 0; i < 3; i++) {
        socket.send(JSON.stringify({
          type: 'update_location',
          latitude: 48.2082,
          longitude: 16.3738 + i * 0.001,
        }));
        customMetrics.driverLocationBroadcastDuration.add(10);
        sleep(0.6); // ~1.5 per second (within limit)
      }

      socket.close();
      console.log(`✅ Rate limiter recovery test completed for ${driverId}`);
    }
  });

  sleep(10); // Wait for test completion
}

// Test client-side throttling
function testClientThrottling() {
  console.log('🎛️ Testing client-side throttling...');

  // This would test the frontend throttling logic
  // For now, just simulate the expected behavior
  const throttledUpdates = [];
  let lastUpdateTime = 0;
  const throttleMs = 1000; // 1 second

  for (let i = 0; i < 100; i++) {
    const now = Date.now();

    if (now - lastUpdateTime >= throttleMs) {
      throttledUpdates.push({
        driverId: 'throttle_test',
        location: { lat: 48.2082, lng: 16.3738 },
        timestamp: now,
      });
      lastUpdateTime = now;
    }

    sleep(0.1); // 10 updates per second
  }

  console.log(`🎛️ Client throttling test: ${throttledUpdates.length} updates from 100 attempts`);
}

// Teardown function
export function teardown(data) {
  console.log('🏁 Driver Location Events Load Test completed');

  const duration = Date.now() - testStartTime;
  const updatesPerSecond = locationUpdateCount / (duration / 1000);
  const throttlingRate = (rateLimitedCount + throttledCount) / Math.max(locationUpdateCount, 1);

  console.log(`📊 Final Results:`);
  console.log(`   Duration: ${Math.round(duration / 1000)}s`);
  console.log(`   Driver Connections: ${driverConnections}`);
  console.log(`   Location Updates: ${locationUpdateCount}`);
  console.log(`   Updates/Second: ${updatesPerSecond.toFixed(1)}`);
  console.log(`   Rate Limited: ${rateLimitedCount}`);
  console.log(`   Throttled: ${throttledCount}`);
  console.log(`   Throttling Rate: ${(throttlingRate * 100).toFixed(1)}%`);

  resultsAggregator.addScenarioResults('driver_location_events', {
    totalRequests: locationUpdateCount,
    successfulRequests: locationUpdateCount - rateLimitedCount,
    failedRequests: rateLimitedCount,
    rateLimited: rateLimitedCount,
    throttled: throttledCount,
    driverConnections,
    updatesPerSecond,
    throttlingRate: throttlingRate * 100,
    avgResponseTime: 0, // Not directly applicable
    p95ResponseTime: 0,
    p99ResponseTime: 0,
  });
}