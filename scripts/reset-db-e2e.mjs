#!/usr/bin/env node

/**
 * Database Reset for E2E Tests
 *
 * Ensures clean, deterministic database state for E2E test runs.
 * - Resets database schema
 * - Seeds with test data
 * - Optimized for fast E2E cycles
 */

import { execSync, spawn } from 'child_process';
import { backendRoot, loadEnvFile, resolveBin, getCwdInfo } from './_lib/paths.mjs';
import { createWriteStream, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

// Load E2E environment variables deterministically
const envPath = `${backendRoot}/.env.e2e`;
const envVars = loadEnvFile(envPath);
// Preserve critical environment variables that were passed from parent process
const prismaConsent = process.env.PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION;
Object.assign(process.env, envVars);
// Restore critical variables that may have been overridden
if (prismaConsent) {
  process.env.PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION = prismaConsent;
}

// Log effective environment for E2E
const envEffectiveLog = join(process.cwd(), 'artifacts', 'e2e-customer', 'env-effective.log');
const envLog = [
  `Timestamp: ${new Date().toISOString()}`,
  `Script: reset-db-e2e.mjs`,
  `NODE_ENV: ${process.env.NODE_ENV}`,
  `DATABASE_URL: ${process.env.DATABASE_URL}`,
  `DEFAULT_DRIVER_PASSWORD: ${process.env.DEFAULT_DRIVER_PASSWORD ? 'SET' : 'NOT SET'}`,
  `Env file loaded: .env.e2e (${Object.keys(envVars).length} vars)`,
  `---`
].join('\n');

writeFileSync(envEffectiveLog, envLog, { flag: 'a' }); // append

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found after loading .env.e2e');
  console.error(`Expected path: ${envPath}`);
  process.exit(1);
}

// Initialize log file
const logFilePath = join(process.cwd(), 'artifacts', 'e2e-customer', 'seed-run.log');
const logStream = createWriteStream(logFilePath, { flags: 'w' });

// Enhanced logging function that writes to both console and file
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };
  const logLine = `[${timestamp}] ${message}`;
  console.log(`${colors[type]}${logLine}${colors.reset}`);
  logStream.write(`${logLine}\n`);
}

