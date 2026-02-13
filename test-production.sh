#!/bin/bash

# UberFoods Production Readiness Test
echo "🚀 UberFoods Production Readiness Test"
echo "======================================"

# Basis-URL (ändere zu deiner Production-Domain)
BASE_URL="http://localhost:3000"

echo "Testing API at: $BASE_URL"
echo ""

# Health Check
echo "🏥 Testing Health Check..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health")
if [ "$HEALTH" = "200" ]; then
    echo "✅ Health Check: PASSED"
    curl -s "$BASE_URL/api/health" | jq . 2>/dev/null || curl -s "$BASE_URL/api/health"
else
    echo "❌ Health Check: FAILED (HTTP $HEALTH)"
fi
echo ""

# API Docs
echo "📚 Testing API Docs..."
DOCS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/docs")
if [ "$DOCS" = "200" ]; then
    echo "✅ API Docs: PASSED"
else
    echo "❌ API Docs: FAILED (HTTP $DOCS)"
fi
echo ""

# Restaurants Endpoint
echo "🏪 Testing Restaurants API..."
RESTAURANTS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/restaurants")
if [ "$RESTAURANTS" = "200" ]; then
    echo "✅ Restaurants API: PASSED"
    RESTAURANT_COUNT=$(curl -s "$BASE_URL/api/restaurants" | jq '.data | length' 2>/dev/null || echo "N/A")
    echo "   📊 Restaurants found: $RESTAURANT_COUNT"
else
    echo "❌ Restaurants API: FAILED (HTTP $RESTAURANTS)"
fi
echo ""

# Auth Login Test
echo "🔐 Testing Authentication..."
AUTH=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@uberfoods.com","password":"admin123"}' \
    "$BASE_URL/api/auth/login" | jq -r '.access_token // empty' 2>/dev/null)

if [ -n "$AUTH" ] && [ "$AUTH" != "null" ]; then
    echo "✅ Authentication: PASSED"
    echo "   🎫 JWT Token received: ${AUTH:0:20}..."
else
    echo "❌ Authentication: FAILED"
fi
echo ""

# Admin Users Test
echo "👤 Testing Admin API..."
ADMIN=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/users")
if [ "$ADMIN" = "200" ]; then
    echo "✅ Admin API: PASSED"
    USER_COUNT=$(curl -s "$BASE_URL/api/admin/users" | jq '.data | length' 2>/dev/null || echo "N/A")
    echo "   👥 Admin users found: $USER_COUNT"
else
    echo "❌ Admin API: FAILED (HTTP $ADMIN)"
fi
echo ""

# Orders Test
echo "📦 Testing Orders API..."
ORDERS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/orders")
if [ "$ORDERS" = "200" ]; then
    echo "✅ Orders API: PASSED"
    ORDER_COUNT=$(curl -s "$BASE_URL/api/orders" | jq '.data | length' 2>/dev/null || echo "N/A")
    echo "   📋 Orders found: $ORDER_COUNT"
else
    echo "❌ Orders API: FAILED (HTTP $ORDERS)"
fi
echo ""

# CORS Test (Basic)
echo "🌐 Testing CORS Headers..."
CORS=$(curl -s -I "$BASE_URL/api/health" | grep -i "access-control-allow-origin" | wc -l)
if [ "$CORS" -gt 0 ]; then
    echo "✅ CORS: PASSED"
else
    echo "❌ CORS: FAILED (No CORS headers found)"
fi
echo ""

echo "======================================"
echo "🎯 Test Summary:"
echo "- Health Check: $(if [ "$HEALTH" = "200" ]; then echo "✅"; else echo "❌"; fi)"
echo "- API Docs: $(if [ "$DOCS" = "200" ]; then echo "✅"; else echo "❌"; fi)"
echo "- Restaurants: $(if [ "$RESTAURANTS" = "200" ]; then echo "✅"; else echo "❌"; fi)"
echo "- Auth: $(if [ -n "$AUTH" ]; then echo "✅"; else echo "❌"; fi)"
echo "- Admin: $(if [ "$ADMIN" = "200" ]; then echo "✅"; else echo "❌"; fi)"
echo "- Orders: $(if [ "$ORDERS" = "200" ]; then echo "✅"; else echo "❌"; fi)"
echo "- CORS: $(if [ "$CORS" -gt 0 ]; then echo "✅"; else echo "❌"; fi)"
echo ""

# Overall Assessment
PASSED=$(( ($(if [ "$HEALTH" = "200" ]; then echo 1; else echo 0; fi) + $(if [ "$DOCS" = "200" ]; then echo 1; else echo 0; fi) + $(if [ "$RESTAURANTS" = "200" ]; then echo 1; else echo 0; fi) + $(if [ -n "$AUTH" ]; then echo 1; else echo 0; fi) + $(if [ "$ADMIN" = "200" ]; then echo 1; else echo 0; fi) + $(if [ "$ORDERS" = "200" ]; then echo 1; else echo 0; fi) + $(if [ "$CORS" -gt 0 ]; then echo 1; else echo 0; fi)) ))

echo "📊 Overall Score: $PASSED/7 tests passed"

if [ "$PASSED" -eq 7 ]; then
    echo "🎉 ALL TESTS PASSED! System is PRODUCTION READY!"
    echo "🚀 Ready for deployment!"
elif [ "$PASSED" -ge 5 ]; then
    echo "⚠️  MOST TESTS PASSED - Minor issues to fix"
    echo "🔧 Check failed tests before deployment"
else
    echo "❌ CRITICAL ISSUES - Do not deploy yet!"
    echo "🛠️  Fix failing tests before deployment"
fi

echo ""
echo "💡 For production testing:"
echo "   1. Change BASE_URL to your production domain"
echo "   2. Ensure SSL/HTTPS is working"
echo "   3. Test all payment flows"
echo "   4. Verify CORS with real frontend"