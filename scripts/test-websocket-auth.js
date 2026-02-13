const io = require('socket.io-client');

console.log('🧪 Testing WebSocket Authentication...\n');

// Test 1: Connection without token should fail
console.log('Test 1: Connection without token (should fail)');
const client1 = io('http://localhost:3000', {
  transports: ['websocket', 'polling'],
  forceNew: true,
  timeout: 5000,
});

client1.on('connect', () => {
  console.log('❌ FAIL: Connection accepted without token');
  client1.disconnect();
});

client1.on('connect_error', (error) => {
  console.log('✅ PASS: Connection rejected without token');
  console.log(`   Error: ${error.message}\n`);
  client1.disconnect();
  runTest2();
});

// Test 2: Connection with valid token should succeed
function runTest2() {
  console.log('Test 2: Connection with valid token (should succeed)');

  // For testing, we'll use a mock token - in real usage this would be obtained from login
  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIiwidHlwZSI6ImN1c3RvbWVyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNjgzMDAwMDAwLCJleHAiOjE2ODMwODY0MDB9.mock-signature';

  const client2 = io('http://localhost:3000', {
    transports: ['websocket', 'polling'],
    forceNew: true,
    auth: {
      token: mockToken,
    },
    timeout: 5000,
  });

  client2.on('connect', () => {
    console.log('✅ PASS: Connection accepted with valid token');
    client2.disconnect();
    console.log('\n🎉 WebSocket authentication tests completed!');
    process.exit(0);
  });

  client2.on('connect_error', (error) => {
    console.log('❌ FAIL: Connection rejected with valid token');
    console.log(`   Error: ${error.message}`);
    client2.disconnect();
    process.exit(1);
  });

  // Timeout
  setTimeout(() => {
    console.log('❌ FAIL: Connection timeout');
    client2.disconnect();
    process.exit(1);
  }, 6000);
}
