# UberFoods Full Publication Readiness Audit

Audit-Zeitpunkt: 2026-07-24 (Europe/Vienna)
Audit-Scope: Repository-Stand `2302b7d600220a39884f35d7a562c175049c3ac1` auf Branch `codex/local-release-check`
Status: **PARTIAL – nicht staging- oder production-freigegeben**

Statuswerte in diesem Bericht: `PASS`, `FAIL`, `PARTIAL`, `BLOCKED`, `NOT TESTED`, `NOT APPLICABLE`.

## 1. Executive Summary

UberFoods ist ein großes npm-basiertes TypeScript-System mit NestJS/Prisma-Backend und vier Vite/React-Webclients. Der Code kann lokal für Backend, Customer, Admin, Restaurant und Driver gebaut werden; auch `Dockerfile.backend` baut. Das reicht nicht für eine Veröffentlichung: Backend-Lint, alle ausgeführten Unit-Test-Suites sowie Customer-, Admin- und Restaurant-Typechecks sind rot. Die fünf `npm audit`-Läufe melden zusammen 11 kritische, 99 hohe, 56 mittlere und 13 niedrige paketbaumbezogene Findings. Externe Provider, frische Datenbank, Restore, Rollback, echtes Render-Staging und Production wurden nicht nachgewiesen.

Der historische CI-Run 28017653414 ist für exakt denselben Commit weiterhin abrufbar und erfolgreich. Seine fünf Jobs prüfen Builds und ausgewählte API/UI-Flows, aber nicht die heute lokal fehlgeschlagenen vollständigen Unit-/Lint-/Typecheck-Gates, Mobile, Docker, Security-Scanning, Restore oder echtes Staging. Daher ist der grüne Run kein Publication-Approval.

Wichtigste belastbare Ergebnisse:

- **PASS:** fünf lokale Builds; Prisma-Validierung und Client-Generierung; drei Compose-Konfigurationen syntaktisch; Backend-Docker-Image; historischer API-/Lifecycle-/Frontend-E2E-CI-Lauf.
- **FAIL:** Backend-Lint (298 Errors); Backend-Unit (2 Tests); Customer-Typecheck und Unit (217 Tests); Admin-Typecheck und Unit (73 Tests); Restaurant-Typecheck und Testsuiten; Driver-Unit (2 Tests); alle fünf Dependency-Audits.
- **BLOCKED/NOT TESTED:** frische DB plus Seed, lokale Full-Lifecycle-E2E-Wiederholung, externe Provider, Render-Deployment/Health/Smoke, Mobile-Build/Signing, Restore und Production-Rollback.

## 2. Geprüfter Git-Stand

| Feld | Nachweis |
|---|---|
| Branch | `git branch --show-current` → `codex/local-release-check` |
| HEAD vor Audit | `2302b7d docs(deploy): add staging deployment execution report` |
| Upstream-Anzeige | `git status` → up to date with `origin/master` |
| Remote | `origin`, GitHub-Repository `Farhadviolin/uberfoods` (URL im lokalen `git remote -v`) |
| Tags | `git tag --sort=-creatordate` lieferte keine Tags |
| Vorher dirty | Ja: `mobile/customer-app/` und `mobile/driver-app/` waren vor Audit untracked |
| Vorher getrackter Diff | Keiner; `git diff --stat` und `git diff` leer |

Letzte 15 Commits: `2302b7d`, `349abea`, `1c91e8d`, `98a42da`, `1b4bcda`, `4110168`, `cd8853c`, `56bc341`, `916578f`, `49c4429`, `3ecf6c7`, `c884f10`, `b31b668`, `e28e2a5`, `fbf75ee`.

Die ungetrackten Mobile-Verzeichnisse enthalten eigene `.git`-Verzeichnisse, `.env`/`.env.local`, `node_modules` und Expo-Dateien. Sie gehören nicht zum geprüften HEAD; es wurden keine Werte daraus übernommen und keine Dateien darin geändert. Während des Audits erwiesen sich `backend`- und `admin-panel`-Lint-Skripte als mutierend (`--fix`). Ausschließlich deren Audit-verursachte getrackte Änderungen wurden auf den zuvor nachgewiesenen sauberen HEAD zurückgeführt.

## 3. Historischer Ausgangspunkt

Der angegebene Stand 24.06.2026 wurde nicht als Fakt übernommen. GitHub CLI bestätigte am 24.07.2026:

- Run 28017653414, Workflow `CI`, Branch `master`, Commit-Titel des HEAD, Status `completed/success`.
- Jobs: `api-verification`, `playwright-browsers`, `ui-e2e-lifecycle`, `frontend-e2e`, `build`, alle erfolgreich.
- Der Build-Job baute Backend, Customer, Admin, Driver und Restaurant.
- `frontend-e2e` führte Customer-Build/E2E, Admin-Unit/E2E und Driver-E2E aus; ein Upload-Step war skipped.
- Kein Job dieses Runs weist Render-Deployment, Production, Mobile, Security-Scan, Docker-Build oder Restore nach.

Der Run ist historisch und etwa einen Monat älter als dieser Audit. Der neueste von `gh run list --limit 20` sichtbare Run ist weiterhin 28017653414.

## 4. Repository- und Architekturübersicht

Package Manager ist npm: alle Anwendungen besitzen `package-lock.json`; es gibt keine deklarierte Root-Workspace-Konfiguration und kein `packageManager`-/`engines.node`-Feld. Lokale Runtime: Node `v20.19.4`, npm `11.5.1`. CI verwendet gemäß `.github/workflows/ci.yml` Setup-Node; die konkrete Workflow-Konfiguration bleibt maßgeblich, weil das Repository selbst keine Engine erzwingt.

| Bereich | Technologie | Einstiegspunkt | Build-Befehl | Test-Befehl | Status |
|---|---|---|---|---|---|
| Backend | NestJS, TypeScript, Prisma/PostgreSQL, Redis/Socket.IO | `backend/src/main.ts` | `npm run build` | `npm test -- --runInBand` | PARTIAL |
| Customer Web | React, Vite | `frontend/customer-web/src/main.tsx`, `App.tsx` | `npm run build` | `npm test -- --runInBand` | PARTIAL |
| Admin Panel | React, Vite | `frontend/admin-panel/src/main.tsx` | `npm run build` | `npm test -- --runInBand` | PARTIAL |
| Restaurant Web | React, Vite | `frontend/restaurant-web/src/main.tsx` | `npm run build` | `npm test -- --runInBand` | PARTIAL |
| Driver Web/PWA | React, Vite | `frontend/driver-app/src/main.tsx`, `App.tsx` | `npm run build` | `npm test -- --runInBand` | PARTIAL |
| Mobile Customer | untracked Expo/React Native working tree | außerhalb HEAD | kein Release-Build-Script | `npm test` | BLOCKED |
| Mobile Driver | untracked Expo/React Native working tree | außerhalb HEAD | kein Release-Build-Script | `npm test` | BLOCKED |
| Shared | `frontend/shared-design-system`, `frontend/test-utils`, `shared/services` | einzelne Module | kein zentrales Build-Gate | kein zentrales Gate | NOT TESTED |

