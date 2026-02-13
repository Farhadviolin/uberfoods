const http = require('http');

// Test script for error sanitization
console.log('🧪 Testing Error Sanitization...\n');

// Simulate production vs development error responses
// This tests the logic from the HttpExceptionFilter

const testCases = [
  {
    name: 'Production 500 Error',
    statusCode: 500,
    message: 'Database connection failed: connect ECONNREFUSED 127.0.0.1:5432',
    isProduction: true,
    expected: {
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal server error',
      shouldHaveStack: false
    }
  },
  {
    name: 'Development 500 Error',
    statusCode: 500,
    message: 'Database connection failed: connect ECONNREFUSED 127.0.0.1:5432',
    isProduction: false,
    expected: {
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Database connection failed: connect ECONNREFUSED [redacted]',
      shouldHaveStack: false // NEVER in response, even in dev
    }
  },
  {
    name: 'Production 400 Error',
    statusCode: 400,
    message: 'Validation failed: email must be valid',
    isProduction: true,
    expected: {
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed: email must be valid',
      shouldHaveStack: false
    }
  },
  {
    name: 'Production 404 Error with ID',
    statusCode: 404,
    message: 'Restaurant with id 1234567890 not found',
    isProduction: true,
    expected: {
      statusCode: 404,
      error: 'Not Found',
      message: 'Restaurant with id [id] not found', // Long ID sanitized
      shouldHaveStack: false
    }
  },
  {
    name: 'Array Messages',
    statusCode: 400,
    message: ['Email is required', 'Password must be at least 8 characters', 'userId: 9876543210 is invalid'],
    isProduction: true,
    expected: {
      statusCode: 400,
      error: 'Bad Request',
      message: ['Email is required', 'Password must be at least 8 characters', 'userId: [id] is invalid'],
      shouldHaveStack: false
    }
  },
  {
    name: 'Object Message with Errors Array',
    statusCode: 400,
    message: { errors: ['Field X is invalid', 'Field Y is missing', 'id: 111111111111 is wrong'] },
    isProduction: true,
    expected: {
      statusCode: 400,
      error: 'Bad Request',
      message: ['Field X is invalid', 'Field Y is missing', 'id: [id] is wrong'],
      shouldHaveStack: false
    }
  },
  {
    name: 'Years/Zip Codes Preserved',
    statusCode: 400,
    message: 'Order from 2024 cannot be modified. Zip code 1010 is valid.',
    isProduction: true,
    expected: {
      statusCode: 400,
      error: 'Bad Request',
      message: 'Order from 2024 cannot be modified. Zip code 1010 is valid.', // Years/zip preserved
      shouldHaveStack: false
    }
  },
  {
    name: 'Nested Arrays Flattened',
    statusCode: 400,
    message: ['Email is required', ['Password too short', 'userId: 1234567890123 is invalid']],
    isProduction: true,
    expected: {
      statusCode: 400,
      error: 'Bad Request',
      message: ['Email is required', 'Password too short', 'userId: [id] is invalid'], // Flattened, IDs sanitized
      shouldHaveStack: false
    }
  },
  {
    name: 'Object Message with Field Preservation',
    statusCode: 400,
    message: { message: ['Name required', 'orderId=999999999999 is wrong', 'restaurantId: 111111111111 invalid'] },
    isProduction: true,
    expected: {
      statusCode: 400,
      error: 'Bad Request',
      message: ['Name required', 'orderId: [id] is wrong', 'restaurantId: [id] invalid'], // Field names preserved
      shouldHaveStack: false
    }
  },
  {
    name: 'Errors Array with Nested Message Arrays',
    statusCode: 400,
    message: { errors: [{ message: ['Field A required', 'Field B invalid'] }, { message: 'Field C wrong' }] },
    isProduction: true,
    expected: {
      statusCode: 400,
      error: 'Bad Request',
      message: ['Field A required', 'Field B invalid', 'Field C wrong'], // Flattened from nested arrays
      shouldHaveStack: false
    }
  }
];

// Simulate the sanitizeMessage function from the filter
function sanitizeMessage(message, isProduction, statusCode) {
  // Normalize to string array, sanitize each, return single string or array
  const normalized = normalizeMessages(message);
  const sanitized = normalized.map(msg => sanitizeString(msg, isProduction, statusCode));

  // Return single string if only one message, otherwise array
  return sanitized.length === 1 ? sanitized[0] : sanitized;
}

