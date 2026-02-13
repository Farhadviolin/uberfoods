#!/bin/bash

# ============================================
# Admin Panel - Localhost Setup Script
# ============================================

set -e

echo "🚀 Admin Panel Localhost Setup"
echo "================================"
echo ""

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Prüfe ob .env existiert
if [ ! -f .env ]; then
  echo -e "${YELLOW}📝 Erstelle .env Datei...${NC}"
  cat > .env << 'EOF'
# ============================================
# Admin Panel - Environment Variables
# ============================================
# Localhost Development Configuration

# Development Auto-Login (optional - nur für Development!)
VITE_SKIP_AUTH=true

# API URL (wird normalerweise über Vite Proxy verwendet)
VITE_API_URL=http://localhost:3000

# WebSocket URL (optional - WebSocket ist aktuell deaktiviert)
VITE_WS_URL=http://localhost:3000

# App Name
VITE_APP_NAME=UberFoods Admin

# Andere Apps (für Deep-Links)
VITE_CUSTOMER_WEB_URL=http://localhost:3001
VITE_DRIVER_APP_URL=http://localhost:3004
VITE_RESTAURANT_WEB_URL=http://localhost:3003

# Sentry Error Tracking (optional)
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=development
EOF
  echo -e "${GREEN}✅ .env Datei erstellt${NC}"
else
  echo -e "${GREEN}✅ .env Datei existiert bereits${NC}"
fi

# Prüfe ob node_modules existiert
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}📦 Installiere Dependencies...${NC}"
  npm install
  echo -e "${GREEN}✅ Dependencies installiert${NC}"
else
  echo -e "${GREEN}✅ Dependencies bereits installiert${NC}"
fi

# Prüfe ob Backend läuft
echo ""
echo -e "${YELLOW}🔍 Prüfe Backend-Verbindung...${NC}"
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Backend läuft auf http://localhost:3000${NC}"
else
  echo -e "${RED}⚠️  Backend läuft NICHT auf http://localhost:3000${NC}"
  echo -e "${YELLOW}   Bitte starte das Backend zuerst:${NC}"
  echo -e "   cd ../backend && npm run start:dev"
fi

echo ""
echo -e "${GREEN}✅ Setup abgeschlossen!${NC}"
echo ""
echo -e "${YELLOW}📋 Nächste Schritte:${NC}"
echo "1. Stelle sicher, dass Backend auf http://localhost:3000 läuft"
echo "2. Starte Admin Panel mit: ${GREEN}npm run dev${NC}"
echo "3. Öffne http://localhost:3002 im Browser"
echo ""
echo -e "${YELLOW}🔐 Login-Informationen:${NC}"
echo "   Email: admin@uberfoods.com"
echo "   Passwort: admin123"
echo ""
echo -e "${YELLOW}💡 Tipp:${NC} Mit VITE_SKIP_AUTH=true ist Auto-Login aktiviert"
echo ""

