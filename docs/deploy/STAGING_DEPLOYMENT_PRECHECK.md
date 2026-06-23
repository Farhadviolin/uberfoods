# UberFoods Staging Deployment Precheck

## 1. Aktueller Branch
- Branch: `codex/local-release-check`
- Remote-Zustand: laut `git status` mit `origin/master` synchron

## 2. Aktueller Commit
- Commit vor dieser Dokumentation: `916578f`
- Commit-Message: `docs(release): add local verification report`

## 3. Letzter grüner GitHub-Actions-Run
- Run-ID: `27987601715`
- Status: `completed`
- Conclusion: `success`
- URL: https://github.com/Farhadviolin/uberfoods/actions/runs/27987601715

## 4. Status der fünf Release-Gates
- `api-verification`: `success`
- `playwright-browsers`: `success`
- `ui-e2e-lifecycle`: `success`
- `frontend-e2e`: `success`
- `build`: `success`

## 5. Repository-Hygiene
- Root-Repository ist nicht clean.
- Es gibt zwei untracked Verzeichnisse:
  - `mobile/customer-app`
  - `mobile/driver-app`
- Diese werden vom Root-Git als untracked Ordner gesehen, nicht als Submodule-Pointer.
- Risiko: Die Ordner enthalten eigene Git-Repositories mit lokalen Änderungen, die vor Staging nicht blind übernommen werden sollten.

## 6. Submodule-Analyse

### `mobile/customer-app`
- `git -C mobile/customer-app status`: zeigt viele staged, unstaged und untracked Änderungen.
- `git -C mobile/customer-app log --oneline -5`: Repository existiert und hat Historie, aktuell auf `master`.
- `git -C mobile/customer-app branch --show-current`: `master`
- Einordnung:
  - Kein Root-Submodule-Pointer
  - Echte lokale Änderungen innerhalb eines eigenständigen Repositories
  - Zusätzlich mögliche Build-/Cache-Artefakte, etwa `node_modules`
- Für Staging zuerst bereinigen oder getrennt behandeln.

### `mobile/driver-app`
- `git -C mobile/driver-app status`: zeigt viele staged, unstaged und untracked Änderungen.
- `git -C mobile/driver-app log --oneline -5`: Repository existiert und hat Historie, aktuell auf `master`.
- `git -C mobile/driver-app branch --show-current`: `master`
- Einordnung:
  - Kein Root-Submodule-Pointer
  - Echte lokale Änderungen innerhalb eines eigenständigen Repositories
  - Zusätzlich mögliche Build-/Cache-Artefakte, etwa `node_modules`
- Für Staging zuerst bereinigen oder getrennt behandeln.

## 7. Lokale Build-Ergebnisse
- `npm --prefix backend run build`: erfolgreich
- `npm --prefix frontend/customer-web run build`: erfolgreich
- `npm --prefix frontend/admin-panel run build`: erfolgreich
- `npm --prefix frontend/restaurant-web run build`: erfolgreich
- `npm --prefix frontend/driver-app run build`: erfolgreich
- `npm --prefix backend run prisma:generate`: erfolgreich

## 8. Backend-Staging-Anforderungen
- `NODE_ENV=production`
- `PORT` muss gesetzt bzw. vom Hosting bereitgestellt werden
- `DATABASE_URL` für PostgreSQL
- `REDIS_URL` für Cache und WebSocket-Adapter
- `JWT_SECRET` für Token-Signierung
- `CORS_ORIGIN` beziehungsweise äquivalente Origin-Liste für die Frontend-URLs
- Stripe-Test- oder Sandbox-Konfiguration nur wenn Zahlungsflüsse im Staging getestet werden
- PayPal-Sandbox-Konfiguration nur wenn Zahlungsflüsse im Staging getestet werden
- Prisma-Migrationen über `prisma migrate deploy`
- Healthcheck vorhanden unter `/api/health`
- Swagger ist optional und nicht zwingend für Staging

## 9. Frontend-Staging-Anforderungen je App

