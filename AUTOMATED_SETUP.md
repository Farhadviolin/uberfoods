# 🤖 Automatisiertes Setup - Scripts & Tools

## 🎯 Verfügbare Scripts

### Backend Scripts

#### 1. Setup-Check
```bash
cd backend
npm run setup:check
```
**Was es macht:**
- Prüft ob .env existiert
- Validiert Environment-Variablen
- Prüft Dependencies
- Prüft Prisma Client
- Prüft Upload-Verzeichnisse

#### 2. Environment-Validierung
```bash
cd backend
npm run setup:validate-env
```
**Was es macht:**
- Prüft alle erforderlichen Environment-Variablen
- Zeigt welche Services konfiguriert sind
- Gibt Warnungen für fehlende optionale Services

#### 3. VAPID Keys generieren
```bash
cd backend
npm run setup:generate-vapid
```
**Was es macht:**
- Generiert VAPID Keys für Web Push Notifications
- Zeigt die Keys zum Kopieren
- Setzt sie in ENV.example (optional)

#### 4. Service Health Check
```bash
cd backend
npm run setup:check-services
```
**Was es macht:**
- Prüft ob Backend läuft
- Testet Stripe Konfiguration
- Testet Google Maps API
- Prüft Email Service
- Prüft S3 Storage
- Prüft Sentry
- Prüft VAPID Keys

### Frontend Scripts

#### 1. Environment-Validierung
```bash
cd frontend/customer-web
npm run setup:validate-env
```
**Was es macht:**
- Prüft alle Frontend Environment-Variablen
- Validiert API URLs
- Prüft Service-Konfigurationen

### Master Setup Script

#### Automatisches Setup (Alles auf einmal)
```bash
./scripts/master-setup.sh
```
**Was es macht:**
- Erstellt .env Dateien aus ENV.example
- Installiert Dependencies
- Generiert Prisma Client
- Validiert Environment-Variablen
- Generiert VAPID Keys (optional)
- Führt alle Setup-Schritte aus

---

## 🚀 Quick Start

### Option 1: Master Setup (Empfohlen)
```bash
# Führe alles automatisch aus
./scripts/master-setup.sh
```

### Option 2: Schritt für Schritt
```bash
# 1. Backend Setup
cd backend
cp ENV.example .env
npm install
npm run setup:check

# 2. Frontend Setup
cd ../frontend/customer-web
cp ENV.example .env
npm install
npm run setup:validate-env

# 3. Services konfigurieren
# Siehe PRODUCTION_SETUP.md
```

---

## 📋 Setup-Workflow

### 1. Initial Setup
```bash
# Master Setup ausführen
./scripts/master-setup.sh
```

### 2. Environment-Variablen setzen
```bash
# Backend
cd backend
nano .env  # oder vim .env

# Frontend
cd frontend/customer-web
nano .env  # oder vim .env
```

### 3. Validierung
```bash
# Backend prüfen
cd backend
npm run setup:validate-env

# Frontend prüfen
cd frontend/customer-web
npm run setup:validate-env
```

### 4. Services konfigurieren
Folge der Anleitung in `PRODUCTION_SETUP.md`:
- Stripe Account erstellen
- Google Maps API Key generieren
- Email Service einrichten
- etc.

### 5. Service Health Check
```bash
# Starte Backend
cd backend
npm run start:dev

# In neuem Terminal
cd backend
npm run setup:check-services
```

---

## 🧪 Test-Endpoints

Nach dem Start des Backends:

```bash
# Health Check
curl http://localhost:3000/api/health

# Config Check
curl http://localhost:3000/api/test/config

# Maps Test
curl http://localhost:3000/api/test/maps

# Storage Test (benötigt Auth)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/test/storage
```

---

## ✅ Checkliste

### Setup Scripts
- [x] `setup-check.js` - Setup-Checker
- [x] `validate-env.js` - Environment-Validierung
- [x] `generate-vapid-keys.js` - VAPID Keys
- [x] `check-services.sh` - Service Health Check
- [x] `setup-production.sh` - Production Setup
- [x] `master-setup.sh` - Master Setup

### NPM Scripts
- [x] `npm run setup:check` - Backend Setup prüfen
- [x] `npm run setup:validate-env` - Backend Env validieren
- [x] `npm run setup:generate-vapid` - VAPID Keys generieren
- [x] `npm run setup:check-services` - Services prüfen
- [x] `npm run setup:validate-env` - Frontend Env validieren

---

## 🎉 Fertig!

Alle Scripts sind erstellt und bereit zur Verwendung!

**Nächster Schritt:** Führe `./scripts/master-setup.sh` aus! 🚀

