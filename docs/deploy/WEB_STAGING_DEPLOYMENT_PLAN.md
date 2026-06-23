# UberFoods Web-Staging Deployment Plan

## 1. Ausgangslage

- Aktueller Branch: `codex/local-release-check`
- Aktueller Commit vor dieser Aenderung: `4110168`
- Commit-Message: `fix(lifecycle-e2e): stabilize final order submit`
- Letzter gruener CI-Run: `28009537200`
- Run-URL: https://github.com/Farhadviolin/uberfoods/actions/runs/28009537200
- Run-Status: `completed`
- Conclusion: `success`
- Freigegebene Web-Komponenten:
  - Backend
  - Customer-Web
  - Admin-Panel
  - Restaurant-Web
  - Driver-App
- Nicht freigegebene Komponenten:
  - Mobile Customer App
  - Mobile Driver App

## 2. Plattform-Entscheidung

- Render Blueprint sinnvoll: ja
- Railway Setup sinnvoll: nein, nicht als bevorzugter Pfad fuer dieses Repository
- Docker Compose fuer Staging sinnvoll: ja, als lokale bzw. vorgelagerte Integrations- und Smoke-Umgebung

Begruendung:
- Es existiert bereits eine `render.yaml` als tragfaehige Basis.
- Die Web-Apps sind als Vite-Frontends und statischer Output deploybar.
- Das Backend ist ein eigenstaendiger NestJS-Service mit klaren Build- und Startkommandos.
- Die Staging-Umgebung braucht PostgreSQL, Redis und vier getrennte Web-Services, was Render gut abbildet.

## 3. Empfohlene Staging-Service-Struktur

### Render / Hosting

- PostgreSQL
- Redis
- Backend-Service
- Customer-Web-Service
- Admin-Panel-Service
- Restaurant-Web-Service
- Driver-App-Service

### Lokale Staging-Vorschau

- `docker-compose.staging.yml` fuer PostgreSQL, Redis und Backend
- Frontends separat als Build-Artefakte oder static preview pruefen

## 4. Build-, Start- und Migrations-Kommandos

### Backend

- Build: `npm ci && npm run build`
- Start: `npm run start:prod`
- Healthcheck: `GET /api/health`
- Prisma Migration: `npx prisma migrate deploy`
- Prisma Generate: `npm run prisma:generate`

### Customer-Web

- Build: `npm ci && npm run build`
- Start in Render: statischer Service, kein eigener Startbefehl noetig
- Lokale Preview: `npm run preview`

### Admin-Panel

- Build: `npm ci && npm run build`
- Start in Render: statischer Service, kein eigener Startbefehl noetig
- Lokale Preview: `npm run preview`

### Restaurant-Web

- Build: `npm ci && npm run build`
- Start in Render: statischer Service, kein eigener Startbefehl noetig
- Lokale Preview: `npm run preview`

### Driver-App

- Build: `npm ci && npm run build`
- Start in Render: statischer Service, kein eigener Startbefehl noetig
- Lokale Preview: `npm run preview`

## 5. Technische Bewertung

### Backend-Staging-Faehigkeit

- Startscript vorhanden: ja
- Buildscript vorhanden: ja
- Prisma Generate: ja
- Prisma Migrate Deploy: ja
- Healthcheck-Endpunkt vorhanden: ja, `/api/health`
- Port-Konfiguration: `PORT`, Default im Code `3000`
- CORS-Konfiguration: ueber `ALLOWED_ORIGINS`
- Redis-Anbindung: ueber `REDIS_URL` oder `REDIS_SOCKET_URL`
- Auth-Signatur: `JWT_SECRET` erforderlich
- Stripe-Testvariablen: vorhanden und im Staging als Platzhalter einzuplanen
- PayPal-Sandboxvariablen: vorhanden und im Staging als Platzhalter einzuplanen

### Frontend-Staging-Faehigkeit

- Customer-Web:
  - Buildscript vorhanden: ja
  - Preview/Startscript vorhanden: ja
  - API-Base-URL: `VITE_API_BASE_URL`
  - WebSocket-URL: `VITE_WS_URL` oder aus der API-URL ableitbar
  - Output-Ordner nach Build: `dist`
  - Vite-freundlich: ja
- Admin-Panel:
  - Buildscript vorhanden: ja
  - Preview/Startscript vorhanden: ja
  - API-URL: `VITE_API_URL`
  - WebSocket-URL: `VITE_WS_URL`
  - Output-Ordner nach Build: `dist`
  - Vite-freundlich: ja
