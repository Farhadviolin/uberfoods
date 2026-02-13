# 🚀 UberFoods - Quick Start Guide

**Schnellstart-Anleitung für lokale Entwicklung**

## ⚡ 5-Minuten Setup

### 1. Voraussetzungen prüfen
```bash
# Node.js Version prüfen
node --version  # Sollte 18+ sein

# Docker prüfen
docker --version
docker-compose --version
```

### 2. Repository Setup
```bash
# Repository klonen (falls noch nicht geschehen)
cd PROJECT_ROOT_PLACEHOLDER

# Dependencies installieren
cd backend && npm install
cd ../frontend/customer-web && npm install
```

### 3. Environment konfigurieren
```bash
# Backend .env erstellen
cd backend
cp .env.example .env

# Wichtige Variablen setzen (falls nicht vorhanden)
echo "DATABASE_URL=postgresql://uberfoods_user:uberfoods_password@localhost:5432/uberfoods_dev" >> .env
echo "JWT_SECRET=your-super-secret-jwt-key-change-in-production" >> .env
```

### 4. Datenbank starten
```bash
# PostgreSQL mit Docker starten
cd backend
docker-compose up -d postgres

# Warten bis DB bereit ist (5-10 Sekunden)
sleep 5
```

### 5. Datenbank migrieren
```bash
# Prisma Migrations ausführen
npx prisma migrate dev

# Optional: Seed Data laden
npx prisma db seed
```

### 6. System starten
```bash
# Terminal 1: Backend starten
cd backend
npm run start:dev

# Terminal 2: Frontend starten
cd frontend/customer-web
npm run dev
```

### 7. System testen
```bash
# Health Check
curl http://localhost:3000/api/health

# Restaurants abrufen
curl http://localhost:3000/api/restaurants/public

# Frontend öffnen
open http://localhost:3001
```

## 🎯 Zugriff auf das System

### Frontend
```
🌐 http://localhost:3001
```

### Backend API
```
🚀 http://localhost:3000/api
📊 Health: http://localhost:3000/api/health
🍕 Restaurants: http://localhost:3000/api/restaurants/public
```

## 🧪 Erste Schritte

### 1. Restaurant-Daten ansehen
```bash
curl http://localhost:3000/api/restaurants/public | jq '.[0]'
```

### 2. System-Status prüfen
```bash
curl http://localhost:3000/api/health | jq '.'
```

### 3. Frontend im Browser öffnen
```bash
open http://localhost:3001
```

## 🔧 Häufige Probleme

### Backend startet nicht
```bash
# Port 3000 bereits belegt?
lsof -ti:3000 | xargs kill -9

# Dependencies neu installieren
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Datenbank-Verbindung fehlt
```bash
# PostgreSQL Status prüfen
docker ps | grep postgres

# Falls nicht läuft:
docker-compose up -d postgres

# Connection String testen
cd backend
npx prisma db push
```

### Frontend Build-Fehler
```bash
# Node Modules neu installieren
cd frontend/customer-web
rm -rf node_modules package-lock.json
npm install

# Build Cache leeren
rm -rf dist .vite
npm run dev
```

## 📋 Nützliche Befehle

### Backend
```bash
# Development Mode
npm run start:dev

# Production Build
npm run build
npm run start:prod

# Tests ausführen
npm run test
npm run test:e2e

# Database Reset
npx prisma migrate reset
```

### Frontend
```bash
# Development Server
npm run dev

# Production Build
npm run build
npm run preview

# Tests
npm run test
```

### Docker
```bash
# Alle Services starten
docker-compose up -d

# Logs ansehen
docker-compose logs -f

# Services stoppen
docker-compose down

# Volumes löschen (⚠️ Datenverlust!)
docker-compose down -v
```

## 🎯 Development Workflow

### 1. Feature entwickeln
```bash
# Feature Branch erstellen
git checkout -b feature/my-feature

# Code entwickeln
# ...

# Commits erstellen
git add .
git commit -m "feat: add new feature"

# Push & Pull Request
git push origin feature/my-feature
```

### 2. API testen
```bash
# Mit curl
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"restaurantId":"rest_123","items":[...]}'

# Mit httpie (falls installiert)
http POST localhost:3000/api/orders restaurantId=rest_123
```

### 3. Datenbank ändern
```bash
# Schema ändern in prisma/schema.prisma
# Migration erstellen
npx prisma migrate dev --name my_migration

# Prisma Client neu generieren
npx prisma generate
```

## 🔍 Debugging

### Backend Logs
```bash
# Development Logs
npm run start:dev

# Production Logs
docker logs uberfoods-api -f
```

### Frontend Logs
```bash
# Browser Console öffnen (F12)
# Vite Dev Server Logs im Terminal
```

### Database Queries
```bash
# Prisma Studio öffnen
npx prisma studio

# SQL direkt ausführen
docker exec -it uberfoods-postgres psql -U uberfoods_user -d uberfoods_dev
```

## 📚 Nächste Schritte

1. **API erkunden**: Siehe [docs/api.md](docs/api.md)
2. **Deployment**: Siehe [docs/deployment.md](docs/deployment.md)
3. **Architektur verstehen**: Siehe [README.md](README.md)
4. **Features entwickeln**: Siehe Codebase in `backend/src/` und `frontend/`

## 🆘 Support

- **Dokumentation**: [README.md](README.md)
- **API Docs**: [docs/api.md](docs/api.md)
- **Issues**: GitHub Issues erstellen
- **Community**: GitHub Discussions

---

**🎊 Viel Erfolg mit dem HMOR Food Delivery System!**

**🚀 Happy Coding!**