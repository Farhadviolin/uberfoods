// Script to update admin panel configuration
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../frontend/admin-panel/.env.local');

try {
  // Read current env file
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update API URL
  envContent = envContent.replace(
    /VITE_API_URL=.*/,
    'VITE_API_URL=http://localhost:3005/api'
  );

  // Write back
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Admin-Panel Konfiguration aktualisiert: API_URL -> localhost:3005');

} catch (error) {
  console.error('❌ Fehler beim Aktualisieren der Konfiguration:', error.message);
}