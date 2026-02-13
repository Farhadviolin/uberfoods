#!/bin/bash

# UberFoods Domain & SSL Test
echo "🌐 UberFoods Domain & SSL Test"
echo "================================"

# Domain (ändere zu deiner echten Domain)
DOMAIN="yourdomain.com"
API_DOMAIN="api.$DOMAIN"
ADMIN_DOMAIN="admin.$DOMAIN"

echo "Testing domains:"
echo "Main: https://$DOMAIN"
echo "API:  https://$API_DOMAIN"
echo "Admin: https://$ADMIN_DOMAIN"
echo ""

# HTTP to HTTPS Redirect Test
echo "🔄 Testing HTTP to HTTPS redirect..."
HTTP_REDIRECT=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN")
if [ "$HTTP_REDIRECT" = "301" ]; then
    echo "✅ HTTP Redirect: PASSED"
else
    echo "❌ HTTP Redirect: FAILED (HTTP $HTTP_REDIRECT)"
fi
echo ""

# SSL Certificate Test
echo "🔒 Testing SSL Certificates..."
SSL_MAIN=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN")
SSL_API=$(curl -s -o /dev/null -w "%{http_code}" "https://$API_DOMAIN/api/health")
SSL_ADMIN=$(curl -s -o /dev/null -w "%{http_code}" "https://$ADMIN_DOMAIN")

if [ "$SSL_MAIN" = "200" ]; then
    echo "✅ Main Domain SSL: PASSED"
else
    echo "❌ Main Domain SSL: FAILED (HTTP $SSL_MAIN)"
fi

if [ "$SSL_API" = "200" ]; then
    echo "✅ API Domain SSL: PASSED"
else
    echo "❌ API Domain SSL: FAILED (HTTP $SSL_API)"
fi

if [ "$SSL_ADMIN" = "200" ]; then
    echo "✅ Admin Domain SSL: PASSED"
else
    echo "❌ Admin Domain SSL: FAILED (HTTP $SSL_ADMIN)"
fi
echo ""

# CORS Test
echo "🌐 Testing CORS Configuration..."
CORS_API=$(curl -s -H "Origin: https://$DOMAIN" "https://$API_DOMAIN/api/health" -o /dev/null -w "%{http_code}")
CORS_HEADERS=$(curl -s -I -H "Origin: https://$DOMAIN" "https://$API_DOMAIN/api/health" | grep -i "access-control-allow-origin" | wc -l)

if [ "$CORS_API" = "200" ] && [ "$CORS_HEADERS" -gt 0 ]; then
    echo "✅ CORS Configuration: PASSED"
else
    echo "❌ CORS Configuration: FAILED"
fi
echo ""

# API Functionality Test
echo "🔌 Testing API Functionality..."
API_HEALTH=$(curl -s "https://$API_DOMAIN/api/health" | jq -r '.status' 2>/dev/null || echo "ERROR")
API_DOCS=$(curl -s -o /dev/null -w "%{http_code}" "https://$API_DOMAIN/api/docs")

if [ "$API_HEALTH" = "ok" ]; then
    echo "✅ API Health: PASSED"
else
    echo "❌ API Health: FAILED"
fi

if [ "$API_DOCS" = "200" ]; then
    echo "✅ API Docs: PASSED"
else
    echo "❌ API Docs: FAILED (HTTP $API_DOCS)"
fi
echo ""

# SSL Certificate Expiry Check
echo "📅 Checking SSL Certificate Expiry..."
EXPIRY=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [ -n "$EXPIRY" ]; then
    echo "✅ SSL Expiry: $EXPIRY"
    # Calculate days until expiry
    EXPIRY_DATE=$(date -d "$EXPIRY" +%s 2>/dev/null || echo "0")
    TODAY=$(date +%s)
    DAYS_LEFT=$(( ($EXPIRY_DATE - $TODAY) / 86400 ))
    if [ "$DAYS_LEFT" -gt 30 ]; then
        echo "✅ SSL valid for $DAYS_LEFT days"
    else
        echo "⚠️  SSL expires in $DAYS_LEFT days - renew soon!"
    fi
else
    echo "❌ SSL Certificate: Could not read expiry"
fi
echo ""

echo "==============================="
echo "📊 Domain Test Summary:"

PASSED=0
TOTAL=0

# Count results
((TOTAL++))
if [ "$HTTP_REDIRECT" = "301" ]; then ((PASSED++)); fi

((TOTAL++))
if [ "$SSL_MAIN" = "200" ]; then ((PASSED++)); fi

((TOTAL++))
if [ "$SSL_API" = "200" ]; then ((PASSED++)); fi

((TOTAL++))
if [ "$SSL_ADMIN" = "200" ]; then ((PASSED++)); fi

((TOTAL++))
if [ "$CORS_API" = "200" ] && [ "$CORS_HEADERS" -gt 0 ]; then ((PASSED++)); fi

((TOTAL++))
if [ "$API_HEALTH" = "ok" ]; then ((PASSED++)); fi

((TOTAL++))
if [ "$API_DOCS" = "200" ]; then ((PASSED++)); fi

echo "✅ $PASSED/$TOTAL tests passed"

if [ "$PASSED" = "$TOTAL" ]; then
    echo "🎉 ALL DOMAIN TESTS PASSED!"
    echo "🚀 Domain is PRODUCTION READY!"
else
    echo "⚠️  Some tests failed - check configuration"
fi

echo ""
echo "💡 If tests fail:"
echo "   1. Check DNS propagation: nslookup $DOMAIN"
echo "   2. Verify SSL certificates: openssl s_client -connect $DOMAIN:443"
echo "   3. Check nginx config: docker-compose logs nginx"
echo "   4. Test CORS: curl -H 'Origin: https://$DOMAIN' https://$API_DOMAIN/api/health"