// SAFETY: Hard-preflight to prevent accidental production database reset
function validateE2EDatabaseSafety() {
  const databaseUrl = process.env.DATABASE_URL;

  try {
    const url = new URL(databaseUrl);

    // ENHANCED SAFETY: Strict validation for E2E databases
    const safeHosts = ['localhost', '127.0.0.1', 'postgres-e2e', 'uberfoods-postgres-e2e'];
    const isSafeHost = safeHosts.includes(url.hostname);

    // Require database name contains "e2e" (case-insensitive)
    const dbName = url.pathname.substring(1); // Remove leading slash
    const isSafeDatabase = dbName.toLowerCase().includes('e2e');

    if (!isSafeHost) {
      console.error('🚨 SAFETY VIOLATION: Database host is not allowed for E2E operations!');
      console.error('');
      console.error('Database URL:', databaseUrl.replace(/:[^:]+@/, ':***@')); // Hide password
      console.error('Host:', url.hostname);
      console.error('');
      console.error('E2E database host must be one of:');
      console.error('  - localhost');
      console.error('  - 127.0.0.1');
      console.error('  - postgres-e2e (Docker service name)');
      console.error('  - uberfoods-postgres-e2e (Docker container name)');
      console.error('');
      console.error('This script is designed ONLY for E2E testing databases.');
      console.error('Refusing to proceed to prevent accidental production data loss.');
      process.exit(1);
    }

    if (!isSafeDatabase) {
      console.error('🚨 SAFETY VIOLATION: Database name does not indicate E2E environment!');
      console.error('');
      console.error('Database URL:', databaseUrl.replace(/:[^:]+@/, ':***@')); // Hide password
      console.error('Database name:', dbName);
      console.error('');
      console.error('E2E database name must contain "e2e" (case-insensitive).');
      console.error('Example: uberfoods_e2e, myapp_e2e, test_e2e_db');
      console.error('');
      console.error('This script is designed ONLY for E2E testing databases.');
      console.error('Refusing to proceed to prevent accidental production data loss.');
      process.exit(1);
    }

    log('✅ Enhanced database safety check passed - targeting E2E environment');
    log(`   Host: ${url.hostname}, Database: ${dbName}`);
  } catch (error) {
    console.error('❌ Failed to parse DATABASE_URL for safety check');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Check for Prisma AI consent
function validatePrismaAIConsent() {
  const consent = process.env.PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION;
  log(`🔍 Prisma AI consent check: ${consent ? 'SET' : 'NOT SET'}`, 'info');

  if (!consent) {
    console.error('🚨 PRISMA AI SAFETY: Consent required for dangerous database operations');
    console.error('');
    console.error('Prisma has detected this operation is being performed by an AI agent.');
    console.error('To proceed with database reset, you must explicitly consent.');
    console.error('');
    console.error('In Windows PowerShell, run:');
    console.error('  $env:PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION = "I explicitly consent to the database reset operation for E2E testing"');
    console.error('  node scripts/reset-db-e2e.mjs');
    console.error('');
    console.error('Or set as environment variable before running:');
    console.error('  set PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=I explicitly consent to the database reset operation for E2E testing');
    console.error('  node scripts/reset-db-e2e.mjs');
    console.error('');
    console.error('This operation will:');
    console.error('  - DROP ALL TABLES in the database');
    console.error('  - Recreate schema from migrations');
    console.error('  - Seed with test data');
    console.error('');
    console.error('Only proceed if you are certain this targets a development/E2E database.');
    process.exit(1);
  }

  log('✅ Prisma AI consent validated');
}

// Run safety checks
validateE2EDatabaseSafety();
validatePrismaAIConsent();


async function runCommand(command, args = [], cwd = backendRoot, description = '', timeoutMs = 180000) {
  const startTime = Date.now();
  try {
    log(`START: ${description || command} (cwd: ${cwd})`);

    // Use execSync instead of spawn for better Windows compatibility
    const fullCommand = `${command} ${args.join(' ')}`;
    log(`EXEC: ${fullCommand} (timeout: ${Math.round(timeoutMs/1000)}s)`);

    execSync(fullCommand, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '0', CI: 'true', NODE_ENV: 'test' },
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    const duration = Date.now() - startTime;
    log(`END: ${description || command} (SUCCESS, ${duration}ms)`, 'success');
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`END: ${description || command} (FAILED, ${duration}ms) - ${error.message}`, 'error');
    return false;
  }
}

// Helper function to execute Prisma commands with EPERM retry logic
function executePrismaCommandWithRetry(command, cwd, timeoutMs = 180000) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      execSync(command, {
        cwd,
        stdio: 'inherit',
        env: { ...process.env, FORCE_COLOR: '0', CI: 'true', NODE_ENV: 'test' },
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024
      });
      return true; // Success
    } catch (error) {
      lastError = error;
      const errorMessage = error.message || '';

      // Check if this is an EPERM unlink error on the Windows query engine DLL
      const isWindowsEpermUnlink = errorMessage.includes('EPERM') &&
                                   errorMessage.includes('unlink') &&
                                   errorMessage.includes('query_engine-windows.dll.node');

      if (isWindowsEpermUnlink && attempt < 3) {
        log(`EPERM detected on query_engine-windows.dll.node (attempt ${attempt}/3), retrying in 2000ms...`, 'error');
        // Wait 2000ms before retry
        execSync('timeout /t 2 /nobreak > nul', { stdio: 'inherit' });
        continue;
      }

      // If not an EPERM error or we've exhausted retries, re-throw
      if (!isWindowsEpermUnlink || attempt >= 3) {
        throw error;
      }
    }
  }

  // If we get here, all retries failed
  throw lastError;
}

