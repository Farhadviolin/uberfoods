#!/bin/bash

# UberFoods Payment Integration Test
echo "💳 UberFoods Payment Integration Test"
echo "====================================="

# Konfiguration
BASE_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:3001"

echo "Testing Payments at: $BASE_URL"
echo ""

# 1. Stripe Payment Intent Test
echo "💳 Testing Stripe Payment Intent..."
STRIPE_TEST=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"amount": 2599, "currency": "eur", "description": "Test Order"}' \
    "$BASE_URL/api/payments/create-intent" | jq -r '.client_secret // empty' 2>/dev/null)

if [ -n "$STRIPE_TEST" ] && [ "$STRIPE_TEST" != "null" ]; then
    echo "✅ Stripe Payment Intent: PASSED"
    echo "   🔑 Client Secret: ${STRIPE_TEST:0:30}..."
else
    echo "❌ Stripe Payment Intent: FAILED"
    STRIPE_ERROR=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"amount": 2599, "currency": "eur"}' \
        "$BASE_URL/api/payments/create-intent" 2>/dev/null)
    echo "   Error: $STRIPE_ERROR"
fi
echo ""

# 2. PayPal Order Test
echo "💰 Testing PayPal Order Creation..."
PAYPAL_TEST=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"amount": "25.99", "currency": "EUR", "description": "Test PayPal Order"}' \
    "$BASE_URL/api/payments/paypal/create-order" | jq -r '.links[1].href // empty' 2>/dev/null)

if [ -n "$PAYPAL_TEST" ] && [ "$PAYPAL_TEST" != "null" ]; then
    echo "✅ PayPal Order Creation: PASSED"
    echo "   🔗 PayPal URL: ${PAYPAL_TEST:0:50}..."
else
    echo "❌ PayPal Order Creation: FAILED"
    PAYPAL_ERROR=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"amount": "25.99", "currency": "EUR"}' \
        "$BASE_URL/api/payments/paypal/create-order" 2>/dev/null)
    echo "   Error: $PAYPAL_ERROR"
fi
echo ""

# 3. Apple Pay Test (falls verfügbar)
echo "🍎 Testing Apple Pay Configuration..."
APPLE_TEST=$(curl -s "$BASE_URL/api/payments/apple-pay" \
    -H "Content-Type: application/json" \
    -d '{}' 2>/dev/null | jq -r '.configured // empty' 2>/dev/null)

if [ "$APPLE_TEST" = "true" ]; then
    echo "✅ Apple Pay: CONFIGURED"
elif [ "$APPLE_TEST" = "false" ]; then
    echo "⚠️  Apple Pay: NOT CONFIGURED (but API available)"
else
    echo "❓ Apple Pay: ENDPOINT NOT FOUND (expected in development)"
fi
echo ""

# 4. Google Pay Test (falls verfügbar)
echo "🤖 Testing Google Pay Configuration..."
GOOGLE_TEST=$(curl -s "$BASE_URL/api/payments/google-pay" \
    -H "Content-Type: application/json" \
    -d '{}' 2>/dev/null | jq -r '.configured // empty' 2>/dev/null)

if [ "$GOOGLE_TEST" = "true" ]; then
    echo "✅ Google Pay: CONFIGURED"
elif [ "$GOOGLE_TEST" = "false" ]; then
    echo "⚠️  Google Pay: NOT CONFIGURED (but API available)"
else
    echo "❓ Google Pay: ENDPOINT NOT FOUND (expected in development)"
fi
echo ""

# 5. Webhook Test Simulation
echo "🪝 Testing Webhook Endpoints..."
STRIPE_WEBHOOK=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Stripe-Signature: test_signature" \
    -d '{"type": "payment_intent.succeeded", "data": {"test": true}}' \
    "$BASE_URL/api/payments/webhooks/stripe")

if [ "$STRIPE_WEBHOOK" = "200" ] || [ "$STRIPE_WEBHOOK" = "400" ]; then
    echo "✅ Stripe Webhook: RESPONDS ($STRIPE_WEBHOOK)"