Root `package.json` orchestriert Befehle per `--prefix`, nicht per npm workspaces. Weitere auffällige Bereiche: `docker`, `nginx`, `k8s`, `infra`, `infrastructure`, `monitoring`, `backup`, `operations`, viele historische Reports/Logs und mehrere Compose-Varianten. Es gibt kein getracktes `packages/`-Verzeichnis. `frontend/customer-web-app/package.json` enthält keine Scripts und ist kein nachgewiesenes Release-Artefakt.

Ports aus den E2E-/Vite-Konfigurationen und CI: Backend 3000; Customer 3001; Admin 3002; Restaurant 3003; Driver 3004. Runtime-URLs werden über `VITE_*` beziehungsweise Backend-ENV verbunden.

## 5. Backend-Audit

`backend/src/main.ts` setzt globalen Prefix `/api` (Zeile 140), CORS (165), Helmet (192), globale ValidationPipe (269), Request-ID-Middleware (284–286) und Swagger unter `/api/docs` (360–376). Health ist unter `/api/health` vorgesehen. `backend/src/app.module.ts` bindet Health und globalen RateLimitGuard ein. Das ist vorhandener Code, kein Betriebsnachweis.

| Backend-Modul | Controller/Service-Evidenz | Datenmodelle | Auth/Rolle | Tests | Status |
|---|---|---|---|---|---|
| Auth/RBAC | `modules/auth`, `modules/rbac` | User/Session/Role/Permission | JWT, Roles, PermissionGuard | vorhanden, Gesamtsuite rot | PARTIAL |
| Admin | `modules/admin/admin.controller.ts`, sehr großer Service | zahlreiche Domänen | viele Roles/RequirePermission | vorhanden, nicht vollständig grün | PARTIAL |
| Customer | `modules/customer` | Customer/Address u.a. | JWT bei geschützten Routen | vorhanden | PARTIAL |
| Restaurant/Dish | `modules/restaurant`, `modules/dish`; zusätzlich `modules/disabled/restaurant*` | Restaurant/Menu/Dish | gemischt öffentlich/JWT | vorhanden | PARTIAL |
| Driver | `modules/driver`, zusätzliche `controllers/driver.controller.ts` | Driver/Tracking/Earnings | gemischt; siehe Finding 006 | vorhanden | PARTIAL |
| Order | `modules/order/order.controller.ts`, `order.service.ts` | Order/Items/Status | RateLimit plus routeweise JWT | 2 aktuelle Unit-Fehler betreffen u.a. Order | FAIL |
| Payment | `modules/payment`, Stripe-Webhook-Controller | Payment/Refund/Webhook | Provider-Signaturpfad vorhanden | Provider-E2E nicht nachgewiesen | PARTIAL |
| Analytics/Reporting | `modules/analytics`, `modules/reporting` | aggregierte Daten | Admin/RBAC | nur Teilabdeckung | PARTIAL |
| Notification | `modules/notification`, `unified-notifications`, Push-Controller | Notifications/Subscriptions | JWT teils vorhanden | externe Zustellung nicht getestet | PARTIAL |
| Tracking/WebSocket | `modules/websocket`, Redis-Socket-Adapter | Tracking/Events | Socket-Auth statisch vorhanden | historischer Lifecycle | PARTIAL |
| Upload/Storage | `common/storage` und Upload-Pfade | Upload-Metadaten | nicht vollständig geprüft | Malware-Scan fehlt als Gate | PARTIAL |
| Health/Monitoring | `common/health`, `modules/monitoring`, metrics/ops | Laufzeitmetriken | teils öffentlich, teils JWT | lokaler gestarteter Healthcheck nicht wiederholt | PARTIAL |

Statische Suche fand 9 TODO-, 1 FIXME-, 1 HACK-, 29 Placeholder-, 6 Stub-, 96 Mock- und 76 `console.log`-Dateitreffer im Backend (Dependency/Dist/Coverage ausgeschlossen). Fachlich relevante Beispiele:

- `modules/order/order.controller.ts:747,912`: Sofort-Redirect ist ausdrücklich kein echter Provider-Aufruf.
- `modules/driver/subscription.service.ts:140,255`: Payment-Verarbeitung ausdrücklich Mock.
- `modules/admin/admin.service.ts:1711`: Export soll in Production erst echte Datei erzeugen.
- `modules/driver/driver.service.ts:8895`: Route-Polyline bleibt `null`.

## 6. Datenbank- und Prisma-Audit

`backend/prisma/schema.prisma` validiert mit Prisma CLI (Exit 0). `npm run prisma:generate` war erfolgreich. Das Schema enthält 187 Models und 21 Enums. Es existiert nur `backend/prisma/migrations/0001_initial`.

| Prüfung | Status | Nachweis |
|---|---|---|
| Prisma validate | PASS | `npx prisma validate`, Exit 0, 2.2 s |
| Prisma generate | PASS | `npm run prisma:generate`, Exit 0, 7.7 s |
| Format check | NOT APPLICABLE | installierte Prisma-Version unterstützt `format --check` nicht; Befehl Exit 1 wegen unbekannter Option |
| Migration von null | NOT TESTED | keine dedizierte temporäre DB für diesen Audit gestartet |
| Seed | NOT TESTED | nicht ohne isolierte DB ausgeführt |
| Seed idempotent | NOT TESTED | kein zweimaliger Lauf |
| Fresh Setup/Health/API | NOT TESTED | historische CI-Evidenz ersetzt keinen aktuellen Fresh-DB-Test |
| Production migration safe | BLOCKED | nur eine große Initialmigration; kein aktueller Staging-Probelauf |
| Rollback | BLOCKED | keine nachgewiesene automatisierte Down-/Restore-Strategie |

Geld-, Status-, Idempotency- und Webhook-Modelle sind im breiten Schema vorhanden. Vorhandensein ist keine Korrektheitsgarantie; insbesondere fehlen aktueller Fresh-DB-, Duplicate-Webhook- und Restore-Nachweis.

## 7. Auth-, Rollen- und Security-Audit

