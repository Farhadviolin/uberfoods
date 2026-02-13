#!/bin/bash

# ============================================
# UberFoods Health Check Script
# ============================================
# Prüft den Health-Status aller Services

set -e

ENVIRONMENT=${1:-production}
BACKEND_URL=${2:-https://localhost:3000}

echo "🏥 Health Check für ${ENVIRONMENT}..."
echo ""

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funktion für Health Check
check_health() {
    local SERVICE=$1
    local URL=$2
    local EXPECTED_STATUS=${3:-200}
    
    echo -n "Prüfe $SERVICE... "
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL" || echo "000")
    
    if [ "$HTTP_CODE" = "$EXPECTED_STATUS" ]; then
        echo -e "${GREEN}✅ OK${NC} (HTTP $HTTP_CODE)"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC} (HTTP $HTTP_CODE)"
        return 1
    fi
}

# Funktion für Service Check
check_service() {
    local SERVICE=$1
    local CONTAINER=$2
    
    echo -n "Prüfe $SERVICE Container... "
    
    if docker ps | grep -q "$CONTAINER"; then
        echo -e "${GREEN}✅ Running${NC}"
        return 0
    else
        echo -e "${RED}❌ Not Running${NC}"
        return 1
    fi
}

# Backend Health Check
echo "📊 Backend Services:"
check_health "Backend API" "$BACKEND_URL/api/health"
check_health "Backend Metrics" "$BACKEND_URL/api/metrics" 200

# Docker Services
echo ""
echo "🐳 Docker Services:"
check_service "PostgreSQL" "uberfoods-postgres-prod"
check_service "Redis" "uberfoods-redis-prod"
check_service "Backend" "uberfoods-backend-prod"
check_service "Nginx" "uberfoods-nginx-prod"

# Database Connection
echo ""
echo "💾 Database:"
echo -n "Prüfe Database-Verbindung... "
if docker exec uberfoods-postgres-prod psql -U postgres -d uberfoods_prod -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connected${NC}"
else
    echo -e "${RED}❌ Connection Failed${NC}"
fi

# Redis Connection
echo ""
echo "🔴 Redis:"
echo -n "Prüfe Redis-Verbindung... "
if docker exec uberfoods-redis-prod redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connected${NC}"
else
    echo -e "${RED}❌ Connection Failed${NC}"
fi

# Disk Space
echo ""
echo "💿 Disk Space:"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo -e "Disk Usage: ${GREEN}✅ $DISK_USAGE%${NC}"
elif [ "$DISK_USAGE" -lt 90 ]; then
    echo -e "Disk Usage: ${YELLOW}⚠️  $DISK_USAGE%${NC}"
else
    echo -e "Disk Usage: ${RED}❌ $DISK_USAGE%${NC}"
fi

# Memory Usage
echo ""
echo "🧠 Memory:"
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
if [ "$MEMORY_USAGE" -lt 80 ]; then
    echo -e "Memory Usage: ${GREEN}✅ $MEMORY_USAGE%${NC}"
elif [ "$MEMORY_USAGE" -lt 90 ]; then
    echo -e "Memory Usage: ${YELLOW}⚠️  $MEMORY_USAGE%${NC}"
else
    echo -e "Memory Usage: ${RED}❌ $MEMORY_USAGE%${NC}"
fi

# Summary
echo ""
echo "📋 Summary:"
echo "   Backend: $BACKEND_URL"
echo "   Environment: $ENVIRONMENT"
echo "   Timestamp: $(date)"
