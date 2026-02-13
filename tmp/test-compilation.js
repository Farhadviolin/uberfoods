// Test script to check if the compilation error is fixed
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/admin-panel/src/components/RestaurantDetailsModal.tsx');

try {
  const content = fs.readFileSync(filePath, 'utf8');

  // Count addHoliday declarations
  const addHolidayMatches = content.match(/const addHoliday/g) || [];
  const functionMatches = content.match(/function.*addHoliday/g) || [];

  console.log('✅ Datei erfolgreich gelesen');
  console.log(`📊 addHoliday Deklarationen gefunden: ${addHolidayMatches.length}`);
  console.log(`📊 addHoliday Funktionsdeklarationen gefunden: ${functionMatches.length}`);

  if (addHolidayMatches.length === 1 && functionMatches.length === 0) {
    console.log('✅ KEINE doppelten addHoliday Deklarationen gefunden!');
    console.log('🎉 TypeScript-Kompilierungsfehler sollte behoben sein!');
  } else {
    console.log('❌ Noch immer doppelte Deklarationen gefunden!');
  }

  // Check for basic syntax
  const bracketCount = (content.match(/\{/g) || []).length - (content.match(/\}/g) || []).length;
  if (bracketCount === 0) {
    console.log('✅ Klammern sind ausgeglichen');
  } else {
    console.log(`❌ Klammern nicht ausgeglichen: ${bracketCount}`);
  }

} catch (error) {
  console.error('❌ Fehler beim Lesen der Datei:', error.message);
}