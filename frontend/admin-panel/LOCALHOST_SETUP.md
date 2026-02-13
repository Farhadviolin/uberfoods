# 🚀 Admin Panel - Localhost Setup Guide

**Vollständige Anleitung für die lokale Entwicklung**

---

## 📋 Voraussetzungen

- ✅ Node.js 18+ installiert
- ✅ PostgreSQL Datenbank läuft
- ✅ Backend läuft auf `http://localhost:3000`
- ✅ Port 3002 frei (für Admin Panel)

---

## 🎯 Schnellstart

### Option 1: Automatisches Setup (Empfohlen)

```bash
cd frontend/admin-panel
./setup-localhost.sh
npm run dev
```

### Option 2: Manuelles Setup

```bash
cd frontend/admin-panel

# 1. Dependencies installieren
npm install

# 2. .env Datei erstellen (optional)
cp .env.example .env

# 3. Dev-Server starten
npm run dev
```

---

## ⚙️ Konfiguration

### Environment-Variablen (.env)

Die `.env` Datei ist bereits erstellt mit folgenden Standard-Werten:

```env
VITE_SKIP_AUTH=true              # Auto-Login in Development
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
VITE_APP_NAME=UberFoods Admin
```

**Wichtig:**
- `VITE_SKIP_AUTH=true` aktiviert automatischen Login (nur Development!)
- In Production wird Auto-Login automatisch deaktiviert
- API-URL wird über Vite Proxy verwendet (siehe `vite.config.ts`)

### Vite Proxy Konfiguration

Das Admin Panel verwendet Vite Proxy für API-Calls:

```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    secure: false,
  }
}
```

**Das bedeutet:**
- Alle `/api/*` Requests werden automatisch an `http://localhost:3000` weitergeleitet
- Keine CORS-Probleme
- Keine manuelle API-URL-Konfiguration nötig

---

## 🔐 Authentifizierung

### Standard-Login

- **Email:** `admin@uberfoods.com` (oder `admin@UberFoods.com`)
- **Passwort:** `admin123`

**Hinweis:** Email wird automatisch zu lowercase normalisiert.

### Development Auto-Login

Mit `VITE_SKIP_AUTH=true` in `.env`:

- ✅ Automatischer Login ohne Passwort
- ✅ Funktioniert NUR in Development
- ✅ Wird in Production automatisch blockiert
- ✅ Verwendet `dev-token-no-auth-required` Token

**Auto-Login deaktivieren:**
```bash
# In .env Datei:
VITE_SKIP_AUTH=false

# Oder Datei löschen/umbenennen
```

---

## 🌐 URLs

| Service | URL | Beschreibung |
|---------|-----|--------------|
| **Admin Panel** | http://localhost:3002 | Frontend |
| **Backend API** | http://localhost:3000/api | REST API |
| **Swagger Docs** | http://localhost:3000/api/docs | API Dokumentation |
| **Health Check** | http://localhost:3000/api/health | Backend Status |

---

## 🔧 Troubleshooting

### Problem: CORS-Fehler

**Symptom:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Lösung:**
1. Prüfe Backend `.env` enthält `ALLOWED_ORIGINS` mit `http://localhost:3002`
2. Prüfe Backend läuft auf Port 3000
3. Starte Backend neu nach `.env` Änderungen

### Problem: API-Calls schlagen fehl

**Symptom:**
```
Network Error oder 404 Not Found
```

**Lösung:**
1. Prüfe Backend läuft: `curl http://localhost:3000/api/health`
2. Prüfe Vite Proxy in `vite.config.ts`
3. Prüfe Browser-Konsole für detaillierte Fehler

### Problem: Auto-Login funktioniert nicht

**Symptom:**
- Login-Seite wird angezeigt trotz `VITE_SKIP_AUTH=true`

**Lösung:**
1. Prüfe `.env` Datei existiert und enthält `VITE_SKIP_AUTH=true`
2. Starte Dev-Server neu: `npm run dev`
3. Prüfe Browser-Konsole für Warnungen
4. Lösche Browser-Cache und localStorage

### Problem: Port 3002 bereits belegt

**Symptom:**
```
Error: Port 3002 is already in use
```

**Lösung:**
```bash
# Option 1: Anderen Prozess beenden
lsof -ti:3002 | xargs kill -9

# Option 2: Anderen Port verwenden
# In vite.config.ts ändern:
server: {
  port: 3005,  # Neuer Port
}
```

### Problem: WebSocket-Verbindung

**Hinweis:** WebSocket ist aktuell im Admin Panel deaktiviert (siehe `useWebSocket.ts`). Das ist normal und beeinträchtigt die Funktionalität nicht.

---

## 📦 Dependencies

### Installieren

```bash
npm install
```

### Wichtige Packages

- **React 18** - UI Framework
- **Vite 5** - Build Tool & Dev Server
- **Axios** - HTTP Client
- **React Query** - Data Fetching
- **Chart.js** - Charts & Visualizations
- **Socket.IO Client** - WebSocket (aktuell deaktiviert)

---

## 🧪 Testing

### Unit Tests

```bash
npm test
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
# Backend und Frontend müssen laufen
npm run test:e2e
npm run test:e2e:ui
```

### API Tests

```bash
# Backend muss laufen
npm run test:api
```

---

## 🚀 Production Build

```bash
# Build erstellen
npm run build

# Preview lokal testen
npm run preview
```

**Build-Output:** `dist/` Verzeichnis

---

## 📝 Wichtige Dateien

| Datei | Beschreibung |
|-------|--------------|
| `.env` | Environment-Variablen (nicht in Git) |
| `.env.example` | Beispiel-Konfiguration |
| `vite.config.ts` | Vite & Proxy Konfiguration |
| `src/config.ts` | App-Konfiguration |
| `src/utils/api.ts` | API Client Setup |
| `src/contexts/AuthContext.tsx` | Authentifizierung |

---

## 🔄 Workflow

### 1. Backend starten

```bash
cd backend
npm run start:dev
```

### 2. Admin Panel starten

```bash
cd frontend/admin-panel
npm run dev
```

### 3. Browser öffnen

```
http://localhost:3002
```

---

## ✅ Checkliste

Vor dem Start prüfen:

- [ ] Backend läuft auf Port 3000
- [ ] PostgreSQL Datenbank läuft
- [ ] `.env` Datei existiert (optional)
- [ ] Dependencies installiert (`node_modules` vorhanden)
- [ ] Port 3002 ist frei
- [ ] CORS konfiguriert im Backend

---

## 🆘 Hilfe

- **Login-Probleme:** Siehe [README_AUTH.md](./README_AUTH.md)
- **API-Probleme:** Siehe [API_ENDPOINT_ANALYSE.md](./API_ENDPOINT_ANALYSE.md)
- **Testing:** Siehe [TESTING.md](./TESTING.md)

---

## 📞 Support

Bei Problemen:
1. Prüfe Browser-Konsole (F12)
2. Prüfe Backend-Logs
3. Prüfe Network-Tab für API-Calls
4. Prüfe `.env` Konfiguration

---

**Erstellt:** 2025-01-27  
**Status:** ✅ Production-Ready für Localhost

