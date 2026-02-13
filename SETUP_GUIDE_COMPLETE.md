# 🚀 UberFoods - Kompletter Setup Guide

**Version:** 2.0  
**Datum:** 11. Dezember 2025  
**Schwierigkeit:** Mittel  
**Dauer:** 30-45 Minuten

---

## 📋 **Inhaltsverzeichnis**

1. [Voraussetzungen](#voraussetzungen)
2. [Quick Start (5 Minuten)](#quick-start)
3. [Detaillierter Setup](#detaillierter-setup)
4. [Environment-Variablen](#environment-variablen)
5. [Erste Schritte](#erste-schritte)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 **Voraussetzungen**

### **System-Requirements**
- **Node.js**: >= 18.0.0 (LTS empfohlen)
- **npm**: >= 9.0.0
- **PostgreSQL**: >= 15.0
- **Git**: Latest version
- **RAM**: Mindestens 8 GB
- **Speicher**: 5 GB frei

### **Optional (für Production)**
- **Docker**: >= 24.0
- **Redis**: >= 7.0 (für Caching)
- **AWS Account**: Für S3 File Storage
- **Stripe Account**: Für Payments
- **Google Cloud Account**: Für Maps API

### **Installation prüfen**
```bash
node --version  # sollte >= 18.0.0 sein
npm --version   # sollte >= 9.0.0 sein
psql --version  # sollte >= 15.0 sein
```

---

## ⚡ **Quick Start (5 Minuten)**

### **1. Repository klonen**
```bash
git clone https://github.com/your-org/uberfoods.git
cd uberfoods
```

### **2. Dependencies installieren**
```bash
# Backend
cd backend
npm install

# Frontend Apps (parallel)
cd ../frontend
cd admin-panel && npm install &
cd ../customer-web && npm install &
cd ../driver-app && npm install &
cd ../restaurant-web && npm install &
wait  # Warte auf alle parallel installs
```

### **3. Datenbank erstellen**
```bash
# PostgreSQL Datenbank erstellen
createdb uberfoods

# Oder mit psql:
psql -U postgres
CREATE DATABASE uberfoods;
\q
```

### **4. Environment-Variablen setzen**
```bash
# Backend
cd backend
cp .env.example .env

# Editiere .env und fülle mindestens aus:
# - DATABASE_URL
# - JWT_SECRET
# - STRIPE_SECRET_KEY (für Payments)
```

### **5. Datenbank migrieren**
```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed  # Optional: Test-Daten
```

### **6. Apps starten**
```bash
# Terminal 1: Backend
cd backend
npm run start:dev

# Terminal 2: Admin Panel
cd frontend/admin-panel
npm run dev

# Terminal 3: Customer Web
cd frontend/customer-web
npm run dev

# Terminal 4: Restaurant Web
cd frontend/restaurant-web
npm run dev

# Terminal 5: Driver App
cd frontend/driver-app
npm run dev
```

### **7. Zugriff**
- **Backend API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api/docs
- **Admin Panel**: http://localhost:3002
- **Customer Web**: http://localhost:3001
- **Restaurant Web**: http://localhost:3003
- **Driver App**: http://localhost:3004

---

## 📝 **Detaillierter Setup**

### **Backend Setup**

#### **1. Environment-Variablen**
```bash
cd backend
cp .env.example .env
```

**Minimale Konfiguration (.env):**
```env
# Pflichtfelder
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/uberfoods
JWT_SECRET=dein-super-geheimer-jwt-key-mindestens-32-zeichen

# Empfohlen
STRIPE_SECRET_KEY=STRIPE_SECRET_KEY_PLACEHOLDER_...
GOOGLE_MAPS_API_KEY=your_api_key
```

**JWT Secret generieren:**
```bash
# macOS/Linux
openssl rand -base64 32

# Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

#### **2. Dependencies & Database**
```bash
# Dependencies installieren
npm install

# Prisma Client generieren
npm run prisma:generate

# Datenbank migrieren
npm run prisma:migrate

# Optional: Test-Daten einfügen
npm run prisma:seed
npm run prisma:seed-admin  # Admin User erstellen
```

#### **3. Backend starten**
```bash
# Development Mode (mit Hot Reload)
npm run start:dev

# Production Mode
npm run build
npm run start:prod

# Mit Debugging
npm run start:debug
```

#### **4. Backend testen**
```bash
# Health Check
curl http://localhost:3000/api/health

# API Dokumentation öffnen
open http://localhost:3000/api/docs
```

---

### **Frontend Apps Setup**

Alle Frontend-Apps haben denselben Setup-Prozess:

#### **1. Environment-Variablen**
```bash
# Admin Panel
cd frontend/admin-panel
cp .env.example .env

# Customer Web
cd ../customer-web
cp .env.example .env

# Driver App
cd ../driver-app
cp .env.example .env

# Restaurant Web
cd ../restaurant-web
cp .env.example .env
```

**Typische .env für alle Frontends:**
```env
# Backend URL (zeigt auf Backend-API)
VITE_API_URL=http://localhost:3000

# WebSocket URL (für Real-time Features)
VITE_WS_URL=http://localhost:3000

# Google Maps (nur Customer Web & Driver App)
VITE_GOOGLE_MAPS_API_KEY=your_api_key

# Stripe (nur Customer Web)
VITE_STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY_PLACEHOLDER_...

# Optional: Sentry für Error Tracking
VITE_SENTRY_DSN=
```

#### **2. Dependencies installieren**
```bash
# Für jede App:
npm install
```

#### **3. App starten**
```bash
# Development Mode
npm run dev

# Production Build
npm run build
npm run preview
```

---

## 🔐 **Environment-Variablen Übersicht**

### **Backend**

| Variable | Pflicht | Beschreibung | Beispiel |
|----------|---------|--------------|----------|
| `NODE_ENV` | Ja | Environment (development/production) | `development` |
| `PORT` | Ja | Server Port | `3000` |
| `DATABASE_URL` | Ja | PostgreSQL Connection String | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | Ja | JWT Encryption Key (min. 32 Zeichen) | `openssl rand -base64 32` |
| `STRIPE_SECRET_KEY` | Empfohlen | Stripe Secret Key | `STRIPE_SECRET_KEY_PLACEHOLDER_...` oder `STRIPE_SECRET_KEY_PLACEHOLDER_...` |
| `STRIPE_WEBHOOK_SECRET` | Empfohlen | Stripe Webhook Secret | `STRIPE_WEBHOOK_SECRET_PLACEHOLDER_...` |
| `GOOGLE_MAPS_API_KEY` | Empfohlen | Google Maps API Key | `AIza...` |
| `AWS_ACCESS_KEY_ID` | Optional | AWS Access Key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | Optional | AWS Secret Key | `...` |
| `AWS_S3_BUCKET` | Optional | S3 Bucket Name | `uberfoods-uploads` |
| `SMTP_HOST` | Optional | Email SMTP Host | `smtp.gmail.com` |
| `SMTP_PORT` | Optional | Email SMTP Port | `587` |
| `SMTP_USER` | Optional | Email Username | `your@email.com` |
| `SMTP_PASS` | Optional | Email Password | `your_password` |
| `REDIS_URL` | Optional | Redis Connection String | `redis://localhost:6379` |
| `SENTRY_DSN` | Optional | Sentry Error Tracking DSN | `https://...@sentry.io/...` |

### **Frontends**

| Variable | Apps | Beschreibung | Beispiel |
|----------|------|--------------|----------|
| `VITE_API_URL` | Alle | Backend API URL | `http://localhost:3000` |
| `VITE_WS_URL` | Alle | WebSocket URL | `http://localhost:3000` |
| `VITE_GOOGLE_MAPS_API_KEY` | Customer, Driver | Google Maps Key | `AIza...` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Customer | Stripe Publishable Key | `STRIPE_PUBLISHABLE_KEY_PLACEHOLDER_...` |
| `VITE_VAPID_PUBLIC_KEY` | Customer, Driver | Push Notifications Key | `generated` |
| `VITE_SENTRY_DSN` | Alle | Sentry DSN | `https://...` |

---

## 🎯 **Erste Schritte**

### **1. Admin User erstellen**
```bash
cd backend
npm run prisma:seed-admin
```

Das erstellt einen Admin mit:
- **Email**: admin@uberfoods.com
- **Password**: AdminPass123!

### **2. Restaurant erstellen**
```bash
# Öffne Admin Panel
open http://localhost:3002

# Login mit Admin-Credentials
# Gehe zu "Restaurants" Tab
# Klicke "Neues Restaurant erstellen"
```

### **3. Test-Order erstellen**
```bash
# Öffne Customer Web
open http://localhost:3001

# Registriere einen Kunden
# Browse Restaurants
# Bestelle etwas
```

### **4. Order in Restaurant Web sehen**
```bash
# Öffne Restaurant Web
open http://localhost:3003

# Login mit Restaurant-Credentials (aus Admin Panel)
# Gehe zu "Orders" Tab
# Akzeptiere die Bestellung
```

### **5. Driver zuweisen**
```bash
# Im Admin Panel
# Gehe zu "Orders" Tab
# Klicke auf Bestellung
# Wähle "Driver zuweisen"
```

---

## 🐛 **Troubleshooting**

### **Problem: Database Connection Failed**
**Symptom**: `Error: connect ECONNREFUSED`

**Lösung**:
```bash
# 1. PostgreSQL läuft?
ps aux | grep postgres

# 2. PostgreSQL starten
# macOS
brew services start postgresql@15

# Linux
sudo systemctl start postgresql

# Windows
net start postgresql-x64-15

# 3. Database existiert?
psql -U postgres -c "\l" | grep uberfoods

# 4. DATABASE_URL korrekt in .env?
cat backend/.env | grep DATABASE_URL
```

### **Problem: Port already in use**
**Symptom**: `Error: listen EADDRINUSE: address already in use :::3000`

**Lösung**:
```bash
# 1. Finde Prozess auf Port
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# 2. Oder anderen Port verwenden
# In backend/.env
PORT=3001
```

### **Problem: CORS Errors im Browser**
**Symptom**: `Access-Control-Allow-Origin error`

**Lösung**:
```bash
# 1. Backend ALLOWED_ORIGINS prüfen
cat backend/.env | grep ALLOWED_ORIGINS

# 2. Frontend URL hinzufügen
# In backend/.env
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004

# 3. Backend neu starten
```

### **Problem: JWT Token Invalid**
**Symptom**: `401 Unauthorized` oder `Invalid token`

**Lösung**:
```bash
# 1. JWT_SECRET in backend/.env gesetzt?
cat backend/.env | grep JWT_SECRET

# 2. JWT_SECRET generieren
openssl rand -base64 32

# 3. Backend neu starten
# 4. Frontend-Cache löschen (Browser Dev Tools > Application > Clear Storage)
```

### **Problem: Prisma Migration Failed**
**Symptom**: `Migration failed to apply`

**Lösung**:
```bash
cd backend

# 1. Prisma Schema validieren
npm run prisma:validate

# 2. Migration zurücksetzen (ACHTUNG: löscht Daten!)
npm run prisma:migrate:reset

# 3. Fresh Migration
npm run prisma:migrate:dev

# 4. Generate Client
npm run prisma:generate
```

### **Problem: Frontend Build Failed**
**Symptom**: `Build failed with errors`

**Lösung**:
```bash
# 1. node_modules löschen
rm -rf node_modules package-lock.json

# 2. Neu installieren
npm install

# 3. TypeScript Errors prüfen
npm run type-check

# 4. Cache löschen
rm -rf .vite node_modules/.vite
```

### **Problem: WebSocket nicht connected**
**Symptom**: `WebSocket connection failed`

**Lösung**:
```bash
# 1. Backend läuft?
curl http://localhost:3000/api/health

# 2. VITE_WS_URL in Frontend .env korrekt?
cat frontend/*/\.env | grep VITE_WS_URL

# 3. Port korrekt?
# Backend läuft auf Port 3000
# VITE_WS_URL sollte http://localhost:3000 sein

# 4. Browser Console prüfen
# Öffne Dev Tools > Console
# Sollte "WebSocket connected" sehen
```

---

## 📚 **Weitere Ressourcen**

- **API Dokumentation**: http://localhost:3000/api/docs (Swagger)
- **Architecture Guide**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Production Deployment**: [DEPLOYMENT_GUIDE_V2.md](./DEPLOYMENT_GUIDE_V2.md)
- **Testing Guide**: [UNIT_TESTS_IMPLEMENTATION.md](./UNIT_TESTS_IMPLEMENTATION.md)

---

## 🤝 **Support**

Bei Problemen:
1. Prüfe [Troubleshooting](#troubleshooting) Sektion
2. Prüfe [GitHub Issues](https://github.com/your-org/uberfoods/issues)
3. Erstelle neues Issue mit:
   - Fehlermeldung (vollständig)
   - Steps to reproduce
   - Environment (OS, Node Version, etc.)
   - Logs (Backend & Frontend Console)

---

**Happy Coding! 🚀**