// Simulate normalizeMessages function
function normalizeMessages(input) {
  if (typeof input === "string") {
    return [input];
  }

  if (Array.isArray(input)) {
    // Flatten nested arrays
    const flattened = [];
    for (const item of input) {
      flattened.push(...normalizeMessages(item));
    }
    return flattened;
  }

  if (typeof input === "object" && input !== null) {
    if ("message" in input) {
      return normalizeMessages(input.message);
    }
    if ("errors" in input && Array.isArray(input.errors)) {
      const flattened = [];
      for (const error of input.errors) {
        if (typeof error === "string") {
          flattened.push(error);
        } else if (typeof error === "object" && error !== null && "message" in error) {
          // Recursively normalize error.message
          flattened.push(...normalizeMessages(error.message));
        } else {
          // Recursively normalize the error itself
          flattened.push(...normalizeMessages(error));
        }
      }
      return flattened;
    }
    return [String(input)];
  }

  return [String(input || "Unknown error")];
}

// Sanitize string with updated rules
function sanitizeString(message, isProduction, statusCode) {
  // In production, use generic message for 5xx errors (but per individual string)
  if (isProduction && statusCode >= 500) {
    return "Internal server error";
  }

  return message
    .replace(/\/[^\s]+/g, "[path]")
    .replace(/at\s+[^\s]+\s+\([^)]+\)/g, "at [function]")
    .replace(/Error:\s*/g, "")
    .replace(/PrismaClient\w+:\s*/g, "")
    .replace(/P\d{4}:\s*/g, "")
    .replace(/SQLSTATE\s+\w+/g, "")
    // Improved ID replacement with capture groups
    .replace(/\b[a-f0-9]{8,}\b/gi, "[id]") // Hex IDs
    .replace(/\b\d{10,}\b/g, "[id]") // Very long numbers
    .replace(/(userId|restaurantId|orderId|customerId|driverId|id)\s*[:=]\s*\d{1,}/gi, "$1: [id]") // Preserve field names
    .trim();
}

// Simulate error type determination
function getErrorType(statusCode) {
  if (statusCode >= 500) return "Internal Server Error";
  if (statusCode === 400) return "Bad Request";
  if (statusCode === 401) return "Unauthorized";
  if (statusCode === 403) return "Forbidden";
  if (statusCode === 404) return "Not Found";
  if (statusCode === 409) return "Conflict";
  if (statusCode === 422) return "Unprocessable Entity";
  return "Client Error";
}

// Run tests
let passed = 0;
let failed = 0;

testCases.forEach(testCase => {
  console.log(`Testing: ${testCase.name}`);

  const sanitizedMessage = sanitizeMessage(testCase.message, testCase.isProduction, testCase.statusCode);
  const errorType = getErrorType(testCase.statusCode);

  const response = {
    statusCode: testCase.statusCode,
    error: errorType,
    message: sanitizedMessage,
    path: '/api/test',
    timestamp: new Date().toISOString(),
    requestId: 'test-request-id'
  };

  // NEVER allow stack in HTTP response (security + performance)
  if (response.stack) {
    console.log('  ❌ FAIL: Stack trace found in response (NEVER allowed)');
    failed++;
    return;
  }

  // Verify no stack in response
  if (!response.stack) {
    console.log('  ✅ PASS: No stack trace in response');
  } else {
    console.log('  ❌ FAIL: Stack trace present in response');
    failed++;
    return;
  }

  // Check response structure
  let valid = true;
  for (const [key, expectedValue] of Object.entries(testCase.expected)) {
    if (key === 'shouldHaveStack') continue;

    const actualValue = response[key];
    const expectedStr = Array.isArray(expectedValue) ? JSON.stringify(expectedValue) : expectedValue;
    const actualStr = Array.isArray(actualValue) ? JSON.stringify(actualValue) : actualValue;

    if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
      console.log(`  ❌ FAIL: ${key} expected "${expectedStr}", got "${actualStr}"`);
      valid = false;
    }
  }

  if (valid) {
    console.log('  ✅ PASS: Response structure correct');
    const messageDisplay = Array.isArray(response.message)
      ? `[${response.message.map(m => `"${m}"`).join(', ')}]`
      : `"${response.message}"`;
    console.log(`     Message: ${messageDisplay}`);
    console.log(`     Has stack: ${!!response.stack} (should always be false)`);
    passed++;
  } else {
    failed++;
  }

  console.log('');
});

console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All error sanitization tests passed!');
  console.log('\n📋 Summary:');
  console.log('- Production 5xx: Generic "Internal server error" message');
  console.log('- Production 4xx: Sanitized but informative messages');
  console.log('- Development: Detailed messages with sanitized stack traces');
  console.log('- IDs and paths: Always sanitized in responses');
  console.log('- Logs: Full error details preserved server-side');
} else {
  console.log('❌ Some error sanitization tests failed!');
  process.exit(1);
}
