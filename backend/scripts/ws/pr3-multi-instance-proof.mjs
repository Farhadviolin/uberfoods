import { io } from 'socket.io-client';

// Test configuration
const PORT_3000 = 3000;
const PORT_3001 = 3001;
const TEST_DRIVER_ID = 'test-driver-123';
const TEST_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWRyaXZlci0xMjMiLCJ0eXBlIjoiZHJpdmVyIiwiaWF0IjoxNjQ5OTUyMDAwLCJleHAiOjE4MDk5NTIwMDB9.mock-signature';

async function testMultiInstanceBroadcast() {
  console.log('🚀 Starting Multi-Instance WebSocket Broadcast Test');
  console.log('📅', new Date().toISOString());

  let receivedOnInstance2 = false;
  let eventCount = 0;
  let firstLatency = null;

  // Client B connects to Instance 2 (port 3001) - consumer
  const clientB = io(`http://localhost:${PORT_3001}`, {
    auth: { token: TEST_JWT_TOKEN },
    transports: ['websocket', 'polling']
  });

  console.log('👤 Client B (Consumer) connecting to port 3001...');

  await new Promise((resolve, reject) => {
    clientB.on('connect', () => {
      console.log('✅ Client B connected to Instance 2');
      resolve();
    });

    clientB.on('connect_error', (error) => {
      console.log('❌ Client B connection failed:', error.message);
      reject(error);
    });

    // Listen for driver location updates
    clientB.on('driver_location_update', (data) => {
      console.log('📨 Client B received driver_location_update:', JSON.stringify(data, null, 2));
      receivedOnInstance2 = true;
      eventCount++;

      if (!firstLatency) {
        firstLatency = Date.now() - data.timestamp;
        console.log(`⚡ First event latency: ${firstLatency}ms`);
      }
    });

    setTimeout(() => reject(new Error('Client B connection timeout')), 5000);
  });

  // Wait a moment for client B to be fully ready
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Client A connects to Instance 1 (port 3000) - producer
  const clientA = io(`http://localhost:${PORT_3000}`, {
    auth: { token: TEST_JWT_TOKEN },
    transports: ['websocket', 'polling']
  });

  console.log('👤 Client A (Producer) connecting to port 3000...');

  await new Promise((resolve, reject) => {
    clientA.on('connect', () => {
      console.log('✅ Client A connected to Instance 1');
      resolve();
    });

    clientA.on('connect_error', (error) => {
      console.log('❌ Client A connection failed:', error.message);
      reject(error);
    });

    setTimeout(() => reject(new Error('Client A connection timeout')), 5000);
  });

  // Send location update from Client A
  console.log('📤 Client A sending update_location event...');
  const locationData = {
    latitude: 40.7128,
    longitude: -74.0060
  };

  clientA.emit('update_location', locationData);

  // Wait for broadcast to propagate
  console.log('⏳ Waiting for broadcast propagation...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Cleanup
  clientA.disconnect();
  clientB.disconnect();

  // Results
  const result = {
    receivedOnInstance2,
    count: eventCount,
    firstLatencyMs: firstLatency,
    timestamp: new Date().toISOString()
  };

  console.log('📊 Test Results:', JSON.stringify(result, null, 2));

  // Write results to file
  const fs = await import('fs');
  fs.writeFileSync('docs/verification/pr3-ws-multi-instance.summary.json', JSON.stringify(result, null, 2));

  console.log('✅ Multi-instance test completed');
  return result;
}

// Run the test
testMultiInstanceBroadcast()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });