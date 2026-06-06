# UberFoods Go-Live Status (MVP)

**Letzter Smoke-Test-Lauf:** 2025-02-22  
**Ergebnis:** FAIL – Backend war zum Testzeitpunkt nicht erreichbar (Connection refused).  
**Ursache:** Server unter `http://localhost:3000` nicht gestartet (u. a. Prometheus-Metrics-Doppelregistrierung → Restart-Loop).

**Wenn Backend im Container wegen Metrics restartet:** Fix ist im Code (MetricsModule nur einmal, Hard-Guard in MetricsService). Damit der Fix im Container ankommt: **Smoke-Modus ohne dist-Mount** nutzen: `docker compose -f docker-compose.yml -f docker-compose.smoke.yml up -d --build` (siehe unten). Alternativ vor normalem `docker compose up` einmal `cd backend && npm run build` ausführen.

---

## So verifizierst du, dass der Container den richtigen dist nutzt

- Prüfen, ob der Guard/globalThis im gebauten Code im Container steckt (erste Zeilen von metrics.service.js):
  ```powershell
  docker exec uberfoods_backend sh -c "head -n 60 /app/dist/common/services/metrics.service.js"
  ```
- Erwartung: Im JS siehst du z. B. `__UBERFOODS_DEFAULT_METRICS__` oder `getSingleMetric("uberfoods_process_cpu_user_seconds_total")` und try/catch-Logik. Wenn stattdessen nur eine einfache `collectDefaultMetrics(...)` ohne Guard erscheint, läuft alter Code (z. B. weil dist gemountet und nicht neu gebaut).

---

## So erreichst du PASS

**Variante A – Lokale Dev-Umgebung (dev-up.ps1):**

1. Aus dem Repo-Root einmalig:
   ```powershell
   powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-up.ps1
   ```
   Dieser Befehl führt aus:
   - `docker compose up -d` (Backend-Container inkl. Health auf `http://localhost:3000/api/health`)
   - Start der Dev-Server:
     - Admin Panel: `http://localhost:3002`
     - Customer Web: `http://localhost:5173`
     - Restaurant Web: `http://localhost:3003`
     - Driver App: `http://localhost:3004`
   - `npm run smoke:mvp` (MVP-Journey für alle 4 Rollen)

   Vor oder nach `dev-up` kannst du die lokale Umgebung prüfen mit:

   ```powershell
   powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-local.ps1
   ```

   Dieses Script zeigt Listener/Prozesse und HTTP-Status für:

   - Backend Health `http://localhost:3000/api/health`
   - Admin Panel `http://localhost:3002` und `http://127.0.0.1:3002`
   - Customer Web `http://localhost:5173`
   - Restaurant Web `http://localhost:3003`
   - Driver App `http://localhost:3004`

**Variante B – Smoke-Compose / Go-Live (Backend ohne Host-Mounts):**

Smoke-Compose nutzt `docker-compose.smoke.yml`, das die Backend-Volumes überschreibt (`volumes: []`). Der Container läuft nur mit dem gebauten Image – kein Mount von `./backend/dist` oder `./backend/src`. Das vermeidet veralteten Host-Code (z. B. Metrics-Doppelregistrierung) und entspricht dem Go-Live-Zustand.

1. Aus Repo-Root: `docker compose -f docker-compose.yml -f docker-compose.smoke.yml down --remove-orphans`
2. `docker compose -f docker-compose.yml -f docker-compose.smoke.yml build --no-cache backend`
3. `docker compose -f docker-compose.yml -f docker-compose.smoke.yml up -d`
4. Nach Start (Postgres/Redis healthy): Backend-Seed ggf. nötig: `cd backend && npm run prisma:deploy && npm run prisma:seed` (DATABASE_URL z. B. localhost:5434)
5. Health prüfen: `Invoke-WebRequest http://localhost:3000/api/health -UseBasicParsing`
6. Smoke Test: `npm run smoke:mvp`

Bei BuildKit-Fehlern (z. B. „parent snapshot … does not exist“): `powershell -File .\scripts\docker-reset.ps1`, danach Schritt 2–3 erneut ausführen.

