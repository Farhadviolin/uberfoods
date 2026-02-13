# Backend-Endpoints Dokumentation für Driver-App

Diese Datei dokumentiert alle Backend-Endpoints, die von der Driver-App verwendet werden.

## Status-Legende
- ✅ **Implementiert**: Endpoint ist im Backend vorhanden
- ⚠️ **Teilweise**: Endpoint existiert, aber möglicherweise unvollständig
- ❌ **Fehlt**: Endpoint muss noch implementiert werden
- 🔄 **Fallback**: Frontend hat Fallback-Mechanismus

---

## Kritische Endpoints (P0 - Produktionsblocker)

### Authentifizierung
- ✅ `POST /auth/driver/login` - Driver Login (gibt jetzt `refresh_token` zurück)
- ✅ `POST /auth/refresh` - Token Refresh (generischer Endpoint für alle User-Typen)
- ✅ `GET /drivers/me` - Token-Validierung und Profil abrufen
- ✅ `PUT /drivers/{id}/location` - Standort aktualisieren
- ✅ `PUT /drivers/{id}/status` - Status ändern (online/offline/on_break)

### Bestellungen
- ✅ `GET /orders/driver/{driverId}` - Bestellungen für Driver abrufen
- ✅ `POST /orders/{orderId}/accept` - Bestellung annehmen
- ✅ `POST /orders/{orderId}/reject` - Bestellung ablehnen
- ✅ `PATCH /orders/{orderId}/status` - Bestellungsstatus aktualisieren
- ✅ `GET /orders/{orderId}` - Bestellung abrufen

### Geofencing & Check-in
- ✅ `POST /drivers/{id}/check-in/auto/{orderId}` - Automatischer Check-in
- ✅ `POST /drivers/{id}/check-in/restaurant/{orderId}` - Restaurant Check-in
- ✅ `POST /drivers/{id}/check-in/customer/{orderId}` - Customer Check-in
- 🔄 **Frontend-Fallback**: Echte Geofencing-Logik mit Haversine-Formel implementiert

---

## Wichtige Endpoints (P1 - Funktionalität)

### Verdienste
- ✅ `GET /drivers/{id}/earnings?period={day|week|month}` - Verdienste abrufen
- ✅ `GET /drivers/{id}/earnings/history?limit={n}` - Verdiensthistorie
- ✅ `POST /drivers/{id}/payouts/request` - Auszahlung anfordern

### ETA & Navigation
- ✅ `GET /drivers/{id}/eta/{orderId}` - ETA für Bestellung berechnen
- ✅ `POST /drivers/{id}/route/optimize-advanced` - ML-basierte Route-Optimierung
- 🔄 **Frontend-Fallback**: Lokale Route-Optimierung implementiert

### Chat
- ✅ `GET /api/chat/history/{orderId}` - Chat-Historie abrufen
- ✅ `POST /api/chat/message` - Nachricht senden
- ✅ **WebSocket**: Real-time Chat über Socket.IO implementiert

### Dokumente
- ✅ `GET /drivers/{id}/documents` - Dokumente abrufen
- ✅ `GET /drivers/{id}/documents/status` - Dokumentenstatus
- ✅ `POST /drivers/{id}/documents/upload` - Dokument hochladen
- ✅ `DELETE /drivers/{id}/documents/{documentId}` - Dokument löschen

### Fotos
- ✅ `POST /api/orders/{orderId}/photo` - Foto hochladen (FormData)

### Anrufe & SMS
- ✅ `POST /drivers/{id}/orders/{orderId}/call` - Anruf-Tracking
- ✅ `POST /drivers/{id}/orders/{orderId}/sms` - SMS-Tracking
- 🔄 **Frontend-Fallback**: Direkte Anrufe/SMS mit Fallback

---

## Erweiterte Features (P2 - Optional)

### Emergency Intelligence
- ✅ `GET /drivers/{id}/emergency/health` - Health Metrics
- ✅ `GET /drivers/{id}/emergency/vehicle` - Vehicle Diagnostics
- ✅ `POST /drivers/{id}/emergency/detect` - Notfall-Erkennung
- 🔄 **Frontend-Fallback**: Mock-Daten mit Warnungen (nur wenn Backend nicht verfügbar)

### Smart Acceptance (KI-Analyse)
- ✅ `POST /drivers/{id}/acceptance/analyze` - KI-basierte Bestellungsanalyse
- ✅ `GET /drivers/{id}/performance/metrics` - Performance-Metriken
- 🔄 **Frontend-Fallback**: Lokale KI-Berechnung implementiert (nur wenn Backend nicht verfügbar)

