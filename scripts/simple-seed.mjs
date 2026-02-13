#!/usr/bin/env node

/**
 * Simple database seeder that bypasses Prisma client issues
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

console.log('🌱 Starting simple database seeding...');

// Get compose file and service name
const scriptDir = dirname(__filename);
const rootDir = dirname(scriptDir);
const composeFile = join(rootDir, 'docker', 'e2e', 'docker-compose.e2e.yml');
const serviceName = 'postgres-e2e';

// Simple SQL to insert minimal restaurant data - using actual column names from schema
const sql = "INSERT INTO restaurants (id, name, email, address, status, \\\"isActive\\\", \\\"createdAt\\\", \\\"updatedAt\\\") VALUES ('rest_001', 'Pizza Palace', 'restaurant@uberfoods.local', '123 Main St, Berlin', 'OPEN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP); INSERT INTO dishes (id, \\\"restaurantId\\\", name, description, price, category, \\\"isAvailable\\\", \\\"isActive\\\", \\\"createdAt\\\", \\\"updatedAt\\\") VALUES ('dish_001', 'rest_001', 'Margherita Pizza', 'Classic pizza with tomatoes, mozzarella and basil', 12.99, 'Pizza', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);"

try {
  // Optional: Query actual columns for debugging (read-only)
  console.log('Checking restaurants table columns for debugging...');
  const columnCheckCmd = 'docker compose -f "' + composeFile + '" exec -T ' + serviceName + ' psql -U uberfoods -d uberfoods_e2e -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'restaurants\' ORDER BY ordinal_position;"';
  try {
    const columns = execSync(columnCheckCmd, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log('Restaurants table columns:');
    console.log(columns);
  } catch (columnError) {
    console.log('⚠️ Could not check columns (non-critical):', columnError.message);
  }

  console.log('Executing SQL insert...');
  // Use ON_ERROR_STOP=1 to fail on first error
  const insertCmd = 'docker compose -f "' + composeFile + '" exec -T ' + serviceName + ' psql -U uberfoods -d uberfoods_e2e -v ON_ERROR_STOP=1 -c "' + sql + '"';
  execSync(insertCmd, {
    stdio: 'inherit'
  });
  console.log('✅ Seeding completed successfully');
  process.exit(0);
} catch (error) {
  console.error('❌ Seeding failed:', error.message);
  console.error('Command was:', 'docker compose -f "' + composeFile + '" exec -T ' + serviceName + ' psql -U uberfoods -d uberfoods_e2e -v ON_ERROR_STOP=1 -c "' + sql + '"');
  process.exit(1);
}