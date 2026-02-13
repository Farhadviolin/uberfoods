#!/bin/bash

# 💾 UberFoods - Database Backup Script
# Automatisiertes Backup der PostgreSQL Datenbank

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKUP_DIR="./backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/uberfoods_backup_${TIMESTAMP}.sql"
RETENTION_DAYS=30

echo "💾 UberFoods - Database Backup"
echo "========================================"
echo ""

# Check if backup directory exists
mkdir -p "$BACKUP_DIR"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    if [ -f "backend/.env.production" ]; then
        export $(grep -v '^#' backend/.env.production | xargs)
    else
        echo -e "${RED}❌ DATABASE_URL nicht gefunden${NC}"
        echo "Bitte DATABASE_URL setzen oder backend/.env.production konfigurieren"
        exit 1
    fi
fi

# Extract database connection info
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

echo "📊 Backup Details:"
echo "   Database: $DB_NAME"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   File: $BACKUP_FILE"
echo ""

# Create backup
echo "🔄 Backup erstellen..."
if command -v pg_dump &> /dev/null; then
    PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -F c -f "$BACKUP_FILE" 2>/dev/null || \
    PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"
else
    # Use Docker if pg_dump not available
    docker exec hmor-postgres-prod pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null || {
        echo -e "${RED}❌ Backup fehlgeschlagen${NC}"
        exit 1
    }
fi

if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup erfolgreich erstellt${NC}"
    echo "   Größe: $BACKUP_SIZE"
    echo "   Datei: $BACKUP_FILE"
    
    # Compress backup
    echo "🗜️  Backup komprimieren..."
    gzip -f "$BACKUP_FILE" 2>/dev/null || true
    BACKUP_FILE="${BACKUP_FILE}.gz"
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "   Komprimierte Größe: $BACKUP_SIZE"
else
    echo -e "${RED}❌ Backup-Datei ist leer oder nicht vorhanden${NC}"
    exit 1
fi

# Cleanup old backups
echo ""
echo "🧹 Alte Backups löschen (älter als $RETENTION_DAYS Tage)..."
    find "$BACKUP_DIR" -name "uberfoods_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
REMAINING=$(find "$BACKUP_DIR" -name "uberfoods_backup_*.sql.gz" -type f | wc -l)
echo "   Verbleibende Backups: $REMAINING"

echo ""
echo "========================================"
echo -e "${GREEN}✅ Backup abgeschlossen!${NC}"
echo "   Backup: $BACKUP_FILE"
echo "   Größe: $BACKUP_SIZE"
echo ""
