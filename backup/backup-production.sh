#!/bin/bash

# UberFoods Production Backup Script
# Creates comprehensive backups of database, files, and configuration

set -e

# Configuration
BACKUP_ROOT="/opt/uberfoods/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
RETENTION_DAYS=30

# Database configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="uberfoods_prod"
DB_USER="uberfoods_user"

# S3 configuration (optional)
S3_BUCKET="uberfoods-backups-prod"
S3_REGION="eu-west-1"

# Logging
LOG_FILE="/var/log/uberfoods/backup.log"

# Functions
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    log "ERROR: $1"
    exit 1
}

cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."
    find "$BACKUP_ROOT" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
    log "Cleanup completed"
}

create_backup_directory() {
    log "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR" || error "Failed to create backup directory"
    chmod 700 "$BACKUP_DIR"
}

backup_database() {
    log "Starting database backup..."

    local db_backup_file="$BACKUP_DIR/database.sql.gz"

    # Create database dump
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        --compress=9 \
        --format=custom \
        --file="$db_backup_file" || error "Database backup failed"

    # Verify backup
    if [ ! -f "$db_backup_file" ]; then
        error "Database backup file not created"
    fi

    local size=$(stat -f%z "$db_backup_file" 2>/dev/null || stat -c%s "$db_backup_file")
    log "Database backup completed: $(($size / 1024 / 1024))MB"

    # Test restore (optional, commented out for production)
    # log "Testing database backup integrity..."
    # PGPASSWORD="$DB_PASSWORD" pg_restore --list "$db_backup_file" > /dev/null || error "Database backup integrity check failed"
}

backup_redis() {
    log "Starting Redis backup..."

    local redis_backup_file="$BACKUP_DIR/redis.rdb"

    # Create Redis dump
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --rdb "$redis_backup_file" || error "Redis backup failed"

    if [ ! -f "$redis_backup_file" ]; then
        error "Redis backup file not created"
    fi

    local size=$(stat -f%z "$redis_backup_file" 2>/dev/null || stat -c%s "$redis_backup_file")
    log "Redis backup completed: $(($size / 1024 / 1024))MB"
}

backup_uploads() {
    log "Starting uploads backup..."

    local uploads_backup_file="$BACKUP_DIR/uploads.tar.gz"

    # Create uploads archive
    tar -czf "$uploads_backup_file" -C /app/uploads . || error "Uploads backup failed"

    if [ ! -f "$uploads_backup_file" ]; then
        error "Uploads backup file not created"
    fi

    local size=$(stat -f%z "$uploads_backup_file" 2>/dev/null || stat -c%s "$uploads_backup_file")
    log "Uploads backup completed: $(($size / 1024 / 1024))MB"
}

backup_configuration() {
    log "Starting configuration backup..."

    local config_backup_file="$BACKUP_DIR/config.tar.gz"

    # Backup configuration files
    tar -czf "$config_backup_file" \
        --exclude='*.log' \
        --exclude='*.tmp' \
        --exclude='node_modules' \
        -C /app \
        .env.production \
        config/ \
        nginx/ \
        docker-compose.prod.yml || error "Configuration backup failed"

    local size=$(stat -f%z "$config_backup_file" 2>/dev/null || stat -c%s "$config_backup_file")
    log "Configuration backup completed: $(($size / 1024 / 1024))MB"
}

upload_to_s3() {
    if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
        log "Uploading backup to S3..."

        # Upload to S3
        aws s3 cp "$BACKUP_DIR/" "s3://$S3_BUCKET/$TIMESTAMP/" --recursive --region "$S3_REGION" || error "S3 upload failed"

        log "Backup uploaded to S3: s3://$S3_BUCKET/$TIMESTAMP/"
    else
        log "S3 credentials not configured, skipping S3 upload"
    fi
}

create_backup_manifest() {
    log "Creating backup manifest..."

    local manifest_file="$BACKUP_DIR/manifest.json"

    cat > "$manifest_file" << EOF
{
  "backup_id": "$TIMESTAMP",
  "created_at": "$(date -Iseconds)",
  "hostname": "$(hostname)",
  "version": "1.0.0",
  "components": {
    "database": {
      "type": "postgresql",
      "database": "$DB_NAME",
      "size": "$(stat -f%z "$BACKUP_DIR/database.sql.gz" 2>/dev/null || stat -c%s "$BACKUP_DIR/database.sql.gz")"
    },
    "redis": {
      "type": "redis",
      "size": "$(stat -f%z "$BACKUP_DIR/redis.rdb" 2>/dev/null || stat -c%s "$BACKUP_DIR/redis.rdb")"
    },
    "uploads": {
      "type": "files",
      "size": "$(stat -f%z "$BACKUP_DIR/uploads.tar.gz" 2>/dev/null || stat -c%s "$BACKUP_DIR/uploads.tar.gz")"
    },
    "config": {
      "type": "configuration",
      "size": "$(stat -f%z "$BACKUP_DIR/config.tar.gz" 2>/dev/null || stat -c%s "$BACKUP_DIR/config.tar.gz")"
    }
  },
  "retention_days": $RETENTION_DAYS,
  "s3_bucket": "$S3_BUCKET",
  "s3_region": "$S3_REGION"
}
EOF

    log "Backup manifest created"
}

send_notification() {
    local status="$1"
    local message="$2"

    # Send notification (implement based on your notification system)
    # Example: Slack webhook, email, etc.

    if [ "$status" = "success" ]; then
        log "✅ Backup completed successfully: $TIMESTAMP"
        # curl -X POST -H 'Content-type: application/json' --data "{\"text\":\"✅ UberFoods Backup Successful: $TIMESTAMP\"}" $SLACK_WEBHOOK_URL
    else
        log "❌ Backup failed: $message"
        # curl -X POST -H 'Content-type: application/json' --data "{\"text\":\"❌ UberFoods Backup Failed: $message\"}" $SLACK_WEBHOOK_URL
    fi
}

main() {
    log "🚀 Starting UberFoods production backup..."

    # Validate environment
    if [ -z "$DB_PASSWORD" ]; then
        error "DB_PASSWORD environment variable not set"
    fi

    # Create backup directory
    create_backup_directory

    # Perform backups
    backup_database
    backup_redis
    backup_uploads
    backup_configuration

    # Create manifest
    create_backup_manifest

    # Upload to S3
    upload_to_s3

    # Cleanup old backups
    cleanup_old_backups

    # Calculate total size
    local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    log "Total backup size: $total_size"

    # Send success notification
    send_notification "success" "Backup completed successfully: $TIMESTAMP ($total_size)"

    log "✅ UberFoods backup completed successfully"
}

# Error handling
trap 'send_notification "failure" "Backup failed at line $LINENO"' ERR

# Run main function
main "$@"
