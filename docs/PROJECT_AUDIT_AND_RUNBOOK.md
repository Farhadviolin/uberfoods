# UberFoods Project Audit and Runbook

Datum: 2026-06-05

## Projektüberblick

UberFoods ist eine Multi-App Delivery-Plattform mit einem NestJS-Backend und vier aktiven Frontends:

- Admin Panel: Plattformverwaltung, Reporting, Exporte, Benutzer, Restaurants, Fahrer, Bestellungen.
- Customer Web: Restaurantliste, Warenkorb, Checkout, Bestellung, Profil, Bestellhistorie.
- Restaurant Web: Restaurant-Dashboard, Menüs, Bestellungen, Statusänderungen, Umsatz/Profil.
- Driver App: Fahrerlogin, verfügbare Aufträge, Annahme, Statusupdates, Historie, Verdienst.

Das Backend stellt REST-APIs unter `/api` bereit, nutzt Prisma/PostgreSQL als Datenbankzugriff, Redis für skalierbare Live-Funktionen und JWT für Rollen-Authentifizierung.

## Architektur

- Backend: `backend/src`, NestJS-Module in `backend/src/modules`, gemeinsame Infrastruktur in `backend/src/common`.
- Datenbank: Prisma-Schema in `backend/prisma/schema.prisma`.
- Migrationen: `backend/prisma/migrations/0001_initial/migration.sql` als Initial-Migration plus `migration_lock.toml`.
- Frontends: Vite/React-Apps unter `frontend/admin-panel`, `frontend/customer-web`, `frontend/restaurant-web`, `frontend/driver-app`.
- Shared UI/Services: `frontend/shared-design-system` und `shared`.
- Lokale Infrastruktur: `docker-compose.smoke.yml` für Postgres, Redis und optional Backend.
- Smoke-Flow: `scripts/smoke-mvp.ps1` prüft eine echte 4-Rollen-Business-Journey.

## Teststrategie

- Schnelle Regression: `npm run typecheck`, `npm run build`, `npm run test:smoke`.
- Backend-Full-Suite: `npm --prefix backend run test:backend`.
- Open-Handle-Analyse: `npm --prefix backend run test:backend:detect-open-handles`.
- Zielgerichtete Specs: einzelne kontrollierte Tests wie der Payment-Webhook-Test.
- Smoke-Tests laufen gegen echte Services mit Seed-Daten und prüfen den Kernfluss der vier Rollen.

## Jest-Hang-Ursache und Lösung

Die größere Backend-Suite hatte früher offene Handles durch Hintergrund- und Infrastruktur-Initialisierung:

- `MetricsService` startete Default-Metriken auch im Testprozess.
- `WebSocketMonitoringService` hielt zwei `setInterval()`-Timer ohne Teardown.

Die Lösung:

- Default-Metriken werden in `NODE_ENV=test` übersprungen.
- Der WebSocket-Monitor speichert Timer-Handles und räumt sie in `onModuleDestroy()` auf.
- Die Prometheus-Registry wird im Testkontext bereinigt.

## Prisma-Migrationen

- Initial-Migration vorhanden: `backend/prisma/migrations/0001_initial/migration.sql`.
- Prisma-Lockfile vorhanden: `backend/prisma/migrations/migration_lock.toml`.
- Für bestehende lokale Datenbanken bleibt `db push` als Fallback dokumentiert.
- Für CI und Produktion ist `prisma migrate deploy` der Standardweg.

## Lokaler, CI- und Produktions-Setup-Weg

- Lokal frisch: `npm --prefix backend run prisma:migrate:dev` oder bei leerem Schema `npm --prefix backend run prisma:db:push`.
- Lokal mit bestehender DB: zuerst `npm --prefix backend run prisma:migrate:deploy`, bei Konflikten kontrolliert `npm --prefix backend run prisma:db:push`.
- CI: Migrationen vor den Tests mit `npm --prefix backend run prisma:migrate:deploy`, danach `npm run test:smoke` und die Backend-Suite.
- Produktion: nur `npm --prefix backend run prisma:migrate:deploy`, keine automatische `db push`-Änderung.

## Module

Wichtige Backend-Module:

- `auth`: Admin, Customer, Restaurant und Driver Login/Register, JWT, Sessions, Passwortwechsel.
- `admin`: Admin-Dashboard, Benutzer, Kunden, Restaurants, Dishes, Fahrer, Bestellungen, Export, Monitoring.
- `restaurant`: öffentliche Restaurantliste, Restaurantdetails, Status, Öffnungszeiten.
- `dish`: Dishes/Menüs je Restaurant.
- `order`: Bestellung erstellen, Status ändern, Driver/Admin/Customer-Zugriff, Payment-bezogene Order-Endpunkte.
- `driver`: Fahrerprofil, verfügbare Aufträge, Annahme, Statusupdates, Subscription/Performance.
- `payment`: Stripe/PayPal/Mock Payment, Webhook-Controller.
- `websocket` und `unified-notifications`: Live-Updates und Ereignisse.
- `common/services/push-notification`: Web-Push/VAPID, jetzt in der Standard-App eingebunden.