JWT-, Roles- und Permission-Guards sind implementiert. Admin-Routen verwenden vielfach `JwtAuthGuard`, `RolesGuard` und `PermissionGuard`, beispielsweise `admin.controller.ts:3005–3264`. `main.ts` enthält Helmet, CORS und Validation. Auth-Controller/-Service implementieren Login/Refresh-Pfade. Vollständige Token-Rotation, Revocation, CSRF und Ownership-Isolation sind wegen roter Tests und fehlender dynamischer Negativtests nicht verifiziert.

| Aktion | Customer | Restaurant | Driver | Admin | Nachweis |
|---|---:|---:|---:|---:|---|
| Login/Refresh | PARTIAL | PARTIAL | PARTIAL | PARTIAL | `modules/auth/auth.controller.ts`; Tests nicht vollständig grün |
| Eigenes Profil | PARTIAL | PARTIAL | PARTIAL | PASS/PARTIAL | jeweilige Controller; keine vollständige IDOR-Suite |
| Bestellung erstellen/sehen | PARTIAL | PARTIAL | PARTIAL | PARTIAL | Order-Controller routeweise JWT |
| Order-Status ändern | BLOCKED | PARTIAL | PARTIAL | PARTIAL | dynamische Rollen-/Statussprung-Matrix fehlt |
| Nutzer/Restaurant/Dish administrieren | BLOCKED | BLOCKED | BLOCKED | PARTIAL | Admin RBAC-Dekoratoren vorhanden |
| Audit/Export | BLOCKED | BLOCKED | BLOCKED | PARTIAL | `RequirePermission("audit:read"/"export:read")` |

Security-relevante Konfiguration darf nicht mit Wirksamkeit gleichgesetzt werden. Swagger wird im Hauptbootstrap eingerichtet; ob es in Production deaktiviert/geschützt ist, muss beim Runtime-Gate verifiziert werden. `VITE_DEV_AUTH_TOKEN`-Verwendungen und bedingte Auth-E2E-Flows sind ein Staging-Risiko, wenn ein Wert in einen statischen Build gelangt. Es wurde kein Secretwert in diesen Bericht kopiert.

## 8. API- und Contract-Audit

Backend-Controller existieren mindestens für Auth, Admin, Analytics, Customer, Restaurant, Dish, Driver, Orders, Payments/Webhooks, Reporting, Search, Notifications, Monitoring, Security, Group Orders, Gamification, Meal Planner, Social Media und Synchronisation. Der globale Prefix ist `/api`.

| Contract-Bereich | Backend | Frontend-Verwendung | Test | Status |
|---|---|---|---|---|
| `/api/auth/*` | AuthController | alle Clients | historisch und Unit-Teile | PARTIAL |
| `/api/restaurants`, `/dishes` | Restaurant/Dish | Customer/Admin/Restaurant | historischer API-Run | PARTIAL |
| `/api/orders/*` | Order/Driver endpoints | alle Apps | historischer Lifecycle; lokale Order-Unit rot | PARTIAL |
| `/api/admin/*` | AdminController | Admin | Admin E2E historisch; lokale Units rot | PARTIAL |
| `/api/drivers/*` | mehrere Driver-Controller | Driver/Admin | Driver E2E historisch | PARTIAL |
| `/api/webhooks/stripe/*` | PaymentWebhookController | Provider | kein echter Provider-E2E | NOT TESTED |
| Socket.IO `/socket.io` | WebSocketGateway | Driver/Restaurant/Customer | historischer Lifecycle-Teil | PARTIAL |

Die Admin-Datei `scripts/test-api-endpoints.ts` listet zahlreiche gewünschte Pfade, darunter auch AI/ML, Inventory und Statistics; eine Testliste ist kein Beleg, dass jeder Pfad im aktiven AppModule existiert. Drei Backend-Integrationstests sind ausdrücklich skipped, weil Routen fehlen (`social/live-orders`, `social/trending`, `drivers/subscription/tiers`). Eine vollständig generierte OpenAPI-vs-Client-Maschinenmatrix ist kein vorhandenes CI-Gate.

## 9. Customer-Web-Audit

`frontend/customer-web/src/App.tsx:108–154` definiert 39 sichtbare Route-Muster: Home/Restaurant/Menu/Checkout/Details, AR/Recipes, Login/Register/Legal/Partner, Dashboard, Orders/Tracking, Profile/Addresses/Favorites, Voice Order, Meal Planner, Loyalty, Scheduled Orders, Gift Cards, Social, Group Orders, Chat, Reviews, Settings, Payment Methods, Support, FAQ, Invoices, Refunds, Promotions, Allergies, Referral, Subscription und Catch-all.

| Routenklasse | Rendering/Build | API/Auth | Empty/Error/Mobile | Test | Status |
|---|---|---|---|---|---|
| öffentlich/Auth/Legal | Build PASS | Login/Register vorhanden | nicht routeweise manuell geprüft | Unit rot | PARTIAL |
| Restaurant/Menu/Checkout | Build PASS | API-Code vorhanden | Lifecycle historisch | Unit rot | PARTIAL |
| Account/Orders/Tracking | Build PASS | ProtectedRoute | nicht vollständig browsergeprüft | historischer E2E | PARTIAL |
| Zusatzfeatures | Build PASS | viele Mock-/Placeholder-Treffer | nicht vollständig E2E | lückenhaft | PARTIAL |
| 404 | Redirect zu `/` | n/a | keine eigene Fehlerseite | nicht separat geprüft | PARTIAL |

Typecheck scheitert an vier unsicheren Casts in `src/contexts/AuthContext.tsx:110,146,183,211`. Unit: 41/49 Suites und 217/306 Tests fehlgeschlagen; Jest meldet offene Async-Handles. Build und Lint sind erfolgreich, Lint hat 245 Warnungen.

## 10. Admin-Panel-Audit

Das Admin-Panel ist komponenten-/zustandsbasiert und besitzt umfangreiche Bereiche für Dashboard, Orders, Customers, Restaurants, Drivers, Payments, Analytics, Reports, RBAC, Monitoring und weitere Management-Funktionen. Ein zentraler URL-Router wie im Customer-App-`App.tsx` ist nicht nachgewiesen; Deep-Link-/Refresh-Verhalten ist deshalb gesondert zu testen.

- Build: PASS.
- Typecheck: FAIL in `src/components/OrdersManagement.tsx:617` durch zwei inkompatible `Order`-Typen.
- Unit: FAIL, 19/35 Suites und 73/187 Tests fehlgeschlagen.
- Lint: Exit 0, aber das Script verwendet `eslint ... --fix` und ist deshalb kein read-only CI-Lint.
- E2E-API-Suites sind standardmäßig per `E2E_RUN_API` deaktivierbar; Auth-Suite enthält bedingte Skips.
- `VITE_DEV_AUTH_TOKEN` darf in Staging/Production nicht gesetzt oder als statische Vite-Variable ausgeliefert werden; kein Deployment-Bundle wurde auf einen realen Wert geprüft.

