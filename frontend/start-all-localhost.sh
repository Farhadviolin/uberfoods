#!/bin/bash

# ============================================
# UberFoods - Master Localhost Start Script
# ============================================
# Startet alle Frontend-Apps gleichzeitig

# Farben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starte alle Frontend-Apps...${NC}"
echo "=========================================="
echo ""

# Prüfe ob wir im frontend Verzeichnis sind
if [ ! -d "admin-panel" ] || [ ! -d "customer-web" ] || [ ! -d "driver-app" ] || [ ! -d "restaurant-web" ]; then
  echo -e "${RED}❌ Bitte führe dieses Script im frontend Verzeichnis aus!${NC}"
  exit 1
fi

# Prüfe Backend
echo -e "${BLUE}🔍 Prüfe Backend...${NC}"
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Backend läuft${NC}"
else
  echo -e "${YELLOW}⚠️  Backend läuft NICHT auf http://localhost:3000${NC}"
  echo -e "${YELLOW}   Starte Backend zuerst: cd ../backend && npm run start:dev${NC}"
  read -p "Trotzdem fortfahren? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Funktion zum Prüfen und Freigeben von Ports
check_port() {
  local port=$1
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Port $port ist bereits belegt${NC}"
    read -p "Prozess beenden? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      lsof -ti:$port | xargs kill -9 2>/dev/null || true
      sleep 1
      echo -e "${GREEN}✅ Port $port freigegeben${NC}"
    fi
  fi
}

# Prüfe alle Ports
check_port 3001
check_port 3002
check_port 3003
check_port 3004

# Erstelle logs Verzeichnis
mkdir -p logs

# Funktion zum Starten einer App
start_app() {
  local app_name=$1
  local app_dir=$2
  local port=$3
  
  echo -e "${BLUE}🚀 Starte $app_name auf Port $port...${NC}"
  cd "$app_dir"
  
  # Prüfe ob .env existiert
  if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env fehlt für $app_name, führe zuerst setup-all-localhost.sh aus${NC}"
    cd ..
    return
  fi
  
  # Prüfe ob node_modules existiert
  if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installiere Dependencies für $app_name...${NC}"
    npm install
  fi
  
  # Starte in neuem Terminal (macOS)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e "tell app \"Terminal\" to do script \"cd '$(pwd)' && echo '🚀 $app_name - Port $port' && npm run dev\"" 2>/dev/null || {
      # Fallback: Starte im Hintergrund
      echo -e "${YELLOW}⚠️  Terminal.app nicht verfügbar, starte im Hintergrund...${NC}"
      npm run dev > "../logs/${app_name}.log" 2>&1 &
      echo $! > "../logs/${app_name}.pid"
      echo -e "${GREEN}✅ $app_name gestartet (PID: $(cat ../logs/${app_name}.pid))${NC}"
    }
  else
    # Linux/Windows - starte im Hintergrund
    npm run dev > "../logs/${app_name}.log" 2>&1 &
    echo $! > "../logs/${app_name}.pid"
    echo -e "${GREEN}✅ $app_name gestartet (PID: $(cat ../logs/${app_name}.pid))${NC}"
  fi
  
  cd ..
  sleep 2
}

# Starte alle Apps
start_app "Admin Panel" "admin-panel" "3002"
start_app "Customer Web" "customer-web" "3001"
start_app "Driver App" "driver-app" "3004"
start_app "Restaurant Web" "restaurant-web" "3003"

echo ""
echo -e "${GREEN}✅ Alle Apps gestartet!${NC}"
echo ""
echo -e "${YELLOW}📋 URLs:${NC}"
echo "  - Admin Panel:    http://localhost:3002"
echo "  - Customer Web:   http://localhost:3001"
echo "  - Driver App:     http://localhost:3004"
echo "  - Restaurant Web: http://localhost:3003"
echo ""
echo -e "${YELLOW}💡 Tipps:${NC}"
echo "  - Logs anzeigen: tail -f logs/*.log"
echo "  - Apps beenden: ./stop-all-localhost.sh (wenn vorhanden)"
echo "  - Oder: Drücke Ctrl+C in jedem Terminal"
echo ""
echo -e "${BLUE}🎉 Viel Erfolg beim Testen!${NC}"
echo ""

