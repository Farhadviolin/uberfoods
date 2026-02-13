#!/usr/bin/env node

/**
 * Production Smoke Test Script
 * Tests basic health endpoints and connectivity after deployment
 */

const BASE_URL = process.env.BASE_URL || process.argv[2];

if (!BASE_URL) {
  console.error('❌ Error: BASE_URL environment variable or command line argument required');
  console.error('Usage: node scripts/smoke.mjs https://your-backend-url.onrender.com');
  console.error('Or: BASE_URL=https://your-backend-url.onrender.com node scripts/smoke.mjs');
  process.exit(1);
}

// Remove trailing slash
const baseUrl = BASE_URL.replace(/\/$/, '');

async function testEndpoint(url, expectedStatus = 200, description = '') {
  try {
    console.log(`🔍 Testing ${description || url}...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'UberFoods-Smoke-Test/1.0',
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (response.status === expectedStatus) {
      console.log(`✅ ${description || url} - Status: ${response.status}`);
      return true;
    } else {
      console.log(`❌ ${description || url} - Expected: ${expectedStatus}, Got: ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`❌ ${description || url} - Timeout after 10 seconds`);
    } else {
      console.log(`❌ ${description || url} - Error: ${error.message}`);
    }
    return false;
  }
}

async function runSmokeTests() {
  console.log('🚀 Starting UberFoods Production Smoke Tests');
  console.log('===========================================');
  console.log(`Base URL: ${baseUrl}`);
  console.log('');

  const results = [];

  // Test 1: Backend health endpoint
  results.push(await testEndpoint(
    `${baseUrl}/api/health`,
    200,
    'Backend Health Check (/api/health)'
  ));

  // Test 2: Alternative health endpoint
  results.push(await testEndpoint(
    `${baseUrl}/health`,
    200,
    'Alternative Health Check (/health)'
  ));

  // Test 3: API root
  results.push(await testEndpoint(
    `${baseUrl}/api`,
    200,
    'API Root (/api)'
  ));

  // Test 4: Swagger/OpenAPI docs (if enabled)
  results.push(await testEndpoint(
    `${baseUrl}/api/docs`,
    200,
    'API Documentation (/api/docs)'
  ));

  // Test 5: OpenAPI JSON spec
  results.push(await testEndpoint(
    `${baseUrl}/api/docs-json`,
    200,
    'OpenAPI Specification (/api/docs-json)'
  ));

  console.log('');
  console.log('===========================================');

  const passed = results.filter(Boolean).length;
  const total = results.length;

  if (passed === total) {
    console.log(`🎉 All smoke tests passed! (${passed}/${total})`);
    console.log('✅ Production deployment appears healthy');
    process.exit(0);
  } else {
    console.log(`❌ Some smoke tests failed! (${passed}/${total} passed)`);
    console.log('🔍 Check the logs above for failed endpoints');
    console.log('💡 Common issues:');
    console.log('   - Backend not fully started yet (wait a few minutes)');
    console.log('   - Environment variables not set correctly');
    console.log('   - Database connection issues');
    console.log('   - CORS configuration problems');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception during smoke tests:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection during smoke tests:', reason);
  process.exit(1);
});

runSmokeTests().catch(error => {
  console.error('💥 Smoke test script failed:', error);
  process.exit(1);
});
