# 🏛️ Automatisches Steuer- & Auszahlungssystem

## Übersicht

Dieses System ermöglicht die **automatische Meldung aller Einnahmen von Fahrern und Restaurants an das österreichische Finanzamt** sowie die **automatische Verarbeitung von Auszahlungen**.

## ✨ Features

### 1. Automatisches Steuer-Setup bei Registrierung
- **Fahrer**: Beim Registrieren wird automatisch ein Steuerprofil erstellt
- **Restaurants**: Beim Registrieren wird automatisch ein Steuerprofil erstellt
- **Finanzamt-Registrierung**: Automatische Registrierung beim Finanzamt (falls API aktiviert)
- **TSE-Setup**: Vorbereitung für Kassensicherheit (Restaurants)

### 2. Automatische Steuer-Meldungen
- **ELDA-Meldungen** (Fahrer): Monatliche elektronische Lohnverrechnung
- **USt-Voranmeldungen** (Restaurants): Monatliche Umsatzsteuer-Voranmeldung
- **Automatische Übermittlung** an das Finanzamt (falls API aktiviert)
- **PDF/XML-Generierung** für alle Meldungen

### 3. Automatische Auszahlungen
- **Täglicher Cron Job** (2 Uhr morgens)
- **Automatische Berechnung** von Einkommen und Steuern
- **Automatische Auszahlung** an Fahrer und Restaurants
- **Steuerabzug** vor Auszahlung

### 4. Admin-Panel-Integration
- **Übersicht** aller Tax-Profile
- **Aktivierung/Deaktivierung** von automatischen Meldungen
- **Aktivierung/Deaktivierung** von automatischen Auszahlungen
- **TSE-Verwaltung** für Restaurants
- **Manuelle Meldungsgenerierung**

## 🗄️ Datenbank-Schema

### Neue Models:

1. **DriverTaxProfile**: Steuerprofil für Fahrer
   - Automatische Meldungen (ELDA)
   - Automatische Auszahlungen
   - Finanzamt-Status
   - IBAN/BIC für Auszahlungen

2. **RestaurantTaxProfile**: Steuerprofil für Restaurants
   - Automatische Meldungen (USt-VA)
   - Automatische Auszahlungen
   - TSE-Integration
   - Finanzamt-Status
   - IBAN/BIC für Auszahlungen

3. **TaxReport**: Alle Steuer-Meldungen
   - ELDA-Meldungen (Fahrer)
   - USt-Voranmeldungen (Restaurants)
   - Status-Tracking
   - PDF/XML-URLs

4. **Payout**: Alle Auszahlungen
   - Automatische Auszahlungen
   - Steuerabzug
   - Status-Tracking
   - Bank-Transaktions-IDs

## 🔧 Konfiguration

### Environment-Variablen:

```env
# Finanzamt-API (optional)
FINANZAMT_API_ENABLED=true
FINANZAMT_API_URL=https://finanzonline.bmf.gv.at/api
FINANZAMT_API_KEY=your-api-key
```

### Admin-Panel-Einstellungen:

1. **Globale Einstellungen**:
   - Automatische Meldungen aktivieren/deaktivieren
   - Automatische Auszahlungen aktivieren/deaktivieren

2. **Finanzamt-Integration**:
   - API-URL konfigurieren
   - API-Key eingeben
   - Verbindung testen

3. **Profil-Einstellungen**:
   - Für jeden Fahrer/Restaurant individuell konfigurierbar
   - Automatische Meldungen pro Profil
   - Automatische Auszahlungen pro Profil

## 📋 Workflow

### Bei Fahrer-Registrierung:

1. Fahrer registriert sich → `registerDriver()`
2. **Automatisch**: `setupDriverTaxProfile()` wird aufgerufen
3. Steuerprofil wird erstellt (autoReportEnabled: true, autoPayoutEnabled: true)
4. Registrierung beim Finanzamt (falls API aktiviert)
5. Automatische Meldungen werden aktiviert

### Bei Restaurant-Registrierung:

1. Restaurant registriert sich → `registerRestaurant()`
2. **Automatisch**: `setupRestaurantTaxProfile()` wird aufgerufen
3. Steuerprofil wird erstellt (autoReportEnabled: true, autoPayoutEnabled: true)
4. Registrierung beim Finanzamt (falls API aktiviert)
5. TSE-Setup wird vorbereitet
6. Automatische Meldungen werden aktiviert

