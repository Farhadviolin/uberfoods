# 🚀 UberFoods - Localhost Testing Guide

**Vollständige Anleitung zum Testen aller Frontend-Apps lokal**

---

## 📋 Übersicht

| App | Port | URL | Status |
|-----|------|-----|--------|
| **Admin Panel** | 3002 | http://localhost:3002 | ✅ Ready |
| **Customer Web** | 3001 | http://localhost:3001 | ✅ Ready |
| **Driver App** | 3004 | http://localhost:3004 | ✅ Ready |
| **Restaurant Web** | 3003 | http://localhost:3003 | ✅ Ready |
| **Backend API** | 3000 | http://localhost:3000 | ⚠️ Muss laufen |

---

## 🎯 Schnellstart

### Option 1: Automatisches Setup (Empfohlen)

```bash
cd frontend
chmod +x setup-all-localhost.sh start-all-localhost.sh
./setup-all-localhost.sh
./start-all-localhost.sh
```

### Option 2: Manuelles Setup

```bash
# 1. Backend starten
cd backend
npm run start:dev

# 2. Admin Panel
cd frontend/admin-panel
npm install
npm run dev

# 3. Customer Web (neues Terminal)
cd frontend/customer-web
npm install
npm run dev

# 4. Driver App (neues Terminal)
cd frontend/driver-app
npm install
npm run dev

# 5. Restaurant Web (neues Terminal)
cd frontend/restaurant-web
npm install
npm run dev
```

---

## ⚙️ Konfiguration

### Backend muss laufen

**Wichtig:** Alle Frontend-Apps benötigen das Backend auf `http://localhost:3000`

```bash
cd backend
npm run start:dev
```

### Environment-Variablen

Jede App hat eine `.env` Datei (wird automatisch erstellt):

#### Admin Panel
```env
VITE_SKIP_AUTH=true
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
VITE_APP_NAME=UberFoods Admin
```

#### Customer Web
```env
VITE_APP_NAME=UberFoods
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
VITE_GOOGLE_MAPS_API_KEY=your_key_here
VITE_STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY_PLACEHOLDER
VITE_ENABLE_VOICE_ASSISTANT=true
VITE_ENABLE_SOCIAL_FEATURES=true
VITE_ENABLE_GAMIFICATION=true
```

#### Driver App
```env
VITE_APP_NAME=UberFoods Driver
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
VITE_GOOGLE_MAPS_API_KEY=your_key_here
VITE_SKIP_AUTH=false
```

#### Restaurant Web
```env
VITE_APP_NAME=UberFoods Restaurant
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

---

## 🔐 Login-Informationen

### Admin Panel
- **Email:** `admin@uberfoods.com`
- **Passwort:** `admin123`
- **Auto-Login:** Aktiviert mit `VITE_SKIP_AUTH=true`

### Customer Web
- Registrierung/Login über UI
- Oder Test-Account erstellen

### Driver App
- Login über UI
- Test-Driver-Account erforderlich

### Restaurant Web
- Login über UI
- Test-Restaurant-Account erforderlich

---

## 🧪 Testing Checkliste

### Admin Panel
- [ ] Dashboard lädt
- [ ] Alle Navigation-Links funktionieren
- [ ] Orders Management
- [ ] User Management
- [ ] Financial Dashboard
- [ ] Settings
- [ ] Subscription Management
- [ ] Analytics

### Customer Web
- [ ] Restaurant-Liste
- [ ] Bestellung aufgeben
- [ ] Payment Flow
- [ ] Order Tracking
- [ ] Profile Management
- [ ] Social Features
- [ ] Gamification
- [ ] Meal Planner
- [ ] Loyalty Program

### Driver App
- [ ] Login
- [ ] Order Acceptance
- [ ] Navigation
- [ ] Order Tracking
- [ ] Earnings Dashboard
- [ ] Performance Analytics
- [ ] Subscription Management

### Restaurant Web
- [ ] Login
- [ ] Menu Management
- [ ] Order Management
- [ ] KDS (Kitchen Display System)
- [ ] Analytics
- [ ] Staff Management

---

## 🔧 Troubleshooting

### Problem: Port bereits belegt

```bash
# Port freigeben
lsof -ti:3001 | xargs kill -9
lsof -ti:3002 | xargs kill -9
lsof -ti:3003 | xargs kill -9
lsof -ti:3004 | xargs kill -9
```

### Problem: CORS-Fehler

**Lösung:** Alle Apps verwenden Vite-Proxy. Prüfe:
1. Backend läuft auf Port 3000
2. `vite.config.ts` hat korrekte Proxy-Konfiguration
3. Backend `.env` enthält `ALLOWED_ORIGINS` mit allen Frontend-URLs:
   ```
   ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004
   ```

### Problem: API-Calls schlagen fehl

1. Prüfe Backend läuft: `curl http://localhost:3000/api/health`
2. Prüfe Browser-Konsole (F12)
3. Prüfe Network-Tab für API-Calls
4. Prüfe Backend-Logs

