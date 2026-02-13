# 🗺️ UberFoods Google Maps Production Setup

## Schritt 3.3: Google Maps Production Konfiguration

### 3.3.1 Google Cloud Console Setup

**1. Gehe zu Google Cloud Console:**
```
https://console.cloud.google.com/
```

**2. Projekt erstellen/auswählen:**
- Klicke oben links auf das Projekt-Dropdown
- Erstelle neues Projekt: "UberFoods Production"
- Wähle das neue Projekt aus

**3. Billing aktivieren:**
- Gehe zu: Billing → Link a billing account
- Erstelle/verknüpfe ein Billing-Konto
- Google Maps API hat kostenlose Kontingente

### 3.3.2 APIs aktivieren

**Aktiviere diese APIs:**
- ✅ Maps JavaScript API
- ✅ Geocoding API
- ✅ Places API
- ✅ Directions API (für Routen-Optimierung)
- ✅ Distance Matrix API (für Lieferzeiten)

**API aktivieren:**
- Gehe zu: APIs & Services → Library
- Suche nach jeder API oben
- Klicke "Enable"

### 3.3.3 API Key erstellen

**1. Credentials erstellen:**
- Gehe zu: APIs & Services → Credentials
- Klicke "Create Credentials" → "API key"
- Kopiere den generierten API Key

**2. API Key restrictten (SICHERHEIT!):**
- Klicke auf den erstellten API Key
- Gehe zu "Application restrictions" → "HTTP referrers"
- Füge deine Domains hinzu:
  ```
  *.yourdomain.com/*
  yourdomain.com/*
  api.yourdomain.com/*
  ```
- Gehe zu "API restrictions" → "Restrict key"
- Wähle nur diese APIs:
  - Maps JavaScript API
  - Geocoding API
  - Places API

### 3.3.4 Usage Limits konfigurieren

**Kostenlose Kontingente (genug für Startup):**
- Maps JavaScript API: 28,000 requests/month free
- Geocoding API: 40,000 requests/month free
- Places API: 20,000 requests/month free

**Billing Alerts einrichten:**
- Gehe zu: Billing → Budgets & alerts
- Erstelle Budget für Google Maps APIs
- Setze Alert bei 80% des Budgets

### 3.3.5 ENV-Konfiguration

**Aktualisiere `production.env`:**

```bash
# GOOGLE APIS PRODUCTION
GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_GOOGLE_MAPS_API_KEY_HERE
GOOGLE_PLACES_API_KEY=YOUR_ACTUAL_GOOGLE_PLACES_API_KEY_HERE
```

**Aktualisiere `frontend-production.env`:**

```bash
# Google Maps (gleicher Key wie Backend)
VITE_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_GOOGLE_MAPS_API_KEY_HERE
```

### 3.3.6 Test Maps Integration

**Teste Google Maps:**

```bash
# Test Geocoding API
curl "https://maps.googleapis.com/maps/api/geocode/json?address=Wien&key=YOUR_API_KEY"

# Sollte erfolgreich Wien koordinaten zurückgeben
```

**Frontend Test:**
- Öffne `https://yourdomain.com`
- Karte sollte laden
- Address-Suche sollte funktionieren

---

## 🔧 Troubleshooting Google Maps

### Problem: API Key rejected
```
# Console: "This API key is not authorized"
```
**Lösung:**
- API Key restrictions prüfen
- Domain zur HTTP referrer list hinzufügen
- APIs aktivieren

### Problem: Quota exceeded
```
# Console: "You have exceeded your daily request quota"
```
**Lösung:**
- Billing aktivieren
- Usage limits erhöhen
- API Key restrictten (reduziert Missbrauch)

### Problem: Map nicht sichtbar
```
# Browser Console prüfen
- Referer header korrekt?
- API Key loaded?
- Domain restrictions?
```

### Problem: Places Autocomplete funktioniert nicht
- Places API aktiviert?
- Billing für Places aktiviert?
- Places Library in Frontend geladen?

---

## 📊 Google Maps Production Checklist

- [ ] Google Cloud Projekt erstellt
- [ ] Billing aktiviert
- [ ] Alle erforderlichen APIs aktiviert
- [ ] Production API Key erstellt
- [ ] API Key auf Domains restricted
- [ ] HTTP Referrer restrictions gesetzt
- [ ] ENV-Variablen aktualisiert
- [ ] Geocoding API funktioniert
- [ ] Frontend Map lädt
- [ ] Places Autocomplete arbeitet
- [ ] Usage alerts konfiguriert

---

## 💰 Google Maps Kosten

**Kostenlose Kontingente:**
- Maps JavaScript API: 28,000 requests/month
- Geocoding API: 40,000 requests/month
- Places API: 20,000 requests/month

**Überschreitungskosten:**
- Maps JavaScript API: $7 per 1,000 requests
- Geocoding API: $5 per 1,000 requests
- Places API: $17 per 1,000 requests

**Für UberFoods typischer Usage:**
- 1,000 Bestellungen/Monat = ~3,000 API calls
- Bleibt im kostenlosen Kontingent

---

## 🎯 Nächster Schritt

Nach Google Maps Setup: **Final Production Deployment**