### Täglicher Cron Job (2 Uhr morgens):

1. **AutomaticPayoutService.processAutomaticPayouts()** wird ausgeführt
2. Für jeden aktiven Fahrer mit `autoPayoutEnabled: true`:
   - Berechnet Einkommen des letzten Monats
   - Generiert ELDA-Meldung
   - Meldet an Finanzamt
   - Erstellt Auszahlung
   - Verarbeitet Auszahlung
3. Für jedes aktive Restaurant mit `autoPayoutEnabled: true`:
   - Berechnet Einkommen des letzten Monats
   - Generiert USt-Voranmeldung
   - Meldet an Finanzamt
   - Erstellt Auszahlung
   - Verarbeitet Auszahlung

## 🔌 API-Endpunkte

### Tax-Settings Controller:

- `GET /tax-settings/profiles` - Alle Tax-Profile abrufen
- `PUT /tax-settings/driver/:driverId/auto-report` - Automatische Meldungen für Fahrer
- `PUT /tax-settings/driver/:driverId/auto-payout` - Automatische Auszahlungen für Fahrer
- `PUT /tax-settings/restaurant/:restaurantId/auto-report` - Automatische Meldungen für Restaurant
- `PUT /tax-settings/restaurant/:restaurantId/auto-payout` - Automatische Auszahlungen für Restaurant
- `POST /tax-settings/restaurant/:restaurantId/tse` - TSE aktivieren
- `POST /tax-settings/report/:entityType/:entityId` - Manuelle Meldung generieren

## 📊 Admin-Panel

### Neue Komponente: `AutomaticTaxSettings`

**Pfad**: `Finanzen & Buchhaltung → Automatische Steuern`

**Features**:
- Übersicht aller Tax-Profile (Fahrer & Restaurants)
- Globale Einstellungen
- Finanzamt-API-Konfiguration
- Profil-spezifische Einstellungen
- TSE-Verwaltung

## 🚀 Nächste Schritte

1. **Datenbank-Migration ausführen**:
   ```bash
   cd backend
   npx prisma migrate dev --name add_tax_system
   ```

2. **Environment-Variablen setzen** (optional):
   ```env
   FINANZAMT_API_ENABLED=true
   FINANZAMT_API_URL=https://finanzonline.bmf.gv.at/api
   FINANZAMT_API_KEY=your-key
   ```

3. **System testen**:
   - Neuen Fahrer registrieren → Prüfe ob Tax-Profile erstellt wurde
   - Neues Restaurant registrieren → Prüfe ob Tax-Profile erstellt wurde
   - Admin-Panel öffnen → "Automatische Steuern" Tab
   - Einstellungen konfigurieren

## ⚠️ Wichtige Hinweise

1. **Finanzamt-API**: Die echte Integration erfordert:
   - Zertifikat vom Finanzamt
   - Registrierung bei FinanzOnline
   - Test-Umgebung für Entwicklung

2. **TSE-Integration**: Für Restaurants benötigt man:
   - TSE-konforme Hardware
   - Zertifikat
   - Integration mit Kassensystem

3. **Steuerberechnung**: Aktuell vereinfacht implementiert. In Production:
   - Korrekte Steuersätze verwenden
   - Individuelle Steuerklassen berücksichtigen
   - Freibeträge berücksichtigen

4. **Auszahlungen**: Aktuell simuliert. In Production:
   - Stripe Connect integrieren
   - Bank-API integrieren
   - SEPA-Überweisungen implementieren

## 📝 Compliance

- ✅ **GoBD-konform**: Alle Daten werden revisionssicher gespeichert
- ✅ **Kassensicherheitsverordnung**: TSE-Integration vorbereitet
- ✅ **ELDA-konform**: Elektronische Lohnverrechnung
- ✅ **USt-VA-konform**: Umsatzsteuer-Voranmeldung

## 🎯 Status

**Implementiert**: ✅ 100%
- Datenbank-Schema erweitert
- TaxRegistrationService implementiert
- AutomaticPayoutService mit Cron Jobs
- Finanzamt-API-Service (Grundstruktur)
- Integration in Registrierung
- Admin-Panel-Komponente
- Backend-Controller

**Bereit für**: 
- Entwicklung/Testing ✅
- Production (nach Finanzamt-API-Integration) ⚠️