// Special function for database reset with schema creation
function runDatabaseReset(cwd = backendRoot, description = 'Database reset and schema creation') {
  const startTime = Date.now();
  log(`START: ${description} (cwd: ${cwd})`);

  // Use absolute schema path for reliability
  const schemaPath = join(cwd, 'prisma', 'schema.prisma');

  // Use db push which creates schema from Prisma schema (not migrations)
  const command = `npx prisma db push --force-reset --skip-generate --schema="${schemaPath}"`;
  log(`EXEC: ${command} (timeout: 180s)`);

  try {
    executePrismaCommandWithRetry(command, cwd, 180000);

    const duration = Date.now() - startTime;
    log(`END: ${description} (SUCCESS, ${duration}ms)`, 'success');
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`END: ${description} (FAILED, ${duration}ms) - ${error.message}`, 'error');
    return false;
  }
}

// Function to get E2E compose file path (from ROOT_DIR, not process.cwd)
function getE2EComposeFile() {
  const scriptDir = dirname(__filename);
  const rootDir = dirname(scriptDir); // Go up one level from scripts/
  return join(rootDir, 'docker', 'e2e', 'docker-compose.e2e.yml');
}

// Function to check if docker compose service is available
function checkComposeServiceAvailable(composeFile, serviceName) {
  try {
    execSync(`docker compose -f "${composeFile}" ps -q ${serviceName}`, {
      encoding: 'utf8',
      timeout: 5000,
      stdio: 'pipe'
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Function to check database connectivity using docker compose
function checkDatabaseConnectivity() {
  const startTime = Date.now();
  log('🔍 Checking database connectivity...');

  const composeFile = getE2EComposeFile();
  const serviceName = 'postgres-e2e';

  // Check if service is available first
  if (!checkComposeServiceAvailable(composeFile, serviceName)) {
    log('❌ E2E database service not available via docker compose', 'error');
    log(`💡 Check if docker compose -f "${composeFile}" is running`, 'error');
    return false;
  }

  try {
    // Use docker compose exec instead of hardcoded container names
    execSync(`docker compose -f "${composeFile}" exec -T ${serviceName} pg_isready -U uberfoods -d uberfoods_e2e`, {
      timeout: 10000, // 10 seconds
      stdio: 'inherit'
    });

    const duration = Date.now() - startTime;
    log(`✅ Database connectivity confirmed (${duration}ms)`, 'success');
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`❌ Database connectivity check failed (${duration}ms): ${error.message}`, 'error');
    log('💡 Ensure E2E database is running and healthy', 'error');
    return false;
  }
}

// Simple seeding function using external script
function runDirectSqlSeeding() {
  const startTime = Date.now();
  log('START: Simple database seeding');

  try {
    // Use the simple seeder script
    execSync('node scripts/simple-seed.mjs', {
      stdio: 'inherit',
      cwd: process.cwd(),
      timeout: 60000 // 60 seconds
    });

    const duration = Date.now() - startTime;
    log(`END: Simple database seeding (SUCCESS, ${duration}ms)`, 'success');
    return true;

  } catch (error) {
    const duration = Date.now() - startTime;
    log(`END: Simple database seeding (FAILED, ${duration}ms) - ${error.message}`, 'error');
    return false;
  }
}

// Enhanced generate function with EPERM retry logic
function runPrismaGenerateWithRetry(cwd = backendRoot, description = 'Generate Prisma client') {
  const startTime = Date.now();
  log(`START: ${description} (with EPERM retry)`);

  let lastError;
  const maxRetries = 5;
  const baseDelay = 2000; // 2 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(`Attempt ${attempt}/${maxRetries}: Running prisma generate...`);

      // Clean up problematic files before each attempt
      try {
        execSync('cmd /c "if exist node_modules\\.prisma\\client rmdir /s /q node_modules\\.prisma\\client 2>nul"', {
          cwd,
          stdio: 'pipe'
        });
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      const schemaPath = join(cwd, 'prisma', 'schema.prisma');
      execSync(`npx prisma generate --schema="${schemaPath}"`, {
        cwd,
        stdio: 'inherit',
        env: { ...process.env, FORCE_COLOR: '0', CI: 'true', NODE_ENV: 'test' },
        timeout: 60000 // 60 seconds
      });

      const duration = Date.now() - startTime;
      log(`END: ${description} (SUCCESS on attempt ${attempt}, ${duration}ms)`, 'success');
      return true;

    } catch (error) {
      lastError = error;
      const errorMessage = error.message || '';

      const isEpermError = errorMessage.includes('EPERM') ||
                          errorMessage.includes('permission denied') ||
                          errorMessage.includes('access denied');

      if (isEpermError && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        log(`EPERM error detected (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`, 'error');
        execSync(`timeout /t ${Math.ceil(delay / 1000)} /nobreak > nul`, { stdio: 'inherit' });
        continue;
      }

      // If not an EPERM error or we've exhausted retries, fail
      const duration = Date.now() - startTime;
      log(`END: ${description} (FAILED after ${attempt} attempts, ${duration}ms) - ${error.message}`, 'error');
      return false;
    }
  }

  // If we get here, all retries failed
  const duration = Date.now() - startTime;
  log(`END: ${description} (FAILED after ${maxRetries} attempts, ${duration}ms) - ${lastError.message}`, 'error');
  return false;
}

// Function to verify core tables exist after Prisma reset
function verifyCoreTablesExist() {
  const startTime = Date.now();
  log('🔍 Verifying core database tables exist...');

  const composeFile = getE2EComposeFile();
  const serviceName = 'postgres-e2e';

  // Core tables that should exist for E2E tests
  const coreTables = ['restaurants', 'customers', 'orders', 'admins'];

  try {
    for (const table of coreTables) {
      execSync(`docker compose -f "${composeFile}" exec -T ${serviceName} psql -U uberfoods -d uberfoods_e2e -c "SELECT 1 FROM ${table} LIMIT 1;"`, {
        timeout: 10000,
        stdio: 'pipe'
      });
      log(`✅ Table '${table}' verified`, 'success');
    }

    const duration = Date.now() - startTime;
    log(`✅ All core tables verified (${duration}ms)`, 'success');
    return true;

  } catch (error) {
    const duration = Date.now() - startTime;
    log(`❌ Table verification failed (${duration}ms): ${error.message}`, 'error');
    log('💡 Tables may not exist after Prisma reset - will apply SQL fallback', 'warning');
    return false;
  }
}

// Function to apply create-tables.sql fallback
function applySqlFallback() {
  const startTime = Date.now();
  log('📄 Applying create-tables.sql fallback...');

  const composeFile = getE2EComposeFile();
  const serviceName = 'postgres-e2e';
  const sqlFilePath = join(process.cwd(), 'scripts', 'create-tables.sql');

  try {
    // Check if SQL file exists
    if (!existsSync(sqlFilePath)) {
      log(`❌ create-tables.sql not found at ${sqlFilePath}`, 'error');
      return false;
    }

    // Apply the SQL file
    const localSqlPath = join(process.cwd(), 'scripts', 'create-tables.sql');
    const containerSqlPath = `/tmp/create-tables.sql`;
    execSync(`docker compose -f "${composeFile}" cp "${localSqlPath}" ${serviceName}:${containerSqlPath}`, {
      timeout: 30000,
      stdio: 'inherit',
      cwd: process.cwd()
    });
    execSync(`docker compose -f "${composeFile}" exec -T ${serviceName} psql -U uberfoods -d uberfoods_e2e -f ${containerSqlPath}`, {
      timeout: 30000, // 30 seconds
      stdio: 'inherit',
      cwd: process.cwd()
    });

    const duration = Date.now() - startTime;
    log(`✅ SQL fallback applied successfully (${duration}ms)`, 'success');
    return true;

  } catch (error) {
    const duration = Date.now() - startTime;
    log(`❌ SQL fallback failed (${duration}ms): ${error.message}`, 'error');
    return false;
  }
}

async function main() {
  log('🗑️ Resetting database for E2E tests...');
  const isCiMode = process.env.CI === 'true';

  // 0. Check database connectivity first
  if (!checkDatabaseConnectivity()) {
    process.exit(1);
  }

  let prismaSuccess = false;
  let tablesExist = false;
  let sqlFallbackSuccess = false;

  // 1. Prisma first (push/migrate) - Enterprise-tolerant DB bootstrap policy
  log('🔄 Phase 1: Attempting Prisma schema push...');
  const resetSuccess = runDatabaseReset(backendRoot, 'Prisma schema push');

  if (resetSuccess) {
    log('✅ Phase 1: Prisma schema push succeeded');
    prismaSuccess = true;
  } else {
    log('❌ Phase 1: Prisma schema push failed', 'error');
    if (isCiMode) {
      log('💡 In CI mode: Prisma failure logged - will attempt SQL fallback', 'warning');
    } else {
      log('💡 In local mode: Prisma failure logged - will attempt SQL fallback', 'warning');
    }
  }

  // 2. Verify core tables exist
  log('🔍 Phase 2: Verifying core database tables exist...');
  tablesExist = verifyCoreTablesExist();

  if (tablesExist) {
    log('✅ Phase 2: Core tables verified successfully');
  } else {
    log('❌ Phase 2: Core tables verification failed', 'error');
  }

  // 3. IF table verification fails -> apply scripts/create-tables.sql fallback
  if (!tablesExist) {
    log('📄 Phase 3: Applying SQL fallback create-tables.sql...');
    sqlFallbackSuccess = applySqlFallback();

    if (sqlFallbackSuccess) {
      log('✅ Phase 3: SQL fallback applied successfully');
    } else {
      log('❌ Phase 3: SQL fallback failed or file not found', 'error');

      // CRITICAL: In CI mode, if both Prisma AND SQL fallback fail -> hard fail
      if (isCiMode) {
        log('💥 CI MODE HARD FAIL: Both Prisma and SQL fallback failed!', 'error');
        log('   This indicates a critical database setup issue.', 'error');
        log('   Check that scripts/create-tables.sql exists and is valid.', 'error');
        logStream.end();
        process.exit(1);
      } else {
        log('⚠️ Local mode: Continuing despite SQL fallback failure - seeding may fail', 'warning');
      }
    }
  } else {
    log('✅ Phase 3: SQL fallback not needed (tables exist)');
  }

  // 4. Generate Prisma client to match reset schema (with EPERM retry)
  log('🔧 Phase 4: Generating Prisma client...');
  const generateSuccess = runPrismaGenerateWithRetry(backendRoot, 'Generate Prisma client');

  if (generateSuccess) {
    log('✅ Phase 4: Prisma client generated successfully');
  } else {
    log('⚠️ Phase 4: Prisma client generation failed after retries (non-critical, continuing)', 'warning');
  }

  // 5. Seed data - final phase
  log('🌱 Phase 5: Running database seeding...');
  const seedSuccess = runDirectSqlSeeding();

  if (!seedSuccess) {
    log('❌ Phase 5: Database seeding failed - E2E tests cannot proceed', 'error');

    // Provide detailed diagnostics for seeding failure
    log('🔍 Seeding failure diagnostics:', 'error');
    log(`   - Prisma success: ${prismaSuccess}`, prismaSuccess ? 'success' : 'error');
    log(`   - Tables exist: ${tablesExist}`, tablesExist ? 'success' : 'error');
    log(`   - SQL fallback: ${sqlFallbackSuccess}`, sqlFallbackSuccess ? 'success' : 'error');

    logStream.end();
    process.exit(1);
  }

  log('✅ Phase 5: Database seeding completed successfully');
  log('🎉 Database reset complete - ready for E2E tests', 'success');

  // Enterprise bootstrap summary
  log('📊 Enterprise DB Bootstrap Summary:', 'info');
  log(`   Prisma Schema Push: ${prismaSuccess ? '✅' : '❌'}`, prismaSuccess ? 'success' : 'error');
  log(`   Core Tables Verified: ${tablesExist ? '✅' : '❌'}`, tablesExist ? 'success' : 'error');
  log(`   SQL Fallback Applied: ${sqlFallbackSuccess ? '✅' : '❌'}`, sqlFallbackSuccess ? 'success' : 'error');
  log(`   Prisma Client Generated: ${generateSuccess ? '✅' : '❌'}`, generateSuccess ? 'success' : 'error');
  log(`   Database Seeded: ${seedSuccess ? '✅' : '❌'}`, seedSuccess ? 'success' : 'error');

  // Close log stream and exit successfully
  logStream.end();
  process.exit(0);
}

main().catch(error => {
  log(`Script failed: ${error.message}`, 'error');
  logStream.end();
  process.exit(1);
}).finally(() => {
  logStream.end();
});
