#!/bin/bash

# ============================================
# UberFoods - Master Localhost Stop Script
# ============================================
# Beendet alle Frontend-Apps

# Farben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🛑 Beende alle Frontend-Apps...${NC}"
echo "=========================================="
echo ""

# Funktion zum Beenden von Prozessen auf einem Port
stop_port() {
  local port=$1
  local app_name=$2
  
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}🛑 Beende $app_name (Port $port)...${NC}"
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}✅ $app_name beendet${NC}"
  else
    echo -e "${GREEN}✅ $app_name läuft nicht${NC}"
  fi
}

# Beende alle Apps
stop_port 3002 "Admin Panel"
stop_port 3001 "Customer Web"
stop_port 3004 "Driver App"
stop_port 3003 "Restaurant Web"

# Beende Prozesse aus PID-Dateien (falls vorhanden)
if [ -d "logs" ]; then
  echo ""
  echo -e "${BLUE}🔍 Prüfe PID-Dateien...${NC}"
  for pidfile in logs/*.pid; do
    if [ -f "$pidfile" ]; then
      pid=$(cat "$pidfile")
      app_name=$(basename "$pidfile" .pid)
      if kill -0 "$pid" 2>/dev/null; then
        echo -e "${YELLOW}🛑 Beende $app_name (PID: $pid)...${NC}"
        kill -9 "$pid" 2>/dev/null || true
        echo -e "${GREEN}✅ $app_name beendet${NC}"
      fi
      rm "$pidfile"
    fi
  done
fi

echo ""
echo -e "${GREEN}✅ Alle Apps beendet!${NC}"
echo ""

