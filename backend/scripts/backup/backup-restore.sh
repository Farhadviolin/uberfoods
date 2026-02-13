#!/bin/bash

# UberFoods Backup and Restore Script
# Provides point-in-time recovery capabilities

set -e

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="uberfoods_backup_${TIMESTAMP}"
RESTORE_DB_NAME="uberfoods_restore"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

# Create backup directory
create_backup_dir() {
    mkdir -p "$BACKUP_DIR"
    log "Backup directory created: $BACKUP_DIR"
}

# Backup PostgreSQL database
backup_database() {
    log "Starting PostgreSQL backup..."

    # Use docker exec to run pg_dump
    docker exec uberfoods_postgres pg_dump \
        --username=postgres \
        --host=localhost \
        --port=5432 \
        --format=custom \
        --compress=9 \
        --no-owner \
        --no-privileges \
        --dbname=uberfoods \
        --file=/tmp/${BACKUP_NAME}.backup

    # Copy backup file from container
    docker cp uberfoods_postgres:/tmp/${BACKUP_NAME}.backup "$BACKUP_DIR/"

    # Clean up container file
    docker exec uberfoods_postgres rm /tmp/${BACKUP_NAME}.backup

    log "PostgreSQL backup completed: $BACKUP_DIR/${BACKUP_NAME}.backup"
}

# Backup Redis data
backup_redis() {
    log "Starting Redis backup..."

    # Trigger Redis save
    docker exec uberfoods_redis redis-cli SAVE

    # Copy RDB file
    docker cp uberfoods_redis:/data/dump.rdb "$BACKUP_DIR/${BACKUP_NAME}.rdb"

    log "Redis backup completed: $BACKUP_DIR/${BACKUP_NAME}.rdb"
}

# Create backup manifest
create_manifest() {
    local manifest_file="$BACKUP_DIR/${BACKUP_NAME}.manifest.json"

    cat > "$manifest_file" << EOF
{
  "backup_name": "${BACKUP_NAME}",
  "timestamp": "${TIMESTAMP}",
  "created_at": "$(date -Iseconds)",
  "version": "1.0",
  "components": {
    "database": {
      "type": "postgresql",
      "original_db": "uberfoods",
      "backup_file": "${BACKUP_NAME}.backup",
      "compressed": true,
      "format": "custom"
    },
    "cache": {
      "type": "redis",
      "backup_file": "${BACKUP_NAME}.rdb",
      "rdb_format": true
    }
  },
  "metadata": {
    "hostname": "$(hostname)",
    "user": "$(whoami)",
    "working_directory": "$(pwd)"
  }
}
EOF

    log "Backup manifest created: $manifest_file"
}