Status: **PARTIAL**, nicht releasefähig.

## 11. Restaurant-Web-Audit

Die App enthält Dashboard, Kitchen/Orders, Menü, Marketing, Multi-Location, Reporting und Einstellungen. Order-/WebSocket-Code ist vorhanden; aktuelle dynamische Status-/Reconnect-Negativtests wurden nicht ausgeführt.

- Build PASS.
- Typecheck FAIL: `KitchenDisplay.tsx:41` und `OrderCard.tsx:51` senden `version`, obwohl der erwartete Status-Payload dieses Feld nicht erlaubt.
- Unit FAIL: 3/13 Suites rot; 23 Tests selbst passierten, also liegen Suite-/Setupfehler vor.
- Lint PASS mit 2 Hook-Warnungen.
- Provider-/Payout-/vollständige Order-State-E2E: NOT TESTED.

Status: **PARTIAL**.

## 12. Driver-App-Audit

Routen in `frontend/driver-app/src/App.tsx:108–177`: `/login`, `/`, `/subscription`, `/support`, `/emergency`, `/settings`, `/legal/:slug`, Catch-all. Hauptfunktionalität ist in Dashboard-Komponenten gebündelt. Socket-Hooks nutzen `/socket.io`; Maps-, Geolocation- und Routing-Services sind vorhanden.

- Build PASS, aber Dashboard-Chunk 771.10 kB und damit über Vite-Warnschwelle.
- Lint PASS mit 738 Warnungen.
- Unit FAIL: 3/28 Suites, 2/135 Tests.
- Eigenes Typecheck-Script: **Script fehlt**.
- Geolocation-Permissions, Background-Verhalten, Offline, echte Maps-Konfiguration und Push: NOT TESTED.
- Historischer Driver-E2E-Job ist PASS, ersetzt keine aktuelle Provider-/Device-Prüfung.

Status: **PARTIAL**.

## 13. Mobile-Audit

Im getrackten HEAD existieren nur `mobile/shared/*` sowie zwei Dokumentdateien. `mobile/customer-app` und `mobile/driver-app` sind verschachtelte, ungetrackte Repositories und deshalb nicht Teil des auditierten Release-Commits. Beide wirken wie Expo/React-Native-Projekte und haben `android`, `ios`, `start`, `test`, `typecheck`, `web`, aber kein Release-/Signing-Script. Sie enthalten lokale ENV-Dateien, deren Werte bewusst nicht gelesen oder berichtet wurden.

| Gate | Customer Mobile | Driver Mobile |
|---|---|---|
| Im Release-Commit | FAIL | FAIL |
| Typecheck/Test | NOT TESTED | NOT TESTED |
| Android/iOS Release Build | NOT TESTED | NOT TESTED |
| Signing/Store Metadata | BLOCKED | BLOCKED |
| Push/Maps/Background | NOT TESTED | NOT TESTED |

Mobile ist ausdrücklich nicht freigegeben.

## 14. Order-Lifecycle-Audit

| Schritt | Backend | Customer | Admin | Restaurant | Driver | Persistenz/Event | Test | Status |
|---|---|---|---|---|---|---|---|---|
| Register/Login | vorhanden | vorhanden | sichtbar | vorhanden | vorhanden | User/Token | historisch/Unit rot | PARTIAL |
| Restaurants/Menu | vorhanden | vorhanden | Verwaltung | Verwaltung | n/a | DB | historischer API/UI | PARTIAL |
| Cart/Address/Create | Order API | vorhanden | sichtbar | eingehend | n/a | Order/Items | historischer Lifecycle | PARTIAL |
| Payment init/finalize | Provider-Code | Checkout | sichtbar | n/a | n/a | Payment/Webhook | kein echter Provider | NOT TESTED |
| Accept/Prepare/Ready | Status-API | Tracking | sichtbar | UI vorhanden | Jobs | DB/Socket | historischer Lifecycle | PARTIAL |
| Driver assign/accept/pickup | Driver-/Order-API | Tracking | sichtbar | Übergabe | UI vorhanden | DB/Socket | historischer Lifecycle | PARTIAL |
| Track/Deliver | Socket/Tracking | UI vorhanden | sichtbar | sichtbar | Geolocation | Tracking/Events | externe Maps nicht geprüft | PARTIAL |
| Notifications/Analytics | Services vorhanden | UI vorhanden | vorhanden | vorhanden | vorhanden | DB/Push/Email | externe Zustellung fehlt | PARTIAL |

Negative Fälle wie ausverkauft, geschlossen, Payment-Fehler, doppelte Bestellung/Webhook, Ablehnung, kein Fahrer, Statussprung, Abbruch, Refund, Timeout und Netzwerkunterbrechung sind nicht als vollständige, heute grüne Matrix nachgewiesen. Lokale Unit-Fehler und bedingte Skips verhindern eine PASS-Bewertung.

## 15. Payment-Audit

| Provider | Implementiert | Konfiguriert | Testmodus | Webhook | E2E | Production-fähig |
|---|---|---|---|---|---|---|
| Stripe | IMPLEMENTED | unbekannt | Codepfad vorhanden | IMPLEMENTED | NOT TESTED aktuell | BLOCKED |
| PayPal | IMPLEMENTED/Legacy SDK | unbekannt | unbekannt | PARTIAL | NOT TESTED | BLOCKED |
| Apple Pay | UI/Code-Referenzen | unbekannt | unbekannt | providerabhängig | NOT TESTED | BLOCKED |
| Google Pay | UI/Code-Referenzen | unbekannt | unbekannt | providerabhängig | NOT TESTED | BLOCKED |
| Sofort | Placeholder | nein nachgewiesen | n/a | n/a | NOT TESTED | FAIL |
| Cash/COD | Codepfade vorhanden | n/a | n/a | n/a | NOT TESTED | PARTIAL |

`IMPLEMENTED`, `CONFIGURED`, `TESTED`, `VERIFIED` und `PRODUCTION-APPROVED` sind hier ausdrücklich nicht gleichgesetzt. PayPal-SDK wird bei Installation als nicht mehr unterstützt gemeldet. Stripe-/Webhook-Signatur- und Idempotenzcode ist statisch vorhanden, aber kein echter Provider-/Replay-Test wurde ausgeführt.

## 16. Externe Integrationen

