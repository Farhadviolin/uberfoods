# Mock Services Dokumentation

## Übersicht

Einige Backend-Services laufen im **Mock-Mode**, wenn keine echten API-Credentials konfiguriert sind. Dies ermöglicht Entwicklung und Testing ohne externe Dienste, sollte aber in Production durch echte Services ersetzt werden.

---

## 🔴 Services mit Mock-Mode

### 1. SMS Service (`src/modules/sms/sms.service.ts`)

**Status:** ⚠️ Läuft im Mock-Mode wenn keine Credentials vorhanden

**Unterstützte Provider:**
- Twilio
- MessageBird
- Vonage

**Konfiguration:**
```env
# Twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_number

# MessageBird
MESSAGEBIRD_API_KEY=your_key

# Vonage
VONAGE_API_KEY=your_key
VONAGE_API_SECRET=your_secret
```

**Mock-Verhalten:**
- SMS werden geloggt, aber nicht wirklich versendet
- Mock-Message-ID wird generiert
- Funktioniert für Development/Testing

**Warnung:** In Production sollten echte SMS-Credentials konfiguriert werden!

---

### 2. OCR Service (`src/modules/ocr/ocr.service.ts`)

**Status:** ⚠️ Läuft im Mock-Mode wenn Google Cloud Vision nicht konfiguriert

**Konfiguration:**
```env
GOOGLE_CLOUD_VISION_API_KEY=your_key
GOOGLE_CLOUD_VISION_PROJECT_ID=your_project
```

**Mock-Verhalten:**
- Text-Extraktion gibt leeren String zurück
- Funktioniert für Development, aber keine echte OCR-Funktionalität

**Warnung:** Für Production OCR-Funktionalität müssen Google Cloud Vision Credentials konfiguriert werden!

---

### 3. Geocoding Service (`src/modules/geocoding/geocoding.service.ts`)

**Status:** ⚠️ Verwendet Mock-Koordinaten für österreichische Städte

**Konfiguration:**
```env
GOOGLE_MAPS_API_KEY=your_key
```

**Mock-Verhalten:**
- Verwendet vordefinierte Koordinaten für bekannte österreichische Städte/Straßen
- Funktioniert für Development, aber ungenau für unbekannte Adressen

**Warnung:** Für Production sollten echte Geocoding-APIs (Google Maps, OpenStreetMap) verwendet werden!

---

### 4. Wearables Service (`src/modules/wearables/wearables.service.ts`)

**Status:** ⚠️ Gibt Mock-Daten zurück wenn kein Gerät verbunden

**Mock-Verhalten:**
- Gibt realistische Mock-Gesundheitsdaten zurück (Herzfrequenz, Schritte, etc.)
- Funktioniert für Development/Testing

**Warnung:** Für Production müssen echte Wearable-Integrationen (Fitbit, Garmin, Apple Health) implementiert werden!

---

### 5. Vehicle Diagnostics Service (`src/modules/vehicle-diagnostics/vehicle-diagnostics.service.ts`)

**Status:** ⚠️ Gibt Mock-Daten zurück wenn kein OBD-II Gerät verbunden

**Mock-Verhalten:**
- Gibt Mock-Fahrzeugdiagnosedaten zurück
- Funktioniert für Development/Testing

**Warnung:** Für Production müssen echte OBD-II Integrationen implementiert werden!

---

### 6. Performance Monitoring Sync (`src/modules/performance-monitoring-sync/performance-monitoring-sync.service.ts`)

**Status:** ⚠️ Gibt Mock-Datenstrukturen zurück

**Mock-Verhalten:**
- Gibt Mock-Performance-Metriken zurück
- Funktioniert für Development

**Warnung:** Für Production sollten echte Monitoring-Tools (Prometheus, Grafana, etc.) integriert werden!

---

## ✅ Services OHNE Mock-Mode

Die folgenden Services haben **keinen** Mock-Mode und benötigen echte Konfiguration:

- Payment Services (Stripe, etc.)
- Database (PostgreSQL)
- Authentication (JWT)
- File Storage (S3, etc.)

---

## 🔧 Konfiguration prüfen

Um zu prüfen, welche Services im Mock-Mode laufen:

```bash
# Backend starten und Logs prüfen
npm run start:dev

# Suche nach "mock" oder "Mock" in den Logs
grep -i "mock" logs/*.log
```

---

## 📝 Nächste Schritte

1. **Development:** Mock-Services sind ok für lokale Entwicklung
2. **Staging:** Konfiguriere echte Services für Testing
3. **Production:** **MUSS** echte Services verwenden - Mock-Mode ist nicht für Production geeignet!

---

**Letzte Aktualisierung:** 2025-12-09
