#!/bin/bash

# 🚀 UberFoods - Development Startup Script
# Startet Backend und Frontend automatisch

set -e

echo "🚀 UberFoods - Development Startup"
echo "============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the project root
if [ ! -f "README.md" ]; then
    echo -e "${RED}❌ Error: Bitte im Projekt-Root ausführen${NC}"
    exit 1
fi

# Check prerequisites
echo "🔍 Prerequisites prüfen..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js nicht gefunden. Bitte installieren.${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker nicht gefunden. Datenbank muss manuell gestartet werden.${NC}"
fi

echo -e "${GREEN}✅ Prerequisites OK${NC}"
echo ""

# Start PostgreSQL if Docker is available
if command -v docker &> /dev/null; then
    echo "🐳 PostgreSQL Container starten..."
    cd backend
    docker-compose up -d postgres 2>/dev/null || echo "PostgreSQL läuft bereits"
    echo -e "${GREEN}✅ PostgreSQL gestartet${NC}"
    sleep 3
    cd ..
    echo ""
fi

# Check if dependencies are installed
echo "📦 Dependencies prüfen..."
if [ ! -d "backend/node_modules" ]; then
    echo "Backend Dependencies installieren..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/customer-web/node_modules" ]; then
    echo "Frontend Dependencies installieren..."
    cd frontend/customer-web && npm install && cd ../..
fi
echo -e "${GREEN}✅ Dependencies OK${NC}"
echo ""

# Database migration
echo "🗄️  Datenbank migrieren..."
cd backend
if npm run prisma:deploy:abs 2>/dev/null; then
    echo -e "${GREEN}✅ Migrationen ausgeführt${NC}"
else
    echo -e "${YELLOW}⚠️  Migrationen übersprungen (Development Mode)${NC}"
fi
cd ..
echo ""

# Start Backend
echo "🔧 Backend starten..."
cd backend
npm run start:dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend gestartet (PID: $BACKEND_PID)${NC}"
echo "   Logs: logs/backend.log"
cd ..
sleep 5
echo ""

# Start Frontend
echo "🎨 Frontend starten..."
cd frontend/customer-web
npm run dev > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend gestartet (PID: $FRONTEND_PID)${NC}"
echo "   Logs: logs/frontend.log"
cd ../..
sleep 5
echo ""

# Health Check
echo "🏥 Health Check durchführen..."
sleep 3
if curl -sk https://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend Health Check: OK${NC}"
else
    echo -e "${YELLOW}⚠️  Backend Health Check: Noch nicht bereit${NC}"
fi

if curl -sk https://localhost:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend Health Check: OK${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend Health Check: Noch nicht bereit${NC}"
fi
echo ""

# Final Status
echo "============================================="
echo -e "${GREEN}🎊 System erfolgreich gestartet!${NC}"
echo ""
echo "🌐 Zugriff:"
echo "   🎯 Frontend: https://localhost:3001"
echo "   🚀 Backend:  https://localhost:3000/api"
echo "   📊 Health:   https://localhost:3000/api/health"
echo ""
echo "📋 PIDs:"
echo "   Backend:  $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "🛑 Stoppen mit:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   oder: ./scripts/stop-dev.sh"
echo ""
echo "📝 Logs ansehen:"
echo "   tail -f logs/backend.log"
echo "   tail -f logs/frontend.log"
echo ""

# Save PIDs for stop script
mkdir -p .dev
echo "$BACKEND_PID" > .dev/backend.pid
echo "$FRONTEND_PID" > .dev/frontend.pid

echo -e "${GREEN}✅ Startup Script abgeschlossen!${NC}"
