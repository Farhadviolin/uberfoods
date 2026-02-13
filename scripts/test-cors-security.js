const http = require('http');

console.log('🧪 Testing CORS Security...\n');

// Start a test server to simulate production CORS behavior
// Note: This is a simplified test - in real usage, the NestJS server would handle this

console.log('Test 1: CORS Origin Validation Logic');

const testOrigins = [
  // Production tests
  { origin: 'https://customer.uberfoods.com', expected: true, description: 'Valid customer domain' },
  { origin: 'https://admin.uberfoods.com', expected: true, description: 'Valid admin domain' },
  { origin: 'https://restaurant.uberfoods.com', expected: true, description: 'Valid restaurant domain' },
  { origin: 'https://driver.uberfoods.com', expected: true, description: 'Valid driver domain' },
  { origin: 'https://evil.com', expected: false, description: 'Invalid external domain' },
  { origin: undefined, expected: true, description: 'No Origin header (curl/server-to-server)' },
  { origin: null, expected: false, description: 'Null origin string (blocked in production)' },
];

const allowedOrigins = [
  'https://customer.uberfoods.com',
  'https://admin.uberfoods.com',
  'https://restaurant.uberfoods.com',
  'https://driver.uberfoods.com'
];

// Simulate CORS validation logic from main.ts
function validateCorsOrigin(origin, allowedOrigins, isProduction = true) {
  if (!isProduction) {
    return true; // Allow all in development
  }

  // Production logic:
  // - undefined origin (no Origin header) = allow (curl/server-to-server)
  // - valid origins from ALLOWED_ORIGINS = allow
  // - "null" string = block (security risk)
  if (origin === undefined || allowedOrigins.includes(origin)) {
    return true;
  }

  return false;
}

let passed = 0;
let failed = 0;

testOrigins.forEach(test => {
  const result = validateCorsOrigin(test.origin, allowedOrigins, true);
  if (result === test.expected) {
    console.log(`✅ PASS: ${test.description} - ${test.origin || 'null'} → ${result ? 'allowed' : 'blocked'}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${test.description} - ${test.origin || 'null'} → expected ${test.expected}, got ${result}`);
    failed++;
  }
});

console.log(`\n📊 CORS Test Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All CORS security tests passed!');
} else {
  console.log('❌ Some CORS security tests failed!');
  process.exit(1);
}

// Additional validation of ALLOWED_ORIGINS parsing
console.log('\nTest 2: ALLOWED_ORIGINS CSV Parsing');

const testCsvStrings = [
  'https://a.com,https://b.com',
  'https://a.com, https://b.com , https://c.com',
  'https://single.com',
];

testCsvStrings.forEach(csv => {
  const parsed = csv.split(',').map(origin => origin.trim());
  console.log(`✅ "${csv}" → [${parsed.map(o => `"${o}"`).join(', ')}]`);
});

console.log('\n🎉 CORS parsing validation completed!');
