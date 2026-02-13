#!/bin/bash

# ============================================
# UberFoods - Test All Services
# ============================================
# Testet alle konfigurierten Services

set -e

echo "🧪 UberFoods Service Tests"
echo "============================"
echo ""

# Prüfe ob Backend läuft
BACKEND_URL="${BACKEND_URL:-https://localhost:3000}"

echo "📡 Prüfe Backend-Verbindung..."
if curl -s "$BACKEND_URL/api/health" > /dev/null 2>&1; then
    echo "   ✅ Backend erreichbar"
    
    # Health Check
    echo ""
    echo "🏥 Health Check:"
    curl -s "$BACKEND_URL/api/health" | jq '.' 2>/dev/null || curl -s "$BACKEND_URL/api/health"
    
    # Config Check
    echo ""
    echo "⚙️  Config Check:"
    curl -s "$BACKEND_URL/api/test/config" | jq '.' 2>/dev/null || curl -s "$BACKEND_URL/api/test/config"
    
    # Maps Test
    echo ""
    echo "🗺️  Maps API Test:"
    curl -s "$BACKEND_URL/api/test/maps" | jq '.' 2>/dev/null || curl -s "$BACKEND_URL/api/test/maps"
    
    # Storage Test (ohne Auth - zeigt nur Config)
    echo ""
    echo "☁️  Storage Test:"
    echo "   (Benötigt Auth für vollständigen Test)"
    
else
    echo "   ❌ Backend nicht erreichbar"
    echo "   Starte Backend: cd backend && npm run start:dev"
    exit 1
fi

echo ""
echo "============================"
echo "✅ Tests abgeschlossen!"
echo ""