## Rollen

- Admin: Seed `admin@uberfoods.com` / `admin123`, Rolle `SUPER_ADMIN`.
- Customer: Seed `customer@uberfoods.local` / `customer123`.
- Restaurant: Seed `restaurant@uberfoods.local` / `restaurant123`.
- Driver: Seed `driver@uberfoods.local` / `driver123`.

Lokale Seed-Passwörter werden nur verwendet, wenn `SEED_ALLOW_DEFAULTS=true` und `NODE_ENV` nicht `production` ist.

## ENV-Variablen

Minimal lokal:

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres123@localhost:5434/uberfoods"
$env:REDIS_URL = "redis://localhost:6379"
$env:JWT_SECRET = "your-super-secret-jwt-key-for-dev"
$env:NODE_ENV = "development"
$env:SEED_ALLOW_DEFAULTS = "true"
$env:SEED_CUSTOMER_PASSWORD = "customer123"
$env:SEED_RESTAURANT_PASSWORD = "restaurant123"
$env:SEED_DRIVER_PASSWORD = "driver123"
```

Production zusätzlich:

- `ALLOWED_ORIGINS`
- `JWT_REFRESH_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_BASIC`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_FULLTIME`
- `STRIPE_PRICE_ENTERPRISE`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- SMTP/SMS/Maps/Sentry/VAPID je nach aktivierter Integration.

Keine echten Secrets ins Repository schreiben.

Vorlagen:

- `/.env.example`
- `backend/.env.example`
- `frontend/customer-web/.env.example`
- `frontend/admin-panel/.env.example`
- `frontend/restaurant-web/.env.example`
- `frontend/driver-app/.env.example`

## Windows PowerShell Startbefehle

Installation:

```powershell
npm ci
npm --prefix backend ci
npm --prefix frontend/admin-panel ci
npm --prefix frontend/customer-web ci
npm --prefix frontend/restaurant-web ci
npm --prefix frontend/driver-app ci
```

Postgres und Redis starten:

```powershell
docker compose -f docker-compose.smoke.yml up -d postgres redis
```

Datenbank synchronisieren und seeden:

```powershell
cd backend
$env:DATABASE_URL = "postgresql://postgres:postgres123@localhost:5434/uberfoods"
$env:SEED_ALLOW_DEFAULTS = "true"
$env:SEED_CUSTOMER_PASSWORD = "customer123"
$env:SEED_RESTAURANT_PASSWORD = "restaurant123"
$env:SEED_DRIVER_PASSWORD = "driver123"
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { npx prisma db push --schema=./prisma/schema.prisma }
npm run prisma:seed
```

Backend starten:

```powershell
cd backend
$env:DATABASE_URL = "postgresql://postgres:postgres123@localhost:5434/uberfoods"
$env:REDIS_URL = "redis://localhost:6379"
$env:JWT_SECRET = "your-super-secret-jwt-key-for-dev"
$env:NODE_ENV = "development"
npm run start:full
```

Frontends starten:

```powershell
npm --prefix frontend/admin-panel run dev:fixed
npm --prefix frontend/customer-web run dev
npm --prefix frontend/restaurant-web run dev
npm --prefix frontend/driver-app run dev
```

Lokaler Full-UI-E2E-Lauf:

```powershell
npm run dev:admin
npm --prefix frontend/customer-web run dev
npm --prefix frontend/restaurant-web run dev
npm --prefix frontend/driver-app run dev
npm run test:e2e:full
```

Wichtig: Fuer diesen Lauf muss das Admin-Panel im normalen Dev-Modus laufen. `dev:e2e` ist hier nicht der richtige Startmodus, weil der lokale Full-UI-E2E-Pfad die Admin-API direkt gegen das Backend auf Port 3000 erwartet.

Tests:

```powershell
npm run typecheck
npm run build
npm run test:smoke
npm --prefix backend run test:backend
npm --prefix backend run test:backend:detect-open-handles
npm --prefix backend test -- --runInBand src/modules/payment/__tests__/payment-webhook.controller.spec.ts
```

Vollständiger Smoke mit Docker-Backend:

```powershell
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File scripts/smoke-up.ps1
```

## Vollständig Geprüfte Features

