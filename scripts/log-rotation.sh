#!/bin/bash

# 📋 UberFoods - Log Rotation Script
# Rotiert und komprimiert alte Log-Dateien

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

LOG_DIR="./logs"
RETENTION_DAYS=30
MAX_SIZE_MB=100

echo "📋 UberFoods - Log Rotation"
echo "====================================="
echo ""

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to rotate log file
rotate_log() {
    local log_file=$1
    local max_size=$2
    
    if [ ! -f "$log_file" ]; then
        return
    fi
    
    # Check file size
    SIZE=$(du -m "$log_file" | cut -f1)
    
    if [ "$SIZE" -gt "$max_size" ]; then
        echo "🔄 Rotiere: $log_file (${SIZE}MB > ${max_size}MB)"
        
        # Create timestamped backup
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_FILE="${log_file}.${TIMESTAMP}"
        
        mv "$log_file" "$BACKUP_FILE"
        
        # Compress backup
        gzip "$BACKUP_FILE" 2>/dev/null || true
        
        echo -e "${GREEN}✅ Rotiert: ${BACKUP_FILE}.gz${NC}"
    fi
}

# Rotate application logs
echo "🔄 Application Logs rotieren..."
rotate_log "$LOG_DIR/app.log" $MAX_SIZE_MB
rotate_log "$LOG_DIR/error.log" $MAX_SIZE_MB
rotate_log "$LOG_DIR/access.log" $MAX_SIZE_MB

# Rotate nginx logs
if [ -d "nginx/logs" ]; then
    echo "🔄 NGINX Logs rotieren..."
    rotate_log "nginx/logs/access.log" $MAX_SIZE_MB
    rotate_log "nginx/logs/error.log" $MAX_SIZE_MB
fi

# Cleanup old logs
echo ""
echo "🧹 Alte Logs löschen (älter als $RETENTION_DAYS Tage)..."
find "$LOG_DIR" -name "*.log.*.gz" -type f -mtime +$RETENTION_DAYS -delete
if [ -d "nginx/logs" ]; then
    find "nginx/logs" -name "*.log.*.gz" -type f -mtime +$RETENTION_DAYS -delete
fi

REMAINING=$(find "$LOG_DIR" -name "*.log.*.gz" -type f | wc -l)
echo "   Verbleibende Log-Archive: $REMAINING"

echo ""
echo "====================================="
echo -e "${GREEN}✅ Log Rotation abgeschlossen!${NC}"
echo ""