| Integration | Code | ENV-Namen | echte Werte | lokal/Staging | Production | Blocker |
|---|---|---|---|---|---|---|
| Google Maps | vorhanden | vorhanden | unbekannt | NOT TESTED | BLOCKED | Key-/API-/Domain-Restrictions und Billing nicht verifiziert |
| E-Mail/SendGrid/SMTP | vorhanden | vorhanden | unbekannt | Templates teils testbar | BLOCKED | Zustellung, Retry, Sender-Domain nicht nachgewiesen |
| Push/VAPID | vorhanden | vorhanden | unbekannt | NOT TESTED | BLOCKED | Subscription/Browser/Delivery nicht verifiziert |
| Sentry/Monitoring | Code/Konfig vorhanden | vorhanden | unbekannt | NOT TESTED | BLOCKED | DSN, Release, Source Maps, PII nicht nachgewiesen |
| Redis/Socket.IO | vorhanden | Render-Referenz vorhanden | lokal unbekannt | historischer CI-Teil | BLOCKED | Staging-Reconnect/Scale nicht verifiziert |
| Storage/Uploads | lokaler/Service-Code | vorhanden | unbekannt | NOT TESTED | BLOCKED | persistenter Storage, Malware-Scan, Zugriffsschutz |

## 17. ENV- und Konfigurationsmatrix

Werte wurden nicht in den Bericht übernommen. Die Matrix beschreibt Namens-/Scope-Klassen:

| Variablenklasse | Backend | Customer | Admin | Restaurant | Driver | Pflicht | Secret | Beispiel | Render |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| API URL | indirekt | ja | ja | ja | ja | ja | nein | ja | ja |
| WebSocket URL | ja | ja | ja | ja | ja | je nach App | nein | teilweise | ja |
| DATABASE_URL | ja | nein | nein | nein | nein | ja | ja | ja | fromDatabase |
| REDIS_URL | ja | nein | nein | nein | nein | Betrieb | ja | ja | fromService |
| JWT/Refresh | ja | nein | nein | nein | nein | ja | ja | Namen ja | `sync:false` |
| Stripe/PayPal | ja | UI-public IDs teils | teils | teils | teils | Provider | Secret backend | Namen ja | `sync:false` |
| Maps | ja | ja | teils | teils | ja | Feature | public/restricted | Namen ja | `sync:false` |
| Mail/VAPID/Sentry | ja | public VAPID/DSN teils | teils | teils | teils | Feature/Betrieb | gemischt | teilweise | `sync:false` |
| `VITE_DEV_AUTH_TOKEN` | nein | möglich | möglich | möglich | möglich | nein | **darf nie ausgeliefert werden** | Risiko | darf nicht gesetzt sein |

`render.yaml` verwendet `sync:false` für viele externe Werte und definiert daher bewusst keine Werte. Das ist korrekt für Secrets, bedeutet aber, dass Repository-Evidenz keine Konfiguration bestätigt. `docker-compose.prod.yml` validiert syntaktisch, warnt lokal jedoch vor leeren `DATABASE_URL`, `JWT_SECRET` und `POSTGRES_PASSWORD`.

## 18. Test- und Build-Ergebnisse

| Befehl | Exit | Dauer | Ergebnis |
|---|---:|---:|---|
| `backend: npm ci --no-audit --no-fund` | 0 | 155.6 s | PASS; mehrere deprecated Pakete |
| `backend: npm run prisma:generate` | 0 | 7.7 s | PASS |
| `backend: npm run lint` | 1 | 48.4 s | FAIL; 298 Errors/307 Warnungen, u.a. fehlende ESLint-Regeldefinition |
| `backend: npm test -- --runInBand` | 1 | 100.2 s | FAIL; 2/41 Suites, 2/246 Tests |
| `backend: npm run build` | 0 | 29.5 s | PASS |
| `customer: npm ci` | 0 | 110.6 s | PASS |
| `customer: npm run type-check` | 2 | 26.7 s | FAIL; 4 AuthContext-Casts |
| `customer: npm run lint` | 0 | 14.5 s | PASS mit 245 Warnungen |
| `customer: npm test -- --runInBand` | 1 | 94.7 s | FAIL; 41 Suites/217 Tests; open handles |
| `customer: npm run build` | 0 | 19.2 s | PASS |
| `admin: npm ci` | 0 | 125.0 s | PASS |
| `admin: npm run typecheck` | 2 | 26.8 s | FAIL; Order-Typkonflikt |
| `admin: npm run lint` | 0 | 8.8 s | PASS, aber mutierendes `--fix`-Script |
| `admin: npm test -- --runInBand` | 1 | 79.4 s | FAIL; 19 Suites/73 Tests |
| `admin: npm run build` | 0 | 44.8 s | PASS |
| `restaurant: npm ci` | 0 | 80.6 s | PASS |
| `restaurant: npm run typecheck` | 2 | 18.6 s | FAIL; 2 Payload-Typfehler |
| `restaurant: npm run lint` | 0 | 13.2 s | PASS mit 2 Warnungen |
| `restaurant: npm test -- --runInBand` | 1 | 25.8 s | FAIL; 3 Suites |
| `restaurant: npm run build` | 0 | 21.9 s | PASS |
| `driver: npm ci` | 0 | 78.9 s | PASS |
| `driver: npm run lint` | 0 | 15.5 s | PASS mit 738 Warnungen |
| `driver: npm test -- --runInBand` | 1 | 32.7 s | FAIL; 3 Suites/2 Tests |
| `driver: npm run build` | 0 | 10.5 s | PASS; großer Chunk |

E2E wurde in diesem Audit nicht erneut vollständig gestartet, weil zunächst Fresh-DB/Seed und alle statischen/Unit-Gates sauber isoliert werden müssen. Die historische CI-Evidenz ist separat dokumentiert und wird nicht als heutiger lokaler Test ausgegeben.

Dependency-Audit:

| Paketbaum | Critical | High | Moderate | Low | Exit |
|---|---:|---:|---:|---:|---:|
| Backend | 5 | 20 | 35 | 4 | 1 |
| Customer | 1 | 26 | 7 | 2 | 1 |
| Admin | 3 | 23 | 6 | 3 | 1 |
| Restaurant | 1 | 15 | 4 | 2 | 1 |
| Driver | 1 | 15 | 4 | 2 | 1 |

Die Summen enthalten wahrscheinlich gleiche transitive Pakete in mehreren Lockfiles. Runtime-/Dev-/Reachability-Triage ist noch erforderlich; kritische Findings dürfen bis dahin nicht ignoriert werden.

## 19. CI-Audit

Workflows: `api-verification.yml`, `ci-cd-pipeline.yml`, `ci.yml`, `complete-testing.yml`, `customer-e2e.yml`, `deploy-production.yml`, `e2e-gates.yml`, `e2e-tests.yml`, `local-development.yml`.

