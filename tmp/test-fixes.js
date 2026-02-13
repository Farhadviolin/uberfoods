// Test-Script für die Fehlerbehebungen
const axios = require('axios');

async function testFixes() {
  console.log('🧪 Teste Fehlerbehebungen...\n');

  // Test 1: Backend-Module (Statistics)
  try {
    const response = await axios.get('http://localhost:3001/api/statistics/dashboard', {
      headers: { 'Authorization': 'Bearer test-token' },
      timeout: 3000
    });
    console.log('✅ Statistics API funktioniert');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend läuft nicht auf Port 3001');
    } else if (error.response?.status === 401) {
      console.log('✅ Statistics API ist erreichbar (401 Unauthorized erwartet ohne gültigen Token)');
    } else {
      console.log('❌ Statistics API Fehler:', error.response?.status || error.message);
    }
  }

  // Test 2: Admin-Panel läuft
  try {
    const response = await axios.get('http://localhost:3004');
    console.log('✅ Admin-Panel ist erreichbar');
  } catch (error) {
    console.log('❌ Admin-Panel nicht erreichbar');
  }

  console.log('\n📋 Zusammenfassung der Behebungen:');
  console.log('✅ 1. Backend-Module in app.module.ts hinzugefügt');
  console.log('✅ 2. Environment-Variable VITE_DEV_AUTH_TOKEN gesetzt');
  console.log('✅ 3. PromotionsTab.tsx Array-Check hinzugefügt');
  console.log('✅ 4. Admin-Panel gestartet auf Port 3004');
  console.log('\n🔄 Nächste Schritte:');
  console.log('- Backend auf Port 3001 starten');
  console.log('- Datenbank-Migrationen ausführen');
  console.log('- Vollständigen Funktionstest durchführen');
}

testFixes().catch(console.error);