# List available backups
list_backups() {
    log "Available backups:"
    echo "=================================================="
    ls -la "$BACKUP_DIR"/*.manifest.json 2>/dev/null | while read -r line; do
        manifest=$(echo "$line" | awk '{print $9}')
        if [ -f "$manifest" ]; then
            timestamp=$(grep -o '"timestamp": "[^"]*"' "$manifest" | cut -d'"' -f4)
            echo "  $timestamp - $(basename "$manifest" .manifest.json)"
        fi
    done
    echo "=================================================="
}

# Restore database from backup
restore_database() {
    local backup_name="$1"

    if [ -z "$backup_name" ]; then
        error "Backup name required for restore"
        echo "Usage: $0 restore <backup_name>"
        echo "Available backups:"
        list_backups
        exit 1
    fi

    local manifest_file="$BACKUP_DIR/${backup_name}.manifest.json"
    local backup_file="$BACKUP_DIR/${backup_name}.backup"

    if [ ! -f "$manifest_file" ]; then
        error "Backup manifest not found: $manifest_file"
        exit 1
    fi

    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        exit 1
    fi

    log "Starting database restore: $backup_name"

    # Create restore database
    warn "This will DROP and RECREATE the database!"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log "Restore cancelled by user"
        exit 0
    fi

    # Drop and recreate database
    log "Recreating database..."
    docker exec uberfoods_postgres psql \
        --username=postgres \
        --host=localhost \
        --port=5432 \
        --command="DROP DATABASE IF EXISTS $RESTORE_DB_NAME;" \
        --command="CREATE DATABASE $RESTORE_DB_NAME;"

    # Copy backup file to container
    docker cp "$backup_file" uberfoods_postgres:/tmp/restore.backup

    # Restore from backup
    log "Restoring from backup..."
    docker exec uberfoods_postgres pg_restore \
        --username=postgres \
        --host=localhost \
        --port=5432 \
        --dbname="$RESTORE_DB_NAME" \
        --no-owner \
        --no-privileges \
        /tmp/restore.backup

    # Clean up
    docker exec uberfoods_postgres rm /tmp/restore.backup

    log "Database restore completed: $RESTORE_DB_NAME"
    log "You can now connect to the restored database for verification"
}

# Verify backup integrity
verify_backup() {
    local backup_name="$1"

    if [ -z "$backup_name" ]; then
        error "Backup name required for verification"
        echo "Usage: $0 verify <backup_name>"
        exit 1
    fi

    local manifest_file="$BACKUP_DIR/${backup_name}.manifest.json"
    local backup_file="$BACKUP_DIR/${backup_name}.backup"

    log "Verifying backup: $backup_name"

    # Check files exist
    if [ ! -f "$manifest_file" ]; then
        error "Manifest file missing"
        return 1
    fi

    if [ ! -f "$backup_file" ]; then
        error "Backup file missing"
        return 1
    fi

    # Verify manifest is valid JSON
    if ! jq . "$manifest_file" >/dev/null 2>&1; then
        error "Manifest file is not valid JSON"
        return 1
    fi

    # Get backup file size
    local size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)
    log "Backup file size: $size bytes"

    # Basic PostgreSQL backup verification
    if ! docker run --rm -v "$PWD/$BACKUP_DIR:/backups" postgres:15-alpine pg_restore --list "/backups/${backup_name}.backup" >/dev/null 2>&1; then
        error "Backup file is corrupted or invalid"
        return 1
    fi

    log "✅ Backup verification passed"
    return 0
}

# Smoke test after restore
smoke_test() {
    log "Running smoke test on restored database..."

    # Simple query test
    local result=$(docker exec uberfoods_postgres psql \
        --username=postgres \
        --host=localhost \
        --port=5432 \
        --dbname="$RESTORE_DB_NAME" \
        --tuples-only \
        --command="SELECT COUNT(*) FROM orders;")

    log "Orders count in restored database: $result"

    # Health check via API (if backend is running)
    if curl -f http://localhost:3000/healthz >/dev/null 2>&1; then
        log "✅ API health check passed"
    else
        warn "⚠️ API health check failed (backend may not be running)"
    fi

    log "Smoke test completed"
}

# Main command handling
case "$1" in
    backup)
        create_backup_dir
        backup_database
        backup_redis
        create_manifest
        log "✅ Backup completed successfully: $BACKUP_NAME"
        ;;

    list)
        list_backups
        ;;

    restore)
        restore_database "$2"
        smoke_test
        ;;

    verify)
        if verify_backup "$2"; then
            log "✅ Backup verification successful"
        else
            error "❌ Backup verification failed"
            exit 1
        fi
        ;;

    *)
        echo "Usage: $0 {backup|list|restore <backup_name>|verify <backup_name>}"
        echo ""
        echo "Commands:"
        echo "  backup    Create a new backup"
        echo "  list      List available backups"
        echo "  restore   Restore database from backup"
        echo "  verify    Verify backup integrity"
        echo ""
        echo "Examples:"
        echo "  $0 backup"
        echo "  $0 list"
        echo "  $0 restore uberfoods_backup_20251221_230000"
        echo "  $0 verify uberfoods_backup_20251221_230000"
        exit 1
        ;;
esac