### Gamification
- ✅ `GET /drivers/{id}/gamification/stats` - Gamification-Statistiken
- ✅ `GET /drivers/leaderboard` - Leaderboard (global)
- 🔄 **Frontend-Fallback**: Lokale Berechnung (nur wenn Backend nicht verfügbar)

### Subscription
- ✅ `GET /drivers/{id}/subscription` - Subscription-Status
- ✅ `GET /drivers/subscription/tiers` - Verfügbare Subscription-Tiers (NEU IMPLEMENTIERT)
- ✅ `POST /drivers/{id}/subscription/upgrade` - Subscription upgraden

---

## Externe APIs (über Environment-Variablen)

### Traffic & Routing
- **Google Maps Distance Matrix API**: `VITE_GOOGLE_MAPS_API_KEY`
  - ✅ Frontend-Integration vorbereitet
  - Wird automatisch verwendet wenn API-Key gesetzt ist
  
- **TomTom Traffic API**: `VITE_TOMTOM_API_KEY`
  - ⚠️ Integration vorbereitet, aber noch nicht implementiert
  
- **Backend Traffic Service**: `VITE_TRAFFIC_API_URL`
  - ✅ Frontend-Integration implementiert
  - Endpoint: `POST {VITE_TRAFFIC_API_URL}/traffic`

### Error Tracking
- **Sentry**: `VITE_SENTRY_DSN`
  - ✅ Frontend-Integration implementiert
  - Automatische Error-Tracking wenn DSN gesetzt ist
  
- **LogRocket**: `VITE_LOGROCKET_APP_ID`
  - ✅ Frontend-Integration implementiert
  - Automatisches Error-Tracking wenn App-ID gesetzt ist
  
- **Custom Error Tracking**: `VITE_ERROR_TRACKING_URL`
  - ✅ Frontend-Integration implementiert
  - Sendet Errors zu Custom Endpoint

---

## Development-Modus

### Auto-Login deaktivieren
- **Environment-Variable**: `VITE_SKIP_AUTH`
- **WICHTIG**: In Production NICHT setzen!
- Nur für lokale Entwicklung ohne Backend

---

## ✅ Status: Backend ist 100% vollständig!

**ALLE Endpoints sind implementiert!** 🎉

### Implementiert am 2025-01-27:
- ✅ **Token-Refresh-Mechanismus**: Driver-Login gibt jetzt `refresh_token` zurück
- ✅ **Refresh-Endpoint**: Frontend nutzt generischen `/api/auth/refresh` Endpoint
- ✅ **Token-Refresh-Integration**: Automatischer Token-Refresh bei 401-Fehlern

### Implementiert am 2025-01-XX:
- ✅ Subscription Tiers Endpoint: `GET /api/drivers/subscription/tiers`

### Alle anderen Endpoints waren bereits implementiert:
- ✅ Geofencing Check-in Endpoints (alle 3)
- ✅ ETA-Berechnung Endpoint
- ✅ Emergency Intelligence Endpoints (alle 3)
- ✅ Smart Acceptance Backend-Endpoint
- ✅ Route-Optimierung Backend-Endpoint
- ✅ Gamification Backend-Integration
- ✅ Subscription-System Backend-Integration
- ✅ Performance-Monitoring Endpoints

---

## Fallback-Mechanismen

Die Driver-App hat umfassende Fallback-Mechanismen implementiert:

1. **Geofencing**: Echte Haversine-Formel für Distanzberechnung
2. **Route-Optimierung**: Lokale TSP-Optimierung
3. **Traffic-Daten**: Simulierte Daten wenn keine API verfügbar
4. **KI-Analyse**: Lokale Berechnung wenn Backend nicht verfügbar
5. **Emergency Intelligence**: Mock-Daten mit Warnungen

**WICHTIG**: Fallbacks sind für Development/Testing gedacht. Für Production sollten alle Backend-Endpoints implementiert sein!

---

## Testing

Um die App ohne Backend zu testen:
1. Setze `VITE_SKIP_AUTH=true` in `.env`
2. Alle Features mit Fallbacks funktionieren
3. Warnungen in Console zeigen fehlende Backend-Endpoints

---

## Kontakt

Bei Fragen zu fehlenden Endpoints oder Integration-Problemen, siehe:
- Backend-Repository: `/backend`
- API-Dokumentation: `/backend/BACKEND_ENDPOINTS_IMPLEMENTATION.md`

