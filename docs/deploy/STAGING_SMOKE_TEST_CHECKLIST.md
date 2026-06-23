# UberFoods Staging Smoke Test Checklist

## Backend Healthcheck

- [ ] `GET /api/health` antwortet mit 200
- [ ] Response zeigt gesunden Staging-Status

## Customer-Web Desktop

- [ ] Customer-Web laedt
- [ ] Startseite zeigt sich ohne Fehler
- [ ] Login funktioniert

## Customer-Web Mobile

- [ ] Mobile-Viewport laedt sauber
- [ ] Navigation bleibt bedienbar
- [ ] Login funktioniert auf kleinem Screen

## Admin-Panel Desktop

- [ ] Admin-Panel laedt
- [ ] Dashboard zeigt Daten
- [ ] Login funktioniert

## Admin-Panel Mobile

- [ ] Mobile-Viewport ist nutzbar
- [ ] Kernnavigation funktioniert

## Restaurant-Web Desktop

- [ ] Restaurant-Web laedt
- [ ] Bestellansicht ist sichtbar
- [ ] Login funktioniert

## Restaurant-Web Mobile

- [ ] Mobile-Viewport laedt sauber
- [ ] Bestellliste bleibt nutzbar

## Driver-App Desktop

- [ ] Driver-App laedt
- [ ] Delivery-Workflow ist sichtbar
- [ ] Login funktioniert

## Driver-App Mobile

- [ ] Mobile-Viewport laedt sauber
- [ ] Live-Tracking bleibt nutzbar

## Register/Login

- [ ] Registrierung funktioniert
- [ ] Login funktioniert
- [ ] Session bleibt nach Reload erhalten

## Full Order Lifecycle

- [ ] Bestellung anlegen
- [ ] Restaurant nimmt Bestellung an
- [ ] Driver uebernimmt Bestellung
- [ ] Bestellung wird abgeschlossen

## Browser Console Errors

- [ ] Keine ungefilterten Console Errors
- [ ] Keine ungefangenen Exceptions

## Network Errors

- [ ] Keine 4xx/5xx Fehler auf kritischen Requests
- [ ] Keine fehlgeschlagenen WebSocket-Verbindungen

## Payment Test Mode

- [ ] Stripe laeuft nur im Testmodus
- [ ] PayPal laeuft nur in Sandbox
- [ ] Keine Live-Zahlungsdaten verwendet

## WebSocket / Live Tracking

- [ ] Live-Updates kommen an
- [ ] Statuswechsel erscheinen zeitnah
- [ ] Reconnect-Verhalten ist ok
## Rollback Decision

- [ ] Smoke-Test bestanden
- [ ] Bei Fehlern klarer Rollback-Befund dokumentiert
- [ ] Vorherige Render-Revision als Fallback notiert
