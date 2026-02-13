#!/bin/bash

# ============================================
# UberFoods Database Restore Script
# ============================================
# Stellt ein Backup wieder her
# Usage: ./scripts/database-restore.sh <backup-file> [production|staging]

set -e

if [ -z "$1" ]; then
    echo "❌ Fehler: Backup-Datei nicht angegeben!"
    echo "Usage: ./scripts/database-restore.sh <backup-file> [production|staging]"
    exit 1
fi

BACKUP_FILE=$1
ENVIRONMENT=${2:-production}
DB_NAME="uberfoods_${ENVIRONMENT}"
CONTAINER_NAME="uberfoods-db-${ENVIRONMENT}"

# Prüfe ob Backup-Datei existiert
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ Backup-Datei nicht gefunden: ${BACKUP_FILE}"
    exit 1
fi

# Prüfe ob Container läuft
if ! docker ps | grep -q "${CONTAINER_NAME}"; then
    echo "❌ Container ${CONTAINER_NAME} läuft nicht!"
    exit 1
fi

echo "⚠️  WARNUNG: Dies wird die aktuelle Datenbank überschreiben!"
read -p "Fortfahren? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
    echo "❌ Abgebrochen."
    exit 1
fi

echo "🔄 Stelle Datenbank wieder her..."

# Dekomprimiere falls nötig
if [[ "${BACKUP_FILE}" == *.gz ]]; then
    echo "📦 Dekomprimiere Backup..."
    TEMP_FILE=$(mktemp)
    gunzip -c "${BACKUP_FILE}" > "${TEMP_FILE}"
    BACKUP_FILE="${TEMP_FILE}"
fi

# Stelle Datenbank wieder her
docker exec -i "${CONTAINER_NAME}" psql -U postgres -d "${DB_NAME}" < "${BACKUP_FILE}"

# Lösche temporäre Datei falls erstellt
if [ -n "${TEMP_FILE}" ]; then
    rm "${TEMP_FILE}"
fi

echo "✅ Datenbank erfolgreich wiederhergestellt!"

