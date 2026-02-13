#!/bin/bash

# UberFoods Payment Configuration Test
echo "💳 UberFoods Payment Configuration Test"
echo "========================================"

# API Base URL (ändere für deine Domain)
API_URL="http://localhost:3000"

echo "Testing API at: $API_URL"
echo ""

# 1. Stripe Configuration Check
echo "🏦 Testing Stripe Configuration..."

# Check if Stripe keys are configured (not placeholder)
STRIPE_SECRET=$(grep "STRIPE_SECRET_KEY=" backend/.env 2>/dev/null | cut -d'=' -f2)
STRIPE_WEBHOOK=$(grep "STRIPE_WEBHOOK_SECRET=" backend/.env 2>/dev/null | cut -d'=' -f2)
STRIPE_PUBLISHABLE=$(grep "STRIPE_PUBLISHABLE_KEY=" backend/.env 2>/dev/null | cut -d'=' -f2)

if [[ $STRIPE_SECRET == STRIPE_SECRET_KEY_PLACEHOLDER ]] && [[ $STRIPE_SECRET != *"_HERE" ]]; then
    echo "✅ Stripe Secret Key: CONFIGURED"
else
    echo "❌ Stripe Secret Key: NOT CONFIGURED (placeholder detected)"
fi

if [[ $STRIPE_WEBHOOK == STRIPE_WEBHOOK_SECRET_PLACEHOLDER ]] && [[ $STRIPE_WEBHOOK != *"_HERE" ]]; then
    echo "✅ Stripe Webhook Secret: CONFIGURED"
else
    echo "❌ Stripe Webhook Secret: NOT CONFIGURED (placeholder detected)"
fi

if [[ $STRIPE_PUBLISHABLE == STRIPE_PUBLISHABLE_KEY_PLACEHOLDER ]] && [[ $STRIPE_PUBLISHABLE != *"_HERE" ]]; then
    echo "✅ Stripe Publishable Key: CONFIGURED"
else
    echo "❌ Stripe Publishable Key: NOT CONFIGURED (placeholder detected)"
fi

# 2. PayPal Configuration Check
echo ""
echo "💰 Testing PayPal Configuration..."

PAYPAL_CLIENT=$(grep "PAYPAL_CLIENT_ID=" backend/.env 2>/dev/null | cut -d'=' -f2)
PAYPAL_SECRET=$(grep "PAYPAL_CLIENT_SECRET=" backend/.env 2>/dev/null | cut -d'=' -f2)
PAYPAL_WEBHOOK=$(grep "PAYPAL_WEBHOOK_ID=" backend/.env 2>/dev/null | cut -d'=' -f2)

if [[ $PAYPAL_CLIENT == AY* ]] && [[ $PAYPAL_CLIENT != *"_HERE" ]]; then
    echo "✅ PayPal Client ID: CONFIGURED"
else
    echo "❌ PayPal Client ID: NOT CONFIGURED (placeholder detected)"
fi

if [[ $PAYPAL_SECRET == EO* ]] && [[ $PAYPAL_SECRET != *"_HERE" ]]; then
    echo "✅ PayPal Client Secret: CONFIGURED"
else
    echo "❌ PayPal Client Secret: NOT CONFIGURED (placeholder detected)"
fi

if [[ $PAYPAL_WEBHOOK != *"_HERE" ]] && [[ -n $PAYPAL_WEBHOOK ]]; then
    echo "✅ PayPal Webhook ID: CONFIGURED"
else
    echo "❌ PayPal Webhook ID: NOT CONFIGURED (placeholder detected)"
fi

# 3. Frontend Configuration Check
echo ""
echo "🎨 Testing Frontend Payment Configuration..."

FRONTEND_STRIPE=$(grep "VITE_STRIPE_PUBLISHABLE_KEY=" frontend/customer-web/.env 2>/dev/null | cut -d'=' -f2)

if [[ $FRONTEND_STRIPE == STRIPE_PUBLISHABLE_KEY_PLACEHOLDER ]] && [[ $FRONTEND_STRIPE != *"_HERE" ]]; then
    echo "✅ Frontend Stripe Key: CONFIGURED"
else
    echo "❌ Frontend Stripe Key: NOT CONFIGURED (placeholder detected)"
fi

# 4. CORS Configuration Check
echo ""
echo "🌐 Testing CORS Configuration..."

ALLOWED_ORIGINS=$(grep "ALLOWED_ORIGINS=" backend/.env 2>/dev/null | cut -d'=' -f2)
API_URL_CONFIG=$(grep "VITE_API_URL=" frontend/customer-web/.env 2>/dev/null | cut -d'=' -f2)

