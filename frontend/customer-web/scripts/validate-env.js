#!/usr/bin/env node

/**
 * Validiert Frontend Environment-Variablen
 * 
 * Usage: node scripts/validate-env.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validiere Frontend Environment-Variablen...\n');

const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', 'ENV.example');

// Prüfe ob .env existiert
if (!fs.existsSync(envPath)) {
  console.error('❌ .env Datei nicht gefunden!');
  console.log('\n📝 Erstelle .env aus ENV.example:');
  console.log('   cp ENV.example .env\n');
  process.exit(1);
}

// Lade .env Datei
const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');

// Parse Environment-Variablen
const envVars = {};
envLines.forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').replace(/^["']|["']$/g, '');
    envVars[key.trim()] = value.trim();
  }
});

let hasErrors = false;
let hasWarnings = false;

// Prüfe Core-Variablen
console.log('📋 Core-Konfiguration:');

const required = ['VITE_API_BASE_URL', 'VITE_WS_URL'];
required.forEach(key => {
  if (!envVars[key] || envVars[key].includes('localhost') && envVars[key].includes('3000')) {
    if (process.env.NODE_ENV === 'production') {
      console.error(`   ❌ ${key} - Muss Production URL sein!`);
      hasErrors = true;
    } else {
      console.log(`   ✅ ${key} - Gesetzt (Development)`);
    }
  } else {
    console.log(`   ✅ ${key} - Gesetzt`);
  }
});

// Prüfe Google Maps
console.log('\n📋 Services:');
if (envVars.VITE_GOOGLE_MAPS_API_KEY && !envVars.VITE_GOOGLE_MAPS_API_KEY.includes('Your')) {
  console.log('   ✅ Google Maps API Key - Gesetzt');
} else {
  console.warn('   ⚠️  Google Maps API Key - Nicht gesetzt (empfohlen)');
  hasWarnings = true;
}

// Prüfe Sentry
if (envVars.VITE_SENTRY_DSN && !envVars.VITE_SENTRY_DSN.includes('your_')) {
  console.log('   ✅ Sentry DSN - Gesetzt');
} else {
  console.warn('   ⚠️  Sentry DSN - Nicht gesetzt (optional)');
  hasWarnings = true;
}

// Zusammenfassung
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('\n❌ FEHLER: Einige erforderliche Variablen fehlen!');
  process.exit(1);
} else if (hasWarnings) {
  console.warn('\n⚠️  WARNUNG: Einige optionale Services sind nicht konfiguriert.');
  console.log('   Das System funktioniert, aber einige Features sind eingeschränkt.\n');
  process.exit(0);
} else {
  console.log('\n✅ ALLE Environment-Variablen sind korrekt konfiguriert!\n');
  process.exit(0);
}

