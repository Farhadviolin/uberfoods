// k6 Load Test: WebSocket Connection Scaling
// Tests horizontal scaling and connection handling under load

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { CONFIG } from '../lib/config.js';
import { authHelper } from '../lib/auth.js';
import { customMetrics, resultsAggregator } from '../lib/metrics.js';

// Test configuration
export let options = {
  ...CONFIG.OPTIONS,

  // WebSocket-specific scenario
  scenarios: {
    websocket_connections: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: Math.min(CONFIG.OPTIONS.vus, 50) }, // Ramp up to test connection scaling
        { duration: '5m', target: Math.min(CONFIG.OPTIONS.vus, 50) },  // Sustained connections
        { duration: '30s', target: 0 },
      ],
      tags: { test_type: 'websocket_connections' },
    },
  },

  // WebSocket-specific thresholds
  thresholds: {
    'websocket_connection_duration': ['p(95)<5000', 'p(99)<10000'], // Connection establishment
    'websocket_connection_errors': ['rate<0.05'], // Allow some connection failures
    'websocket_active_connections': ['value>0'], // At least some connections active
  },
};

// Global test state
let testStartTime = Date.now();
let connectionCount = 0;
let successfulConnections = 0;
let failedConnections = 0;
let messageCount = 0;
let activeConnections = 0;

// Setup function
export function setup() {
  console.log('🚀 Setting up WebSocket Connection Scaling Load Test...');

  CONFIG.validateConfig();
  await authHelper.validateTokens();

  return {
    startTime: Date.now(),
  };
}

// Main test function - each VU maintains one WebSocket connection
export default function () {
  const connectionStart = Date.now();
  const userType = Math.random() < 0.3 ? 'driver' : 'customer'; // 30% drivers, 70% customers
  const userId = `${userType}_${__VU}_${Date.now()}`;

  connectionCount++;

  const wsResponse = ws.connect(CONFIG.WS_BASE_URL, {
    headers: {
      'Authorization': `Bearer ${authHelper.adminToken}`, // Use admin token for auth
    },
  }, function (socket) {
    const connectionDuration = Date.now() - connectionStart;

    // Connection established
    if (socket.readyState === WebSocket.OPEN) {
      successfulConnections++;
      activeConnections++;

      customMetrics.websocketConnectionDuration.add(connectionDuration);
      customMetrics.websocketActiveConnections.add(1);

      console.log(`🔗 WS Connected: ${userType} ${userId.slice(-8)}, ${connectionDuration}ms`);

      // Join relevant rooms based on user type
      socket.send(JSON.stringify({
        type: 'join-room',
        room: userType === 'driver' ? `driver-${userId}` : `user_${userId}`,
      }));

      // If driver, join drivers room
      if (userType === 'driver') {
        socket.send(JSON.stringify({
          type: 'join-room',
          room: 'drivers',
        }));
      }

      // Set up message handler
      socket.on('message', (data) => {
        messageCount++;
        customMetrics.websocketMessages.add(1);

        try {
          const message = JSON.parse(data);
          // Basic message validation
          check(message, {
            'message has type': (msg) => msg.type || msg.event,
            'message has valid structure': (msg) => typeof msg === 'object',
          });
        } catch (error) {
          console.warn('⚠️ Invalid WebSocket message format');
        }
      });

      // Handle connection errors
      socket.on('error', (error) => {
        customMetrics.websocketConnectionErrors.add(1);
        console.error(`❌ WS Error for ${userId}:`, error);
      });

      // Connection maintenance - send periodic ping
      const pingInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } else {
          clearInterval(pingInterval);
        }
      }, 30000); // Ping every 30 seconds

      // Keep connection alive for test duration
      socket.setTimeout(() => {
        // Connection will be closed by k6 when VU finishes
      }, CONFIG.OPTIONS.duration * 1000);

    } else {
      failedConnections++;
      customMetrics.websocketConnectionErrors.add(1);
      console.error(`❌ WS Connection failed for ${userId}: readyState ${socket.readyState}`);
    }

    // Cleanup when connection closes
    socket.on('close', () => {
      activeConnections = Math.max(0, activeConnections - 1);
      customMetrics.websocketActiveConnections.add(-1);
      console.log(`🔌 WS Disconnected: ${userId}`);
    });

    // Keep connection open for the test duration
    sleep(parseInt(CONFIG.OPTIONS.duration) || 60);
  });

  // Check connection result
  check(wsResponse, {
    'websocket connection attempted': (r) => r && r.readyState !== undefined,
  });

  // Brief pause between connection attempts
  sleep(0.1);
}

