#!/bin/bash

# ============================================
# UberFoods - Master Localhost Setup Script
# ============================================
# Bereitet alle Frontend-Apps für Localhost-Tests vor

set -e

# Farben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 UberFoods - Master Localhost Setup${NC}"
echo "=========================================="
echo ""

# Prüfe Backend
echo -e "${BLUE}🔍 Prüfe Backend...${NC}"
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Backend läuft auf http://localhost:3000${NC}"
else
  echo -e "${YELLOW}⚠️  Backend läuft NICHT${NC}"
  echo -e "${YELLOW}   Starte Backend zuerst: cd ../backend && npm run start:dev${NC}"
  read -p "Trotzdem fortfahren? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Admin Panel
echo ""
echo -e "${BLUE}📦 Admin Panel Setup...${NC}"
cd admin-panel
if [ -f "setup-localhost.sh" ]; then
  chmod +x setup-localhost.sh
  ./setup-localhost.sh
else
  if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
VITE_SKIP_AUTH=true
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
VITE_APP_NAME=UberFoods Admin
EOF
    echo -e "${GREEN}✅ .env Datei erstellt${NC}"
  fi
  if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installiere Dependencies...${NC}"
    npm install
    echo -e "${GREEN}✅ Dependencies installiert${NC}"
  fi
fi
cd ..

# Customer Web
echo ""
echo -e "${BLUE}📦 Customer Web Setup...${NC}"
cd customer-web
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}📝 Erstelle .env Datei...${NC}"
  cat > .env << 'EOF'
VITE_APP_NAME=UberFoods
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
VITE_GOOGLE_MAPS_API_KEY=AIzaSyYourGoogleMapsAPIKeyHere
VITE_STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY_PLACEHOLDER
VITE_ENABLE_VOICE_ASSISTANT=true
VITE_ENABLE_SOCIAL_FEATURES=true
VITE_ENABLE_GAMIFICATION=true
EOF
  echo -e "${GREEN}✅ .env Datei erstellt${NC}"
fi
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}📦 Installiere Dependencies...${NC}"
  npm install
  echo -e "${GREEN}✅ Dependencies installiert${NC}"
fi
cd ..

# Driver App
echo ""
echo -e "${BLUE}📦 Driver App Setup...${NC}"
cd driver-app
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}📝 Erstelle .env Datei...${NC}"
  cat > .env << 'EOF'
VITE_APP_NAME=UberFoods Driver
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
VITE_GOOGLE_MAPS_API_KEY=AIzaSyYourGoogleMapsAPIKeyHere
VITE_SKIP_AUTH=false
EOF
  echo -e "${GREEN}✅ .env Datei erstellt${NC}"
fi
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}📦 Installiere Dependencies...${NC}"
  npm install
  echo -e "${GREEN}✅ Dependencies installiert${NC}"
fi
cd ..

# Restaurant Web
echo ""
echo -e "${BLUE}📦 Restaurant Web Setup...${NC}"
cd restaurant-web
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}📝 Erstelle .env Datei...${NC}"
  cat > .env << 'EOF'
VITE_APP_NAME=UberFoods Restaurant
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
EOF
  echo -e "${GREEN}✅ .env Datei erstellt${NC}"
fi
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}📦 Installiere Dependencies...${NC}"
  npm install
  echo -e "${GREEN}✅ Dependencies installiert${NC}"
fi
cd ..

echo ""
echo -e "${GREEN}✅ Alle Apps sind bereit!${NC}"
echo ""
echo -e "${YELLOW}📋 Ports:${NC}"
echo "  - Admin Panel:    http://localhost:3002"
echo "  - Customer Web:   http://localhost:3001"
echo "  - Driver App:     http://localhost:3004"
echo "  - Restaurant Web: http://localhost:3003"
echo "  - Backend API:    http://localhost:3000"
echo ""
echo -e "${YELLOW}🚀 Starte alle Apps mit:${NC}"
echo "  ./start-all-localhost.sh"
echo ""