- Backend Build: bestanden.
- Backend-Jest-Suite mit `--detectOpenHandles`: bestanden.
- Admin Panel Build und Typecheck: bestanden.
- Customer Web Build und Typecheck: bestanden.
- Restaurant Web Build und Typecheck: bestanden.
- Driver App Build: bestanden.
- Payment Webhook Unit-Test: bestanden.
- MVP Business Smoke gegen echte API/Postgres/Redis: bestanden.
- Prisma-Generate: bestanden.
- Push-Notification-Web-Abo API-Verbindung: Backend-Route und Frontend-Unsubscribe repariert, Build bestanden.

## Bekannte Einschränkungen

- `backend/prisma/migrations` enthält jetzt eine Initial-Migration; `db push` bleibt nur als lokaler Fallback für Schema-Abweichungen.
- Der gesamte Backend-Jest-Lauf beendet sich jetzt sauber; vorherige Open-Handle-Ursachen wurden behoben.
- Der Docker-Image-Smoke kann beim Backend-Image-Build länger als 4 Minuten dauern. Für schnelle lokale Flow-Prüfung ist der Postgres/Redis-only Flow dokumentiert.
- Viele Advanced-Frontend-Flächen haben Fallbacks für optionale Backend-Module. Sie sind buildfähig, aber nicht alle Buttons sind im MVP-Smoke automatisiert abgedeckt.
- Der lokale Full-UI-E2E-Lauf nutzt das Admin-Panel im normalen Dev-Modus auf Port 3002, nicht den `dev:e2e`-Proxy-Modus.

## Noch Offene Manuelle Prüfungen

- Vollständiges Klick-E2E für jeden Admin-Button und jede Tabelle.
- Stripe/PayPal mit echten Test-Credentials und Provider-Dashboards.
- WebSocket-UI-Sichtprüfung in mehreren Browsern.
- Mobile visuelle QA für Customer Web, Restaurant Web und Driver App.
- Production Deployment mit echten `ALLOWED_ORIGINS`, HTTPS, Webhook-URLs und Secrets.
- CI-Pipeline einmal end-to-end gegen frische Datenbank und Redis validieren.
- Release-Checkliste: `docs/PRODUCTION_RELEASE_CHECKLIST.md`

## Feature-Tabelle

