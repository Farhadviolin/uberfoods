# Admin Panel - Authentifizierung

## Auto-Login deaktivieren

Das Admin Panel hat standardmäßig **KEINEN** Auto-Login aktiviert. Du musst dich normal einloggen.

### Falls Auto-Login aktiviert ist:

1. **Prüfe Umgebungsvariablen:**
   - Erstelle eine `.env` Datei im `frontend/admin-panel` Verzeichnis
   - Stelle sicher, dass `VITE_SKIP_AUTH` NICHT gesetzt ist oder auf `false` steht

2. **Lösche gespeicherte Auth-Daten:**
   - Öffne `clear-auth.html` im Browser
   - Oder öffne die Browser-Konsole (F12) auf http://localhost:3002
   - Führe aus:
   ```javascript
   localStorage.removeItem('admin_token');
   localStorage.removeItem('admin_refresh_token');
   localStorage.removeItem('admin_user');
   location.reload();
   ```

## Standard-Login

- **Email:** admin@uberfoods.com (oder admin@UberFoods.com - funktioniert beides)
- **Passwort:** admin123

**Hinweis:** Die Email wird automatisch zu lowercase normalisiert, daher funktioniert sowohl `admin@uberfoods.com` als auch `admin@UberFoods.com`.

## Development Auto-Login (optional)

Falls du den Development Auto-Login aktivieren möchtest:

1. Erstelle `.env` Datei:
   ```
   VITE_SKIP_AUTH=true
   ```

2. Starte den Dev-Server neu

**WICHTIG:** Auto-Login funktioniert NUR in Development-Modus, niemals in Production!
