# 15 Gaps Closure Roadmap

Datum: 2026-06-05

## Executive Summary

Das Projekt steht nach der aktuellen Audit- und Testlage bei ca. 86% Production Readiness: Der MVP-Kern ist durch Smoke-, Build-, Typecheck- und Backend-Tests stark belegt. Die sechs P1-UI/API-Luecken wurden geschlossen und der Full-Platform-UI-E2E-Run ist gruen. Der naechste stabile Schritt ist jetzt die Docker-/Production-Runtime-Pruefung statt weiterer Business-Features.

Diese Roadmap ist bewusst kein Rewrite-Plan. Sie trennt MVP-kritische Produktionsfreigabe-Themen von erweiterten Plattformfunktionen und benennt je Luecke klare Akzeptanzkriterien.

## Ausgangslage

- MVP-Kernfluss Customer -> Restaurant -> Driver -> Admin ist lokal gegen echte Services belegt.
- Backend-Typecheck, Build, Smoke-Test, Backend-Test-Suite und Payment-Webhook-Unit-Test sind gruen.
- Die sechs P1-UI/API-Fixes sind abgeschlossen und im Full-Platform-UI-E2E-Run abgesichert.
- Keine echten Produktiv-Secrets wurden in den neu geaenderten Dateien eingetragen.
- Lokale absolute Workspace-Pfade wurden aus den neu geaenderten Docs entfernt.
- Kleine, risikoarme Korrekturen wurden an CI-Redis, CI-Datenbank-URL, Production-Entrypoints und Healthcheck-Routen vorgenommen.

## Zielbild

Ziel ist nicht "mehr Features", sondern belastbare Produktionssicherheit:

- echte Provider-Konfigurationen validiert,
- CI laeuft reproduzierbar gegen frische Services,
- Deployment-Artefakte starten den vollen Produktionsentrypoint,
- Monitoring, WebSocket, Push und Admin-Reporting sind nicht nur vorhanden, sondern End-to-End bewiesen,
- Runbooks wurden mindestens einmal gegen eine Staging-Umgebung geprobt.

## Die 15 Luecken