### Problem: WebSocket-Verbindung

- Prüfe Backend WebSocket läuft
- Prüfe `vite.config.ts` WebSocket-Proxy
- Prüfe Browser-Konsole für WebSocket-Fehler

### Problem: Dependencies fehlen

```bash
# In jedem App-Verzeichnis
cd admin-panel && npm install
cd customer-web && npm install
cd driver-app && npm install
cd restaurant-web && npm install
```

---

## 📊 Monitoring

### Alle Apps gleichzeitig öffnen

```bash
# macOS
open http://localhost:3002  # Admin Panel
open http://localhost:3001  # Customer Web
open http://localhost:3004  # Driver App
open http://localhost:3003  # Restaurant Web

# Linux
xdg-open http://localhost:3002
xdg-open http://localhost:3001
xdg-open http://localhost:3004
xdg-open http://localhost:3003
```

### Logs anzeigen

```bash
# Wenn mit start-all-localhost.sh gestartet
tail -f logs/*.log

# Einzelne App
tail -f logs/Admin\ Panel.log
tail -f logs/Customer\ Web.log
```

### Apps beenden

```bash
# Wenn im Hintergrund gestartet
kill $(cat logs/*.pid)

# Oder manuell
lsof -ti:3001 | xargs kill -9
lsof -ti:3002 | xargs kill -9
lsof -ti:3003 | xargs kill -9
lsof -ti:3004 | xargs kill -9
```

---

## 🚀 Production Build

```bash
# Jede App einzeln
cd admin-panel && npm run build
cd customer-web && npm run build
cd driver-app && npm run build
cd restaurant-web && npm run build
```

---

## 📝 Wichtige Dateien

| Datei | Beschreibung |
|-------|--------------|
| `setup-all-localhost.sh` | Master-Setup-Script |
| `start-all-localhost.sh` | Master-Start-Script |
| `LOCALHOST_TESTING_GUIDE.md` | Diese Anleitung |
| `admin-panel/.env` | Admin Panel Konfiguration |
| `customer-web/.env` | Customer Web Konfiguration |
| `driver-app/.env` | Driver App Konfiguration |
| `restaurant-web/.env` | Restaurant Web Konfiguration |
| `logs/` | Log-Dateien (wird automatisch erstellt) |

---

## ✅ Checkliste vor dem Start

- [ ] Backend läuft auf Port 3000
- [ ] PostgreSQL Datenbank läuft
- [ ] Alle Ports (3001-3004) sind frei
- [ ] Dependencies installiert (`npm install` in jedem Verzeichnis)
- [ ] `.env` Dateien existieren (werden automatisch erstellt)
- [ ] Scripts sind ausführbar (`chmod +x *.sh`)

---

## 🎯 Workflow

### 1. Backend starten
```bash
cd backend
npm run start:dev
```

### 2. Frontend-Apps setup
```bash
cd frontend
./setup-all-localhost.sh
```

### 3. Frontend-Apps starten
```bash
./start-all-localhost.sh
```

### 4. Browser öffnen
- Admin Panel: http://localhost:3002
- Customer Web: http://localhost:3001
- Driver App: http://localhost:3004
- Restaurant Web: http://localhost:3003

---

## 🆘 Hilfe

### Weitere Dokumentation

- **Admin Panel:** Siehe `admin-panel/LOCALHOST_SETUP.md`
- **Customer Web:** Siehe `customer-web/INSTALLATION.md`
- **Driver App:** Siehe `driver-app/BACKEND_ENDPOINTS.md`
- **Restaurant Web:** Siehe `restaurant-web/API_ENDPOINT_AUDIT.md`

### Support

Bei Problemen:
1. Prüfe Browser-Konsole (F12)
2. Prüfe Backend-Logs
3. Prüfe Network-Tab für API-Calls
4. Prüfe `.env` Konfiguration
5. Prüfe Ports sind frei

---

**Erstellt:** 2025-01-27  
**Status:** ✅ Production-Ready für Localhost-Tests

