#!/bin/bash

# ============================================
# Admin Panel - Localhost Start Script
# ============================================
# Startet Admin Panel mit Backend-Verbindung

set -e

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Admin Panel - Localhost Start${NC}"
echo "================================"
echo ""

# Prüfe ob wir im richtigen Verzeichnis sind
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Bitte führe dieses Script im admin-panel Verzeichnis aus!${NC}"
  exit 1
fi

# Prüfe ob .env existiert
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}📝 .env Datei fehlt, erstelle sie...${NC}"
  if [ -f "setup-localhost.sh" ]; then
    ./setup-localhost.sh
  else
    echo -e "${RED}❌ setup-localhost.sh nicht gefunden!${NC}"
    exit 1
  fi
fi

# Prüfe ob Backend läuft
echo -e "${BLUE}🔍 Prüfe Backend-Verbindung...${NC}"
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Backend läuft auf http://localhost:3000${NC}"
else
  echo -e "${YELLOW}⚠️  Backend läuft NICHT auf http://localhost:3000${NC}"
  echo -e "${YELLOW}   Starte Backend in separatem Terminal:${NC}"
  echo -e "   ${BLUE}cd ../../backend && npm run start:dev${NC}"
  echo ""
  read -p "Trotzdem Admin Panel starten? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Prüfe ob Dependencies installiert sind
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}📦 Installiere Dependencies...${NC}"
  npm install
fi

# Prüfe ob Port 3002 frei ist
if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
  echo -e "${YELLOW}⚠️  Port 3002 ist bereits belegt${NC}"
  read -p "Prozess beenden und neu starten? (y/n) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    lsof -ti:3002 | xargs kill -9 2>/dev/null || true
    sleep 2
  else
    exit 1
  fi
fi

echo ""
echo -e "${GREEN}✅ Starte Admin Panel...${NC}"
echo -e "${BLUE}📍 URL: http://localhost:3002${NC}"
echo -e "${BLUE}🔐 Auto-Login: Aktiviert (VITE_SKIP_AUTH=true)${NC}"
echo ""
echo -e "${YELLOW}💡 Tipp: Drücke Ctrl+C zum Beenden${NC}"
echo ""

# Starte Vite Dev Server
npm run dev

