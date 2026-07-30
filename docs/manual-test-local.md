# Manuelle Browser-Abnahme auf Localhost

Diese Anleitung ist der kanonische Ablauf für die lokale Browser-Abnahme von
UberFoods. Sie verwendet ausschließlich lokale Dienste. Cloud-, Render-,
Production- und öffentliche Deployment-Ziele gehören nicht zu diesem Ablauf.

## Voraussetzungen

- Windows PowerShell
- Docker Desktop mit Docker Compose
- Node.js und npm gemäß Repository
- Chromium oder ein anderer moderner Desktop-Browser
- installierte Repository-Abhängigkeiten
- freie Ports `3000`, `3002`, `3003`, `3004`, `3102`, `5434` und `6379`

Die Verzeichnisse `mobile/customer-app/` und `mobile/driver-app/` sind kein Teil
dieser Abnahme und dürfen weder installiert noch getestet oder verändert werden.

## Startmatrix

Der vorhandene Gesamteinstieg ist:

```powershell
.\scripts\check-docker.ps1
.\scripts\dev-up.ps1
```

`dev-up.ps1` startet Compose, die vier Frontends und anschließend den vorhandenen
MVP-Smoke. Für eine besser kontrollierbare manuelle Abnahme können die Befehle
auch in getrennten Terminals ausgeführt werden:

| Komponente | Startbefehl | Port | URL/Prüfung | Environment-Quelle |
| --- | --- | ---: | --- | --- |
| PostgreSQL | `docker compose up -d` | 5434 | `docker compose exec postgres pg_isready` | Root-Compose und lokale Root-Environment |
| Redis | `docker compose up -d` | 6379 | `docker compose exec redis redis-cli ping` | Root-Compose und lokale Root-Environment |
| Backend | `docker compose up -d` | 3000 | `http://127.0.0.1:3000/api/health` | `backend/.env`; Vorlage `backend/.env.example` |
| Customer-Web | `npm run dev:e2e` in `frontend/customer-web` | 3102 | `http://127.0.0.1:3102/` | `frontend/customer-web/.env.example` und Vite-E2E-Mode |
| Admin-Panel | `npm run dev -- --host 127.0.0.1 --port 3002 --strictPort` in `frontend/admin-panel` | 3002 | `http://127.0.0.1:3002/` | `frontend/admin-panel/.env.example` |
| Restaurant-Web | `npm run dev -- --host 127.0.0.1 --port 3003 --strictPort` in `frontend/restaurant-web` | 3003 | `http://127.0.0.1:3003/` | `frontend/restaurant-web/.env.example` |
| Driver-App | `npm run dev -- --host 127.0.0.1 --port 3004 --strictPort` in `frontend/driver-app` | 3004 | `http://127.0.0.1:3004/` | `frontend/driver-app/.env.example` |

Keine Environment-Werte, Tokens oder Passwörter in Terminalprotokolle oder
Screenshots übernehmen.

### Isolierte Produktionssimulation

Wenn die Standardports bereits belegt sind oder eine garantiert frische
Datenbasis benötigt wird, ist der kanonische isolierte Einstieg im
Repository-Root:

```powershell
npm run verify:production-simulation
```

Der Verifier verwendet einen eigenen Compose-Projektnamen, dynamische
Loopback-Ports und ein eigenes PostgreSQL-Volume. Er führt Prisma Generate,
alle vorhandenen Migrationen sowie den Seed zweimal aus und prüft
Idempotenz, Backend- und Frontend-Health, den API-Lifecycle und Persistenz
nach Backend-, Anwendungs- und PostgreSQL-Recreate. Die tatsächlichen Ports
werden ausschließlich aus seiner Ausgabe beziehungsweise den
Container-Mappings übernommen. Die temporären Test-Secrets werden nicht
protokolliert.

Der Verifier bereinigt am Ende ausschließlich seinen eigenen Compose-Namespace
und sein eigenes Test-Volume. Die Browser-UI-Abnahme bleibt ein separater,
zusätzlicher Schritt; ein grüner API-Verifier ersetzt sie nicht.

## Preflight und Health

Vor dem Start müssen fremde Prozesse und Container ausgeschlossen werden:

