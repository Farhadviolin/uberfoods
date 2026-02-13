# 🚀 UberFoods Frontend Apps

Alle Frontend-Apps für die UberFoods Platform.

---

## 📦 Apps

| App | Port | Beschreibung |
|-----|------|--------------|
| **Admin Panel** | 3002 | Verwaltungs-Dashboard |
| **Customer Web** | 3001 | Kunden-Web-App |
| **Driver App** | 3004 | Fahrer-App |
| **Restaurant Web** | 3003 | Restaurant-Dashboard |

---

## 🎯 Schnellstart

### Alle Apps gleichzeitig starten

```bash
# 1. Setup (einmalig)
./setup-all-localhost.sh

# 2. Starten
./start-all-localhost.sh

# 3. Beenden
./stop-all-localhost.sh
```

### Einzelne App starten

```bash
# Admin Panel
cd admin-panel && npm run dev

# Customer Web
cd customer-web && npm run dev

# Driver App
cd driver-app && npm run dev

# Restaurant Web
cd restaurant-web && npm run dev
```

---

## 📋 Voraussetzungen

- ✅ Node.js 18+
- ✅ Backend läuft auf `http://localhost:3000`
- ✅ PostgreSQL Datenbank läuft

---

## 📚 Dokumentation

- **Vollständige Anleitung:** [LOCALHOST_TESTING_GUIDE.md](./LOCALHOST_TESTING_GUIDE.md)
- **Admin Panel:** [admin-panel/README.md](./admin-panel/README.md)
- **Customer Web:** [customer-web/INSTALLATION.md](./customer-web/INSTALLATION.md)

---

## 🔧 Scripts

| Script | Beschreibung |
|--------|--------------|
| `setup-all-localhost.sh` | Bereitet alle Apps für Localhost vor |
| `start-all-localhost.sh` | Startet alle Apps gleichzeitig |
| `stop-all-localhost.sh` | Beendet alle Apps |

---

## 🌐 URLs

Nach dem Start:

- **Admin Panel:** http://localhost:3002
- **Customer Web:** http://localhost:3001
- **Driver App:** http://localhost:3004
- **Restaurant Web:** http://localhost:3003
- **Backend API:** http://localhost:3000

---

**Status:** ✅ Production-Ready

