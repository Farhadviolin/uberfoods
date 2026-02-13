#!/usr/bin/env node
/**
 * Backend-Verbindungs-Check Script
 * Prüft alle kritischen Verbindungen des Backends
 */

const http = require('http');
const https = require('https');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const checks = [];

const isLocalhost = (hostname) => ['localhost', '127.0.0.1', '::1'].includes(hostname);

// Helper: HTTP Request
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL);
    if (url.protocol !== 'https:' && !isLocalhost(url.hostname)) {
      return reject(new Error('Unsichere HTTP-Verbindung zu nicht-lokaler Adresse blockiert.'));
    }

    const client = url.protocol === 'https:' ? https : http;
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Check 1: Health Endpoint
async function checkHealth() {
  try {
    const result = await makeRequest('/api/health');
    if (result.status === 200 && result.data.status === 'ok') {
      checks.push({ name: 'Health Check', status: '✅ OK', details: result.data });
      return true;
    } else {
      checks.push({ name: 'Health Check', status: '❌ FAILED', details: result });
      return false;
    }
  } catch (error) {
    checks.push({ name: 'Health Check', status: '❌ ERROR', details: error.message });
    return false;
  }
}

// Check 2: Database Connection
async function checkDatabase() {
  try {
    const result = await makeRequest('/api/health/ready');
    if (result.status === 200 && result.data.status === 'ready') {
      checks.push({ name: 'Database Connection', status: '✅ OK', details: result.data });
      return true;
    } else {
      checks.push({ name: 'Database Connection', status: '❌ FAILED', details: result });
      return false;
    }
  } catch (error) {
    checks.push({ name: 'Database Connection', status: '❌ ERROR', details: error.message });
    return false;
  }
}

// Check 3: Test Endpoint (wenn verfügbar)
async function checkTestEndpoint() {
  try {
    const result = await makeRequest('/api/test/connection');
    checks.push({ name: 'Test Endpoint', status: '✅ OK', details: result.data });
    return true;
  } catch (error) {
    checks.push({ name: 'Test Endpoint', status: '⚠️  SKIPPED', details: 'Endpoint nicht verfügbar' });
    return true; // Nicht kritisch
  }
}

// Check 4: API Endpoints
async function checkAPIEndpoints() {
  const endpoints = [
    '/api/statistics/dashboard?period=7d',
    '/api/restaurants',
  ];
  
  let successCount = 0;
  for (const endpoint of endpoints) {
    try {
      const result = await makeRequest(endpoint);
      if (result.status === 200 || result.status === 401) { // 401 = Auth fehlt, aber Endpoint existiert
        successCount++;
      } else {
        checks.push({ name: `API: ${endpoint}`, status: '❌ FAILED', details: `Status: ${result.status}` });
      }
    } catch (error) {
      checks.push({ name: `API: ${endpoint}`, status: '❌ ERROR', details: error.message });
    }
  }
  
  checks.push({ 
    name: 'API Endpoints', 
    status: successCount === endpoints.length ? '✅ OK' : '⚠️  PARTIAL', 
    details: `${successCount}/${endpoints.length} erfolgreich` 
  });
  
  return successCount === endpoints.length;
}

// Main
async function runChecks() {
  console.log('🔍 Backend-Verbindungs-Check wird durchgeführt...\n');
  console.log(`📍 Backend URL: ${BACKEND_URL}\n`);
  
  const results = await Promise.all([
    checkHealth(),
    checkDatabase(),
    checkTestEndpoint(),
    checkAPIEndpoints(),
  ]);
  
  console.log('\n📊 Ergebnisse:\n');
  checks.forEach(check => {
    console.log(`${check.status} ${check.name}`);
    if (check.details && typeof check.details === 'object') {
      if (check.details.database) {
        console.log(`   Database: ${check.details.database.status}`);
      }
      if (check.details.status) {
        console.log(`   Status: ${check.details.status}`);
      }
    } else if (check.details) {
      console.log(`   Details: ${check.details}`);
    }
    console.log('');
  });
  
  const allPassed = results.every(r => r);
  const criticalPassed = results[0] && results[1]; // Health + Database
  
  console.log('\n' + '='.repeat(50));
  if (criticalPassed) {
    console.log('✅ KRITISCHE VERBINDUNGEN: OK');
  } else {
    console.log('❌ KRITISCHE VERBINDUNGEN: FEHLER');
    console.log('\n💡 Tipps:');
    console.log('   1. Prüfe ob Backend läuft: npm run start:dev');
    console.log('   2. Prüfe DATABASE_URL in .env');
    console.log('   3. Prüfe Backend-Logs für Details');
  }
  
  if (allPassed) {
    console.log('✅ ALLE CHECKS: BESTANDEN');
    process.exit(0);
  } else {
    console.log('⚠️  EINIGE CHECKS: FEHLGESCHLAGEN');
    process.exit(1);
  }
}

runChecks().catch(error => {
  console.error('❌ Fataler Fehler:', error);
  process.exit(1);
});

