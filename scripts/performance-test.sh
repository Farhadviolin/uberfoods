#!/bin/bash

# ⚡ UberFoods - Performance Test Script
# Testet API Performance und Load

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

API_URL="${API_URL:-https://localhost:3000/api}"
CONCURRENT_REQUESTS=${1:-10}
TOTAL_REQUESTS=${2:-100}

echo "⚡ UberFoods - Performance Test"
echo "========================================"
echo ""
echo "📊 Test Configuration:"
echo "   API URL: $API_URL"
echo "   Concurrent Requests: $CONCURRENT_REQUESTS"
echo "   Total Requests: $TOTAL_REQUESTS"
echo ""

# Check if curl is available
if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ curl nicht gefunden${NC}"
    exit 1
fi

# Test endpoints
ENDPOINTS=(
    "/health"
    "/restaurants/public"
    "/gamification/achievements"
    "/analytics/dashboard-stats"
)

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local url="${API_URL}${endpoint}"
    
    echo -e "${BLUE}Testing: $endpoint${NC}"
    
    # Single request timing
    START_TIME=$(date +%s%N)
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    END_TIME=$(date +%s%N)
    DURATION=$((($END_TIME - $START_TIME) / 1000000))
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "   ${GREEN}✅ Status: $HTTP_CODE | Time: ${DURATION}ms${NC}"
    else
        echo -e "   ${RED}❌ Status: $HTTP_CODE | Time: ${DURATION}ms${NC}"
    fi
    
    # Load test (if ab or wrk available)
    if command -v ab &> /dev/null; then
        echo "   Load Test (Apache Bench)..."
        ab -n $TOTAL_REQUESTS -c $CONCURRENT_REQUESTS "$url" 2>/dev/null | grep -E "Requests per second|Time per request|Failed requests" || true
    elif command -v wrk &> /dev/null; then
        echo "   Load Test (wrk)..."
        wrk -t$CONCURRENT_REQUESTS -c$CONCURRENT_REQUESTS -d10s "$url" 2>/dev/null || true
    else
        echo -e "   ${YELLOW}⚠️  ab oder wrk nicht verfügbar - Load Test übersprungen${NC}"
    fi
    
    echo ""
}

# Run tests
for endpoint in "${ENDPOINTS[@]}"; do
    test_endpoint "$endpoint"
done

# Summary
echo "========================================"
echo -e "${BLUE}📊 Performance Test abgeschlossen${NC}"
echo ""
echo "💡 Tipps zur Performance-Optimierung:"
echo "   - Redis Caching aktivieren"
echo "   - Database Indexes prüfen"
echo "   - CDN für Static Assets"
echo "   - Load Balancing für hohe Last"
echo ""
