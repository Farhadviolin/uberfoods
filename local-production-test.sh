#!/bin/bash

# UberFoods Local Production Test
echo "🧪 UberFoods Local Production Test"
echo "==================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "success" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "warning" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    else
        echo -e "${RED}❌ $message${NC}"
    fi
}

# Check if docker-compose is running
echo "🐳 Checking Docker services..."
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    print_status "success" "Docker services are running"
else
    print_status "error" "Docker services not running - start with: docker-compose -f docker-compose.prod.yml up -d"
    exit 1
fi

# Wait a moment for services to be ready
sleep 3

# Test Backend Health
echo ""
echo "🏥 Testing Backend Health..."
HEALTH_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" http://localhost:3000/api/health 2>/dev/null)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed -e 's/HTTPSTATUS:.*//g')

if [ "$HTTP_CODE" = "200" ]; then
    if echo "$HEALTH_BODY" | grep -q '"status":"ok"'; then
        print_status "success" "Backend health check passed"
    else
        print_status "warning" "Backend responds but health status unclear"
    fi
else
    print_status "error" "Backend health check failed (HTTP $HTTP_CODE)"
fi

# Test API Docs
echo ""
echo "📚 Testing API Documentation..."
DOCS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/docs 2>/dev/null)

if [ "$DOCS_CODE" = "200" ]; then
    print_status "success" "API documentation accessible"
else
    print_status "error" "API documentation not accessible (HTTP $DOCS_CODE)"
fi

# Test Restaurants Endpoint
echo ""
echo "🏪 Testing Restaurants API..."
RESTAURANTS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/restaurants 2>/dev/null)

if [ "$RESTAURANTS_CODE" = "200" ]; then
    print_status "success" "Restaurants API responding"
else
    print_status "error" "Restaurants API failed (HTTP $RESTAURANTS_CODE)"
fi

# Test Auth Endpoint
echo ""
echo "🔐 Testing Authentication..."
AUTH_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@uberfoods.com","password":"admin123"}' \
    http://localhost:3000/api/auth/login 2>/dev/null)

if echo "$AUTH_RESPONSE" | grep -q '"access_token"'; then
    print_status "success" "Authentication working"
else
    print_status "error" "Authentication failed"
fi

# Test Frontend (if nginx is running)
echo ""
echo "🌐 Testing Frontend..."
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null)

if [ "$FRONTEND_CODE" = "200" ]; then
    print_status "success" "Frontend accessible"
else
    print_status "warning" "Frontend not accessible (nginx may not be running)"
fi

# Summary
echo ""
echo "==================================="
echo "📊 Test Summary:"
echo ""

PASSED=0
TOTAL=0

# Count results
SERVICES_UP=$(docker-compose -f docker-compose.prod.yml ps | grep -c "Up")
if [ "$SERVICES_UP" -gt 0 ]; then ((PASSED++)); fi
((TOTAL++))

if [ "$HTTP_CODE" = "200" ]; then ((PASSED++)); fi
((TOTAL++))

if [ "$DOCS_CODE" = "200" ]; then ((PASSED++)); fi
((TOTAL++))

if [ "$RESTAURANTS_CODE" = "200" ]; then ((PASSED++)); fi
((TOTAL++))

if echo "$AUTH_RESPONSE" | grep -q '"access_token"'; then ((PASSED++)); fi
((TOTAL++))

if [ "$FRONTEND_CODE" = "200" ]; then ((PASSED++)); fi
((TOTAL++))

echo "✅ $PASSED/$TOTAL tests passed"

if [ "$PASSED" = "$TOTAL" ]; then
    echo ""
    echo "🎉 ALL TESTS PASSED!"
    echo "🚀 System is ready for production deployment!"
    echo ""
    echo "Next steps:"
    echo "1. Configure real domains and SSL"
    echo "2. Set up Stripe/PayPal production keys"
    echo "3. Run: docker-compose -f docker-compose.prod.yml up -d"
    echo "4. Access: https://yourdomain.com"
elif [ "$PASSED" -ge 4 ]; then
    echo ""
    echo "⚠️  MOST TESTS PASSED - Core functionality works"
    echo "🔧 Some optional features may need configuration"
else
    echo ""
    echo "❌ CRITICAL ISSUES DETECTED"
    echo "🛠️  Fix failing tests before deployment"
    echo ""
    echo "Common fixes:"
    echo "- Check backend logs: docker-compose logs backend"
    echo "- Verify ENV variables: cat backend/.env"
    echo "- Test database: docker exec uberfoods_postgres psql -U uberfoods_prod_user -d uberfoods_production -c 'SELECT 1;'"
fi

echo ""
echo "💡 Useful commands:"
echo "  docker-compose -f docker-compose.prod.yml logs -f          # Follow logs"
echo "  docker-compose -f docker-compose.prod.yml restart         # Restart services"
echo "  docker-compose -f docker-compose.prod.yml down            # Stop everything"
echo "  ./local-production-test.sh                               # Run this test again"