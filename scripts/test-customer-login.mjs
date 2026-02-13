#!/usr/bin/env node

/**
 * Test Customer Login for E2E Tests
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { backendRoot } from './_lib/paths.mjs';

// Simple .env parser (same as in create-e2e-customer.js)
function parseEnvFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const env = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim();
        const value = trimmed.substring(equalIndex + 1).trim().replace(/^["']|["']$/g, '');
        env[key] = value;
      }
    }
  }

  return env;
}

// Load E2E environment variables (same as seeding)
const envPath = join(backendRoot, '.env.e2e');
console.log('Loading .env.e2e from:', envPath);
const envVars = parseEnvFile(envPath);
console.log('Loaded envVars keys:', Object.keys(envVars));
console.log('E2E_CUSTOMER_EMAIL from file:', envVars.E2E_CUSTOMER_EMAIL);
console.log('E2E_CUSTOMER_PASSWORD from file:', envVars.E2E_CUSTOMER_PASSWORD);
Object.assign(process.env, envVars);

// Test login credentials (use same logic as seeding - same as create-e2e-customer.js)
const testEmail = envVars.E2E_CUSTOMER_EMAIL || envVars.TEST_CUSTOMER_EMAIL || 'testcustomer@example.com';
const testPassword = envVars.E2E_CUSTOMER_PASSWORD || envVars.TEST_CUSTOMER_PASSWORD || 'TestPassword123!';

// Debug: show what password we're using
console.log('DEBUG: Using password from envVars.E2E_CUSTOMER_PASSWORD:', !!envVars.E2E_CUSTOMER_PASSWORD);
console.log('DEBUG: Using password from envVars.TEST_CUSTOMER_PASSWORD:', !!envVars.TEST_CUSTOMER_PASSWORD);
console.log('DEBUG: Final password value (first 3 chars):', testPassword.substring(0, 3) + '...');

console.log('🔐 Testing customer login...');
console.log(`Using email: ${testEmail}`);
console.log(`Using password from ENV: ${envVars.E2E_CUSTOMER_PASSWORD ? 'E2E_CUSTOMER_PASSWORD' : envVars.TEST_CUSTOMER_PASSWORD ? 'TEST_CUSTOMER_PASSWORD' : 'fallback (TestPassword123!)'}`);
console.log(`Password value (first 3 chars): ${testPassword.substring(0, 3)}...`);

try {
  // Make login request - use customer-specific endpoint
  const loginCommand = `curl -X POST http://localhost:3000/api/auth/customer/login -H "Content-Type: application/json" -d "{\\"email\\": \\"${testEmail}\\", \\"password\\": \\"${testPassword}\\"}" --max-time 10`;

  console.log('Executing:', loginCommand);

  const result = execSync(loginCommand, {
    encoding: 'utf8',
    timeout: 15000,
    cwd: backendRoot
  });

  console.log('Response:', result);

  // Parse JSON response and check for token/accessToken
  try {
    const responseData = JSON.parse(result.trim());

    // Check for token in various possible field names
    const hasToken = responseData.token || responseData.accessToken || responseData.authToken || responseData.access_token;

    if (hasToken) {
      console.log('✅ Customer login test PASSED - Token received');
      console.log('Token (first 20 chars):', hasToken.substring(0, 20) + '...');
      process.exit(0);
    } else {
      console.log('❌ Customer login test FAILED - no token in response');
      console.log('Response:', result);
      process.exit(1);
    }
  } catch (parseError) {
    console.log('❌ Customer login test FAILED - invalid JSON response');
    console.log('Parse error:', parseError.message);
    console.log('Raw response:', result);
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Customer login test FAILED');
  console.error('Error:', error.message);
  process.exit(1);
}