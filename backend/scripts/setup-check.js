#!/usr/bin/env node

/**
 * Automatischer Setup-Checker
 * Prüft ob alle notwendigen Services konfiguriert sind
 * 
 * Usage: node scripts/setup-check.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 UberFoods Setup-Checker');
console.log('==========================\n');

let allGood = true;
const checks = [];

// 1. Prüfe ob .env existiert
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env Datei nicht gefunden!');
  console.log('   Lösung: cp ENV.example .env\n');
  allGood = false;
  checks.push({ name: '.env Datei', status: 'missing' });
} else {
  console.log('✅ .env Datei vorhanden');
  checks.push({ name: '.env Datei', status: 'ok' });
}

// 2. Prüfe Environment-Variablen
console.log('\n📋 Validiere Environment-Variablen...');
try {
  execSync('node scripts/validate-env.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  checks.push({ name: 'Environment-Variablen', status: 'ok' });
} catch (error) {
  allGood = false;
  checks.push({ name: 'Environment-Variablen', status: 'errors' });
}

// 3. Prüfe ob Node Modules installiert sind
console.log('\n📦 Prüfe Dependencies...');
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.warn('⚠️  node_modules nicht gefunden');
  console.log('   Lösung: npm install\n');
  checks.push({ name: 'Dependencies', status: 'missing' });
} else {
  console.log('✅ Dependencies installiert');
  checks.push({ name: 'Dependencies', status: 'ok' });
}

// 4. Prüfe Prisma
console.log('\n🗄️  Prüfe Prisma...');
const prismaClientPath = path.join(__dirname, '..', 'node_modules', '.prisma');
if (!fs.existsSync(prismaClientPath)) {
  console.warn('⚠️  Prisma Client nicht generiert');
  console.log('   Lösung: npx prisma generate\n');
  checks.push({ name: 'Prisma Client', status: 'missing' });
} else {
  console.log('✅ Prisma Client generiert');
  checks.push({ name: 'Prisma Client', status: 'ok' });
}

// 5. Prüfe ob Datenbank-Migrationen ausgeführt wurden
console.log('\n🔄 Prüfe Datenbank-Migrationen...');
try {
  // Versuche Prisma Status zu prüfen (vereinfacht)
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  if (fs.existsSync(schemaPath)) {
    console.log('✅ Prisma Schema vorhanden');
    console.log('   Tipp: Führe aus: npx prisma migrate deploy');
    checks.push({ name: 'Datenbank-Migrationen', status: 'check_manually' });
  }
} catch (error) {
  console.warn('⚠️  Konnte Migrationen nicht prüfen');
  checks.push({ name: 'Datenbank-Migrationen', status: 'unknown' });
}

// 6. Prüfe Upload-Verzeichnisse
console.log('\n📁 Prüfe Upload-Verzeichnisse...');
const uploadDirs = [
  'uploads/restaurants',
  'uploads/dishes',
  'uploads/reviews',
  'uploads/drivers',
  'uploads/invoices',
];

let uploadDirsOk = true;
uploadDirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`   ✅ ${dir} erstellt`);
    } catch (error) {
      console.warn(`   ⚠️  ${dir} konnte nicht erstellt werden`);
      uploadDirsOk = false;
    }
  }
});

if (uploadDirsOk) {
  checks.push({ name: 'Upload-Verzeichnisse', status: 'ok' });
} else {
  checks.push({ name: 'Upload-Verzeichnisse', status: 'warnings' });
}

// Zusammenfassung
console.log('\n' + '='.repeat(50));
console.log('📊 Setup-Check Zusammenfassung:\n');

checks.forEach(check => {
  const icon = check.status === 'ok' ? '✅' : check.status === 'missing' ? '❌' : '⚠️';
  console.log(`${icon} ${check.name}: ${check.status}`);
});

console.log('\n' + '='.repeat(50));

if (allGood) {
  console.log('\n✅ Setup sieht gut aus!');
  console.log('\n📋 Nächste Schritte:');
  console.log('   1. Setze alle Environment-Variablen in .env');
  console.log('   2. Konfiguriere externe Services (siehe PRODUCTION_SETUP.md)');
  console.log('   3. Führe aus: npm run start:dev');
  console.log('');
} else {
  console.log('\n⚠️  Einige Checks sind fehlgeschlagen.');
  console.log('   Bitte behebe die oben genannten Probleme.\n');
  process.exit(1);
}

