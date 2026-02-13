# 🚀 UberFoods Localhost Setup

## Schnellstart (3 Minuten)

```bash
# 1. Repository klonen und in Verzeichnis wechseln
cd uberfoods

# 2. Alle Services starten
./start-localhost.sh

# 3. Frontend Apps starten
./start-frontend-apps.sh

# 4. Browser öffnen
open http://localhost:3001  # Customer Web
open http://localhost:3002  # Admin Panel
open http://localhost:3003  # Restaurant Web
open http://localhost:3004  # Driver App
```

## Detaillierte Anleitung

### Voraussetzungen
- Docker & Docker Compose
- Node.js 18+
- Git

### Schritt 1: Dependencies installieren
```bash
# Backend dependencies
cd backend && npm install

# Frontend dependencies (parallel)
cd ../frontend/customer-web && npm install &
cd ../frontend/admin-panel && npm install &
cd ../frontend/restaurant-web && npm install &
cd ../frontend/driver-app && npm install &
wait
```

### Schritt 2: Datenbank setup
```bash
# Docker Services starten
docker-compose up -d postgres redis

# Warten bis DB bereit ist
sleep 15

# Datenbank migrieren
cd backend
npx prisma migrate dev
npx prisma generate

# Testdaten laden
npm run prisma:seed
```

### Schritt 3: Backend starten
```bash
cd backend
npm run start:dev
```

### Schritt 4: Frontend Apps starten
```bash
# Terminal 1: Customer Web
cd frontend/customer-web && npm run dev

# Terminal 2: Admin Panel
cd frontend/admin-panel && npm run dev

# Terminal 3: Restaurant Web
cd frontend/restaurant-web && npm run dev

# Terminal 4: Driver App
cd frontend/driver-app && npm run dev
```

## Verfügbare URLs

| Service | URL | Beschreibung |
|---------|-----|-------------|
| Customer Web | http://localhost:3001 | Kunden-Interface |
| Admin Panel | http://localhost:3002 | Administrator-Interface |
| Restaurant Web | http://localhost:3003 | Restaurant-Interface |
| Driver App | http://localhost:3004 | Fahrer-Interface |
| Backend API | http://localhost:3000 | REST API |
| API Docs | http://localhost:3000/api/docs | Swagger Dokumentation |
| Database | localhost:5434 | PostgreSQL |
| Redis | localhost:6379 | Redis Cache |

## Test-Accounts

### Admin Account
- Email: admin@uberfoods.com
- Password: admin123

### Restaurant Account
- Email: restaurant@uberfoods.com
- Password: restaurant123

### Driver Account
- Email: driver@uberfoods.com
- Password: driver123

### Customer Account
- Email: customer@uberfoods.com
- Password: customer123

## Troubleshooting

### Backend startet nicht
```bash
# Logs prüfen
docker-compose logs backend

# Dependencies neu installieren
cd backend && rm -rf node_modules && npm install
```

### Datenbank-Verbindung fehlt
```bash
# DB Container neustarten
docker-compose restart postgres

# Migration erneut ausführen
cd backend && npx prisma migrate dev --force
```

### Frontend lädt nicht
```bash
# Cache leeren
cd frontend/[app-name] && rm -rf node_modules/.vite && npm run dev
```

## Logs verfolgen

```bash
# Alle Services
docker-compose logs -f

# Spezifischer Service
docker-compose logs -f backend

# Frontend Logs
tail -f logs/customer-web.log
```

## Vollständigen Reset

```bash
# Alles stoppen
./stop-localhost.sh

# Datenbank zurücksetzen
docker-compose down -v
docker-compose up -d postgres redis

# Neu setup
./start-localhost.sh
```
