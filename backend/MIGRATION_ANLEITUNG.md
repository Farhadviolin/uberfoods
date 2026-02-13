# Migration-Anleitung: Version-Feld hinzufügen

Da das Prisma-Schema und die Datenbank nicht vollständig synchron sind, führen Sie die Migration manuell aus:

## Option 1: Direkt mit psql

```bash
cd backend
psql -h localhost -p 5434 -U postgres -d UberFood_food -f prisma/migrations/manual_add_version_field.sql
```

## Option 2: Mit Docker (falls PostgreSQL in Docker läuft)

```bash
docker exec -i <postgres-container-name> psql -U postgres -d UberFood_food < backend/prisma/migrations/manual_add_version_field.sql
```

## Option 3: Prisma Client regenerieren (nach Migration)

```bash
cd backend
npx prisma generate
```

## Prüfen ob Migration erfolgreich war

```sql
-- In psql oder einem SQL-Client:
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'version';
```

Sollte `version` INTEGER mit DEFAULT 1 zurückgeben.

## Alternative: Migration überspringen

Falls die Migration nicht sofort ausgeführt werden kann, funktioniert das System trotzdem:
- Das `version` Feld wird beim ersten Update automatisch auf 1 gesetzt
- Optimistic Locking funktioniert dann vollständig

Die Migration kann später ausgeführt werden, ohne dass das System beeinträchtigt wird.

