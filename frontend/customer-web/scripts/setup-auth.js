#!/usr/bin/env node

/**
 * Setup authentication states for Playwright E2E tests
 * This script runs the auth.setup.ts tests to create storageState files
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const authDir = path.join(__dirname, '..', 'playwright', '.auth');

// Ensure auth directory exists
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

console.log('🔐 Setting up authentication states for E2E tests...');

try {
  // Run auth setup tests
  execSync('npx playwright test auth.setup.ts --reporter=line', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  console.log('✅ Authentication states created successfully!');
  console.log(`📁 Auth files saved to: ${authDir}`);

  // List created files
  const files = fs.readdirSync(authDir);
  files.forEach(file => {
    console.log(`  - ${file}`);
  });

} catch (error) {
  console.error('❌ Failed to setup authentication states:', error.message);
  process.exit(1);
}
