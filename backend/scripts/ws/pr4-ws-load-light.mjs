import { io } from 'socket.io-client';

// PR-4 WS Load Light Test
// Simple WebSocket load test using socket.io-client
// Tests connection scaling and basic message throughput

const TARGET_URL = 'http://localhost:3000';
const MAX_CONNECTIONS = 200;
const RAMP_UP_TIME = 30; // seconds
const TEST_DURATION = 60; // seconds
const LOCATION_UPDATES_PER_SECOND = 50; // per connection

async function runWSLoadLight() {
  console.log('🚀 Starting PR-4 WS Load Light Test');
  console.log('📅', new Date().toISOString());
  console.log(`🎯 Target: ${TARGET_URL}`);
  console.log(`👥 Max Connections: ${MAX_CONNECTIONS}`);
  console.log(`⏱️  Test Duration: ${TEST_DURATION}s`);
  console.log('');

  const connections = [];
  const results = {
    totalConnections: 0,
    successfulConnections: 0,
    failedConnections: 0,
    totalMessagesSent: 0,
    totalMessagesReceived: 0,
    avgLatency: 0,
    latencies: [],
    errors: [],
    timestamp: new Date().toISOString()
  };

  // Ramp up connections gradually
  console.log('📈 Ramping up connections...');
  const connectionsPerSecond = MAX_CONNECTIONS / RAMP_UP_TIME;

  for (let i = 0; i < MAX_CONNECTIONS; i++) {
    try {
      const client = io(TARGET_URL, {
        auth: { token: 'mock-jwt-token-for-load-test' },
        transports: ['websocket', 'polling']
      });

      results.totalConnections++;

      await new Promise((resolve, reject) => {
        client.on('connect', () => {
          results.successfulConnections++;
          connections.push(client);
          resolve();
        });

        client.on('connect_error', (error) => {
          results.failedConnections++;
          results.errors.push(`Connection ${i}: ${error.message}`);
          reject(error);
        });

        // Timeout after 5 seconds
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      // Stagger connection creation
      if (i % 10 === 0) {
        console.log(`   Connected ${i + 1}/${MAX_CONNECTIONS} clients`);
      }

      // Small delay between connections
      const delay = 1000 / connectionsPerSecond;
      await new Promise(resolve => setTimeout(resolve, delay));

    } catch (error) {
      // Connection failed, continue
      continue;
    }
  }

  console.log(`✅ Connection phase complete: ${results.successfulConnections}/${results.totalConnections} successful`);
  console.log('');

  // Send location updates from random connections
  console.log('📤 Starting location update load...');
  const startTime = Date.now();
  let messageCount = 0;

  const updateInterval = setInterval(() => {
    if (connections.length === 0) return;

    // Send updates from random subset of connections
    const activeConnections = Math.min(connections.length, LOCATION_UPDATES_PER_SECOND);
    for (let i = 0; i < activeConnections; i++) {
      const client = connections[Math.floor(Math.random() * connections.length)];
      if (client && client.connected) {
        const locationData = {
          latitude: 40.7128 + (Math.random() - 0.5) * 0.01,
          longitude: -74.0060 + (Math.random() - 0.5) * 0.01
        };

        const sendTime = Date.now();
        client.emit('update_location', locationData);
        messageCount++;

        // Listen for response (simulated latency tracking)
        client.once('driver_location_update', () => {
          const latency = Date.now() - sendTime;
          results.latencies.push(latency);
        });
      }
    }
  }, 1000); // Send batch every second

  // Wait for test duration
  await new Promise(resolve => setTimeout(resolve, TEST_DURATION * 1000));
  clearInterval(updateInterval);

  // Calculate results
  results.totalMessagesSent = messageCount;
  if (results.latencies.length > 0) {
    results.avgLatency = results.latencies.reduce((a, b) => a + b, 0) / results.latencies.length;
  }

  const totalTime = (Date.now() - startTime) / 1000;
  const successRate = (results.successfulConnections / results.totalConnections) * 100;
  const messagesPerSecond = messageCount / totalTime;

  console.log('📊 WS Load Light Results:');
  console.log(`   Connections: ${results.successfulConnections}/${results.totalConnections} (${successRate.toFixed(1)}% success)`);
  console.log(`   Messages Sent: ${messageCount}`);
  console.log(`   Messages/sec: ${messagesPerSecond.toFixed(1)}`);
  console.log(`   Avg Latency: ${results.avgLatency.toFixed(0)}ms`);
  console.log(`   Errors: ${results.errors.length}`);
  console.log('');

  // Cleanup
  connections.forEach(client => client.disconnect());
  console.log('🧹 Cleanup completed');

  // Write results
  const fs = await import('fs');
  fs.writeFileSync('docs/verification/pr4-ws-load.summary.json', JSON.stringify({
    ...results,
    successRate,
    messagesPerSecond,
    totalTimeSeconds: totalTime
  }, null, 2));

  const txtContent = `WS LOAD LIGHT TEST\n${'-'.repeat(40)}\nConnections: ${results.successfulConnections}/${results.totalConnections} (${successRate.toFixed(1)}%)\nMessages Sent: ${messageCount}\nMessages/sec: ${messagesPerSecond.toFixed(1)}\nAvg Latency: ${results.avgLatency.toFixed(0)}ms\nErrors: ${results.errors.length}\nStatus: ${successRate > 95 ? '✅ PASS' : '❌ FAIL'}\n`;
  fs.writeFileSync('docs/verification/pr4-ws-load.txt', txtContent);

  console.log('✅ WS Load Light test completed');
  return results;
}

// Run the test
runWSLoadLight()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ WS Load test failed:', error);
    process.exit(1);
  });