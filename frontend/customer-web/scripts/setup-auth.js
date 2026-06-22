#!/usr/bin/env node

/**
 * Setup authentication states for Playwright E2E tests
 * This script runs the auth.setup.ts tests to create storageState files
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const playwrightBin = path.join(
  projectRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'playwright.cmd' : 'playwright'
);

const authDir = path.join(__dirname, '..', 'playwright', '.auth');

// Ensure auth directory exists
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

console.log('🔐 Setting up authentication states for E2E tests...');
console.log('Auth setup cwd:', projectRoot);
console.log(
  'Auth setup @playwright/test version:',
  require(path.join(projectRoot, 'node_modules', '@playwright', 'test', 'package.json')).version
);
console.log(
  'Auth setup playwright-core version:',
  require(path.join(projectRoot, 'node_modules', 'playwright-core', 'package.json')).version
);
console.log('Auth setup playwright binary:', playwrightBin);

try {
  // Run auth setup tests
  execFileSync(playwrightBin, ['test', 'auth.setup.ts', '--reporter=line'], {
    stdio: 'inherit',
    cwd: projectRoot,
    env: process.env
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