| Nr. | Prioritaet | Luecke | Evidenz | Risiko | Fix-Plan | Akzeptanzkriterium |
|---:|---|---|---|---|---|---|
| 1 | P0 | Produktiv-Secrets und ENV-Governance sind noch nicht final nachgewiesen. | `.env.example`, `backend/.env.example`, `render.yaml`, Kubernetes Secret-Referenzen | Beispielwerte oder fehlende Secrets koennen den Livebetrieb blockieren oder unsicher machen. | Secrets ausschliesslich in Secret-Manager/CI-Environment pflegen, Required-Env-Check fuer Staging/Prod erzwingen. | Staging/Prod startet ohne Beispielwerte; Secret-Rotation und Owner sind dokumentiert. |
| 2 | P0 | Payment-Service enthaelt noch testkompatible Minimal-/Mock-Pfade. | `backend/src/modules/payment/payment.service.ts` | Reale Zahlungen, Refunds oder Providerfehler koennen anders laufen als Tests. | Stripe/PayPal-Servicepfade gegen Sandbox-Provider voll verdrahten und negative Pfade testen. | Sandbox-Zahlung, Capture, Refund und Failure-Recovery sind per automatisiertem Test belegt. |
| 3 | P0 | Stripe/PayPal-Webhooks sind nicht gegen echte Provider-Sandbox-Endpunkte bewiesen. | `backend/src/modules/payment/payment-webhook.controller.ts`, Payment-Webhook-Unit-Test | Falsche Secrets, Raw-Body-Konfiguration oder Event-Mapping fallen erst live auf. | Staging-Webhook-URL einrichten, Stripe CLI/PayPal Sandbox Events replayen. | Mindestens `payment_succeeded`, `payment_failed`, Refund und Subscription Events aktualisieren DB-Zustand korrekt. |
| 4 | P0 | CI war nicht konsequent auf frische Postgres- und Redis-Services verdrahtet. | `.github/workflows/ci.yml` | Tests koennen lokal gruen sein, aber in CI nicht reproduzierbar laufen. | Redis-Service in CI aktivieren, DB-URL korrigieren, Backend-Start mit Redis-URL ausfuehren. | Alle CI-Jobs laufen gruen auf frischer Postgres/Redis-Kombination. |
| 5 | P0 | Production-Entrypoints und Healthchecks waren uneinheitlich. | `Dockerfile.backend`, `backend/Dockerfile`, `docker/production/*`, `k8s/production/backend-deployment.yml`, `nginx/nginx.production.conf` | Production-Container koennen den schmalen Entry starten oder Healthchecks gegen falsche Route pruefen. | Production-Images auf `dist/main.prod.js` und Healthchecks auf `/api/health` ausrichten. | Docker/Kubernetes-Staging startet den Full-Stack und meldet healthy. |
| 6 | P0 | Backup-/Restore-Rehearsal ist dokumentiert, aber nicht als ausgefuehrt belegt. | Release-/Runbook-Dokumentation | Ein Restore-Plan ohne Probe ist im Ernstfall ein Annahmerisiko. | Staging-Backup erzeugen, Restore in frische DB proben, Dauer und Schritte dokumentieren. | Restore-Protokoll mit Zeit, Verantwortlichen und erfolgreichem Smoke-Test liegt vor. |
| 7 | P0 | Domain, SSL, Reverse Proxy und CORS sind vorbereitet, aber nicht in Zielumgebung validiert. | `nginx/nginx.production.conf`, `render.yaml`, Frontend-Env-Beispiele | App kann gebaut sein, aber wegen DNS/SSL/CORS/WebSocket-Routing im Browser scheitern. | Staging-Domain mit TLS, API, WebSocket und Frontend-Origin komplett testen. | Browser-E2E gegen Staging-Domain besteht inklusive API-Calls und WebSocket-Verbindung. |
| 8 | P1 | Admin-E2E-Abdeckung ist noch nicht hart genug fuer alle kritischen Betriebsaktionen. | `frontend/admin-panel/e2e/*`, Admin-Backend-Tests | Admin kann Livebetrieb nicht sicher steuern, wenn Teilbereiche nur gemockt oder optional getestet sind. | E2E fuer Orders, Restaurants, Drivers, Users, Roles und Emergency-Aktionen mit echten APIs haerten. | Admin-E2E laeuft gegen echten Backend-Seed ohne optionale Kernassertions. |
| 9 | P1 | Reporting/Export/Analytics-Flows sind nicht vollstaendig End-to-End bewiesen. | `backend/src/modules/reporting/*`, Admin Reporting Hooks | Finanz-/Betriebsreports koennen unvollstaendig oder nicht exportierbar sein. | Report-Erstellung, Filter, Export und Scheduled Reports mit Testdaten pruefen. | CSV/PDF/Excel-Export und Scheduled-Report-Flow sind reproduzierbar getestet. |
| 10 | P1 | Monitoring-Frontend und Monitoring-Backend passen nicht vollstaendig zusammen. | `backend/src/modules/monitoring/*`, `frontend/admin-panel/src/hooks/useMonitoringData.ts` | Admin-Dashboard zeigt leere oder irrefuehrende Betriebsdaten. | Fehlende Endpunkte wie Errors/API/Database entweder implementieren oder Frontend-Vertrag anpassen. | Monitoring-Dashboard zeigt reale Health-, DB-, API- und Error-Daten in Staging. |
| 11 | P1 | WebSocket-Gateway ist noch nicht als echte Event-Auslieferung bewiesen. | `backend/src/modules/websocket/websocket.gateway.ts` | Live-Tracking und Statusupdates koennen nur per Polling/Refresh funktionieren. | Gateway als echten Socket.IO Gateway verdrahten, Rooms/User-Channels testen. | Order-Statuswechsel erscheint ohne Reload in Customer-, Restaurant- und Driver-App. |
| 12 | P1 | Push-Notification-Flows sind vorhanden, aber nicht gegen echte Browser/Device-Subscription validiert. | `backend/src/common/controllers/push-notification.controller.ts` | Kritische Updates erreichen Nutzer nicht zuverlaessig. | VAPID/Firebase-Konfiguration in Staging pruefen, Subscribe/Unsubscribe/Broadcast testen. | Testgeraet erhaelt Order- und Broadcast-Push; Unsubscribe verhindert weitere Zustellung. |
| 13 | P1 | Payment-Failure, Refund und Dispute-Flows sind nicht ausreichend als echte Nutzer-/Admin-Flows belegt. | Payment-Service, Customer/Admin Payment UI, Payment Tests | Geldfluss-Sonderfaelle sind operativ besonders teuer, wenn sie manuell repariert werden muessen. | Failure-Recovery, Refund-Antrag, Admin-Review und Provider-Statusabgleich testen. | Mindestens je ein automatisierter E2E fuer Failure und Refund ist gruen. |
| 14 | P2 | Performance- und Bundle-Budgets sind nicht als CI-Gate erzwungen. | Frontend-Builds, Performance-Skripte | Schleichende Bundle- oder API-Latenzregressionen bleiben unbemerkt. | Bundle-Budget und API-Baseline als nicht-blockierendes Gate einfuehren, danach blockierend schalten. | CI reportet Budgets; Regression ueber definiertem Grenzwert failt. |
| 15 | P3 | Zukunftsvertikalen wie White-Label, Franchise, Supermarkt/Paketshop und AI sind eher vorbereitet als produktisiert. | Prisma-Modelle, Docs, breite Modulstruktur | Erwartungsmanagement leidet, wenn vorbereitete Features als live verkauft werden. | Als Roadmap-Features kennzeichnen, je Vertical eigenes MVP-Scope und Tests definieren. | Sales-/Produktdoku unterscheidet klar zwischen live, beta und planned. |

