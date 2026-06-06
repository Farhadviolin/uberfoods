# UberFoods – Lokales MVP Runbook (PowerShell)

Voraussetzung: Docker Desktop, Node 18+, npm. Repo-Root = `UberFoods`.

---

## 1) Docker starten (DB + Redis)

```powershell
cd "PROJECT_ROOT_PLACEHOLDER"
docker compose up -d
```

- Postgres: `localhost:5434` (User: `postgres`, Passwort: `postgres123`, DB: `uberfoods`)
- Redis: `localhost:6379`

---

## 2) Backend (lokal, ohne Container)

```powershell
cd backend

# ENV anlegen (falls noch nicht vorhanden)
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# .env prüfen: DATABASE_URL=postgresql://postgres:postgres123@localhost:5434/uberfoods

npm install
npx prisma generate --schema=./prisma/schema.prisma
npm run build
npm run prisma:deploy
npm run prisma:seed
npm run start:full
```

Alternativ Produktions-Entry (NODE_ENV=production):

```powershell
$env:NODE_ENV="production"; node dist/main.prod.js
```

Erwartung: Backend auf `http://localhost:3000`, Health: `http://localhost:3000/api/health`.

---

## 3) Vier Frontends (je eigenes Terminal)

```powershell
# Customer Web
cd frontend/customer-web
npm install
npm run dev
# → http://localhost:3102

# Admin Panel
cd frontend/admin-panel
npm install
npm run dev
# → http://localhost:3002

# Restaurant Web
cd frontend/restaurant-web
npm install
npm run dev
# → http://localhost:3003

# Driver App
cd frontend/driver-app
npm install
npm run dev
# → http://localhost:3004
```

---

## 4) Smoke Tests (curl / Invoke-RestMethod)

Backend muss laufen (`npm run start:full` oder Docker backend).

### 1) GET /api/health

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get
```

Erwartung: JSON mit `timestamp`, `database.status: connected`, `uptime`.

### 2) Customer Register

```powershell
$body = @{
  email = "smoke@test.local"
  password = "Test123!"
  firstName = "Smoke"
  lastName = "User"
  phone = "+43123456789"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/customer/register" -Method Post -Body $body -ContentType "application/json"
```

Erwartung: JSON mit `id`, `email`, ggf. `access_token` oder Bestätigung.

### 3) Customer Login

```powershell
$body = @{ email = "smoke@test.local"; password = "Test123!" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/customer/login" -Method Post -Body $body -ContentType "application/json"
```

Erwartung: `access_token`, `refresh_token`, `user`/`email`.

### 4) Restaurants (öffentlich)

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/restaurants/public" -Method Get
```

Erwartung: Array von Restaurants (kann leer sein vor Seed).

### 5) Driver verfügbare Orders (mit Token)

Zuerst Login als Driver (z. B. Seed-Driver), dann:

```powershell
$login = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/driver/login" -Method Post -Body '{"email":"driver@uberfoods.com","password":"driver123"}' -ContentType "application/json"
$token = $login.access_token
Invoke-RestMethod -Uri "http://localhost:3000/api/orders" -Method Get -Headers @{ Authorization = "Bearer $token" }
```

Erwartung: Liste von Orders (oder leeres Array). Ohne Seed-Driver zuerst `npm run prisma:seed` bzw. Seed mit Driver ausführen.

### Optional: Order anlegen (mit Customer-Token)

```powershell
$login = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/customer/login" -Method Post -Body '{"email":"smoke@test.local","password":"Test123!"}' -ContentType "application/json"
$token = $login.access_token
# Order anlegen (restaurantId/customerId/items je nach Seed anpassen)
$orderBody = '{"restaurantId":"<RESTAURANT_ID>","address":"Teststr 1","phone":"+43123456789","items":[{"dishId":"<DISH_ID>","quantity":1}]}'
Invoke-RestMethod -Uri "http://localhost:3000/api/orders" -Method Post -Body $orderBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $token" }
```

---

## 5) Backend nur per Docker

```powershell
docker compose up -d
# Backend baut und startet mit node dist/main.full.js; Health: http://localhost:3000/api/health
```

Smoke-Tests wie oben mit `http://localhost:3000`.

---

## 6) Smoke/Go-Live IMAGE-ONLY (Standalone Compose)

Für einen echten Go-Live-Szenario-Test (Backend läuft **nur** aus dem Docker-Image, ohne Host-Bind-Mounts) gibt es ein eigenes Smoke-Compose-File:

- `docker-compose.smoke.yml` (Standalone; **nicht** als Merge/Override mit `docker-compose.yml` nutzen)

Kanonischer Befehl (aus Repo-Root):

```powershell
npm run smoke:up
```

Dieses Script (`scripts/smoke-up.ps1`) führt aus:

1. `docker compose -f docker-compose.smoke.yml down --remove-orphans`
2. `docker compose -f docker-compose.smoke.yml up -d --build --force-recreate`
3. Wartet auf `http://localhost:3000/api/health` (Status 200)
4. Prüft die Mounts von `uberfoods_backend`:
   - Erwartung: **nur** Volume `/app/node_modules`, **keine** Bind-Mounts (`./backend/src`, `./backend/dist`, …)
5. Führt im Container `npm run prisma:deploy` (optional) und `npm run prisma:seed` aus
6. Startet den MVP Smoke Test: `npm run smoke:mvp` – dabei wird `admin@uberfoods.com` als SUPER_ADMIN verwendet, sodass `GET /api/admin/audit` nach erfolgreichem Seed im Normalfall **PASS** liefert.

Nur wenn der Mount-Check keine Bind-Mounts findet, gilt der Smoke/Go-Live-Test als **IMAGE-ONLY** bestanden.