### Customer-Web
- `VITE_API_BASE_URL`
- `VITE_WS_URL`, falls WebSocket genutzt wird
- `VITE_APP_ENV`
- `VITE_APP_NAME`
- Build: `npm run build`
- Preview: `npm run preview`

### Admin-Panel
- `VITE_API_BASE_URL`
- `VITE_WS_URL`, falls WebSocket genutzt wird
- `VITE_APP_ENV`
- `VITE_APP_NAME`
- Build: `npm run build`
- Preview: `npm run preview`

### Restaurant-Web
- `VITE_API_BASE_URL`
- `VITE_WS_URL`, falls WebSocket genutzt wird
- `VITE_APP_ENV`
- `VITE_APP_NAME`
- Build: `npm run build`
- Preview: `npm run preview`

### Driver-App
- `VITE_API_BASE_URL`
- `VITE_WS_URL`
- `VITE_APP_ENV`
- `VITE_APP_NAME`
- Build: `npm run build`
- Preview: `npm run preview`

## 10. Benötigte Services
- PostgreSQL
- Redis
- Stripe optional
- PayPal optional

## 11. Benötigte ENV-Variablen ohne echte Werte
- Backend:
  - `NODE_ENV`
  - `PORT`
  - `DATABASE_URL`
  - `REDIS_URL`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
  - `CORS_ORIGIN`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `PAYPAL_CLIENT_ID`
  - `PAYPAL_CLIENT_SECRET`
  - `PAYPAL_MODE`
  - `FRONTEND_CUSTOMER_URL`
  - `FRONTEND_ADMIN_URL`
  - `FRONTEND_RESTAURANT_URL`
  - `FRONTEND_DRIVER_URL`
- Frontend je App:
  - `VITE_API_BASE_URL`
  - `VITE_WS_URL`
  - `VITE_APP_ENV`
  - `VITE_APP_NAME`

## 12. Empfohlene Render/Railway-Service-Struktur
- Backend-Service
- Customer-Web-Service
- Admin-Panel-Service
- Restaurant-Web-Service
- Driver-App-Service
- PostgreSQL
- Redis

## 13. Healthcheck-Plan
- Backend-Check: `GET /api/health`
- Optionaler Fallback: `GET /health`
- Deployment gilt erst als gesund, wenn Backend und alle Frontend-Services erreichbar sind
- Nach Start zuerst API, dann Frontends, dann Login-/Order-Flows prüfen

## 14. Prisma-Migration-Plan
- Vor dem Staging-Start: `prisma generate`
- Beim Deployment: `prisma migrate deploy`
- Keine Seed-Logik gegen Staging/Production ausführen, außer explizit freigegeben
- Migrationen immer aus einem sauberen Commit heraus deployen

## 15. Rollback-Plan
- Auf Hosting-Ebene auf den letzten funktionierenden Release-Stand zurückrollen
- Vorherige Revision erneut deployen
- Wenn die DB-Migration bereits live ist, zuerst kompatible App-Version zurücksetzen, dann Datenbankzustand prüfen
- Kein Force-Push, kein hartes Zurücksetzen im Repo als Rollback-Ersatz

## 16. Smoke-Test-Plan nach Deployment
- Backend-Health prüfen
- Customer-Web laden und API-Verbindung prüfen
- Admin-Panel laden und zentrale Übersichtsseite prüfen
- Restaurant-Web laden und eine Kernansicht prüfen
- Driver-App laden und Login/Startscreen prüfen
- Wenn vorhanden: Order-Lifecycle und WebSocket-Verbindung prüfen

## 17. Offene Blocker vor Staging
- Root-Repository ist wegen der beiden lokalen Mobile-Repositories nicht sauber
- `mobile/customer-app` und `mobile/driver-app` müssen vor einer Freigabe separat eingeordnet werden
- Es liegt hier nur Dokumentation vor, keine Bereinigung der mobilen Repositories

## 18. Entscheidung
- staging-ready: **nein**
- production-ready: **nein**
- Warum: Die Plattform-Builds und der letzte GitHub-Actions-Run sind grün, aber der Arbeitsbaum ist nicht repository-sauber, weil die beiden lokalen Mobile-Repositories noch echte Änderungen enthalten.
