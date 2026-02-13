#!/bin/bash

# ============================================
# UBERFOODS DEVELOPMENT START SCRIPT
# ============================================

echo "🚀 UberFoods Development Start"
echo "=============================="

# Backend starten
echo "📦 Starte Backend..."
cd backend
npm run start:dev &
BACKEND_PID=$!
cd ..

# Warte kurz auf Backend
sleep 5

# Frontend Apps starten
echo "🌐 Starte Frontend Apps..."

# Admin Panel
echo "   📊 Admin Panel (Port 3001)..."
cd frontend/admin-panel
npm run dev -- --port 3001 &
ADMIN_PID=$!
cd ../..

# Customer Web
echo "   🛒 Customer Web (Port 3002)..."
cd frontend/customer-web
npm run dev -- --port 3002 &
CUSTOMER_PID=$!
cd ../..

# Driver App
echo "   🚗 Driver App (Port 3003)..."
cd frontend/driver-app
npm run dev -- --port 3003 &
DRIVER_PID=$!
cd ../..

# Restaurant Web
echo "   🍽️  Restaurant Web (Port 3004)..."
cd frontend/restaurant-web
npm run dev -- --port 3004 &
RESTAURANT_PID=$!
cd ../..

echo ""
echo "🎉 Alle Services gestartet!"
echo "==========================="
echo ""
echo "📊 URLs:"
echo "   🟢 Backend API:    http://localhost:3000"
echo "   🟢 Admin Panel:    http://localhost:3001"
echo "   🟢 Customer Web:   http://localhost:3002"
echo "   🟢 Driver App:     http://localhost:3003"
echo "   🟢 Restaurant Web: http://localhost:3004"
echo ""
echo "🛑 Zum Stoppen: Ctrl+C oder 'pkill -f \"npm run dev\"'"
echo ""
echo "📝 Logs:"
echo "   Backend: cd backend && npm run start:dev"
echo "   Frontend: cd frontend/[app] && npm run dev"
echo ""

# Warte auf Interrupt
trap "echo '🛑 Stoppe alle Services...'; kill $BACKEND_PID $ADMIN_PID $CUSTOMER_PID $DRIVER_PID $RESTAURANT_PID 2>/dev/null; exit" INT

# Halte Script am Laufen
wait