```powershell
docker compose ps
docker ps --format "table {{.ID}}`t{{.Names}}`t{{.Image}}`t{{.Ports}}`t{{.Status}}"
Get-NetTCPConnection -State Listen |
  Where-Object LocalPort -in 3000,3002,3003,3004,3102,5434,6379 |
  Sort-Object LocalPort
```

Keine fremden Prozesse beenden und keine alternativen Ports wählen. Ein
Portkonflikt wird zuerst über Containername, Image, PID, Commandline und
Arbeitsverzeichnis zugeordnet.

Vor dem Öffnen des Browsers müssen diese Prüfungen erfolgreich sein:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000/api/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3102/
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3002/
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3003/
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3004/
docker compose exec postgres pg_isready
docker compose exec redis redis-cli ping
```

Erwartet werden HTTP `200`, PostgreSQL `accepting connections` und Redis `PONG`.

## Lokale Seed-Konten

Die vier lokalen Rollen werden nicht frei erfunden. Ihre kanonischen Quellen
sind:

- `backend/prisma/seed.ts`
- `scripts/seed-e2e.mjs`
- die vorhandenen E2E-Fixtures unter `backend/test/e2e/`

Passwortwerte bleiben ausschließlich in der lokalen Secret-Zufuhr. Der
kanonische Seed wird mit den erforderlichen lokalen `SEED_*`-Variablen über
`npm run prisma:seed` ausgeführt. Danach den Seed ein zweites Mal ausführen:
beide Läufe müssen ohne Duplikate und ohne Fehler enden.

Keine Production-Konten, echten Zahlungen, E-Mails oder Push-Nachrichten
verwenden.

## Getrennte Browser-Sessions

Customer, Admin, Restaurant und Driver jeweils in einem eigenen Browserprofil
oder privaten Browserkontext öffnen. Eine bloße Trennung in Tabs ist nur
ausreichend, wenn Cookies und Storage nachweislich pro Rolle isoliert sind.

Für jede Anwendung prüfen:

1. Login über das sichtbare Formular.
2. Dashboard beziehungsweise Startansicht.
3. Navigation zu einer geschützten Ansicht.
4. Reload ohne Redirect- oder Refresh-Schleife.
5. Logout über die UI.
6. Reload und Browser-Zurück nach Logout.
7. Console, Network und Socket.IO während aller Schritte.

Die Abnahme wird fail-closed unterbrochen, wenn eine Kernrolle nicht über die UI
einloggen kann, eine unbehandelte JavaScript-Ausnahme auftritt oder die
Anwendung einen ungültigen Token als Sitzung akzeptiert. API-Aufrufe dürfen
einen blockierten UI-Schritt nicht ersetzen.

## Manueller Order-Lifecycle

Die neue Bestellung muss in der sichtbaren Customer-Oberfläche entstehen. Nur
lokale Testdaten und vorhandene Mock- oder Sandbox-Zahlungswege verwenden.

| Schritt | Anwendung | Sichtbare Aktion | Erwarteter Status |
| ---: | --- | --- | --- |
| 1 | Customer | Restaurant und Gericht wählen, Warenkorb prüfen, Bestellung absenden | `PENDING` |
| 2 | Restaurant | neue Bestellung öffnen und annehmen | `CONFIRMED` |
| 3 | Restaurant | „In Zubereitung“ wählen | `PREPARING` |
| 4 | Restaurant | „Bereit zur Abholung“ wählen | `READY_FOR_PICKUP` |
| 5 | Driver | verfügbare Bestellung übernehmen | `ACCEPTED` |
| 6 | Driver | Abholung bestätigen | `PICKED_UP` |
| 7 | Driver | Fahrt starten | `IN_TRANSIT` |
| 8 | Driver | Lieferung bestätigen | `DELIVERED` |
| 9 | Customer | Bestellverfolgung kontrollieren | `DELIVERED` |
| 10 | Admin | Bestellung in der Verwaltung kontrollieren | `DELIVERED` |

Pro Schritt Order-ID, sichtbaren Vorher-/Nachher-Status und genau einen
UI-Eintrag notieren. Eine mehrfach erzeugte Bestellung oder ein doppeltes
Statusereignis ist ein Abbruchgrund.

## Realtime-Prüfung

Restaurant, Driver, Customer und Admin während des Lifecycles geöffnet lassen.
Vor der Bewertung eines Übergangs nicht manuell aktualisieren.

Im Browser-Network-Tab prüfen:

- Socket.IO-Pfad `/socket.io`
- Standard-Namespace `/`
- erfolgreicher authentifizierter Connect
- kein `404`, kein CORS-Fehler und kein wiederholtes `connect_error`
- keine unkontrollierte Reconnect-Schleife
- jeder Statusübergang erscheint genau einmal

Erwartete Live-Übergänge:

1. Customer erstellt → Restaurant sieht die Bestellung.
2. Restaurant bestätigt → Customer sieht `CONFIRMED`.
3. Restaurant setzt `READY_FOR_PICKUP` → Driver sieht den Auftrag.
4. Driver übernimmt → Restaurant und Admin sehen die Zuweisung.
5. Driver bestätigt Pickup → Customer und Admin sehen `PICKED_UP`.
6. Driver bestätigt Delivery → Customer und Admin sehen `DELIVERED`.

Danach einen Client neu laden. Der Socket muss sich erneut verbinden und der
aktuelle Status darf nicht auf einen alten Wert zurückfallen. Raum- oder
JWT-Werte niemals in Screenshots oder Protokolle kopieren.

## Auth-, RBAC- und Ownership-Smokes

- `Customer /dashboard` ohne Sitzung direkt öffnen: Redirect auf Login oder
  vertragsgemäße Ablehnung.
- Mit Customer-, Driver- und Restaurant-Zugang jeweils eine Adminroute öffnen:
  kein Admin-Dashboard und keine sensiblen Daten.
- Nach Logout geschützte Route neu laden und Browser-Zurück ausführen.
- Soweit über die vorhandene UI gefahrlos möglich, eine fremde Order-ID öffnen:
  `401`, `403` oder `404`, ohne Datenflash.
- Tokens nicht editieren und nicht in DevTools kopieren.

Ein absichtlich ausgelöster einzelner `401` oder `403` ist akzeptabel. Eine
Schleife oder sichtbare fremde Daten sind nicht akzeptabel.

## Console-, Network- und visuelles Gate

Für jede Anwendung im Desktop-Viewport und zusätzlich in einem schmalen
Viewport prüfen:

- Navigation, Loginformular und zentrale Buttons erreichbar
- keine blockierende leere Fläche, kein Endlosspinner und kein dauerhaftes Overlay
- keine `Uncaught`, `Unhandled`, `TypeError` oder `ReferenceError`
- keine dauerhaften `4xx`-/`5xx`-Schleifen
- keine CORS-, Mixed-Content- oder falsche Backend-URL
- keine Socket.IO-404 und kein wiederholtes Reconnect

Router-Zukunftswarnungen werden dokumentiert, sind allein aber kein funktionaler
Fehler. Jede rote Console-Meldung wird einzeln klassifiziert.

## Evidenz

Screenshots nur außerhalb des Repositorys oder unter dem bereits ignorierten
Verzeichnis `artifacts/` speichern. Vor jedem Screenshot Loginfelder leeren und
Tokens, Cookies, Authorization-Header sowie persönliche Daten ausblenden.

Mindestens belegen:

- erfolgreiche Anmeldung jeder Rolle
- neue Bestellung und jeden Rollenübergang
- finalen Status bei Customer und Admin
- Socket.IO-Connect
- abgewiesene unberechtigte Route

Vor Commit mit `git status --short` sicherstellen, dass keine Evidenzdatei
gestaged ist.

## Kontrollierter Stop

Nur Prozesse und Container stoppen, die für den aktuellen Lauf gestartet wurden.
In den vier Frontend-Terminals `Ctrl+C` verwenden und die jeweilige PID
protokollieren. Wurde das UberFoods-Compose-Projekt in diesem Lauf gestartet:

```powershell
docker compose down
```

Keine Volumes löschen. Niemals pauschal alle Node-Prozesse beenden. Danach
erneut `docker compose ps`, `docker ps` und die Portliste prüfen. Vor dem Lauf
bereits vorhandene UberFoods-Dienste bleiben unangetastet und werden als solche
dokumentiert.

## Troubleshooting

### Portkonflikt

Mit `Get-NetTCPConnection` die PID und anschließend mit
`Get-CimInstance Win32_Process` Commandline und Arbeitsverzeichnis prüfen. Nur
einen eindeutig zu diesem UberFoods-Lauf gehörenden Prozess stoppen.

### Backend nicht healthy

`docker compose ps` und `docker compose logs --tail 200 backend` prüfen.
Environment-Werte vor jeder Weitergabe redigieren.

### PostgreSQL oder Redis nicht ready

```powershell
docker compose exec postgres pg_isready
docker compose exec redis redis-cli ping
docker compose logs --tail 100 postgres redis
```

Keine Migration zurücksetzen und kein Volume löschen.

### Login bleibt auf dem Formular

Den HTTP-Status und ausschließlich die Struktur der Auth-Antwort prüfen.
Frontend und Backend müssen denselben Response-Envelope-Vertrag verwenden.
Keine Tokens von Hand setzen und keine Auth-Guards umgehen.

### Socket.IO verbindet nicht

Backend-Health, `/socket.io`-Request, exakte Localhost-Origin und den
authentifizierten Connect prüfen. CORS-Allowlist, JWT-Prüfung und Raumregeln
nicht lockern.

## Optionale Integrationen

Echte Payment-Provider, E-Mail, Push, Passkeys, Social Login und externe Karten-
oder Geocoding-Anbieter sind in dieser lokalen Browser-Abnahme `NOT TESTED`,
sofern kein vorhandener lokaler Mock- oder Sandboxpfad verwendet wird.

## LOCAL-13-Protokoll vom 29. Juli 2026

Die Abnahme auf Branch `codex/local-release-check` startete auf Commit
`e4a7529945095aa3f699891445633fd0843abd30`. Infrastruktur und alle fünf
HTTP-Anwendungen waren erreichbar. Der kanonische Seed wurde so korrigiert,
dass bestehende Customer-, Restaurant- und Admin-Identitäten ihre lokalen
Passwort-Hashes idempotent aktualisieren.

Der Browserlauf bleibt `PARTIAL`: Nach erfolgreichem Customer-Login stürzt die
Sidebar mit `orders?.filter is not a function` ab. Admin und Driver verarbeiten
den standardisierten Auth-Response-Envelope nicht korrekt; beim Driver entsteht
nach Reload eine ungültige scheinbare Sitzung. Restaurant zeigt den
Onboarding-Wizard vor dem Login und blockiert dadurch die Auth-Oberfläche.
Order-Lifecycle, Realtime-Abnahme, Rollen-Reload/Logout und responsive
Kernaktionen sind deshalb nicht als bestanden zu werten.

## P1-LOCAL-INTEGRATED-BROWSER-012-Protokoll vom 30. Juli 2026

Die Abnahme startete auf Commit
`58827cc3c98a133330bb5281ad0b2acadd889441`. Die isolierte
Produktionssimulation `uberfoods_prod_sim_7b0ef312` bestand Fresh-DB,
Migrationen, beide Seed-Läufe, Idempotenz, Health aller Dienste, den
API-Rollen-Lifecycle und die Persistenzprüfungen. Ihr eigener Namespace und
ihr Test-Volume wurden anschließend erfolgreich entfernt.

Der erste Browser-P1 trat auf `http://127.0.0.1:3102/login` auf:
`TypeError: orders?.filter is not a function` in `Sidebar`. Die
Order-List-Normalisierung berücksichtigte den verschachtelten standardisierten
Pagination-Envelope nicht, und die Badge-Berechnung war gegenüber einer
bereits gecachten Fehlform nicht abgesichert. Nach der Korrektur rendert die
Loginseite wieder ohne Error Boundary. Ein positiver Regressionstest prüft den
verschachtelten Envelope; ein negativer Regressionstest normalisiert eine
unbekannte Antwortform fail-closed auf eine leere Liste.

Gemäß der Regel, beim ersten P0/P1 den breiten Lauf zu stoppen, wurden der
Mehrrollen-Browser-Lifecycle, die vollständige Negativmatrix und die
WebSocket-UI-Abnahme in diesem Lauf nicht fortgesetzt. Das Finding bleibt bis
zu einem neuen vollständigen Browserlauf `PARTIAL`.
