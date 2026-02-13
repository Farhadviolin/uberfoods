import { io } from 'socket.io-client';

// Test configuration
const PORT_3000 = 3000;
const PORT_3001 = 3001;
const TEST_DRIVER_ID = 'test-driver-rate-limit-456';
const TEST_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWRyaXZlci1yYXRlLWxpbWl0LTQ1NiIsInR5cGUiOiJkcml2ZXIiLCJpYXQiOjE2NDk5NTIwMDAsImV4cCI6MTgwOTk1MjAwMH0.mock-signature';

async function testRateLimiting() {
  console.log('🚀 Starting Rate Limiting WebSocket Test');
  console.log('📅', new Date().toISOString());

  const receivedEvents = [];
  let producerConnected = false;

  // Consumer connects to Instance 2 (port 3001)
  const consumer = io(`http://localhost:${PORT_3001}`, {
    auth: { token: TEST_JWT_TOKEN },
    transports: ['websocket', 'polling']
  });

  console.log('👤 Consumer connecting to port 3001...');

  await new Promise((resolve, reject) => {
    consumer.on('connect', () => {
      console.log('✅ Consumer connected to Instance 2');
      resolve();
    });

    consumer.on('connect_error', (error) => {
      console.log('❌ Consumer connection failed:', error.message);
      reject(error);
    });

    // Listen for driver location updates
    consumer.on('driver_location_update', (data) => {
      const now = Date.now();
      receivedEvents.push({
        timestamp: now,
        eventData: data,
        latency: now - data.timestamp
      });
      console.log(`📨 Consumer received event #${receivedEvents.length} at ${new Date(now).toISOString()}`);
    });

    setTimeout(() => reject(new Error('Consumer connection timeout')), 5000);
  });

  // Producer connects to Instance 1 (port 3000)
  const producer = io(`http://localhost:${PORT_3000}`, {
    auth: { token: TEST_JWT_TOKEN },
    transports: ['websocket', 'polling']
  });

  console.log('👤 Producer connecting to port 3000...');

  await new Promise((resolve, reject) => {
    producer.on('connect', () => {
      console.log('✅ Producer connected to Instance 1');
      producerConnected = true;
      resolve();
    });

    producer.on('connect_error', (error) => {
      console.log('❌ Producer connection failed:', error.message);
      reject(error);
    });

    setTimeout(() => reject(new Error('Producer connection timeout')), 5000);
  });

  // Send 10 location updates per second for 5 seconds (50 total)
  console.log('📤 Starting rate limit test: 10 updates/sec for 5 seconds...');

  const startTime = Date.now();
  const totalUpdates = 50;
  const updatesPerSecond = 10;
  const testDurationMs = 5000;

  for (let i = 0; i < totalUpdates; i++) {
    const locationData = {
      latitude: 40.7128 + (Math.random() - 0.5) * 0.01, // Small random variation
      longitude: -74.0060 + (Math.random() - 0.5) * 0.01
    };

    producer.emit('update_location', locationData);

    // Wait for next update (100ms = 10/sec)
    if (i < totalUpdates - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('⏳ Waiting for all broadcasts to propagate...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Analyze results
  const endTime = Date.now();
  const totalDuration = endTime - startTime;

  console.log(`📊 Analysis:`);
  console.log(`   - Sent: ${totalUpdates} updates`);
  console.log(`   - Received: ${receivedEvents.length} events`);
  console.log(`   - Duration: ${totalDuration}ms`);

  // Group events by second
  const eventsBySecond = {};
  receivedEvents.forEach(event => {
    const second = Math.floor((event.timestamp - startTime) / 1000);
    if (!eventsBySecond[second]) {
      eventsBySecond[second] = [];
    }
    eventsBySecond[second].push(event);
  });

  console.log('   - Events per second:');
  Object.keys(eventsBySecond).forEach(second => {
    console.log(`     Second ${second}: ${eventsBySecond[second].length} events`);
  });

  // Calculate max events per second
  const maxEventsPerSecond = Math.max(...Object.values(eventsBySecond).map(arr => arr.length));
  console.log(`   - Max events/sec: ${maxEventsPerSecond}`);

  // Determine PASS/FAIL (should be ≤ 2 events/sec)
  const rateLimitPass = maxEventsPerSecond <= 2;
  console.log(`   - Rate limit check: ${rateLimitPass ? '✅ PASS' : '❌ FAIL'} (≤2 events/sec)`);

  // Cleanup
  producer.disconnect();
  consumer.disconnect();

  // Results
  const result = {
    sent: totalUpdates,
    received: receivedEvents.length,
    durationMs: totalDuration,
    maxEventsPerSecond,
    rateLimitPass,
    eventsBySecond,
    timestamp: new Date().toISOString()
  };

  console.log('📊 Final Results:', JSON.stringify({
    sent: result.sent,
    received: result.received,
    maxEventsPerSecond: result.maxEventsPerSecond,
    rateLimitPass: result.rateLimitPass
  }, null, 2));

  // Write results to files
  const fs = await import('fs');
  fs.writeFileSync('docs/verification/pr3-rate-limit.raw.log', JSON.stringify(receivedEvents, null, 2));
  fs.writeFileSync('docs/verification/pr3-rate-limit.summary.json', JSON.stringify(result, null, 2));

  // Write PASS/FAIL summary
  const passFailText = `RATE LIMIT TEST: ${rateLimitPass ? 'PASS' : 'FAIL'}\n` +
    `Sent: ${totalUpdates} updates\n` +
    `Received: ${receivedEvents.length} events\n` +
    `Max events/sec: ${maxEventsPerSecond}\n` +
    `Expected: ≤2 events/sec\n` +
    `Result: ${rateLimitPass ? '✅ Rate limiting working correctly' : '❌ Rate limiting not effective'}\n`;

  fs.writeFileSync('docs/verification/pr3-rate-limit.txt', passFailText);

  console.log('✅ Rate limit test completed');
  return result;
}

// Run the test
testRateLimiting()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });