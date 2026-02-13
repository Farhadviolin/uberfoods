# ⚡ Quick Start - Alle Apps starten

**Schnellstart-Anleitung für Localhost-Tests**

---

## 🚀 In 3 Schritten

### 1. Backend starten (Terminal 1)

```bash
cd backend
npm run start:dev
```

**Warte bis:** `Nest application successfully started`

---

### 2. Frontend-Apps starten (Terminal 2)

```bash
cd frontend
./start-all-localhost.sh
```

**Was passiert:**
- ✅ Alle Apps werden in separaten Terminal-Fenstern gestartet
- ✅ Ports werden automatisch geprüft
- ✅ Logs werden in `logs/` gespeichert

---

### 3. Browser öffnen

```bash
# macOS
open http://localhost:3002  # Admin Panel
open http://localhost:3001  # Customer Web
open http://localhost:3004  # Driver App
open http://localhost:3003  # Restaurant Web
```

---

## 📋 URLs

| App | URL | Login |
|-----|-----|-------|
| **Admin Panel** | http://localhost:3002 | admin@uberfoods.com / admin123 |
| **Customer Web** | http://localhost:3001 | Registrierung/Login |
| **Driver App** | http://localhost:3004 | Login erforderlich |
| **Restaurant Web** | http://localhost:3003 | Login erforderlich |

---

## 🛑 Apps beenden

```bash
cd frontend
./stop-all-localhost.sh
```

---

## ✅ Checkliste

Vor dem Start:
- [ ] Backend läuft auf Port 3000
- [ ] PostgreSQL läuft
- [ ] Ports 3001-3004 sind frei
- [ ] Setup wurde ausgeführt: `./setup-all-localhost.sh`

---

## 🆘 Probleme?

### Port belegt
```bash
lsof -ti:3001 | xargs kill -9
lsof -ti:3002 | xargs kill -9
lsof -ti:3003 | xargs kill -9
lsof -ti:3004 | xargs kill -9
```

### Backend läuft nicht
```bash
cd backend
npm run start:dev
```

### Dependencies fehlen
```bash
cd frontend
./setup-all-localhost.sh
```

---

**Viel Erfolg! 🎉**

