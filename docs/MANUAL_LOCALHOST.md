# Manuelle Localhost-Runtime

Der kanonische manuelle Vertrag verwendet die bewährte isolierte Docker-/Acceptance-
Runtime aus demselben Repository-Root und demselben Git-HEAD. PostgreSQL und Redis
laufen in einem eigenen Compose-Namespace und eigenen Test-Volumes; die bereits
laufende Infrastruktur auf den Host-Ports `5434` und `6379` bleibt unangetastet.

## BEFUND UND VERTRAG

Der frühere manuelle Pfad startete Backend und Customer aus dem Acceptance-Checkout,
Admin/Restaurant/Driver aber aus dem Main-Checkout. Zusätzlich wurde
`npm run start:full:watch` direkt im Backend ausgeführt. Dabei kam `NODE_ENV=production`
aus der Shell-Umgebung; `backend/src/main.full.ts` beendet den Prozess in diesem Modus,
wenn Produktionspflichtfelder wie `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` und
`PAYPAL_WEBHOOK_ID` fehlen. Es wurden dafür keine echten Provider-Werte ergänzt.

Der Main-Checkout besitzt außerdem eine bereits inkonsistente persistente Datenbank-
Migration (`0001_initial` fehlgeschlagen, P3009 bei `prisma migrate deploy`). Deshalb
ist die isolierte lokale Production-Simulation der belastbare Vertrag: eigener
Compose-Namespace, eigene Testdatenbank, eigener Session-Marker und ein gemeinsamer
Root/HEAD für Backend und alle vier Web-UIs. Die Test-Provider-Konfiguration bleibt
lokal simuliert und löst keine externen Zahlungen oder Webhooks aus.

## START

Aus dem Repository-Root:

```powershell
npm run localhost:up
```

Der Launcher prüft die festen App-Ports, erzeugt eine eigene Session, führt im
eigenen Container-PostgreSQL `prisma migrate deploy` und den vorhandenen
idempotenten lokalen Seed aus und startet Backend sowie alle vier Web-UIs. Ein
Portkonflikt oder ein fremder Prozess wird nicht beendet.

## STATUS

```powershell
npm run localhost:status
```

`RUNTIME_ROOT`, `RUNTIME_HEAD` und `SESSION_ID` stammen aus der geschützten
Session-Datei unter `%TEMP%\UberFoods-localhost-runtime`. `CONSISTENT_RUNTIME=YES`
ist nur gültig, wenn alle fünf App-Services nachweislich zu dieser Session, dem
gleichen Root und dem gleichen HEAD gehören.

## STOP

```powershell
npm run localhost:down
```

Es werden ausschließlich Container der eigenen LOCAL13-Session graceful beendet.
Vorbestehende PostgreSQL-/Redis-Container und deren persistente Volumes bleiben
unangetastet; die temporären Test-Volumes der eigenen isolierten Session werden
gemäß dem bestehenden LOCAL13-Cleanup-Vertrag entfernt.

## RESTART

```powershell
npm run localhost:restart
```

## URLs

| Dienst | URL |
| --- | --- |
| Backend | http://127.0.0.1:3000 |
| Customer | http://127.0.0.1:3102 |
| Admin | http://127.0.0.1:3002 |
| Restaurant | http://127.0.0.1:3003 |
| Driver | http://127.0.0.1:3004 |

Nach einem Frontend-Update im Browser `Ctrl+Shift+R` verwenden.

Die isolierte `local13`-Production-Simulation ist damit der manuelle Fixed-Port-
Vertrag; die direkte `local13-session`-Bedienung mit dynamischen Ports bleibt als
separater technischer Acceptance-Einstieg erhalten.