- Restaurant-Web:
  - Buildscript vorhanden: ja
  - Preview/Startscript vorhanden: ja
  - API-URL: `VITE_API_URL`
  - WebSocket-URL: `VITE_WS_URL`
  - Output-Ordner nach Build: `dist`
  - Vite-freundlich: ja
- Driver-App:
  - Buildscript vorhanden: ja
  - Preview/Startscript vorhanden: ja
  - API-URL: `VITE_API_URL`
  - WebSocket-URL: `VITE_WS_URL`
  - Output-Ordner nach Build: `dist`
  - Vite-freundlich: ja

## 6. Vorhandene ENV-Dateien

### Vorhandene `.env.example`-Dateien

- `backend/.env.example`
- `frontend/customer-web/.env.example`
- `frontend/admin-panel/.env.example`
- `frontend/restaurant-web/.env.example`
- `frontend/driver-app/.env.example`
- Root: `.env.example`
- Root: `.env.e2e.example`

### Fehlende `.env.example`-Dateien

- Keine fuer die Web-Apps im Root-Repository erkannt

### Echte `.env`-Dateien vorhanden

- `backend/.env`
- `mobile/customer-app/.env`
- `mobile/customer-app/.env.local`
- `mobile/driver-app/.env.local`

Hinweis:
- Es wurden keine Inhalte echter `.env`-Dateien ausgegeben.
- Die mobilen `.env`-Dateien bleiben ausserhalb dieses Web-Staging-Scopings.

## 7. Benoetigte ENV-Variablen ohne echte Werte

### Backend

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ALLOWED_ORIGINS`
- `ENABLE_SWAGGER`
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT`
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
- `FRONTEND_CUSTOMER_URL`
- `FRONTEND_ADMIN_URL`
- `FRONTEND_RESTAURANT_URL`
- `FRONTEND_DRIVER_URL`

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

### Driver-App

- `VITE_API_URL`
- `VITE_WS_URL`
- `VITE_APP_NAME`
- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_APP_VERSION`

## 8. CORS-Origin-Matrix

Empfohlene Staging-Origins:

- Backend erlaubt:
  - `https://customer-web-staging.onrender.com`
  - `https://admin-panel-staging.onrender.com`
  - `https://restaurant-web-staging.onrender.com`
  - `https://driver-app-staging.onrender.com`

- Customer-Web spricht mit:
  - Backend: `https://backend-web-staging.onrender.com`

- Admin-Panel spricht mit:
  - Backend: `https://backend-web-staging.onrender.com`

- Restaurant-Web spricht mit:
  - Backend: `https://backend-web-staging.onrender.com`

- Driver-App spricht mit:
  - Backend: `https://backend-web-staging.onrender.com`

## 9. Frontend-URL-Matrix

- Backend: `https://backend-web-staging.onrender.com`
- Customer-Web: `https://customer-web-staging.onrender.com`
- Admin-Panel: `https://admin-panel-staging.onrender.com`
- Restaurant-Web: `https://restaurant-web-staging.onrender.com`
- Driver-App: `https://driver-app-staging.onrender.com`

## 10. WebSocket-Konfiguration

- Empfohlen fuer alle Web-Frontends: Backend-Origin als HTTPS-URL setzen
- Beispiel: `VITE_WS_URL=https://backend-web-staging.onrender.com`
- Backend verwendet `REDIS_URL` fuer Socket.IO-Skalierung
- Socket.IO-Adapter ist im Backend bereits konfiguriert

## 11. Stripe- und PayPal-Konfiguration

### Stripe-Testmodus

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- Testmodus oder Sandbox nur fuer Staging
- Keine Live-Schluessel im Web-Staging verwenden

### PayPal-Sandbox

- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_MODE=sandbox`

## 12. Smoke-Test nach Deployment

Reihenfolge:

1. Backend Healthcheck
2. Customer-Web Login/Register
3. Restaurant Dashboard
4. Driver Dashboard
5. Admin Dashboard
6. Full Order Lifecycle

### Beispiel-Pruefungen

```bash
curl https://backend-web-staging.onrender.com/api/health
curl -I https://customer-web-staging.onrender.com
curl -I https://admin-panel-staging.onrender.com
curl -I https://restaurant-web-staging.onrender.com
curl -I https://driver-app-staging.onrender.com
```

## 13. Rollback-Plan

- Auf die zuletzt funktionierende Staging-Revision zurueckschalten
- Wenn Datenbankmigrationen bereits live sind, zuerst App-Version zurueckrollen, dann Schema-Kompatibilitaet verifizieren
- Keine Force-Pushes und kein hartes Zuruecksetzen als Rollback-Ersatz
- Render: vorherige Deployment-Revision wiederherstellen
- Docker Compose: letzte funktionierende Image-/Tag-Kombination erneut ausrollen

## 14. Bekannte Nicht-Blocker

- Vite-Build-Warnungen zu grossen Chunks
- CJS-API-Deprecation-Hinweise von Vite
- Lokale Mobil-Repositorys bleiben separat und sind fuer Web-Staging nicht relevant
- `render.yaml` existiert bereits und ist als Blueprint-Basis verwendbar

## 15. Bekannte Blocker

- Keine Blocker fuer Web-Staging im aktuellen Stand
- Falsche oder fehlende Secret-Werte muessen im Hosting-Provider gesetzt werden
- Mobile-Staging bleibt separat blockiert und wird hier bewusst nicht angefasst

## 16. render.yaml Bewertung

- Render Blueprint sinnvoll: ja
- Status der vorhandenen Datei: brauchbare Basis
- Erzeugung einer neuen `render.yaml`: nicht noetig
- Empfehlung: vorhandene Blueprint-Struktur verwenden und Secrets sowie Origins im Hosting-Provider setzen

## 17. Render Blueprint

Die Datei `render.yaml` ist die deklarative Staging-Vorlage fuer Render. Sie definiert
die PostgreSQL-Datenbank, den Redis-Key-Value-Service, das Backend und die vier Web-Frontends
als getrennte Services. Die Datei ist absichtlich so aufgebaut, dass keine echten Geheimnisse,
keine Produktionsdomains und keine produktiven Zugangsdaten im Repository landen.

### Verwendung von `render.yaml`

- Die Datei wird als Blueprint in Render importiert.
- Render legt daraus die Staging-Services mit den dort beschriebenen Build-, Start- und
  Publish-Einstellungen an.
- Backend und Frontends bleiben getrennt deploybar, damit sich einzelne Services einzeln
  untersuchen und neu ausrollen lassen.
- Die Frontends verwenden die vorhandenen Vite-Builds und publizieren nur ihren `dist`-Ordner.

### Manuell in Render zu setzende Secrets

Folgende Werte duerfen nicht im Repo stehen und muessen in Render manuell gesetzt werden:

- `JWT_SECRET`
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
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_DEV_AUTH_TOKEN`
- `VITE_SENTRY_DSN`

### Variablen, die nicht im Repo stehen duerfen

- Alle produktiven Secrets, Token und Passwoerter
- Reale Produktionsdomains oder Produktions-API-URLs
- Echte `.env`-Dateien fuer Staging oder Produktion
- Persistente Zugangsdaten fuer Drittanbieter in Klartext

### Prisma-Migration auf Staging

- Die Blueprint-Datei fuehrt die Migration nicht blind aus.
- Der dokumentierte Weg ist: Staging-Deployment anlegen, Backend starten, dann die Migration
  kontrolliert gegen die Staging-Datenbank ausfuehren.
- In Render ist dafuer der `preDeployCommand` vorgesehen; er sollte nur nach Pruefung des
  Zielsystems und der kompatiblen Backend-Version laufen.
- Vor einem neuen Staging-Rollout sollte immer geprueft werden, ob neue Schema-Aenderungen
  bereits mit den App-Artefakten kompatibel sind.

### Healthcheck und Smoke-Test nach Deployment

- Der Backend-Healthcheck laeuft ueber `GET /api/health`.
- Ein erfolgreiches Render-Deployment gilt erst dann als belastbar, wenn Backend und alle vier
  Web-Frontends erreichbar sind.
- Nach dem Rollout sollten mindestens diese Pruefungen laufen:
  - Backend-Healthcheck
  - Customer-Web erreichbar
  - Admin-Panel erreichbar
  - Restaurant-Web erreichbar
  - Driver-App erreichbar
  - Ein kurzer Login- oder Ladepfad pro Frontend
  - Der Full-Order-Lifecycle-Smoke-Test gegen die Staging-API

### Ergaenzende Sicherheitsregeln

- `sync: false` bleibt die Standardwahl fuer alle Geheimnisse im Blueprint.
- CORS muss nur die vier Staging-Origins erlauben.
- WebSocket- und API-URLs sollen auf Staging-Hosts zeigen, nie auf Produktionsziele.

## 18. Entscheidung

- Web-Staging-ready: ja
- Production-ready: nein

Begruendung:
- Die relevanten Build- und CI-Gates sind gruen.
- Backend, Redis, PostgreSQL und alle vier Web-Frontends sind technisch deploybar.
- Es fehlen fuer Staging nur noch providerseitige Werte und die eigentliche Freischaltung der Infrastruktur.
- Production bleibt wegen des expliziten Nicht-Goals und fehlender Freigabe ausserhalb dieses Schritts.
