# Teststrategie UberFoods

## Ziel
Diese Datei beschreibt, wie Unit-, Integration- und E2E-Tests ausgeführt werden,
welche Scripts dafür genutzt werden und welche Voraussetzungen gelten.

## Backend (NestJS)
Standard-Commands:
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run test:integration`
- `npm run test:integration:ci`
- `npm run test:e2e`

Hinweise:
- `test:integration`/`test:integration:ci` nutzen `scripts/test-full-subscription-integration.js`.
- E2E nutzt `test/jest-e2e.json`.

## Frontend (Apps)
Je App im jeweiligen Verzeichnis:
- `npm run lint`
- `npm run test`
- `npm run build`

## E2E-Datenbank (Windows Docker Desktop)
Wenn E2E-Tests mit `PrismaClientInitializationError` (DB unreachable) fehlschlagen:
- Docker Desktop starten und sicherstellen, dass die Engine läuft.
- WSL2 aktivieren und prüfen, ob der Docker-Kontext korrekt ist.
- E2E-Postgres starten (Beispiel, falls vorhanden):
  - `docker compose -f docker/e2e/docker-compose.e2e.yml up -d postgres-e2e`
  - `pg_isready -h localhost -p 5433`
- Danach:
  - `npx prisma migrate deploy`
  - `npx prisma db seed` (falls Seeds vorhanden)
  - `npm run test:e2e`

### Fallback ohne Docker
Falls Docker nicht verfügbar ist, lokale PostgreSQL-Instanz auf Port 5433 nutzen:
- Datenbank anlegen, User erstellen
- `DATABASE_URL` in `.env.e2e` auf `localhost:5433` setzen
- Danach die Prisma-Befehle und `npm run test:e2e` ausführen