| Feature | Frontend-Dateien | Backend-Dateien | API | Status vorher | Änderung | Status nachher | Testbefehl |
|---|---|---|---|---|---|---|---|
| Admin Login | `frontend/admin-panel/src/contexts/AuthContext.tsx`, `frontend/admin-panel/src/utils/api.ts` | `backend/src/modules/auth/auth.controller.ts`, `backend/src/modules/auth/auth.service.ts` | `POST /api/auth/login` | Vorhanden, buildfähig | Flow gegen echte API geprüft | Funktionsfähig | `npm run test:smoke` |
| Customer Register/Login | `frontend/customer-web/src/contexts/AuthContext.tsx`, `frontend/customer-web/src/utils/api.ts` | `backend/src/modules/auth/auth.controller.ts`, `backend/src/modules/auth/auth.service.ts` | `POST /api/auth/customer/register`, `POST /api/auth/customer/login` | Vorhanden | Flow gegen echte API geprüft | Funktionsfähig | `npm run test:smoke` |
| Restaurantliste laden | `frontend/customer-web/src/hooks/useRestaurants.ts`, `frontend/customer-web/src/components/RestaurantList.tsx` | `backend/src/modules/restaurant/restaurant.controller.ts`, `backend/src/modules/restaurant/restaurant.service.ts` | `GET /api/restaurants/public` | Vorhanden | Seed und Flow geprüft | Funktionsfähig | `npm run test:smoke` |
| Produktliste laden | `frontend/customer-web/src/components/Menu.tsx`, `frontend/restaurant-web/src/hooks/useMenu.ts` | `backend/src/modules/dish/dish.controller.ts`, `backend/src/modules/restaurant/restaurant.controller.ts` | `GET /api/dishes/restaurant/:restaurantId` | Vorhanden | Seed-Dishes geprüft | Funktionsfähig | `npm run test:smoke` |
| Bestellung erstellen | `frontend/customer-web/src/components/Checkout.tsx`, `frontend/customer-web/src/components/Cart.tsx` | `backend/src/modules/order/order.controller.ts`, `backend/src/modules/order/order.service.ts` | `POST /api/orders/customer` | Vorhanden | Echte Order-Erstellung geprüft | Funktionsfähig | `npm run test:smoke` |
| Restaurant Status ändern | `frontend/restaurant-web/src/hooks/useOrders.ts` | `backend/src/modules/order/order.controller.ts`, `backend/src/modules/order/order.service.ts` | `PATCH /api/orders/:id/status` | Vorhanden | PREPARING, READY, READY_FOR_PICKUP geprüft | Funktionsfähig | `npm run test:smoke` |
| Driver Login | `frontend/driver-app/src/contexts/AuthContext.tsx` | `backend/src/modules/auth/auth.controller.ts`, `backend/src/modules/auth/auth.service.ts` | `POST /api/auth/driver/login` | Vorhanden | Flow gegen Seed-Fahrer geprüft | Funktionsfähig | `npm run test:smoke` |
| Driver sieht Auftrag | `frontend/driver-app/src/services/driverService.ts` | `backend/src/modules/driver/driver.controller.ts`, `backend/src/modules/admin/admin.controller.ts` | `GET /api/drivers/orders/available` | Vorhanden | Verfügbare Order geprüft | Funktionsfähig | `npm run test:smoke` |
| Driver nimmt Auftrag an | `frontend/driver-app/src/services/driverService.ts` | `backend/src/modules/driver/driver.controller.ts`, `backend/src/modules/order/order.service.ts` | `POST /api/drivers/orders/:orderId/accept` | Vorhanden | Annahme geprüft | Funktionsfähig | `npm run test:smoke` |
| Driver liefert Bestellung | `frontend/driver-app/src/services/driverService.ts` | `backend/src/modules/driver/driver.controller.ts`, `backend/src/modules/order/order.service.ts` | `PUT /api/drivers/orders/:orderId/status` | Vorhanden | DELIVERING und DELIVERED geprüft | Funktionsfähig | `npm run test:smoke` |
| Admin sieht Bestellung | `frontend/admin-panel/src/components/OrdersManagement.tsx` | `backend/src/modules/order/order.controller.ts`, `backend/src/modules/admin/admin.controller.ts` | `GET /api/orders/:id`, `GET /api/admin/audit` | Vorhanden | Order-Detail und Audit geprüft | Funktionsfähig | `npm run test:smoke` |
| Payment Webhook | `frontend/customer-web/src/components/Payment.tsx` | `backend/src/modules/payment/payment-webhook.controller.ts`, `backend/src/modules/payment/payment.service.ts` | `POST /api/payment/webhook` | Vorhanden | Gezielten Unit-Test ausgeführt | Funktionsfähig im getesteten Webhook-Pfad | `npm --prefix backend test -- --runInBand src/modules/payment/__tests__/payment-webhook.controller.spec.ts` |
| Web Push Subscribe/Unsubscribe | `frontend/customer-web/src/services/notificationService.ts` | `backend/src/common/controllers/push-notification.controller.ts`, `backend/src/common/services/push-notification.module.ts`, `backend/src/app.module.ts` | `POST /api/notifications/subscribe`, `POST /api/notifications/unsubscribe` | Defekt: Routen nicht in Standard-App, Unsubscribe sendete `null` | Modul importiert, Alias-Routen ergänzt, Unsubscribe-Payload repariert | Buildfähig und API-konform | `npm --prefix backend run build`; `npm --prefix frontend/customer-web run build` |
| Root-Verifikation | `package.json`, `scripts/verify-local-no-docker.ps1`, `scripts/smoke-up.ps1` | `backend/prisma/schema.prisma`, `backend/prisma/seed.ts` | n/a | Teilweise defekt: Root `build`/`typecheck` fehlten, Smoke-DB-Fallback fehlte | Root-Skripte ergänzt, DB-Push-Fallback dokumentiert/geskriptet | Reproduzierbar | `npm run typecheck`; `npm run test:smoke` |
| Backend Jest Hang | `backend/src/common/services/metrics.service.ts`, `backend/src/common/services/websocket-monitoring.service.ts` | n/a | n/a | Suite hing länger als 120 Sekunden | Test-only Metrics deaktiviert, Interval-Teardown ergänzt | Behoben | `npm --prefix backend run test:backend:detect-open-handles` |
| Prisma Migrationen | n/a | `backend/prisma/migrations/0001_initial/migration.sql`, `backend/prisma/migrations/migration_lock.toml` | `prisma migrate deploy`, `prisma db push` | Keine Migrationen vorhanden | Initial-Migration und Lockfile ergänzt | CI-/Prod-fähig | `npm --prefix backend run prisma:migrate:deploy` |

## Aktualisierter Stand 2026-06-06

- Die sechs P1-Fixes sind abgeschlossen.
- `npm run test:e2e:full` ist gruen.
- Der lokale Full-UI-E2E-Lauf nutzt fuer das Admin-Panel den normalen Dev-Modus, nicht `dev:e2e`.
- Der Production-Docker-Backend-Container startet mit `dist/main.prod.js` und beantwortet `GET /api/health`.
- Der naechste technische Schwerpunkt ist jetzt die Docker-/Production-Runtime-Pruefung in Staging.
