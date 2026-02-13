#!/usr/bin/env node

/**
 * Validiert Environment-Variablen für Production
 * 
 * Usage: node scripts/validate-env.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validiere Environment-Variablen...\n');

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

// Definiere erforderliche Variablen
const required = {
  core: [
    'DATABASE_URL',
    'JWT_SECRET',
  ],
  p0: [
    'STRIPE_SECRET_KEY',
    'GOOGLE_MAPS_API_KEY',
  ],
  p1: [
    // Optional aber empfohlen
  ],
};

// Definiere optionale aber empfohlene Variablen
const recommended = {
  email: ['SENDGRID_API_KEY', 'SMTP_HOST'],
  storage: ['AWS_S3_BUCKET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
  monitoring: ['SENTRY_DSN'],
  push: ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'],
};

// Prüfe Core-Variablen
console.log('📋 Core-Konfiguration:');
let hasErrors = false;
let hasWarnings = false;

required.core.forEach(key => {
  if (!envVars[key] || envVars[key].includes('your_') || envVars[key].includes('change-this')) {
    console.error(`   ❌ ${key} - FEHLT oder nicht gesetzt`);
    hasErrors = true;
  } else {
    console.log(`   ✅ ${key} - Gesetzt`);
  }
});

// Prüfe P0-Variablen
console.log('\n📋 P0 - Kritische Services:');
required.p0.forEach(key => {
  if (!envVars[key] || envVars[key].includes('your_') || envVars[key].includes('test_your')) {
    console.error(`   ❌ ${key} - FEHLT oder nicht gesetzt`);
    hasErrors = true;
  } else {
    console.log(`   ✅ ${key} - Gesetzt`);
  }
});

// Prüfe empfohlene Variablen
console.log('\n📋 P1 - Empfohlene Services:');

// Email Service
const hasEmail = recommended.email.some(key => 
  envVars[key] && !envVars[key].includes('your_')
);
if (hasEmail) {
  console.log('   ✅ Email Service - Konfiguriert');
} else {
  console.warn('   ⚠️  Email Service - Nicht konfiguriert (empfohlen)');
  hasWarnings = true;
}

// Storage Service
const hasStorage = recommended.storage.every(key => 
  envVars[key] && !envVars[key].includes('your_')
);
if (hasStorage) {
  console.log('   ✅ Cloud Storage (S3) - Konfiguriert');
} else {
  console.warn('   ⚠️  Cloud Storage (S3) - Nicht konfiguriert (verwendet lokales Storage)');
  hasWarnings = true;
}

// Monitoring
if (envVars.SENTRY_DSN && !envVars.SENTRY_DSN.includes('your_')) {
  console.log('   ✅ Error Tracking (Sentry) - Konfiguriert');
} else {
  console.warn('   ⚠️  Error Tracking (Sentry) - Nicht konfiguriert (empfohlen)');
  hasWarnings = true;
}

// Push Notifications
const hasVAPID = recommended.push.every(key => 
  envVars[key] && !envVars[key].includes('your_')
);
if (hasVAPID) {
  console.log('   ✅ Push Notifications (VAPID) - Konfiguriert');
} else {
  console.warn('   ⚠️  Push Notifications (VAPID) - Nicht konfiguriert (empfohlen)');
  hasWarnings = true;
}

// JWT Secret Validation
if (envVars.JWT_SECRET && envVars.JWT_SECRET.length < 32) {
  console.error('\n   ❌ JWT_SECRET ist zu kurz! Mindestens 32 Zeichen erforderlich.');
  hasErrors = true;
}

// Zusammenfassung
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('\n❌ FEHLER: Einige erforderliche Variablen fehlen!');
  console.log('\n📖 Siehe PRODUCTION_SETUP.md für detaillierte Anleitung\n');
  process.exit(1);
} else if (hasWarnings) {
  console.warn('\n⚠️  WARNUNG: Einige empfohlene Services sind nicht konfiguriert.');
  console.log('   Das System funktioniert, aber einige Features sind eingeschränkt.');
  console.log('\n📖 Siehe PRODUCTION_SETUP.md für Setup-Anleitung\n');
  process.exit(0);
} else {
  console.log('\n✅ ALLE Environment-Variablen sind korrekt konfiguriert!');
  console.log('   Das System ist bereit für Production!\n');
  process.exit(0);
}

