#!/bin/bash

# ============================================
# UberFoods Database Migration Script
# ============================================
# Führt Prisma-Migrationen aus
# Usage: ./scripts/database-migrate.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
CONTAINER_NAME="uberfoods-backend-${ENVIRONMENT}"

echo "🔄 Führe Datenbank-Migrationen aus für ${ENVIRONMENT}..."

# Prüfe ob Container läuft
if ! docker ps | grep -q "${CONTAINER_NAME}"; then
    echo "❌ Container ${CONTAINER_NAME} läuft nicht!"
    exit 1
fi

# Führe Migrationen aus
docker exec "${CONTAINER_NAME}" npm run prisma:migrate:deploy

echo "✅ Migrationen erfolgreich ausgeführt!"

