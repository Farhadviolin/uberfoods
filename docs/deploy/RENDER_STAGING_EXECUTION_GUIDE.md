# UberFoods Render Staging Execution Guide

## 1. Voraussetzungen

- Letzter gruener CI-Run: `28012900796`
- Branch: `master`
- Commit-Stand: `1c91e8d885eff5d9dc6e93a0125999a0f1297703`
- Web-Staging ist freigegeben
- Mobile-Repositories bleiben separat und werden hier nicht angefasst

## 2. Zielarchitektur

Die Render-Staging-Umgebung besteht aus:

- PostgreSQL
- Redis
- Backend
- Customer-Web
- Admin-Panel
- Restaurant-Web
- Driver-App

Die Datei `render.yaml` ist die Blueprint-Vorlage fuer diese Struktur. Sie ist
bewusst als sichere Staging-Konfiguration aufgebaut und speichert keine echten Secrets.

## 3. Blueprint-Deployment in Render

### 3.1 Repository verbinden

1. Render Dashboard oeffnen.
2. Ein neues Blueprint-Deployment starten.
3. Dieses GitHub-Repository verbinden.
4. Branch `master` auswaehlen.
5. Blueprint-Erkennung aktivieren, damit `render.yaml` gelesen wird.
6. Deployment starten und die erzeugten Services kontrollieren.

### 3.2 Was Render aus `render.yaml` erzeugen soll

- `uberfoods-staging-postgres`
- `uberfoods-staging-redis`
- `uberfoods-backend-staging`
- `uberfoods-customer-web-staging`
- `uberfoods-admin-panel-staging`
- `uberfoods-restaurant-web-staging`
- `uberfoods-driver-app-staging`

### 3.3 Woran die Erzeugung erkannt wird

- PostgreSQL und Redis werden als eigene Infrastruktur-Services angelegt.
- Das Backend wird als Web Service angelegt.
- Die vier Frontends werden als Static Sites bzw. static Web Services angelegt.
- Die Publish-Pfade zeigen auf die jeweiligen `dist`-Ordner.

## 4. Manuelle Service-Anlage, falls Blueprint nicht greift

Wenn das Blueprint-Deployment nicht vollstaendig greift, werden die Services
manuell im Render Dashboard angelegt.

### Backend Web Service

- Root Directory: `backend`
- Build Command: `npm ci && npm run build`
- Start Command: `npm run start:prod`
- Pre-Deploy Command: `npm run prisma:migrate:deploy`
- Healthcheck: `/api/health`

### Customer-Web Static Site

- Root Directory: `frontend/customer-web`
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`

### Admin-Panel Static Site

- Root Directory: `frontend/admin-panel`
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`

### Restaurant-Web Static Site

- Root Directory: `frontend/restaurant-web`
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`

### Driver-App Static Site

- Root Directory: `frontend/driver-app`
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`

### PostgreSQL

- Datenbankname: Staging-Namen verwenden
- Keine Produktionsdaten uebernehmen
- Keine Migrationen ohne Backend-Kompatibilitaet ausfuehren

### Redis

- Als Key-Value-Service fuer Staging anlegen
- Keine produktiven Persistenzdaten importieren

## 5. Build Commands je Service

- Backend: `npm ci && npm run build`
- Customer-Web: `npm ci && npm run build`
- Admin-Panel: `npm ci && npm run build`
- Restaurant-Web: `npm ci && npm run build`
- Driver-App: `npm ci && npm run build`

## 6. Start Commands je Service

- Backend: `npm run start:prod`
- Customer-Web: kein Start Command fuer Render Static Site erforderlich
- Admin-Panel: kein Start Command fuer Render Static Site erforderlich
- Restaurant-Web: kein Start Command fuer Render Static Site erforderlich
- Driver-App: kein Start Command fuer Render Static Site erforderlich

## 7. Publish Directories

- Customer-Web: `frontend/customer-web/dist`
- Admin-Panel: `frontend/admin-panel/dist`
- Restaurant-Web: `frontend/restaurant-web/dist`
- Driver-App: `frontend/driver-app/dist`

## 8. ENV-Variablen ohne echte Werte

### Backend

