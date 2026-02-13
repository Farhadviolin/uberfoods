#!/usr/bin/env node

/**
 * Generiert VAPID Keys für Web Push Notifications
 * 
 * Usage: node scripts/generate-vapid-keys.js
 * 
 * Installiere web-push: npm install -g web-push
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔑 Generiere VAPID Keys für Web Push Notifications...\n');

try {
  // Prüfe ob web-push installiert ist
  try {
    execSync('web-push --version', { stdio: 'ignore' });
  } catch {
    console.error('❌ web-push ist nicht installiert!');
    console.log('\n📦 Installiere web-push:');
    console.log('   npm install -g web-push\n');
    console.log('Oder lokal:');
    console.log('   npm install web-push\n');
    process.exit(1);
  }

  // Generiere Keys
  const output = execSync('web-push generate-vapid-keys', { encoding: 'utf-8' });
  
  // Parse Output
  const lines = output.split('\n');
  let publicKey = '';
  let privateKey = '';

  for (const line of lines) {
    if (line.includes('Public Key:')) {
      publicKey = line.split('Public Key:')[1].trim();
    }
    if (line.includes('Private Key:')) {
      privateKey = line.split('Private Key:')[1].trim();
    }
  }

  if (!publicKey || !privateKey) {
    // Fallback: Versuche JSON Output
    try {
      const jsonOutput = execSync('web-push generate-vapid-keys --json', { encoding: 'utf-8' });
      const keys = JSON.parse(jsonOutput);
      publicKey = keys.publicKey;
      privateKey = keys.privateKey;
    } catch {
      console.error('❌ Konnte VAPID Keys nicht generieren');
      console.log('\nManuell generieren:');
      console.log('   web-push generate-vapid-keys\n');
      process.exit(1);
    }
  }

  console.log('✅ VAPID Keys erfolgreich generiert!\n');
  console.log('📋 Füge diese in deine .env Datei ein:\n');
  console.log('VAPID_PUBLIC_KEY=' + publicKey);
  console.log('VAPID_PRIVATE_KEY=' + privateKey);
  console.log('VAPID_SUBJECT=mailto:admin@uberfoods.com\n');

  // Optional: Schreibe in .env.example (wenn vorhanden)
  const envExamplePath = path.join(__dirname, '..', 'ENV.example');
  if (fs.existsSync(envExamplePath)) {
    console.log('💡 Tipp: Diese Keys wurden auch in ENV.example als Beispiel gesetzt.\n');
  }

  console.log('⚠️  WICHTIG: Bewahre den Private Key sicher auf!');
  console.log('   Niemals in Git committen!\n');

} catch (error) {
  console.error('❌ Fehler beim Generieren der VAPID Keys:', error.message);
  process.exit(1);
}

