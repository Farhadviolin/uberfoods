const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

// Simple .env parser
function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
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

// Load .env.e2e
const repoRoot = process.cwd();
const envPath = path.join(repoRoot, 'backend', '.env.e2e');
console.log('Loading .env.e2e from:', envPath);

const envVars = parseEnvFile(envPath);
const password = envVars.E2E_CUSTOMER_PASSWORD || envVars.TEST_CUSTOMER_PASSWORD || 'TestPassword123!';

console.log('Password to test:', password);

async function testHash() {
  // Hash with same parameters as seeding
  const hash1 = await bcrypt.hash(password, 10);
  console.log('Hash with 10 rounds:', hash1.substring(0, 20) + '...');

  // Hash with 12 rounds (as used in some places)
  const hash2 = await bcrypt.hash(password, 12);
  console.log('Hash with 12 rounds:', hash2.substring(0, 20) + '...');

  // Test compare
  const isValid1 = await bcrypt.compare(password, hash1);
  const isValid2 = await bcrypt.compare(password, hash2);

  console.log('Compare with 10 rounds hash:', isValid1);
  console.log('Compare with 12 rounds hash:', isValid2);
}

testHash().catch(console.error);