- `NODE_ENV=production`
- `PORT=3000`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ALLOWED_ORIGINS`
- `FRONTEND_CUSTOMER_URL`
- `FRONTEND_ADMIN_URL`
- `FRONTEND_RESTAURANT_URL`
- `FRONTEND_DRIVER_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_BASIC`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_FULLTIME`
- `STRIPE_PRICE_ENTERPRISE`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_MODE=sandbox`
- `APPLE_MERCHANT_ID`
- `GOOGLE_PAY_MERCHANT_ID`
- `SENDGRID_API_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`
- `SMTP_FROM_NAME`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `SUPPORT_PHONE`

### Customer-Web

- `VITE_API_BASE_URL`
- `VITE_WS_URL`
- `VITE_APP_ENV=staging`
- `VITE_APP_NAME`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_ENABLE_SOCIAL_FEATURES`
- `VITE_ENABLE_VOICE_ASSISTANT`
- `VITE_ENABLE_GAMIFICATION`
- `VITE_ENABLE_ANALYTICS`
- `VITE_ENABLE_NOTIFICATIONS`
- `VITE_ENABLE_GEOCODING`
- `VITE_SENTRY_DSN`
- `VITE_SENTRY_ENVIRONMENT=staging`

### Admin-Panel

- `VITE_API_URL`
- `VITE_WS_URL`
- `VITE_APP_NAME`
- `VITE_APP_TITLE`
- `VITE_SKIP_AUTH`
- `VITE_DEV_AUTH_TOKEN`
- `VITE_SENTRY_DSN`
- `VITE_SENTRY_ENVIRONMENT=staging`

### Restaurant-Web

- `VITE_API_URL`
- `VITE_WS_URL`
- `VITE_APP_NAME`
- `VITE_SENTRY_DSN`
- `VITE_SENTRY_ENVIRONMENT=staging`

### Driver-App

- `VITE_API_URL`
- `VITE_WS_URL`
- `VITE_APP_NAME`
- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_APP_VERSION`
- `VITE_SENTRY_DSN`
- `VITE_SENTRY_ENVIRONMENT=staging`

## 9. CORS-Origin-Matrix

Das Backend soll nur diese vier Staging-Origins erlauben:

- `https://uberfoods-customer-web-staging.onrender.com`
- `https://uberfoods-admin-panel-staging.onrender.com`
- `https://uberfoods-restaurant-web-staging.onrender.com`
- `https://uberfoods-driver-app-staging.onrender.com`

## 10. WebSocket-URL-Matrix

- Customer-Web: `https://uberfoods-backend-staging.onrender.com`
- Admin-Panel: `https://uberfoods-backend-staging.onrender.com`
- Restaurant-Web: `https://uberfoods-backend-staging.onrender.com`
- Driver-App: `https://uberfoods-backend-staging.onrender.com`

## 11. Stripe-Testmodus

Folgende Werte muessen in Render gesetzt werden, aber ohne echte Live-Keys:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_BASIC`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_FULLTIME`
- `STRIPE_PRICE_ENTERPRISE`
- `VITE_STRIPE_PUBLISHABLE_KEY`

Nur Test- oder Staging-Werte verwenden.

## 12. PayPal-Sandbox

Folgende Werte muessen in Render gesetzt werden, aber nur als Sandbox:

- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_MODE=sandbox`

## 13. Prisma Migration

- Migration erst nach erfolgreichem Backend-Deploy und mit passender Staging-Datenbank ausfuehren.
- Verwendeter Command: `npm run prisma:migrate:deploy`
- Niemals gegen Production ausfuehren.
- Wenn Schema und App-Artefakte nicht zusammenpassen, zuerst App-Kompatibilitaet pruefen.

## 14. Healthcheck

- Backend Healthcheck URL: `/api/health`
- Erwartung: HTTP 200 mit gesundem Backend-Status

## 15. Smoke-Test nach Deployment

Mindestens diese Pfade pruefen:

- Customer-Web laedt
- Registrierung und Login funktionieren
- Warenkorb funktioniert
- Checkout funktioniert
- Restaurant sieht Bestellungen
- Driver sieht Bestellungen
- Admin Dashboard ist sichtbar
- Full Order Lifecycle laeuft durch

## 16. Rollback

- Vorherigen Commit wieder ausrollen
- Render Deployment Rollback nutzen
- Wenn eine DB-Migration live ging, zuerst Schema-Kompatibilitaet pruefen
- DB-Rollback nur geplant und niemals blind

## 17. Go/No-Go

- Web-Staging ausfuehrbar: ja
- Production freigegeben: nein
- Mobile freigegeben: nein

## 18. Was hier nicht passiert

- Keine echten Secrets werden ins Repo geschrieben
- Keine Mobile-Repositories werden geaendert
- Keine App-Logik wird geaendert
- Keine Tests werden geaendert