| Job/Workflowbereich | Status | Evidenz/Risiko |
|---|---|---|
| API verification | PASS historisch | Run 28017653414 |
| Playwright browser setup | PASS historisch | Run 28017653414 |
| UI lifecycle | PASS historisch | Run 28017653414 |
| Frontend E2E | PASS historisch | Run 28017653414; einzelne Uploads skipped |
| Fünf Builds | PASS historisch/lokal | Run plus lokaler Audit |
| Vollständige Unit-Suites | FAIL lokal | nicht als zwingendes grünes Gate im historischen Run belegt |
| Lint/Typecheck | FAIL lokal | Build transpiliert trotz separater Typefehler |
| Mobile | NOT TESTED | nicht im Commit/Run |
| Docker/Security/Dependency | PARTIAL/FAIL | Docker lokal PASS; Audit rot; CI-Gate fehlt |
| Fresh migration | PASS historisch, NOT TESTED aktuell | CI führte Migrationen auf Service-DB aus |
| Deploy/Approval | BLOCKED | kein aktueller Staging-/Production-Nachweis |

`.github/workflows/e2e-gates.yml:83` enthält `continue-on-error: true`. Mehrere `if: always()` dienen überwiegend Artefakt-/Summary-Schritten, müssen aber jobweise betrachtet werden. Bedingte Skips existieren in Admin-API/Auth-E2E und Customer-Auth-Setup. Drei Backend-Integrationstests sind global skipped wegen fehlender Routen.

## 20. Docker- und Runtime-Audit

| Prüfung | Status | Nachweis |
|---|---|---|
| `docker compose config --quiet` | PASS | Exit 0, 0.3 s |
| Smoke Compose config | PASS | Exit 0, 0.3 s |
| Prod Compose config | PARTIAL | Exit 0; drei Pflichtwerte leer, `version` obsolete |
| Backend Docker build | PASS | `docker build -f Dockerfile.backend -t uberfoods-backend:audit .`, Exit 0, 174.3 s |
| Multi-container build | NOT TESTED | nicht ausgeführt |
| Container health/runtime | NOT TESTED | Stack nicht gestartet |
| Migration startup | NOT TESTED | keine isolierte DB |
| TLS/reverse proxy | PARTIAL | nginx/Compose-Dateien vorhanden; Laufzeit nicht geprüft |
| Backup volumes | BLOCKED | kein Restore-Nachweis |

## 21. Render- und Staging-Audit

`render.yaml` definiert Postgres, Key Value/Redis, Backend sowie vier statische Webservices auf Branch `master`. Backend: `rootDir: backend`, `npm ci && npm run build`, `npm run start:prod`, Health `/api/health`. Frontends haben passende RootDirs/Builds und ENV-Einträge. Viele externe Werte sind korrekt als `sync:false` markiert.

| Stufe | Status | Evidenz |
|---|---|---|
| Blueprint statisch gelesen | PASS | `render.yaml` |
| Services angelegt | BLOCKED | kein Render-Dashboard/API-Nachweis |
| Build erfolgreich auf Render | BLOCKED | keine Render-Logs |
| Deploy erfolgreich | BLOCKED | keine Deployment-ID/URL |
| Healthcheck erfolgreich | BLOCKED | keine echte URL |
| Smoke-Test erfolgreich | BLOCKED | nicht ausgeführt |
| Staging freigegeben | BLOCKED | vorangehende Gates fehlen |
| Production freigegeben | BLOCKED | ausdrücklich nicht freigegeben |

`docs/deploy/STAGING_DEPLOYMENT_EXECUTION_REPORT.md` enthält noch leere Public-URL-Felder und bestätigt Production/Mobile als nicht freigegeben. Es wurden keine URLs oder Services erfunden.

## 22. Monitoring, Backup und Rollback

Strukturierte Logger-, Request-ID-, Metrics-, Health-, Monitoring- und Sentry-nahe Codepfade existieren. Betriebswirksamkeit, Alert-Routing, Retention und PII-Filterung sind nicht nachgewiesen.

| Fähigkeit | Dokumentiert | Automatisiert | Getestet | Nachgewiesen |
|---|---|---|---|---|
| Health/Metrics | ja | Code vorhanden | teilweise historisch | PARTIAL |
| Error Monitoring | ja/Code | konfigabhängig | NOT TESTED | BLOCKED |
| DB Backup | Dateien/Dokumente vorhanden | unbekannt | NOT TESTED | BLOCKED |
| Restore | Dokumentfragmente | nein nachgewiesen | NOT TESTED | BLOCKED |
| Migration Rollback | unvollständig | nein nachgewiesen | NOT TESTED | BLOCKED |
| Deployment Rollback | Dokumente vorhanden | Render/Git abhängig | NOT TESTED | BLOCKED |
| Incident Response | Dokumentation verteilt | unbekannt | NOT TESTED | PARTIAL |

## 23. Release-Gate-Matrix

| Gate | Status | Nachweis | Blocker | Priorität |
|---|---|---|---|---|
| Backend Build | PASS | lokal Exit 0 | – | P1 |
| Customer Build | PASS | lokal Exit 0 | – | P1 |
| Admin Build | PASS | lokal Exit 0 | – | P1 |
| Restaurant Build | PASS | lokal Exit 0 | – | P1 |
| Driver Build | PASS | lokal Exit 0 | – | P1 |
| Mobile Builds | BLOCKED | nicht im HEAD | Repo/Signing | P1 |
| Unit Tests | FAIL | alle fünf Suites rot | Test-/Codefehler | P1 |
| API Verification | PASS | historischer Run 28017653414 | Aktualität | P1 |
| Customer E2E | PASS | historisch | aktuelle Wiederholung fehlt | P1 |
| Admin E2E | PASS | historisch | bedingte Skips | P1 |
| Restaurant E2E | PARTIAL | Lifecycle historisch | eigene Vollsuite unklar | P1 |
| Driver E2E | PASS | historisch | Provider/Device fehlen | P1 |
| Lifecycle E2E | PASS | historisch | aktuelle Negativmatrix fehlt | P1 |
| Fresh DB Setup | NOT TESTED | – | isolierte DB fehlt | P1 |
| Prisma Migration | PARTIAL | validate + historischer CI | nur Initialmigration | P1 |
| Seed | NOT TESTED | – | isolierte DB | P1 |
| Docker Build | PASS | Backend-Image lokal | Gesamtstack fehlt | P2 |
| Local Production Smoke | NOT TESTED | – | DB/ENV | P1 |
| Render Blueprint | PASS | statisch validiert | externe Werte | P1 |
| Render Deployment | BLOCKED | – | Dashboard/Accounts | P1 |
| Staging Healthcheck | BLOCKED | – | keine URL | P1 |
| Staging Smoke Test | BLOCKED | – | kein Deploy | P1 |
| Auth/RBAC | PARTIAL | Code/Guards | dynamische Negativtests | P1 |
| Payments | BLOCKED | Code teils | Provider/Webhooks | P1 |
| Maps | BLOCKED | Code | Key/Restrictions/E2E | P2 |
| Email | BLOCKED | Code/Templates | Zustellnachweis | P2 |
| Push | BLOCKED | Code | Browser/Keys/Delivery | P2 |
| WebSockets | PARTIAL | Code/historischer Flow | Staging/Reconnect | P1 |
| Monitoring | PARTIAL | Code/Dokumente | echte Alerts | P2 |
| Backup | BLOCKED | Dokumente | Automation/Nachweis | P1 |
| Restore | BLOCKED | – | Test-Restore | P1 |
| Rollback | BLOCKED | Dokumente | Test | P1 |
| Security | FAIL | npm audits + offene Verifikation | Triage/Fixes | P0/P1 |
| Documentation | PARTIAL | umfangreich, widersprüchliche „100%“-Reports | Aktualität | P2 |
| Production Approval | BLOCKED | keine Freigabe | viele Gates | P0 |

