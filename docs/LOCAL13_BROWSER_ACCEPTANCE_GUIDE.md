# LOCAL-13 Browser-Abnahme

Diese Anleitung beschreibt die isolierte lokale Abnahme der vier Web-Apps mit
einem gemeinsamen Backend, PostgreSQL und Redis. Sie verwendet ausschließlich
lokale Seed-Daten und erzeugt dynamische Host-Ports.

## Voraussetzungen

- Docker Desktop läuft.
- Node.js/npm sind aus dem Repository-Vertrag verfügbar.
- Das Arbeitsverzeichnis ist der Repository-Root.
- Die Browser-Abnahme erfolgt in getrennten Browser-Tabs bzw. Kontexten pro
  Rolle: Customer, Admin, Restaurant Owner, Driver A und optional Driver B.

## Start und URL-Ermittlung

PowerShell:

```powershell
$runDir = Join-Path $env:TEMP 'uberfoods-local13-browser'
New-Item -ItemType Directory -Path $runDir -Force | Out-Null
npm run verify:production-simulation -- `
  --browser-session-file (Join-Path $runDir 'session.json') `
  --browser-control-dir (Join-Path $runDir 'control')
```

Der Verifier baut und startet PostgreSQL, Redis, Migration/Seed, Backend,
Customer-Web, Admin-Panel, Restaurant-Web und `frontend/driver-app` in einem
eigenen Compose-Projekt. Er reserviert freie Ports und gibt sie in der
Startausgabe aus. Die vollständigen URLs stehen zusätzlich in der temporären
`session.json` unter `urls.backend`, `urls.customer`, `urls.admin`,
`urls.restaurant` und `urls.driver`; die Datei bleibt außerhalb des
Repositories und darf nicht veröffentlicht werden.

Backend-Prüfungen:

```text
<backend-url>/api/health       -> 200
<backend-url>/api/health/ready -> 200
<backend-url>/api/restaurants/public -> 200
```

Die Frontends verwenden im Produktions-Simulationsbuild `/api` und den
proxied Socket.IO-Pfad `/socket.io`; dadurch zeigen alle vier Apps auf dasselbe
aktuelle Backend, ohne historische Ports festzulegen.

## Seed-Rollen und Reihenfolge

Der Seed stellt diese Rollen bereit: Customer, Admin, Restaurant Owner,
Driver A und Driver B. Die Zugangsdaten werden nur vom Verifier in der
temporären Session-Datei bereitgestellt. Werte niemals in Reports,
Screenshots, Logs oder das Repository kopieren.

Empfohlene Reihenfolge:

1. Backend-Health und alle vier Root-Dokumente öffnen.
2. Customer-Web: Login, Session-Restore nach Reload, öffentliche Restaurants,
   Profil, Restaurant/Menü, Warenkorb befüllen und wieder leeren, Logout und
   geschützte Route nach Logout.
3. Admin-Panel: Login, Dashboard, Restaurants, Bestellungen oder Kunden,
   Reporting, Integrationen, Supplier Management, Einstellungen und Logout.
4. Restaurant-Web: Login, Onboarding nur mit lokaler Seed-Lieferzone
   abschließen, Reload/Session-Restore, Restaurant-Profil, Dashboard, Menü,
   Bestellungen, KDS, Standorte, Meal Planner, Analytics, Reporting,
   WebSocket-Status, Logout und erneuten Login.
5. Driver-App: Login, Dashboard/Driver-Me, verfügbare und aktive
   Bestellungen, authentifizierten WebSocket-Status, Logout und erneuten
   Login. Driver B darf keine Bestellung von Driver A als eigene aktive
   Bestellung sehen oder übernehmen.

Keine Zahlung, Mail, Push-Nachricht oder produktive Integration auslösen.

## Negative Auth-, RBAC- und Ownership-Prüfungen

Mit den bereits angemeldeten Tabs prüfen und das erwartete Ergebnis als PASS
markieren:

- Customer erhält keine Admin- oder Restaurant-Owner-Seite.
- Restaurant Owner erhält keine Admin-Seite und keinen Zugriff auf eine
  fremde Restaurant-Ressource.
- Driver erhält keine Admin- oder Restaurant-Owner-Seite.
- Driver B erhält keinen Zugriff auf Driver-A-Bestellungen.
- Ungültige/abgelaufene Sessions werden entfernt.
- Nach Logout führt jede geschützte Route zum jeweiligen Login.

Erwartete `401`/`403` sind bei diesen Negativtests kein Fehler. Unerwartete
`401`/`403`, `404`, `500`, `requestfailed`, `pageerror`, nicht erklärbare
`console.error`/`console.warn`, Unhandled Rejections oder WebSocket-Fehler
sind als Findings zu erfassen.

## Kontrollierte Checkpoints, Stop und Cleanup

Der Verifier wartet für `initial`, `after-controlled-restart`,
`after-application-recreate` und `after-postgres-recreate` auf die jeweilige
Datei `continue-<stage>` im Control-Verzeichnis. Nach dem Browser-Smoke kann
der nächste Checkpoint kontrolliert freigegeben werden:

```powershell
New-Item -ItemType File -Path (Join-Path $runDir 'control\continue-initial')
```

Für die weiteren Stufen entsprechend `continue-after-controlled-restart`,
`continue-after-application-recreate` und
`continue-after-postgres-recreate` verwenden. Erst nach dem letzten
Checkpoint beendet sich der Verifier erfolgreich und entfernt ausschließlich
seine eigenen Container, sein Netzwerk und temporäre Laufzeit-Artefakte.

Bei einem kontrollierten Abbruch `Ctrl+C` verwenden und anschließend prüfen,
dass das vom Verifier ausgegebene Compose-Projekt, seine Listener und
Container verschwunden sind. Fremde Container, Volumes, Prozesse und
untracked Repository-Dateien nicht verändern.

## Optionale Integrationen

Zahlungsanbieter, Mail, Push, Google/Facebook/Apple-Login und externe Karten-
oder Geocoding-Dienste sind in dieser lokalen Abnahme NOT-TESTED, sofern kein
lokaler Sandbox-/Mock-Vertrag ausdrücklich vorhanden ist.