## Priorisierte Umsetzung

### P0: Vor echtem Livegang

- Secret-/ENV-Governance finalisieren.
- Payment-Provider und Webhooks in Sandbox/Staging beweisen.
- CI auf frische Postgres/Redis Services festziehen.
- Production-Entrypoints, Healthchecks, Domain, SSL und CORS in Staging validieren.
- Backup und Restore einmal real proben.

### P1: Vor breiter Produktion

- Admin-, Reporting-, Monitoring-, WebSocket-, Push- und Payment-Sonderfall-Flows hart end-to-end testen.
- Frontend/Backend-Vertraege fuer Monitoring und Reporting bereinigen.
- Provider- und Realtime-Flows in Staging als Release-Gates aufnehmen.
- Die lokale Full-UI-E2E-Umgebung bleibt mit Backend auf 3000, Customer-Web auf 3102, Restaurant-Web auf 3003, Driver-App auf 3004 und Admin-Panel im normalen Dev-Modus auf 3002 dokumentiert.

### P2: Nach Stabilisierung

- Performance- und Bundle-Budgets in CI einfuehren.
- Langsame oder grosse Frontend-Bereiche gezielt optimieren.

### P3: Produktstrategie

- Zukunftsvertikalen getrennt vom aktuellen Food-Delivery-MVP behandeln.
- White-Label/Franchise/AI nur mit eigenem Scope als produktionsbereit markieren.

## Kleine Korrekturen in diesem Pass

- CI: Redis-Service ergaenzt und fehlerhafte E2E-Datenbank-URL korrigiert.
- Deployment: Production-Dockerfiles starten den Full-Production-Entrypoint.
- Healthchecks: Backend-Probes in Production-Compose/Kubernetes/Nginx auf `/api/health` ausgerichtet.
- Dokumentation: Lokalen Workspace-Pfad aus dem Audit entfernt.
- Stabilisierung: Full-Platform-UI-E2E ist gruen, und der Admin-Devserver-Hinweis ist eindeutig dokumentiert.

## Freigabeampel

- MVP: gruen.
- Staging: gruen mit Pflicht zur Provider-/Infra-Validierung.
- Production mit echten Kundinnen und Kunden: gelb, bis P0 vollstaendig geschlossen ist.
- Ziel 95%: realistisch nach Abschluss aller P0- und der wichtigsten P1-Gates.

## Status 2026-06-06

- Die sechs P1-UI/API-Luecken sind geschlossen.
- `npm run test:e2e:full` ist gruen.
- Der lokale Full-UI-E2E-Lauf verwendet fuer das Admin-Panel den normalen Dev-Modus.
- Der Docker-Backend-Container startet erfolgreich mit `dist/main.prod.js`, und `GET /api/health` funktioniert im Container.
- Nächster technischer Schritt: Docker-/Production-Runtime in Staging pruefen, nicht neue Business-Features bauen.
