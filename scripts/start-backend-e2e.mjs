#!/usr/bin/env node

/**
 * Cross-platform Backend E2E Starter
 * Eliminates shell-specific syntax issues by using pure Node.js
 */

import { execSync, spawn } from 'child_process';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');
const backendRoot = join(repoRoot, 'backend');

// Simple .env parser (no dependencies)
function parseEnvFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const env = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  }

  return env;
}

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️ ';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function maskDatabaseUrl(databaseUrl) {
  if (!databaseUrl) {
    return 'NOT SET';
  }

  try {
    const url = new URL(databaseUrl);
    if (url.password) {
      url.password = '***';
    }
    return url.toString();
  } catch {
    return 'SET (invalid URL format)';
  }
}

async function main() {
  log('Starting Backend E2E service...');

  try {
    // 1. Load E2E environment variables
    const envPath = join(backendRoot, '.env.e2e');
    let e2eEnvVars = {};

    if (existsSync(envPath)) {
      log(`Loading .env.e2e from ${envPath}`);
      e2eEnvVars = parseEnvFile(envPath);
      Object.assign(process.env, e2eEnvVars);
      log(`Loaded ${Object.keys(e2eEnvVars).length} environment variables`);
    } else if (process.env.CI === 'true') {
      log('No .env.e2e found; using CI environment variables.');
    } else {
      throw new Error(
        '.env.e2e not found. Create backend/.env.e2e locally from .env.e2e.example or use CI environment variables.'
      );
    }

    // E2E-only logging of effective environment
    const envEffectiveLog = join(repoRoot, 'artifacts', 'e2e-customer', 'env-effective.log');
    mkdirSync(dirname(envEffectiveLog), { recursive: true });
    const envLog = [
      `Timestamp: ${new Date().toISOString()}`,
      `NODE_ENV: ${process.env.NODE_ENV}`,
      `DATABASE_URL: ${maskDatabaseUrl(process.env.DATABASE_URL)}`,
      `DEFAULT_DRIVER_PASSWORD: ${process.env.DEFAULT_DRIVER_PASSWORD ? 'SET' : 'NOT SET'}`,
      `Environment source: ${existsSync(envPath) ? '.env.e2e' : 'CI process environment'}`,
      `---`
    ].join('\n');

    writeFileSync(envEffectiveLog, envLog);
    log(`E2E environment logged to ${envEffectiveLog}`);

    // 2. Set required environment variables
    process.env.NODE_ENV = 'e2e';
    process.env.CI = 'true';

    // 3. Ensure built application exists
    const mainFile = join(backendRoot, 'dist', 'main.e2e.js');
    if (!existsSync(mainFile)) {
      log('Building backend application...');
      execSync('npm run build:e2e', {
        cwd: backendRoot,
        stdio: 'inherit',
        env: process.env
      });
      log('Backend build completed');
    }

    // 4. Start the application
    log(`Starting E2E backend from ${mainFile}`);
    log(`DEFAULT_DRIVER_PASSWORD in parent: ${process.env.DEFAULT_DRIVER_PASSWORD ? 'SET' : 'NOT SET'}`);

    // Merge environment variables - set E2E-specific overrides
    const childEnv = {
      ...process.env,
      ...e2eEnvVars,
      NODE_ENV: 'e2e',  // Ensure E2E mode for main.ts
      APP_ENV: 'e2e'
    };

    // Pass through E2E debug flags
    if (process.env.E2E_AUTH_DEBUG) {
      childEnv.E2E_AUTH_DEBUG = process.env.E2E_AUTH_DEBUG;
      log(`E2E_AUTH_DEBUG: ${childEnv.E2E_AUTH_DEBUG}`);
    }

    log(`DEFAULT_DRIVER_PASSWORD in child env: ${childEnv.DEFAULT_DRIVER_PASSWORD ? 'SET' : 'NOT SET'}`);

    const child = spawn('node', [mainFile], {
      cwd: backendRoot,
      stdio: 'inherit',
      env: childEnv,
      detached: false
    });

    // Wait a bit for startup
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (child.exitCode !== null) {
      throw new Error(`Backend exited immediately with code ${child.exitCode}`);
    }

    log('Backend E2E service started successfully', 'success');

    // Keep the process running
    process.on('SIGINT', () => {
      log('Shutting down backend...');
      child.kill();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      log('Shutting down backend...');
      child.kill();
      process.exit(0);
    });

  } catch (error) {
    log(`Backend E2E startup failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
