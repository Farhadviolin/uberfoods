#!/bin/bash

# ============================================
# UberFoods Database Backup Script
# ============================================
# Erstellt automatische Backups der PostgreSQL-Datenbank
# Usage: ./scripts/database-backup.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
DB_NAME="uberfoods_${ENVIRONMENT}"
CONTAINER_NAME="uberfoods-db-${ENVIRONMENT}"

# Erstelle Backup-Verzeichnis
mkdir -p "${BACKUP_DIR}"

echo "🔄 Erstelle Backup für ${ENVIRONMENT} Datenbank..."

# Prüfe ob Container läuft
if ! docker ps | grep -q "${CONTAINER_NAME}"; then
    echo "❌ Container ${CONTAINER_NAME} läuft nicht!"
    exit 1
fi

# Erstelle Backup
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql"
docker exec "${CONTAINER_NAME}" pg_dump -U postgres "${DB_NAME}" > "${BACKUP_FILE}"

# Komprimiere Backup
gzip "${BACKUP_FILE}"
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "✅ Backup erstellt: ${BACKUP_FILE}"

# Lösche alte Backups (behalte nur die letzten 30 Tage)
find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -mtime +30 -delete

echo "✅ Alte Backups gelöscht (älter als 30 Tage)"

# Zeige Backup-Größe
BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "📊 Backup-Größe: ${BACKUP_SIZE}"