## 24. Priorisierte Findings

| ID | Schweregrad | Bereich | Befund | Nachweis | Auswirkung | Empfohlene Lösung |
|---|---|---|---|---|---|---|
| UF-AUDIT-001 | P0 | Security | 11 kritische Audit-Zählungen über fünf Lockfiles | `npm audit --json`, jeweils Exit 1 | unbekannte Runtime-Exposition; Release nicht vertretbar | deduplizieren, Runtime-Reachability prüfen, gezielt upgraden |
| UF-AUDIT-002 | P1 | Tests | alle fünf Unit-Gates schlagen lokal fehl | Abschnitt 18 | Regressionen können trotz grünem Build durchgehen | Ursachen je App beheben, unveränderte Assertions |
| UF-AUDIT-003 | P1 | Type Safety | Customer/Admin/Restaurant-Typechecks rot; Driver-Script fehlt | konkrete Dateien Abschnitt 18 | Build ist nicht typensicher | Typefehler beheben und Typecheck als CI-Gate |
| UF-AUDIT-004 | P1 | Backend Quality | Backend-Lint 298 Errors; Regeldefinition fehlt | Exit 1, 605 Findings | Lint-Gate faktisch unbrauchbar | ESLint-Version/Config konsistent machen, Fehler abarbeiten |
| UF-AUDIT-005 | P1 | Staging | kein Render-Service/Deploy/Health/Smoke nachgewiesen | leere Execution-Report-Felder | keine Staging-Readiness | erst nach grünen lokalen Gates kontrolliert deployen |
| UF-AUDIT-006 | P0 | Auth | Driver-Endpunkt-Controller enthält auskommentierten Guard | `order/driver-endpoints.controller.ts:25` | potenziell ungeschützter Driver-Pfad; genaue Route prüfen | Route/Ownership analysieren und Negativtest hinzufügen |
| UF-AUDIT-007 | P1 | Payments | Sofort und Driver-Subscription-Payment sind Placeholder/Mock | konkrete Codezeilen Abschnitt 5 | Geldfluss nicht real verifiziert | Provider klar deaktivieren oder vollständig implementieren/testen |
| UF-AUDIT-008 | P1 | DB/Recovery | Fresh DB, Seed-Idempotenz und Restore ungetestet | keine aktuellen Runs | Deploy/Recovery kann scheitern | isolierten Fresh-DB-/Restore-Test automatisieren |
| UF-AUDIT-009 | P1 | Mobile | Apps sind untracked/nested und nicht Bestandteil des Releases | Git-Tree/Status | keine reproduzierbaren Mobile-Artefakte | Repo-Strategie und Signing separat entscheiden |
| UF-AUDIT-010 | P2 | CI | `continue-on-error` und bedingte E2E-Skips | Workflow/Test-Dateien | grün kann reduzierte Abdeckung bedeuten | Gates explizit und verpflichtend machen |
| UF-AUDIT-011 | P2 | Operations | Monitoring/Backup/Rollback nur teilweise dokumentiert, nicht nachgewiesen | Abschnitt 22 | Incident- und Datenverlustrisiko | Runbooks automatisiert testen |
| UF-AUDIT-012 | P2 | Documentation | zahlreiche historische „100%/complete“-Reports widersprechen aktueller Evidenz | Root-Dokumente vs. Audit | falsche Release-Entscheidungen | diesen Audit als aktuelle Source of Truth referenzieren |
| UF-AUDIT-013 | P2 | Tooling | Lint-Skripte mutieren Code durch `--fix` | `backend/package.json`, `admin-panel/package.json` | Diagnose verändert Working Tree | getrennte `lint`/`lint:fix` Scripts |
| UF-AUDIT-014 | P2 | API | fehlende Routen werden per `it.skip` verdeckt | Integrationstest-Zeilen | Contract-Lücken ohne rotes Gate | implementieren oder Clients/Tests entfernen |

## 25. Readiness-Bewertung

Bewertung: pro Bereich wurden Implementierung, aktuelle lokale Gates, externe Verifikation und Betriebsnachweis getrennt gewichtet. `PASS` zählt voll, `PARTIAL` anteilig, `FAIL/BLOCKED/NOT TESTED` stark oder vollständig abgezogen.

| Bereich | Gewicht | Erfüllung | Begründung |
|---|---:|---:|---|
| Backend | 15 % | 60 % | Build/Architektur gut, Lint/Units rot |
| Frontends | 15 % | 55 % | vier Builds, aber Type-/Unit-/Route-Gaps |
| Kernflows | 15 % | 55 % | historischer Lifecycle, negative/externe Fälle fehlen |
| Auth/Security | 10 % | 40 % | Guards vorhanden; Audit/Negativtest-Risiken |
| Payments | 10 % | 25 % | Provider-Code, aber Mock/Placeholder/kein echter E2E |
| Datenbank | 8 % | 55 % | Schema valid; Fresh/Seed/Restore fehlen |
| Tests/CI | 10 % | 45 % | historischer CI grün, aktuelle breite Gates rot |
| Deployment/Staging | 7 % | 20 % | Blueprint ja, kein Deploy/Health |
| Monitoring/Betrieb | 5 % | 30 % | Code/Dokumente, keine Betriebs-Evidenz |
| Backup/Rollback | 3 % | 10 % | kein Testnachweis |
| Dokumentation | 2 % | 60 % | umfangreich, aber widersprüchlich/veraltet |

