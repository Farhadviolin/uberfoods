#!/usr/bin/env node

/**
 * Complete E2E Test Runner
 *
 * Orchestrates the full E2E testing pipeline:
 * 1. Start E2E database (Docker)
 * 2. Reset and seed database
 * 3. Start backend server
 * 4. Start frontend server
 * 5. Wait for health checks
 * 6. Run Playwright tests
 * 7. Cleanup
 */

import { execSync, spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

const FRONTEND_APP = 'admin-panel';
const BACKEND_PORT = '3000';
const FRONTEND_PORT = '3002';
const DB_CONTAINER = 'postgres-e2e';

let processes = [];

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

function runCommand(command, cwd = ROOT_DIR, description = '', options = {}) {
  try {
    log(`Running: ${description || command}`);
    execSync(command, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1', ...options.env },
      ...options
    });
    return true;
  } catch (error) {
    log(`Failed: ${description || command}`, 'error');
    log(`Error: ${error.message}`, 'error');
    return false;
  }
}

async function waitForHealthCheck(url, timeout = 30000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        log(`✅ Health check passed for ${url}`);
        return true;
      }
    } catch (error) {
      log(`⏳ Health check failed for ${url}, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  log(`❌ Health check timeout for ${url}`, 'error');
  return false;
}

async function startDatabase() {
  log('🐳 Starting E2E database...');

  const success = runCommand(
    'docker compose -f docker/e2e/docker-compose.e2e.yml up -d',
    ROOT_DIR,
    'Start E2E database'
  );

  if (!success) {
    log('❌ Failed to start database', 'error');
    return false;
  }

  // Wait for database to be ready
  log('⏳ Waiting for database to be ready...');

  // Give the database more time to initialize
  await new Promise(resolve => setTimeout(resolve, 15000));

  // Try direct connection test multiple times
  let dbReady = false;
  for (let i = 0; i < 10; i++) {
    try {
      execSync('docker exec uberfoods_postgres_e2e pg_isready -U uberfoods -d uberfoods_e2e', { stdio: 'pipe', timeout: 5000 });
      dbReady = true;
      log('✅ Database health check passed');
      break;
    } catch (error) {
      log(`⏳ Database health check attempt ${i + 1}/10 failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  if (!dbReady) {
    log('❌ Database health check failed after 10 attempts');
  }

  if (!dbReady) {
    log('❌ Database failed to become ready', 'error');
    return false;
  }

  return true;
}

async function resetAndSeedDatabase() {
  log('🗑️ Resetting and seeding database...');

  const success = runCommand(
    'node scripts/reset-db-e2e.mjs',
    ROOT_DIR,
    'Reset and seed database',
    {
      env: {
        ...process.env,
        PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: process.env.PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION || 'I, User, consent to Prisma migrate reset for E2E testing'
      }
    }
  );

  return success;
}

async function startBackend() {
  log('🚀 Starting backend server...');

  const backendProcess = spawn('node', [join(ROOT_DIR, 'backend', 'node_modules', 'ts-node', 'dist', 'bin.js'), 'src/main.e2e.ts'], {
    cwd: join(ROOT_DIR, 'backend'),
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'e2e',
      APP_ENV: 'e2e',
      PORT: BACKEND_PORT,
      TS_NODE_PROJECT: 'tsconfig.build.json',
      FORCE_COLOR: '1',
      E2E_ADMIN_EMAIL: process.env.E2E_ADMIN_EMAIL || 'admin@uberfoods.com',
      E2E_ADMIN_PASSWORD: process.env.E2E_ADMIN_PASSWORD || 'admin123'
    },
    shell: false
  });

  // Wait a bit for backend to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  processes.push(backendProcess);

  // Capture backend stdout/stderr for debugging
  let backendStdout = '';
  let backendStderr = '';

  backendProcess.stdout?.on('data', (data) => {
    backendStdout += data.toString();
    log(`[BACKEND STDOUT] ${data.toString().trim()}`);
  });

  backendProcess.stderr?.on('data', (data) => {
    backendStderr += data.toString();
    log(`[BACKEND STDERR] ${data.toString().trim()}`, 'error');
  });

  // Wait for backend to be healthy with longer timeout and better error handling
  log('⏳ Waiting for backend to be ready (up to 60s)...');
  const backendReady = await waitForHealthCheck(`http://localhost:${BACKEND_PORT}/api/health`, 60000);

  if (!backendReady) {
    log('❌ Backend failed to become ready within 60 seconds', 'error');

    // Write backend logs to artifacts for debugging
    try {
      const fs = await import('fs');
      const logPath = join(ROOT_DIR, 'artifacts', 'backend-e2e-startup.log');
      const logContent = `BACKEND STARTUP FAILURE LOG\n===========================\n\nSTDOUT:\n${backendStdout}\n\nSTDERR:\n${backendStderr}\n\nENVIRONMENT:\n- CWD: ${join(ROOT_DIR, 'backend')}\n- PORT: ${BACKEND_PORT}\n- NODE_ENV: e2e\n\nHEALTH CHECK URL: http://localhost:${BACKEND_PORT}/api/health\n`;

      fs.writeFileSync(logPath, logContent);
      log(`📄 Backend startup logs written to: ${logPath}`, 'error');
    } catch (error) {
      log(`❌ Failed to write backend logs: ${error.message}`, 'error');
    }

    return false;
  }

  return true;
}

