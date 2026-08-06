# LOCAL-13 Browser-Abnahme

Diese Anleitung beschreibt den authentifizierten lokalen UI-Gate für Customer-Web,
Admin-Panel, Restaurant-Web und `frontend/driver-app`. Jeder Lauf verwendet ein
eigenes Docker-Compose-Projekt, eine eigene PostgreSQL-/Redis-Instanz, dynamische
Host-Ports, frische Testidentitäten und getrennte Playwright-Browserkontexte.

## Voraussetzungen

- Docker Desktop läuft.
- Node.js/npm sind verfügbar.
- Das Arbeitsverzeichnis ist der Repository-Root des isolierten Worktrees.
- Die vier mobilen/Frontend-Oberflächen werden nur über ihre Web-UIs geprüft;
  `mobile/customer-app/` und `mobile/driver-app/` bleiben außerhalb des Scopes.

Vor dem ersten Browserlauf einmalig die Runner-Abhängigkeit installieren:

```powershell
Push-Location frontend/customer-web
npm ci
Pop-Location
```

## Session starten

```powershell
$startOutput = node scripts/local13-session.mjs start
$startOutput
```

Die Ausgabe enthält `LOCAL13_SESSION_FILE`, die fünf lokalen URLs und den
Compose-Namespace. Die Credential-Datei liegt ausschließlich unter `%TEMP%`.
Ihr Inhalt darf nicht geöffnet, kopiert, geloggt oder in Evidence übernommen
werden.

Optionaler Statuscheck:

```powershell
$sessionFile = ($startOutput | Select-String '^LOCAL13_SESSION_FILE=').ToString().Split('=', 2)[1]
node scripts/local13-session.mjs status --session-file $sessionFile
```

## Browser-Abnahme ausführen

Der Runner verwendet ausschließlich sichtbare UI-Aktionen: Login-Formulare,
Profil-/Checkout-/Zahlungsdialog, Restaurant-Statusbuttons, Driver-Statusbuttons,
Admin-Navigation, Reload und Logout. Er injiziert keine Tokens, setzt kein
`localStorage` und führt den Bestell-Lifecycle nicht per direkter API aus.

```powershell
node scripts/local13-browser-acceptance.mjs --session-file $sessionFile
```

Die UI-Reihenfolge ist:

1. Guest-Checks gegen geschützte Routen aller vier Apps.
2. Customer-Login, Profiladresse, Restaurant/Menü, Warenkorb, Checkout und
   lokale Überweisung; Bestell-ID wird aus der sichtbaren UI-Route gelesen.
3. Restaurant-Login/Onboarding und `PENDING -> CONFIRMED -> PREPARING -> READY_FOR_PICKUP`.
4. Driver A: Online, Übernahme, `PICKED_UP -> IN_TRANSIT -> DELIVERED`.
5. Driver B: kein sichtbarer Zugriff auf die Bestellung von Driver A, einschließlich
   sicherem Deep-Link-Check.
6. Customer: Live-/Polling-Update, Reload, finaler Status und Bestellhistorie.
7. Admin: Suche nach vollständiger Bestell-ID, `DELIVERED`, Dashboard/Reporting/
   Integrations-/Orders-Navigation ohne 404.
8. Inkompatible Rollen-Logins auf dem Admin-Panel, danach UI-Logout und geschützte
   Route nach Logout.

Erwartete `401`/`403` bei den negativen UI-Checks werden als erwartete Fälle
klassifiziert. Unerwartete `4xx`/`5xx`, `requestfailed`, `pageerror`, nicht
erklärbare Console-Fehler oder WebSocket-Fehler führen zum Fail.

## Evidence und Cleanup

Sanitisierte Evidence wird unter
`%TEMP%\UberFoods-local13-080-artifacts\<Run-ID>\browser` geschrieben:

- `summary.json`, `order-lifecycle.json`, `security-negative-cases.json`
- `sanitized-network.json`, `sanitized-console.json`, `events.jsonl`
- `browser-contexts.json`, `applications.json`, Screenshots und
  `manual-checklist-result.md`

Die Evidence enthält keine Request-Bodies, Header, Tokens oder Passwörter. Der
Runner scannt die Textdateien zusätzlich gegen alle Laufzeit-Geheimnisse.

Nach jedem Lauf, auch nach einem fehlgeschlagenen Lauf, nur die eigene Session
bereinigen:

```powershell
node scripts/local13-session.mjs cleanup --session-file $sessionFile
```

Der Cleanup prüft den `uberfoods_local13_`-Namespace, entfernt nur dessen
Container/Netzwerk/Volumes und löscht das Credential-Bundle. Danach muss
`cleanup.json` `PASS` sowie null eigene Ressourcen ausweisen.

## Verifikation

```powershell
node --check scripts/local13-session.mjs
node --check scripts/local13-browser-acceptance.mjs
node --test scripts/__tests__/local13-browser-acceptance.test.mjs
```

Nur nach zwei unabhängigen `PASS`-Läufen und erfolgreichem Cleanup darf der
isolierte Finding-Branch committed und gepusht werden. Externe Zahlungsanbieter,
Mail, Push, Karten/Geocoding und Cloud-/Render-/Production-Ziele sind nicht Teil
dieses lokalen Gates.
