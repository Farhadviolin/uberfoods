#!/usr/bin/env node

/**
 * 🧪 UberFoods - API Test Suite
 * 
 * Einfaches Test-Script für die wichtigsten API-Endpunkte
 * 
 * Usage: node test/api-test.js [baseUrl]
 * Default: https://localhost:3000/api
 */

const https = require('https');

const BASE_URL = process.argv[2] || 'https://localhost:3000/api';
if (BASE_URL.startsWith('http://') && !process.env.ALLOW_HTTP) {
  throw new Error('Refusing to use insecure HTTP for API tests. Set ALLOW_HTTP=true to allow for local testing.');
}
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

let passed = 0;
let failed = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client =
      urlObj.protocol === 'https:' || process.env.ALLOW_HTTP
        ? (urlObj.protocol === 'https:' ? https : require('http'))
        : https;
    const req = client.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 3000),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        rejectUnauthorized: false, // erlaubt lokale Self-Signed in Dev; in Prod abdrehen
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const json = data ? JSON.parse(data) : {};
            resolve({ status: res.statusCode, data: json });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      }
    );

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function test(name, testFn) {
  try {
    await testFn();
    log(`✅ ${name}`, 'green');
    passed++;
  } catch (error) {
    log(`❌ ${name}: ${error.message}`, 'red');
    failed++;
  }
}

async function runTests() {
  log('\n🧪 UberFoods - API Test Suite', 'blue');
  log('=====================================\n', 'blue');

  // Health Check
  await test('Health Check', async () => {
    const response = await makeRequest(`${BASE_URL}/health`);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (response.data.status !== 'ok') throw new Error('Health status not ok');
  });

  // Restaurants Public
  await test('Get Public Restaurants', async () => {
    const response = await makeRequest(`${BASE_URL}/restaurants/public`);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!Array.isArray(response.data)) throw new Error('Response is not an array');
  });

  // Gamification Achievements
  await test('Get Gamification Achievements', async () => {
    const response = await makeRequest(`${BASE_URL}/gamification/achievements`);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!Array.isArray(response.data)) throw new Error('Response is not an array');
  });

  // Analytics Dashboard (if available)
  await test('Analytics Dashboard Stats', async () => {
    const response = await makeRequest(`${BASE_URL}/analytics/dashboard-stats`);
    // 200 or 404 is acceptable (endpoint might not be implemented)
    if (response.status !== 200 && response.status !== 404) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  });

  // Test 404 handling
  await test('404 Handling', async () => {
    const response = await makeRequest(`${BASE_URL}/nonexistent-endpoint`);
    if (response.status !== 404) throw new Error(`Expected 404, got ${response.status}`);
  });

  // Summary
  log('\n=====================================', 'blue');
  log(`📊 Test Results:`, 'blue');
  log(`   ✅ Passed: ${passed}`, 'green');
  log(`   ❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`   📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`, 'blue');
  log('=====================================\n', 'blue');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  log(`\n❌ Fatal Error: ${error.message}`, 'red');
  process.exit(1);
});
