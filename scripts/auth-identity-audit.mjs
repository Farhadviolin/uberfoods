#!/usr/bin/env node

/**
 * Auth Identity Audit - Comprehensive Email Conflict Detection
 *
 * Analyzes all authentication tables for email conflicts and validates password matching.
 * Specifically designed to debug "Invalid credentials" issues by identifying which entity
 * validateUser() would actually match against.
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

// Simple .env parser
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

async function authIdentityAudit() {
// Load .env.e2e deterministically
const repoRoot = process.cwd();
const envPath = join(repoRoot, 'backend', '.env.e2e');
console.log('Loading .env.e2e from:', envPath);

// Also try to load from root if backend fails
let envVars;
try {
  envVars = parseEnvFile(envPath);
} catch (e) {
  console.log('Backend .env.e2e failed, trying root .env.e2e');
  envVars = parseEnvFile(join(repoRoot, '.env.e2e'));
}
const databaseUrl = envVars.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in .env.e2e');
  process.exit(1);
}

console.log('DATABASE_URL loaded (ends with):', databaseUrl.slice(-30));

// Load bcrypt for verification from backend node_modules
let bcrypt;
try {
  // Use createRequire to load from backend context (where node_modules is available)
  const backendRequire = createRequire(join(repoRoot, 'backend', 'package.json'));
  bcrypt = backendRequire('bcrypt');
  console.log('✅ Bcrypt loaded successfully from backend node_modules');
} catch (e) {
  console.log('❌ Cannot load bcrypt - will show hash info only');
  console.log('   Error:', e.message);
}

const prisma = new PrismaClient({
  datasourceUrl: databaseUrl
});

// Test email from ENV (normalized like AuthService does)
const testEmail = envVars.E2E_CUSTOMER_EMAIL || 'testcustomer@example.com';
const normalizedEmail = testEmail.toLowerCase().trim();

// Also try case-sensitive search
const caseSensitiveEmail = testEmail;

console.log('Test email from ENV:', testEmail);
console.log('Normalized email:', normalizedEmail);

// Expected password from ENV
const expectedPassword = envVars.E2E_CUSTOMER_PASSWORD || 'TestPassword123!';
console.log('Expected password (first 3 chars):', expectedPassword.substring(0, 3) + '...');

async function checkTable(tableName, query, includeAllFields = false) {
  try {
    const result = await query;
    if (result) {
      console.log(`✅ ${tableName} found:`);
      console.log(`   ID: ${result.id}`);
      console.log(`   Email: ${result.email}`);

      // Status flags (different models have different fields)
      if (result.isActive !== undefined) console.log(`   isActive: ${result.isActive}`);
      if (result.status) console.log(`   status: ${result.status}`);
      if (result.currentStatus) console.log(`   currentStatus: ${result.currentStatus}`);
      if (result.emailVerified !== undefined) console.log(`   emailVerified: ${result.emailVerified}`);

      // Password analysis
      const hasPassword = !!result.password;
      const looksLikeBcrypt = hasPassword && result.password.startsWith('$2');
      console.log(`   passwordFieldPresent: ${hasPassword}`);
      console.log(`   passwordHashLooksBcrypt: ${looksLikeBcrypt}`);

      if (hasPassword && bcrypt) {
        try {
          const isValid = await bcrypt.compare(expectedPassword, result.password);
          console.log(`   bcrypt/verify compare result: ${isValid}`);

          if (!isValid) {
            console.log(`   ❌ Password verification FAILED for ${tableName}`);
          } else {
            console.log(`   ✅ Password verification SUCCESS for ${tableName}`);
          }
        } catch (e) {
          console.log(`   ❌ Error during bcrypt.compare: ${e.message}`);
          console.log(`   password hash (first 20 chars): ${result.password.substring(0, 20)}...`);
          console.log(`   expected password (first 3 chars): ${expectedPassword.substring(0, 3)}...`);
        }
      } else if (hasPassword) {
        console.log(`   password hash (first 20 chars): ${result.password.substring(0, 20)}...`);
        console.log(`   expected password (first 3 chars): ${expectedPassword.substring(0, 3)}...`);
        console.log(`   ℹ️  Manual bcrypt.compare needed: bcrypt.compare("${expectedPassword}", "${result.password}")`);
      }

      // Additional fields if requested
      if (includeAllFields && result.createdAt) {
        console.log(`   createdAt: ${result.createdAt}`);
      }
    } else {
      console.log(`❌ ${tableName} not found`);
    }
    return result;
  } catch (error) {
    console.log(`❌ Error checking ${tableName}: ${error.message}`);
    return null;
  }
}

try {
  console.log('\n=== AUTH IDENTITY AUDIT ===');

  // Check all tables that validateUser might use
  const results = {};

  results.customer = await checkTable('Customer', prisma.customer.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      password: true,
      isActive: true,
      status: true,
      emailVerified: true,
      createdAt: true
    }
  }));

  // Also try case-sensitive search if normalized didn't work
  if (!results.customer) {
    console.log(`\n🔍 Trying case-sensitive search for: "${caseSensitiveEmail}"`);
    results.customer = await checkTable('Customer (case-sensitive)', prisma.customer.findUnique({
      where: { email: caseSensitiveEmail },
      select: {
        id: true,
        email: true,
        password: true,
        isActive: true,
        status: true,
        emailVerified: true,
        createdAt: true
      }
    }));
  }

  results.admin = await checkTable('Admin', prisma.admin.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, password: true, isActive: true, createdAt: true }
  }));

  results.restaurant = await checkTable('Restaurant', prisma.restaurant.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, password: true, status: true, createdAt: true }
  }));

  results.driver = await checkTable('Driver', prisma.driver.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, password: true, isActive: true, currentStatus: true, createdAt: true }
  }));

  // CONFLICT SUMMARY as requested
  console.log('\n=== CONFLICT SUMMARY ===');
  const foundInTables = Object.entries(results).filter(([table, result]) => result !== null);
  const conflictCount = foundInTables.length;
  const hasConflict = conflictCount > 1;

  console.log(`Email "${normalizedEmail}" found in ${conflictCount} table(s): ${foundInTables.map(([table]) => table).join(', ')}`);
  console.log(`CONFLICT=${hasConflict} (true if > 1 entity found)`);

  if (hasConflict) {
    console.log('⚠️  CRITICAL: Multiple entities with same email - validateUser will use first match');
    console.log('   This explains "Invalid credentials" - wrong entity type being validated');
  } else if (conflictCount === 0) {
    console.log('❌ CRITICAL: Email not found in any authentication table');
  } else {
    console.log('✅ CLEAN: Email found in exactly one table');
  }

  // Summary
  console.log('\n=== AUDIT SUMMARY ===');
  console.log(`Email "${normalizedEmail}" found in ${foundInTables.length} table(s): ${foundInTables.map(([table]) => table).join(', ')}`);

  if (foundInTables.length === 0) {
    console.log('❌ CRITICAL: Email not found in any authentication table');
  } else if (foundInTables.length > 1) {
    console.log('⚠️  WARNING: Email found in multiple tables - validateUser will use first match');
  }

  // Check which table validateUser would actually use
  console.log('\n=== VALIDATEUSER DECISION PATH ===');
  if (results.customer) {
    console.log('validateUser would use: Customer (auto-detected)');
  } else if (results.admin) {
    console.log('validateUser would use: Admin (role=admin)');
  } else if (results.restaurant) {
    console.log('validateUser would use: Restaurant (role=restaurant)');
  } else if (results.driver) {
    console.log('validateUser would use: Driver (role=driver)');
  } else {
    console.log('validateUser would fail: No matching user found');
  }

} finally {
  await prisma.$disconnect();
}
}

authIdentityAudit().catch(console.error);