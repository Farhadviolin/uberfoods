# 🔍 Backend-Verbindungs-Check Anleitung

## ✅ Automatische Checks implementiert

Ich habe automatische Diagnose-Scripts erstellt, die die Backend-Verbindung prüfen.

## 📋 Verfügbare Commands

### 1. Verbindungs-Check (Backend muss laufen)
```bash
cd backend
npm run check:connection
```

Prüft:
- ✅ Health Endpoint (`/api/health`)
- ✅ Database Connection (`/api/health/ready`)
- ✅ API Endpoints
- ✅ Test Endpoints

### 2. Datenbank-Check
```bash
cd backend
npm run check:db
```

Prüft:
- ✅ Prisma Schema Validierung
- ✅ Datenbank-Verbindung
- ✅ Schema-Synchronisation

### 3. Vollständiger Check
```bash
cd backend
npm run check:all
```

Führt alle Checks durch.

## 🚀 Backend starten

### Option 1: Manuell
```bash
cd backend
npm run start:dev
```

### Option 2: Mit Check-Script
```bash
cd backend
bash scripts/start-and-check.sh
```

## 🔧 Häufige Probleme & Lösungen

### Problem 1: Backend läuft nicht
**Symptom:** `❌ ERROR Health Check`

**Lösung:**
```bash
cd backend
npm run start:dev
```

### Problem 2: Datenbank nicht verbunden
**Symptom:** `❌ ERROR Database Connection`

**Lösung:**
1. Prüfe `.env` Datei:
```bash
cd backend
cat .env | grep DATABASE_URL
```

2. Prüfe ob PostgreSQL läuft:
```bash
# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql
```

3. Teste Datenbank-Verbindung:
```bash
cd backend
npx prisma db pull
```

### Problem 3: Prisma Schema nicht synchronisiert
**Symptom:** `500 Internal Server Error` bei API-Calls

**Lösung:**
```bash
cd backend
npx prisma generate
npx prisma migrate dev
# oder
npx prisma db push
```

### Problem 4: Port 3000 belegt
**Symptom:** Backend startet nicht

**Lösung:**
```bash
# Finde Prozess auf Port 3000
lsof -ti:3000

# Beende Prozess
kill -9 $(lsof -ti:3000)

# Oder ändere Port in .env
PORT=3001
```

### Problem 5: .env Datei fehlt
**Symptom:** `❌ .env Datei fehlt`

**Lösung:**
```bash
cd backend
cp ENV.example .env
# Dann .env bearbeiten und DATABASE_URL setzen
```

## 📊 Health-Check Endpunkte

### Im Browser testen:
- **Health Check:** http://localhost:3000/api/health
- **Readiness:** http://localhost:3000/api/health/ready
- **Liveness:** http://localhost:3000/api/health/live

### Mit curl:
```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/ready
curl http://localhost:3000/api/health/live
```

## 🔍 Detaillierte Diagnose

### 1. Backend-Logs prüfen
Wenn Backend läuft, schaue in die Console-Ausgabe für:
- ✅ `Prisma Client erfolgreich verbunden`
- ✅ `Backend läuft auf http://localhost:3000`
- ❌ Fehler-Messages (rot)

### 2. Datenbank-Verbindung testen
```bash
cd backend
npx prisma studio
# Öffnet Prisma Studio im Browser
```

### 3. Environment-Variablen prüfen
```bash
cd backend
npm run setup:validate-env
```

## ✅ Checkliste für funktionierendes Backend

- [ ] `.env` Datei existiert
- [ ] `DATABASE_URL` ist gesetzt
- [ ] PostgreSQL läuft
- [ ] Prisma Schema ist synchronisiert (`npx prisma generate`)
- [ ] Backend läuft (`npm run start:dev`)
- [ ] Health Check erfolgreich (`npm run check:connection`)
- [ ] Port 3000 ist erreichbar

## 🎯 Quick Start

```bash
# 1. Backend-Verzeichnis
cd backend

# 2. Prüfe .env
test -f .env || cp ENV.example .env

# 3. Prisma generieren
npx prisma generate

# 4. Backend starten
npm run start:dev

# 5. In neuem Terminal: Check durchführen
npm run check:connection
```

## 📝 Scripts Übersicht

| Script | Beschreibung |
|--------|--------------|
| `npm run check:connection` | Prüft Backend-Verbindung (Backend muss laufen) |
| `npm run check:db` | Prüft Datenbank-Verbindung & Schema |
| `npm run check:all` | Führt alle Checks durch |
| `bash scripts/start-and-check.sh` | Startet Backend & prüft Verbindung |

## 🆘 Support

Wenn alle Checks fehlschlagen:
1. Prüfe Backend-Logs (Console-Ausgabe)
2. Prüfe `.env` Datei
3. Prüfe ob PostgreSQL läuft
4. Prüfe Prisma Schema: `npx prisma validate`