Gewichtete Gesamtreife: **45 %** (Summe gewichteter Erfüllung, gerundet).

- **Code-Readiness: 55 %** – Builds grün, aber Typecheck/Lint/Units/Security rot.
- **Staging-Readiness: 30 %** – Blueprint vorhanden; lokale Gates und echte Render-Evidenz fehlen.
- **Production-Readiness: 18 %** – externe Zahlungen/Maps/Mail/Push, Restore, Monitoring, Security und Approval fehlen.
- **Gesamtreife: 45 %** – gewichtete Tabelle; keine Marketingzahl.

## 26. Was nachweislich fertig ist

- Der auditierten HEAD lässt Backend und vier Webclients lokal bauen.
- Prisma Client wird generiert und das Schema validiert.
- Backend-Dockerfile baut ein Image.
- Haupt-, Smoke- und Prod-Compose-Dateien sind syntaktisch parsebar.
- Der historische CI-Run 28017653414 hat seine fünf dokumentierten Jobs bestanden.
- Render Blueprint enthält fünf App-Services plus Postgres/Redis-Referenzen und Secret-Platzhalter.

## 27. Was nur teilweise fertig ist

Backend-Module, RBAC, Order Lifecycle, WebSockets, Payments, Notifications, Maps, Monitoring, alle Web-UIs, CI, Prisma-Migration, Deployment-Dokumentation und rechtliche Seiten sind als Code/Dokumente vorhanden, jedoch nicht durch aktuelle vollständige Gates oder externe Betriebs-Evidenz abgesichert.

## 28. Was noch fehlt

Grüne Unit-/Type-/Lint-/Dependency-Gates; aktueller Fresh-DB/Seed/Lifecycle-Smoke; vollständige Contract-/Negativtests; echte Provider-Verifikation; Render-Deploy/Health/Smoke; Mobile-Repo-/Build-/Signing-Entscheidung; Backup-Restore- und Rollback-Test; echte Alerts/Monitoring; formale Production-Freigabe.

## 29. Externe menschliche oder Account-Blocker

- Render-Dashboardzugriff und Kosten-/Planentscheidung.
- Geheimnisse/Accounts für Stripe, PayPal, Maps, Mail, Push und Sentry.
- Domain-/API-Restrictions, Webhook-URLs und Sender-Domain-Verifikation.
- Mobile Apple/Google Developer Accounts, Signing und Store-Freigabe.
- Rechtliche Prüfung von Impressum, Datenschutz, AGB, Storno/Widerruf.
- Festgelegte Backup-Aufbewahrung, On-call/Incident-Verantwortung und Production-Approval.

## 30. Exakt nächste Aufgabe

**NÄCHSTE AUFGABE:**
Customer-Web Typecheck und Unit-Test-Gate wieder vollständig grün machen

**WARUM JETZT:**
Customer ist Einstieg und Checkout-Oberfläche des Kernflows. Der Build ist irreführend grün, während vier Auth-Typfehler, 217 fehlgeschlagene Tests und offene Async-Handles bestehen. Diese Aufgabe ist lokal testbar, benötigt keine externen Accounts, verändert keine Infrastruktur und schafft eine belastbare Basis vor Fresh-DB/E2E/Staging. Sie ist enger und risikoärmer als gleichzeitige Multi-App-, Provider- oder Deployment-Arbeit.

**BETROFFENE DATEIEN:**
Voraussichtlich `frontend/customer-web/src/contexts/AuthContext.tsx`, fehlschlagende Dateien unter `frontend/customer-web/src/**/__tests__`, Jest-Setup/Mocks unter `frontend/customer-web/src/test*` beziehungsweise vorhandene Testkonfiguration. Keine Datei darf ohne konkreten Fehlernachweis geändert werden.

**AKZEPTANZKRITERIEN:**

1. `npm run type-check` Exit 0.
2. `npm test -- --runInBand` Exit 0; keine globalen/zusätzlichen Skips, keine abgeschwächten Assertions.
3. Jest beendet ohne Open-Handle-Warnung.
4. `npm run lint` Exit 0 und `npm run build` Exit 0.
5. Customer-E2E-Suites bleiben unverändert und vorhandene Tests werden nicht gelöscht.
6. Keine externen Accounts, Staging- oder Production-Systeme werden verändert.

**NICHT ÄNDERN:**
Backend, Admin, Restaurant, Driver, Mobile, Render, Provider-Accounts, globale Testregeln und fachliche Erwartungen.

**LOKALE CHECKS:**

```text
cd frontend/customer-web
npm ci
npm run type-check
npm run lint
npm test -- --runInBand
npm run build
```

**CI-GATES:**
`build`, Customer-Anteil von `frontend-e2e`, anschließend `ui-e2e-lifecycle`.

## 31. Direkt kopierbarer nächster Codex-Prompt

```text
Arbeite ausschließlich am Customer-Web von UberFoods.

Ziel: Bringe den Customer-Web-Typecheck und die vollständige Unit-Test-Suite ohne Abschwächung wieder auf grün.

Ausgangsevidenz:
- frontend/customer-web: `npm run type-check` scheitert in `src/contexts/AuthContext.tsx` an den Zeilen 110, 146, 183 und 211 durch unsichere `Record<string, unknown>`-zu-`User`-Casts.
- `npm test -- --runInBand` meldet 41 fehlgeschlagene von 49 Suites, 217 fehlgeschlagene von 306 Tests und offene Async-Handles.
- Lint und Build sind aktuell grün.

Arbeitsregeln:
1. Beginne mit `git status`, Branch, HEAD und Diff. Bewahre fremde Änderungen.
2. Analysiere zuerst die vollständigen Testfehler und gruppiere gemeinsame Ursachen; ändere dann nur Customer-Web-Dateien.
3. Keine Tests löschen, keine Assertions abschwächen, keine globalen oder bedingten Skips hinzufügen, keine Coverage-Schwellen senken.
4. Keine Backend-, Admin-, Restaurant-, Driver-, Mobile-, Render- oder Provider-Dateien ändern.
5. Behebe Typen an der Quelle mit Runtime-Validierung/Type Guards, nicht mit `as unknown as User`.
6. Behebe offene Handles durch korrektes Cleanup; verwende kein Force-Exit.
7. Führe abschließend exakt aus:
   cd frontend/customer-web
   npm ci
   npm run type-check
   npm run lint
   npm test -- --runInBand
   npm run build
8. Berichte jeden Exit-Code und die Testzahlen. Committe/pushe nur, wenn ausschließlich beabsichtigte Customer-Web-Dateien geändert sind und alle fünf Checks grün sind.
```