**Variante C – Lokales Backend (ohne Container-Backend):**

1. **Docker starten:** `docker compose up -d` (Postgres, Redis)
2. **Backend:**  
   `cd backend`  
   `.env` anlegen (mind. `DATABASE_URL`, `JWT_SECRET`; für Seed: `SEED_CUSTOMER_PASSWORD`, `SEED_RESTAURANT_PASSWORD`, `SEED_DRIVER_PASSWORD`)  
   `npm run build`  
   `npm run prisma:deploy`  
   `npm run prisma:seed`  
   `npm run start:full`
3. **Smoke Test (neues Terminal, Repo-Root):**  
   `npm run smoke:mvp`

Wenn das Backend läuft und die DB geseeded ist, durchläuft der Smoke Test alle 4 Rollen (Health → Admin → Restaurant/Dish → Customer Register/Login → Restaurants/Dishes → Order erstellen → Restaurant Status PREPARING/READY/READY_FOR_PICKUP → Driver Login → Driver Accept → Driver DELIVERING/DELIVERED → Admin Order + Audit) und endet mit **RESULT: PASS**. Schritt **AdminAudit** kann als SKIP (z. B. 403) erscheinen, wenn der Admin nicht über Berechtigung `audit:read` bzw. Rolle SUPER_ADMIN verfügt; der Gesamtergebnis bleibt PASS. Im Repo-Seed wird `admin@uberfoods.com` als SUPER_ADMIN angelegt – nach `prisma:seed` sollte AdminAudit durchlaufen.

---

## 4 Rollen im Smoke Test

| Rolle      | Schritte im Script |
|-----------|---------------------|
| **Admin** | Login → Token; Restaurant/Dish prüfen; Order-Details; Audit |
| **Customer** | Register, Login → Token; Restaurants public; Dishes; Order erstellen |
| **Restaurant** | Login → Token; Order-Status PREPARING → READY → READY_FOR_PICKUP |
| **Driver** | Login → Token; Available Orders; Accept; Status DELIVERING → DELIVERED |

---

## Kanonische MVP-Endpoints (nach Contract-Fixes)

| Bereich   | Method | Pfad |
|-----------|--------|------|
| Health   | GET    | /api/health |
| Auth     | POST   | /api/auth/login, /api/auth/customer/register, /api/auth/customer/login, /api/auth/restaurant/login, /api/auth/driver/login |
| Restaurants | GET  | /api/restaurants/public |
| Dishes   | GET    | /api/dishes/restaurant/:id (oder /api/restaurants/:id/dishes) |
| Orders   | POST   | /api/orders/customer |
| Orders   | GET    | /api/orders/:id |
| Orders   | PATCH  | /api/orders/:id/status |
| Driver   | GET    | /api/drivers/orders/available oder /api/drivers/:driverId/orders/available |
| Driver   | POST   | /api/drivers/orders/:orderId/accept oder /api/drivers/:driverId/orders/:orderId/accept |
| Driver   | PUT    | /api/drivers/orders/:orderId/status oder /api/drivers/:driverId/orders/:orderId/status |
| Admin    | GET    | /api/admin/orders, /api/admin/audit |

---

## Änderungen (commit-ready)

| Datei | Begründung |
|-------|------------|
| scripts/smoke-mvp.ps1 | PowerShell 5.x: `??` durch `if/else` ersetzt, damit Script unter Windows ohne PS7 läuft. |
| docs/SMOKE-MVP.last-run.log | Log der letzten Smoke-Ausführung (FAIL = Backend nicht erreichbar) und Hinweise für PASS. |
| docs/API-CONTRACT.md | MVP-Matrix Frontend-Calls vs. Backend-Routen; MISMATCHs und kanonische Endpoints. |
| docs/GO-LIVE-STATUS.md | Go-Live-Status, 4 Rollen, kanonische Endpoints, Anleitung für PASS. |
| backend/src/modules/order/driver-endpoints.controller.ts | Alias-Routen für Driver-App: GET/POST/PUT `:driverId/orders/...` delegieren an bestehende Logik (GetUser bleibt Auth). |
