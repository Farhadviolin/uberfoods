# UberFoods Staging Deployment Execution Report

## 1. Deployment-Datum

- Datum: 2026-06-23
- Uhrzeit: _aus Render-Dashboard uebernehmen_

## 2. Git-Stand

- Git-Branch: `master`
- Git-Commit: `349abea9a2873c222cbdb12b532217ffa7225069`

## 3. Letzter gruener CI-Run

- Run-ID: `28016541630`
- Status: `completed`
- Conclusion: `success`

## 4. Render-Deployment-Methode

- Verwendete Methode: _Blueprint ueber `render.yaml`_ oder _manuelle Anlage_
- Blueprint erkannt: _ja/nein_
- Dashboard-Link zum Blueprint-Deploy: _Render-URL hier eintragen_

## 5. Angelegte oder zu pruefende Services

### PostgreSQL

- Name: `uberfoods-staging-postgres`
- Status: _eintragen_
- Public URL: _nicht oeffentlich, falls nicht vorhanden leer lassen_

### Redis

- Name: `uberfoods-staging-redis`
- Status: _eintragen_
- Public URL: _nicht oeffentlich, falls nicht vorhanden leer lassen_

### Backend

- Name: `uberfoods-backend-staging`
- Status: _eintragen_
- URL: _Render-Service-URL hier eintragen_

### Customer-Web

- Name: `uberfoods-customer-web-staging`
- Status: _eintragen_
- URL: _Render-Service-URL hier eintragen_

### Admin-Panel

- Name: `uberfoods-admin-panel-staging`
- Status: _eintragen_
- URL: _Render-Service-URL hier eintragen_

### Restaurant-Web

- Name: `uberfoods-restaurant-web-staging`
- Status: _eintragen_
- URL: _Render-Service-URL hier eintragen_

### Driver-App

- Name: `uberfoods-driver-app-staging`
- Status: _eintragen_
- URL: _Render-Service-URL hier eintragen_

## 6. Service-URLs

- Backend: _Render-Staging-URL eintragen_
- Customer-Web: _Render-Staging-URL eintragen_
- Admin-Panel: _Render-Staging-URL eintragen_
- Restaurant-Web: _Render-Staging-URL eintragen_
- Driver-App: _Render-Staging-URL eintragen_

## 7. Backend-Healthcheck

- Healthcheck-URL: `/api/health`
- Vollstaendige URL: _Render-Backend-URL + `/api/health`_
- Status: _eintragen_
- Antwort: _HTTP-Status und kurze JSON-Antwort eintragen_

## 8. ENV-Variablen je Service

### Backend

- `NODE_ENV`
- `PORT`
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
- `PAYPAL_MODE`
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
- `VITE_APP_ENV`
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
- `VITE_SENTRY_ENVIRONMENT`

### Admin-Panel

- `VITE_API_URL`
- `VITE_WS_URL`
- `VITE_APP_NAME`
- `VITE_APP_TITLE`
- `VITE_SKIP_AUTH`
- `VITE_DEV_AUTH_TOKEN`
- `VITE_SENTRY_DSN`
- `VITE_SENTRY_ENVIRONMENT`

### Restaurant-Web

- `VITE_API_URL`
- `VITE_WS_URL`
- `VITE_APP_NAME`
- `VITE_SENTRY_DSN`
- `VITE_SENTRY_ENVIRONMENT`

### Driver-App

- `VITE_API_URL`
- `VITE_WS_URL`
- `VITE_APP_NAME`
- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_APP_VERSION`
- `VITE_SENTRY_DSN`
- `VITE_SENTRY_ENVIRONMENT`

## 9. Prisma-Migration

- Ausgefuehrt: _ja/nein_
- Command: `npm run prisma:migrate:deploy`
- Ergebnis: _eintragen_
- Hinweis: nicht gegen Production ausfuehren

## 10. Frontend-Deployments

- Customer-Web: _Status und URL eintragen_
- Admin-Panel: _Status und URL eintragen_
- Restaurant-Web: _Status und URL eintragen_
- Driver-App: _Status und URL eintragen_

## 11. CORS-Pruefung

- Erwartete Origins:
  - `https://uberfoods-customer-web-staging.onrender.com`
  - `https://uberfoods-admin-panel-staging.onrender.com`
  - `https://uberfoods-restaurant-web-staging.onrender.com`
  - `https://uberfoods-driver-app-staging.onrender.com`
- Ergebnis: _eintragen_

## 12. WebSocket-Pruefung

- Backend WebSocket-URL: _eintragen_
- Customer-Web Ergebnis: _eintragen_
- Admin-Panel Ergebnis: _eintragen_
- Restaurant-Web Ergebnis: _eintragen_
- Driver-App Ergebnis: _eintragen_

## 13. Stripe-Testmodus

- Pruefung: nur Test- oder Staging-Werte verwendet
- Ergebnis: _eintragen_
- Relevante Variablen: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_FULLTIME`, `STRIPE_PRICE_ENTERPRISE`, `VITE_STRIPE_PUBLISHABLE_KEY`

## 14. PayPal-Sandbox

- Pruefung: Sandbox aktiviert
- Ergebnis: _eintragen_
- Relevante Variablen: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_MODE=sandbox`

## 15. Smoke-Test-Ergebnis

- Backend Healthcheck: _eintragen_
- Customer-Web laedt: _eintragen_
- Register/Login: _eintragen_
- Warenkorb: _eintragen_
- Checkout: _eintragen_
- Restaurant Order sichtbar: _eintragen_
- Driver Order sichtbar: _eintragen_
- Admin Dashboard sichtbar: _eintragen_
- Full Order Lifecycle: _eintragen_

## 16. Kritische Browser-Console-Fehler

- Ja/Nein: _eintragen_
- Details: _falls ja, kurz vermerken_

## 17. Kritische Network-Fehler

- Ja/Nein: _eintragen_
- Details: _falls ja, kurz vermerken_

## 18. Blocker

- Ja/Nein: _eintragen_
- Beschreibung: _falls ja, kurz vermerken_

## 19. Go / No-Go

- Web-Staging live: _ja/nein_
- Production freigegeben: nein
- Mobile freigegeben: nein

## 20. Render-Dashboard-Schritte

1. Render oeffnen.
2. GitHub-Repository `Farhadviolin/uberfoods` verbinden.
3. Branch `master` auswaehlen.
4. Blueprint ueber `render.yaml` erkennen lassen.
5. Services pruefen.
6. PostgreSQL und Redis erstellen lassen.
7. Backend-Service erstellen.
8. Vier Frontend-Services erstellen.
9. ENV-Variablen manuell in Render setzen.
10. Deploy starten.
11. Backend-Logs pruefen.
12. Prisma Migration ausfuehren, falls nicht automatisch im Startprozess vorgesehen.
13. Staging-URLs erfassen.
14. Healthcheck ausfuehren.
15. Smoke-Test durchfuehren.

## 21. Werte, die aus Render zu kopieren sind

- Oeffentliche Service-URLs
- Backend-Healthcheck-Antwort
- Status jeder Service-Revision
- Bestimmte Fehlermeldungen aus den Logs
- Ergebnis der Prisma-Migration
- Ergebnis des Smoke-Tests

## 22. Abschlussnotiz

- Render-Dashboard automatisch erreichbar: _ja/nein_
- Blueprint-Deployment gestartet: _ja/nein_
- Services angelegt: _ja/nein_
- Blocker gefunden: _ja/nein_
- Web-Staging live: _ja/nein_
- Production weiterhin nicht freigegeben: ja
- Mobile weiterhin nicht freigegeben: ja

