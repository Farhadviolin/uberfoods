#!/bin/bash

# ============================================
# UberFoods Service Health Check Script
# ============================================
# Prüft ob alle externen Services erreichbar sind

set -e

echo "🔍 UberFoods Service Health Check"
echo "=================================="
echo ""

# Lade .env wenn vorhanden
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Prüfe ob Backend läuft
echo "📡 Backend Health Check..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "   ✅ Backend läuft"
    
    # Hole Health Status
    HEALTH=$(curl -s http://localhost:3000/api/health)
    echo "   Status: $(echo $HEALTH | grep -o '"status":"[^"]*"' | cut -d'"' -f4)"
else
    echo "   ❌ Backend läuft nicht (Port 3000)"
    echo "   Starte Backend: npm run start:dev"
fi

echo ""

# Prüfe Stripe (wenn konfiguriert)
if [ ! -z "$STRIPE_SECRET_KEY" ] && [ "$STRIPE_SECRET_KEY" != "STRIPE_SECRET_KEY_PLACEHOLDER" ]; then
    echo "💳 Stripe Payment..."
    if [[ $STRIPE_SECRET_KEY == STRIPE_SECRET_KEY_PLACEHOLDER ]]; then
        echo "   ✅ Production Key gesetzt"
    elif [[ $STRIPE_SECRET_KEY == STRIPE_SECRET_KEY_PLACEHOLDER ]]; then
        echo "   ⚠️  Test Key gesetzt (OK für Development)"
    else
        echo "   ❌ Ungültiger Stripe Key Format"
    fi
else
    echo "   ⚠️  Stripe nicht konfiguriert"
fi

echo ""

# Prüfe Google Maps
if [ ! -z "$GOOGLE_MAPS_API_KEY" ] && [ "$GOOGLE_MAPS_API_KEY" != "AIzaSyYourGoogleMapsAPIKeyHere" ]; then
    echo "🗺️  Google Maps API..."
    # Test API Key (vereinfacht)
    if curl -s "https://maps.googleapis.com/maps/api/geocode/json?address=Wien&key=$GOOGLE_MAPS_API_KEY" | grep -q "results" 2>/dev/null; then
        echo "   ✅ API Key funktioniert"
    else
        echo "   ⚠️  API Key könnte ungültig sein (prüfe manuell)"
    fi
else
    echo "   ⚠️  Google Maps nicht konfiguriert"
fi

echo ""

# Prüfe Email Service
if [ ! -z "$SENDGRID_API_KEY" ] && [ "$SENDGRID_API_KEY" != "SG.your_sendgrid_api_key_here" ]; then
    echo "📧 SendGrid Email..."
    echo "   ✅ SendGrid API Key gesetzt"
elif [ ! -z "$SMTP_HOST" ]; then
    echo "📧 SMTP Email..."
    echo "   ✅ SMTP konfiguriert"
else
    echo "   ⚠️  Email Service nicht konfiguriert"
fi

echo ""

# Prüfe S3 Storage
if [ ! -z "$AWS_S3_BUCKET" ] && [ ! -z "$AWS_ACCESS_KEY_ID" ] && [ ! -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "☁️  AWS S3 Storage..."
    echo "   ✅ S3 konfiguriert (Bucket: $AWS_S3_BUCKET)"
else
    echo "   ⚠️  S3 nicht konfiguriert (verwendet lokales Storage)"
fi

echo ""

# Prüfe Sentry
if [ ! -z "$SENTRY_DSN" ] && [ "$SENTRY_DSN" != "https://your_sentry_dsn@sentry.io/project_id" ]; then
    echo "🐛 Sentry Error Tracking..."
    echo "   ✅ Sentry DSN gesetzt"
else
    echo "   ⚠️  Sentry nicht konfiguriert"
fi

echo ""

# Prüfe VAPID Keys
if [ ! -z "$VAPID_PUBLIC_KEY" ] && [ ! -z "$VAPID_PRIVATE_KEY" ] && 
   [ "$VAPID_PUBLIC_KEY" != "your_vapid_public_key_here" ] && 
   [ "$VAPID_PRIVATE_KEY" != "your_vapid_private_key_here" ]; then
    echo "🔔 Push Notifications (VAPID)..."
    echo "   ✅ VAPID Keys gesetzt"
else
    echo "   ⚠️  VAPID Keys nicht konfiguriert"
    echo "   Generiere mit: node scripts/generate-vapid-keys.js"
fi

echo ""
echo "=================================="
echo "✅ Health Check abgeschlossen!"
echo ""
echo "📖 Für detaillierte Setup-Anleitung siehe: PRODUCTION_SETUP.md"
echo ""

