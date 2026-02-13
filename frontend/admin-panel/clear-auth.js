#!/usr/bin/env node

/**
 * Script zum Löschen der Admin Panel Authentifizierungsdaten
 * Kann im Browser-Konsole ausgeführt werden oder als Bookmarklet verwendet werden
 */

const authKeys = [
  'admin_token',
  'admin_refresh_token',
  'admin_user'
];

console.log('🔐 Admin Panel - Auth-Daten löschen');
console.log('=====================================');

let deleted = 0;
authKeys.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log(`✅ ${key} gelöscht`);
    deleted++;
  } else {
    console.log(`ℹ️  ${key} nicht gefunden`);
  }
});

if (deleted > 0) {
  console.log(`\n✅ ${deleted} Auth-Daten erfolgreich gelöscht!`);
  console.log('Bitte lade die Seite neu (F5)');
} else {
  console.log('\nℹ️  Keine Auth-Daten gefunden.');
}

// Für Browser-Konsole:
// Kopiere diesen Code in die Browser-Konsole (F12) auf http://localhost:3002