// Simulate WebSocket message broadcasting
function simulateBroadcasting(socket, userId, userType) {
  if (userType === 'driver') {
    // Simulate driver location updates
    const locationUpdate = {
      type: 'update_location',
      latitude: 48.2082 + (Math.random() - 0.5) * 0.01,
      longitude: 16.3738 + (Math.random() - 0.5) * 0.01,
    };

    socket.send(JSON.stringify(locationUpdate));
    customMetrics.driverLocationBroadcastDuration.add(Math.random() * 100); // Mock duration
  }
}

// Stress test: rapid connection churn
export function connectionChurnTest() {
  const churnDuration = 60000; // 1 minute
  const startTime = Date.now();
  let churnCount = 0;

  while (Date.now() - startTime < churnDuration) {
    const userId = `churn_${Date.now()}_${churnCount}`;

    const wsResponse = ws.connect(CONFIG.WS_BASE_URL, {
      headers: {
        'Authorization': `Bearer ${authHelper.adminToken}`,
      },
    }, function (socket) {
      if (socket.readyState === WebSocket.OPEN) {
        // Immediately close connection
        setTimeout(() => {
          socket.close();
        }, 100); // Close after 100ms
      }
    });

    churnCount++;
    sleep(0.05); // 50ms between connection attempts
  }

  console.log(`🔄 Connection churn test: ${churnCount} connections in ${churnDuration}ms`);
}

// Test connection limits
export function connectionLimitTest() {
  const maxConnections = 1000;
  const connections = [];

  for (let i = 0; i < maxConnections; i++) {
    const wsResponse = ws.connect(CONFIG.WS_BASE_URL, {
      headers: {
        'Authorization': `Bearer ${authHelper.adminToken}`,
      },
    }, function (socket) {
      if (socket.readyState === WebSocket.OPEN) {
        connections.push(socket);
      }

      // Close after establishing all connections
      if (connections.length >= Math.min(i + 1, 100)) { // Close first 100 connections
        setTimeout(() => {
          connections.forEach(socket => socket.close());
        }, 5000); // Keep open for 5 seconds
      }
    });

    if (i % 100 === 0) {
      console.log(`📊 Established ${i} connections...`);
      sleep(1); // Brief pause every 100 connections
    }
  }

  console.log(`🎯 Connection limit test completed: attempted ${maxConnections} connections`);
}

// Teardown function
export function teardown(data) {
  console.log('🏁 WebSocket Connection Scaling Load Test completed');

  const duration = Date.now() - testStartTime;
  const connectionSuccessRate = (successfulConnections / Math.max(connectionCount, 1)) * 100;
  const messagesPerSecond = messageCount / (duration / 1000);

  console.log(`📊 Final Results:`);
  console.log(`   Duration: ${Math.round(duration / 1000)}s`);
  console.log(`   Connection Attempts: ${connectionCount}`);
  console.log(`   Successful Connections: ${successfulConnections} (${connectionSuccessRate.toFixed(1)}%)`);
  console.log(`   Failed Connections: ${failedConnections}`);
  console.log(`   Peak Active Connections: ${activeConnections}`);
  console.log(`   Messages Received: ${messageCount}`);
  console.log(`   Messages/Second: ${messagesPerSecond.toFixed(1)}`);

  resultsAggregator.addScenarioResults('websocket_connections', {
    totalRequests: connectionCount,
    successfulRequests: successfulConnections,
    failedRequests: failedConnections,
    successRate: connectionSuccessRate,
    messagesReceived: messageCount,
    messagesPerSecond,
    peakActiveConnections: activeConnections,
    avgResponseTime: 0, // Not applicable for WebSocket connections
    p95ResponseTime: 0,
    p99ResponseTime: 0,
  });
}