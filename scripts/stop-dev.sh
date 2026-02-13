#!/bin/bash

# 🛑 UberFoods - Development Stop Script
# Stoppt Backend und Frontend sauber

set -e

echo "🛑 UberFoods - Development Shutdown"
echo "============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check for PID files
if [ -f ".dev/backend.pid" ]; then
    BACKEND_PID=$(cat .dev/backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "🔧 Backend stoppen (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null || true
        echo -e "${GREEN}✅ Backend gestoppt${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend läuft nicht (PID: $BACKEND_PID)${NC}"
    fi
    rm -f .dev/backend.pid
else
    echo -e "${YELLOW}⚠️  Keine Backend PID gefunden${NC}"
fi

if [ -f ".dev/frontend.pid" ]; then
    FRONTEND_PID=$(cat .dev/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "🎨 Frontend stoppen (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
        echo -e "${GREEN}✅ Frontend gestoppt${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend läuft nicht (PID: $FRONTEND_PID)${NC}"
    fi
    rm -f .dev/frontend.pid
else
    echo -e "${YELLOW}⚠️  Keine Frontend PID gefunden${NC}"
fi

# Kill any remaining processes on ports
echo ""
echo "🔍 Ports prüfen..."

# Backend Port 3000
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "Port 3000 noch belegt, Prozess beenden..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}✅ Port 3000 freigegeben${NC}"
fi

# Frontend Port 3001
if lsof -ti:3001 > /dev/null 2>&1; then
    echo "Port 3001 noch belegt, Prozess beenden..."
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}✅ Port 3001 freigegeben${NC}"
fi

# Optional: Docker containers stoppen
read -p "🐳 Docker Container auch stoppen? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v docker &> /dev/null; then
        cd backend
        docker-compose down 2>/dev/null || true
        echo -e "${GREEN}✅ Docker Container gestoppt${NC}"
        cd ..
    fi
fi

echo ""
echo "============================================="
echo -e "${GREEN}✅ Shutdown abgeschlossen!${NC}"
echo ""
echo "📝 Logs bleiben erhalten in:"
echo "   logs/backend.log"
echo "   logs/frontend.log"
echo ""