if [[ $ALLOWED_ORIGINS == https://* ]] && [[ $ALLOWED_ORIGINS != *"_HERE" ]]; then
    echo "✅ CORS Origins: CONFIGURED ($ALLOWED_ORIGINS)"
else
    echo "❌ CORS Origins: NOT CONFIGURED (placeholder detected)"
fi

if [[ $API_URL_CONFIG == https://* ]] && [[ $API_URL_CONFIG != *"_HERE" ]]; then
    echo "✅ Frontend API URL: CONFIGURED ($API_URL_CONFIG)"
else
    echo "❌ Frontend API URL: NOT CONFIGURED (placeholder detected)"
fi

# 5. API Functionality Test (if backend is running)
echo ""
echo "🔌 Testing API Payment Endpoints..."

# Test Health
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/health" 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
    echo "✅ API Health: OK"
else
    echo "⚠️  API Health: NOT AVAILABLE (HTTP $HEALTH) - Start backend first"
fi

# Test Payment Endpoints (if available)
if [ "$HEALTH" = "200" ]; then
    STRIPE_ENDPOINT=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/payments/create-intent" \
        -X POST -H "Content-Type: application/json" -d '{"amount": 1000}' 2>/dev/null || echo "000")

    if [ "$STRIPE_ENDPOINT" = "401" ] || [ "$STRIPE_ENDPOINT" = "400" ]; then
        echo "✅ Stripe Payment Endpoint: RESPONDS (Auth required - expected)"
    elif [ "$STRIPE_ENDPOINT" = "200" ]; then
        echo "✅ Stripe Payment Endpoint: FULLY FUNCTIONAL"
    else
        echo "❌ Stripe Payment Endpoint: ERROR (HTTP $STRIPE_ENDPOINT)"
    fi

    PAYPAL_ENDPOINT=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/payments/paypal/create-order" \
        -X POST -H "Content-Type: application/json" -d '{"amount": "10.00"}' 2>/dev/null || echo "000")

    if [ "$PAYPAL_ENDPOINT" = "401" ] || [ "$PAYPAL_ENDPOINT" = "400" ]; then
        echo "✅ PayPal Payment Endpoint: RESPONDS (Auth required - expected)"
    elif [ "$PAYPAL_ENDPOINT" = "200" ]; then
        echo "✅ PayPal Payment Endpoint: FULLY FUNCTIONAL"
    else
        echo "❌ PayPal Payment Endpoint: ERROR (HTTP $PAYPAL_ENDPOINT)"
    fi
fi

echo ""
echo "======================================"
echo "📊 Payment Configuration Summary:"

CONFIGURED=0
TOTAL=0

# Backend Stripe
((TOTAL++))
if [[ $STRIPE_SECRET == STRIPE_SECRET_KEY_PLACEHOLDER ]] && [[ $STRIPE_SECRET != *"_HERE" ]]; then ((CONFIGURED++)); fi

((TOTAL++))
if [[ $STRIPE_WEBHOOK == STRIPE_WEBHOOK_SECRET_PLACEHOLDER ]] && [[ $STRIPE_WEBHOOK != *"_HERE" ]]; then ((CONFIGURED++)); fi

((TOTAL++))
if [[ $STRIPE_PUBLISHABLE == STRIPE_PUBLISHABLE_KEY_PLACEHOLDER ]] && [[ $STRIPE_PUBLISHABLE != *"_HERE" ]]; then ((CONFIGURED++)); fi

# PayPal
((TOTAL++))
if [[ $PAYPAL_CLIENT == AY* ]] && [[ $PAYPAL_CLIENT != *"_HERE" ]]; then ((CONFIGURED++)); fi

((TOTAL++))
if [[ $PAYPAL_SECRET == EO* ]] && [[ $PAYPAL_SECRET != *"_HERE" ]]; then ((CONFIGURED++)); fi

((TOTAL++))
if [[ $PAYPAL_WEBHOOK != *"_HERE" ]] && [[ -n $PAYPAL_WEBHOOK ]]; then ((CONFIGURED++)); fi

# Frontend
((TOTAL++))
if [[ $FRONTEND_STRIPE == STRIPE_PUBLISHABLE_KEY_PLACEHOLDER ]] && [[ $FRONTEND_STRIPE != *"_HERE" ]]; then ((CONFIGURED++)); fi

# CORS
((TOTAL++))
if [[ $ALLOWED_ORIGINS == https://* ]] && [[ $ALLOWED_ORIGINS != *"_HERE" ]]; then ((CONFIGURED++)); fi

((TOTAL++))
if [[ $API_URL_CONFIG == https://* ]] && [[ $API_URL_CONFIG != *"_HERE" ]]; then ((CONFIGURED++)); fi

echo "✅ $CONFIGURED/$TOTAL payment configurations completed"

if [ "$CONFIGURED" = "$TOTAL" ]; then
    echo ""
    echo "🎉 ALL PAYMENT CONFIGURATIONS COMPLETE!"
    echo "🚀 Ready for production deployment with full payment processing!"
    echo ""
    echo "Next steps:"
    echo "1. Run: ./launch-production.sh"
    echo "2. Test real payments with small amounts"
    echo "3. Monitor Stripe/PayPal dashboards"
else
    echo ""
    echo "⚠️  PAYMENT CONFIGURATION INCOMPLETE"
    echo ""
    echo "Missing configurations:"
    if [[ $STRIPE_SECRET != STRIPE_SECRET_KEY_PLACEHOLDER ]] || [[ $STRIPE_SECRET == *"_HERE" ]]; then
        echo "  - Stripe Secret Key (get from https://dashboard.stripe.com/)"
    fi
    if [[ $STRIPE_WEBHOOK != STRIPE_WEBHOOK_SECRET_PLACEHOLDER ]] || [[ $STRIPE_WEBHOOK == *"_HERE" ]]; then
        echo "  - Stripe Webhook Secret (create webhook in Stripe dashboard)"
    fi
    if [[ $PAYPAL_CLIENT != AY* ]] || [[ $PAYPAL_CLIENT == *"_HERE" ]]; then
        echo "  - PayPal Client ID (get from https://developer.paypal.com/)"
    fi
    if [[ $PAYPAL_SECRET != EO* ]] || [[ $PAYPAL_SECRET == *"_HERE" ]]; then
        echo "  - PayPal Client Secret (get from https://developer.paypal.com/)"
    fi
    if [[ $ALLOWED_ORIGINS != https://* ]] || [[ $ALLOWED_ORIGINS == *"_HERE" ]]; then
        echo "  - CORS Origins (set to your production domains)"
    fi
    echo ""
    echo "📖 See PAYMENT_ACTIVATION.md for detailed setup instructions"
fi

echo ""
echo "💡 Test commands:"
echo "  ./test-payment-config.sh  # This script"
echo "  ./test-payments.sh        # Functional payment tests"
echo "  ./launch-production.sh    # Full production launch"