async function startFrontend() {
  log(`🌐 Starting ${FRONTEND_APP} frontend...`);

  const frontendProcess = spawn('node', [join(ROOT_DIR, 'frontend', FRONTEND_APP, 'node_modules', 'vite', 'bin', 'vite.js'), '--mode', 'e2e', '--host', '127.0.0.1', '--port', FRONTEND_PORT], {
    cwd: join(ROOT_DIR, 'frontend', FRONTEND_APP),
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      FORCE_COLOR: '1',
      VITE_API_URL: `http://localhost:${BACKEND_PORT}`, // Direct connection to E2E backend
      VITE_E2E_ORCHESTRATED: '1'
    },
    shell: false
  });

  processes.push(frontendProcess);

  // Wait for frontend to be healthy
  log('⏳ Waiting for frontend to be ready...');
  const frontendReady = await waitForHealthCheck(`http://localhost:${FRONTEND_PORT}`, 30000);

  if (!frontendReady) {
    log('❌ Frontend failed to become ready', 'error');
    return false;
  }

  return true;
}

async function runPlaywrightTests() {
  log('🎭 Running Playwright E2E tests...');

  const success = runCommand(
    'npx playwright test --project=chromium --workers=1',
    join(ROOT_DIR, 'frontend', FRONTEND_APP),
    'Run Playwright tests',
    {
      env: {
      BASE_URL: `http://localhost:${FRONTEND_PORT}`,
      E2E_API_URL: `http://localhost:${BACKEND_PORT}`,
      TEST_ADMIN_EMAIL: process.env.E2E_ADMIN_EMAIL || 'admin@uberfoods.com',
      TEST_ADMIN_PASSWORD: process.env.E2E_ADMIN_PASSWORD || 'admin123',
      E2E_RUN_AUTH: 'true',
      E2E_RUN_API: 'true',
      E2E_ORCHESTRATED: '1' // Disable Playwright webServer since run-e2e orchestrates
      }
    }
  );

  return success;
}

async function cleanup() {
  log('🧹 Cleaning up...');

  // Stop processes
  processes.forEach(proc => {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /PID ${proc.pid} /T /F`, { stdio: 'pipe' });
      } else {
        proc.kill('SIGTERM');
      }
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  // Stop database
  runCommand(
    'docker compose -f docker/e2e/docker-compose.e2e.yml down',
    ROOT_DIR,
    'Stop E2E database'
  );

  log('✅ Cleanup complete');
}

async function main() {
  log('🚀 Starting Complete E2E Test Pipeline');

  try {
    // 1. Start database
    if (!(await startDatabase())) {
      throw new Error('Database startup failed');
    }

    // 2. Reset and seed database
    if (!(await resetAndSeedDatabase())) {
      throw new Error('Database reset/seed failed');
    }

    // 3. Start backend
    if (!(await startBackend())) {
      throw new Error('Backend startup failed');
    }

    // 4. Start frontend
    if (!(await startFrontend())) {
      throw new Error('Frontend startup failed');
    }

    // 5. Run tests
    const testSuccess = await runPlaywrightTests();

    if (testSuccess) {
      log('🎉 E2E tests passed!', 'success');
      process.exitCode = 0;
    } else {
      log('❌ E2E tests failed', 'error');
      process.exitCode = 1;
    }

  } catch (error) {
    log(`💥 E2E pipeline failed: ${error.message}`, 'error');
    process.exitCode = 1;
  } finally {
    await cleanup();
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  log('Received SIGINT, cleaning up...');
  await cleanup();
  process.exit(1);
});

process.on('SIGTERM', async () => {
  log('Received SIGTERM, cleaning up...');
  await cleanup();
  process.exit(1);
});

main().catch(error => {
  log(`Script failed: ${error.message}`, 'error');
  cleanup().finally(() => process.exit(1));
});
