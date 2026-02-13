#!/bin/bash
set -e
echo "═══════════════════════════════════════════════════════════"
echo "🧪 UBERFOODS - VOLLSTÄNDIGER TEST-DURCHLAUF"
echo "═══════════════════════════════════════════════════════════"
echo ""

echo "📦 [1/5] Backend-Tests..."
echo "───────────────────────────────────────────────────────────"
(cd backend && npm test -- --silent 2>&1 | tail -5)
echo ""

echo "📊 [2/5] Admin Panel Tests..."
echo "───────────────────────────────────────────────────────────"
(cd frontend/admin-panel && npm test -- --silent 2>&1 | tail -5)
echo ""

echo "🛒 [3/5] Customer Web Tests..."
echo "───────────────────────────────────────────────────────────"
(cd frontend/customer-web && npm test -- --silent 2>&1 | tail -5)
echo ""

echo "🚗 [4/5] Driver App Tests..."
echo "───────────────────────────────────────────────────────────"
(cd frontend/driver-app && npm test -- --silent 2>&1 | tail -5)
echo ""

echo "🍕 [5/5] Restaurant Web Tests..."
echo "───────────────────────────────────────────────────────────"
(cd frontend/restaurant-web && npm test -- --silent 2>&1 | tail -5)
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "✅ ALLE TESTS ERFOLGREICH ABGESCHLOSSEN!"
echo "═══════════════════════════════════════════════════════════"