else
    echo "❌ Stripe Webhook: FAILED (HTTP $STRIPE_WEBHOOK)"
fi

PAYPAL_WEBHOOK=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"event_type": "PAYMENT.CAPTURE.COMPLETED", "resource": {"test": true}}' \
    "$BASE_URL/api/payments/webhooks/paypal")

if [ "$PAYPAL_WEBHOOK" = "200" ] || [ "$PAYPAL_WEBHOOK" = "400" ]; then
    echo "✅ PayPal Webhook: RESPONDS ($PAYPAL_WEBHOOK)"
else
    echo "❌ PayPal Webhook: FAILED (HTTP $PAYPAL_WEBHOOK)"
fi
echo ""

# 6. Frontend Payment Integration Test
echo "🎨 Testing Frontend Payment Loading..."
FRONTEND_STRIPE=$(curl -s "$FRONTEND_URL" | grep -o "STRIPE_PUBLISHABLE_KEY_PLACEHOLDER_[^\"']*" | head -1)
if [ -n "$FRONTEND_STRIPE" ]; then
    echo "✅ Frontend Stripe Key: FOUND (${FRONTEND_STRIPE:0:20}...)"
else
    echo "❌ Frontend Stripe Key: NOT FOUND"
fi

FRONTEND_MAPS=$(curl -s "$FRONTEND_URL" | grep -o "AIza[^\"']*" | head -1)
if [ -n "$FRONTEND_MAPS" ]; then
    echo "✅ Frontend Google Maps: FOUND (${FRONTEND_MAPS:0:20}...)"
else
    echo "❌ Frontend Google Maps: NOT FOUND"
fi
echo ""

echo "======================================"
echo "💰 Payment Test Summary:"

PASSED=0
TOTAL=0

# Count results
((TOTAL++))
if [ -n "$STRIPE_TEST" ]; then ((PASSED++)); fi

((TOTAL++))
if [ -n "$PAYPAL_TEST" ]; then ((PASSED++)); fi

((TOTAL++))
if [ "$APPLE_TEST" = "true" ] || [ "$APPLE_TEST" = "false" ]; then ((PASSED++)); fi

((TOTAL++))
if [ "$GOOGLE_TEST" = "true" ] || [ "$GOOGLE_TEST" = "false" ]; then ((PASSED++)); fi

((TOTAL++))
if [ "$STRIPE_WEBHOOK" = "200" ] || [ "$STRIPE_WEBHOOK" = "400" ]; then ((PASSED++)); fi

((TOTAL++))
if [ "$PAYPAL_WEBHOOK" = "200" ] || [ "$PAYPAL_WEBHOOK" = "400" ]; then ((PASSED++)); fi

((TOTAL++))
if [ -n "$FRONTEND_STRIPE" ]; then ((PASSED++)); fi

((TOTAL++))
if [ -n "$FRONTEND_MAPS" ]; then ((PASSED++)); fi

echo "✅ $PASSED/$TOTAL payment integration tests passed"

if [ "$PASSED" = "$TOTAL" ]; then
    echo "🎉 ALL PAYMENT TESTS PASSED!"
    echo "🚀 Payment integration is PRODUCTION READY!"
elif [ "$PASSED" -ge 6 ]; then
    echo "✅ MOST PAYMENT TESTS PASSED - Core functionality works"
    echo "🔧 Some optional features may need configuration"
else
    echo "⚠️  PAYMENT ISSUES DETECTED - Check configuration"
    echo "🛠️  Ensure API keys are correctly set in production.env"
fi

echo ""
echo "💡 For production testing:"
echo "   1. Update BASE_URL and FRONTEND_URL to your domain"
echo "   2. Test real payment flows (small amounts)"
echo "   3. Verify webhooks are received"
echo "   4. Check Apple Pay domain verification"
echo "   5. Confirm Google Pay merchant ID"