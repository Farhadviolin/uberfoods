# RBAC Datenbank-Setup Anleitung

## ⚠️ Wichtiger Hinweis

Die Migration und der Seed können **nur ausgeführt werden, wenn die Datenbank läuft**.

## Status

- ✅ Code-Implementierung: **100% abgeschlossen**
- ✅ Build: **Erfolgreich**
- ✅ Migration-Datei: **Vorhanden**
- ✅ Seed-Script: **Vorhanden**
- ❌ Datenbank: **Läuft nicht** (ECONNREFUSED)

## Datenbank starten

### Option 1: Docker Compose (empfohlen)

```bash
cd PROJECT_ROOT_PLACEHOLDER
docker-compose up -d postgres
```

### Option 2: Lokale PostgreSQL-Installation

```bash
# macOS mit Homebrew
brew services start postgresql@14

# Oder manuell starten
pg_ctl -D /usr/local/var/postgres start
```

### Option 3: PostgreSQL mit Docker

```bash
docker run -d \
  --name uberfoods-postgres \
  -e POSTGRES_USER=your_user \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=UberFood_food \
  -p 5434:5432 \
  postgres:14
```

## Nach dem Starten der Datenbank

### 1. Migration ausführen

```bash
cd backend

# Prisma 7 benötigt eine spezielle Konfiguration
# Versuche es mit:
npx prisma migrate dev --name add_moderator_support_roles

# Falls das nicht funktioniert, wende die Migration manuell an:
# Die SQL-Datei ist in: prisma/migrations/20250128000000_add_moderator_support_roles/migration.sql
```

### 2. RBAC-Seed ausführen

```bash
npm run prisma:seed-rbac
```

### 3. Prüfen

```bash
# Prüfe, ob die Rollen erstellt wurden
node -e "
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
prisma.role.findMany().then(roles => {
  console.log('✅ Rollen:', roles.map(r => r.name).join(', '));
  pool.end();
  prisma.\$disconnect();
});
"
```

## Migration manuell ausführen (falls Prisma migrate nicht funktioniert)

Die Migration-SQL-Datei befindet sich in:
`backend/prisma/migrations/20250128000000_add_moderator_support_roles/migration.sql`

Du kannst sie direkt mit `psql` ausführen:

```bash
psql -h localhost -p 5434 -U your_user -d UberFood_food -f backend/prisma/migrations/20250128000000_add_moderator_support_roles/migration.sql
```

Oder mit der DATABASE_URL:

```bash
psql $DATABASE_URL -f backend/prisma/migrations/20250128000000_add_moderator_support_roles/migration.sql
```

## Troubleshooting

### Fehler: "ECONNREFUSED"
- **Ursache**: Datenbank läuft nicht
- **Lösung**: Datenbank starten (siehe oben)

### Fehler: "The datasource property is required"
- **Ursache**: Prisma 7 Konfiguration
- **Lösung**: Prisma 7 verwendet eine andere Konfiguration. Die Migration kann manuell ausgeführt werden.

### Fehler: "Migration already applied"
- **Ursache**: Migration wurde bereits ausgeführt
- **Lösung**: Weiter mit dem Seed

## Nächste Schritte nach erfolgreicher Migration und Seed

1. Backend starten: `npm run start:dev`
2. API testen: Endpunkte mit verschiedenen Rollen testen
3. Frontend testen: `usePermissions` Hook testen

