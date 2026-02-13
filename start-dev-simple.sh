#!/bin/bash

# UberFoods - Einfacher Development Start
# Überspringt problematische npm Installationen

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || { echo "❌ Konnte nicht ins Projektverzeichnis wechseln!"; exit 1; }

echo "🍕 UberFoods - Einfacher Start"
echo "=============================="
echo ""

# Farben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Docker prüfen
echo -e "${BLUE}🔍 Prüfe Docker...${NC}"
if ! docker ps > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker läuft nicht! Bitte starten Sie Docker Desktop.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker bereit!${NC}"

# Ports freimachen
echo -e "${BLUE}🔍 Prüfe Ports...${NC}"
for port in 3000 3001 3002 3003 3004 5434 6379; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}⚠️  Port $port belegt, beende Prozess...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null
        sleep 1
    fi
done
echo -e "${GREEN}✅ Ports frei!${NC}"

# Docker Container starten
echo -e "${YELLOW}📦 Starte Datenbank Services...${NC}"
docker-compose down -v 2>/dev/null
docker-compose up -d postgres redis

# Warte auf Datenbank
echo -e "${BLUE}⏳ Warte auf Datenbank...${NC}"
for i in {1..30}; do
    if docker exec uberfoods_postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Datenbank bereit!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Datenbank startet nicht!${NC}"
        exit 1
    fi
    sleep 2
done

# Backend Setup (ohne npm install)
cd "$SCRIPT_DIR/backend" || exit 1

# Prisma Setup
echo -e "${YELLOW}🗄️  Prisma Setup...${NC}"
if [ -d "node_modules" ]; then
    echo "🔨 Generiere Prisma Client..."
    npx prisma generate 2>/dev/null || echo -e "${YELLOW}⚠️  Prisma Generate übersprungen${NC}"

    echo "🗄️  Führe Migrationen aus..."
    npx prisma migrate deploy 2>/dev/null || npx prisma migrate dev --name init 2>/dev/null || echo -e "${YELLOW}⚠️  Migrationen übersprungen${NC}"
else
    echo -e "${YELLOW}⚠️  node_modules fehlen, überspringe Prisma Setup${NC}"
fi

cd "$SCRIPT_DIR" || exit 1

# Backend starten
echo -e "${GREEN}🚀 Starte Backend...${NC}"
cd "$SCRIPT_DIR/backend" || exit 1
if [ -d "node_modules" ]; then
    npm run start:dev > "$SCRIPT_DIR/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo -e "${GREEN}✅ Backend gestartet${NC}"
else
    echo -e "${YELLOW}⚠️  node_modules fehlen, Backend kann nicht gestartet werden${NC}"
    echo -e "${YELLOW}💡 Führen Sie zuerst 'cd backend && npm install --legacy-peer-deps' aus${NC}"
fi

cd "$SCRIPT_DIR" || exit 1
sleep 5

# Frontend-Apps starten
echo -e "${GREEN}🚀 Starte Frontend-Apps...${NC}"

# Customer Web
if [ -d "$SCRIPT_DIR/frontend/customer-web" ]; then
    cd "$SCRIPT_DIR/frontend/customer-web" || exit 1
    if [ -d "node_modules" ]; then
        npm run dev > "$SCRIPT_DIR/customer-web.log" 2>&1 &
        echo -e "${GREEN}✅ Customer Web gestartet (Port 3001)${NC}"
    else
        echo -e "${YELLOW}⚠️  Customer Web: node_modules fehlen${NC}"
    fi
    cd "$SCRIPT_DIR" || exit 1
fi

# Admin Panel
if [ -d "$SCRIPT_DIR/frontend/admin-panel" ]; then
    cd "$SCRIPT_DIR/frontend/admin-panel" || exit 1
    if [ -d "node_modules" ]; then
        npm run dev > "$SCRIPT_DIR/admin-panel.log" 2>&1 &
        echo -e "${GREEN}✅ Admin Panel gestartet (Port 3002)${NC}"
    else
        echo -e "${YELLOW}⚠️  Admin Panel: node_modules fehlen${NC}"
    fi
    cd "$SCRIPT_DIR" || exit 1
fi

# Restaurant Web
if [ -d "$SCRIPT_DIR/frontend/restaurant-web" ]; then
    cd "$SCRIPT_DIR/frontend/restaurant-web" || exit 1
    if [ -d "node_modules" ]; then
        npm run dev > "$SCRIPT_DIR/restaurant-web.log" 2>&1 &
        echo -e "${GREEN}✅ Restaurant Web gestartet (Port 3003)${NC}"
    else
        echo -e "${YELLOW}⚠️  Restaurant Web: node_modules fehlen${NC}"
    fi
    cd "$SCRIPT_DIR" || exit 1
fi

# Driver App
if [ -d "$SCRIPT_DIR/frontend/driver-app" ]; then
    cd "$SCRIPT_DIR/frontend/driver-app" || exit 1
    if [ -d "node_modules" ]; then
        npm run dev > "$SCRIPT_DIR/driver-app.log" 2>&1 &
        echo -e "${GREEN}✅ Driver App gestartet (Port 3004)${NC}"
    else
        echo -e "${YELLOW}⚠️  Driver App: node_modules fehlen${NC}"
    fi
    cd "$SCRIPT_DIR" || exit 1
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Services werden gestartet!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📊 Services:${NC}"
echo "  🌐 Backend API:         http://localhost:3000"
echo "  📚 API Dokumentation:   http://localhost:3000/api/docs"
echo "  🏥 Health Check:        http://localhost:3000/api/health"
echo "  🛒 Customer Web:        http://localhost:3001"
echo "  🛠️  Admin Panel:         http://localhost:3002"
echo "  🍽️  Restaurant Web:     http://localhost:3003"
echo "  🚗 Driver App:          http://localhost:3004"
echo ""
echo -e "${BLUE}🔐 Admin Login:${NC}"
echo "  Email:    admin@UberFoods.com"
echo "  Passwort: admin123"
echo ""
echo -e "${YELLOW}🛑 Zum Stoppen: Ctrl+C oder './stop-dev.sh'${NC}"
echo ""

# PIDs speichern
PIDS_TO_KILL="$BACKEND_PID"
echo "$PIDS_TO_KILL" > "$SCRIPT_DIR/.dev-pids"

# Warte auf Ctrl+C
trap "echo ''; echo '🛑 Stoppe Services...'; kill $PIDS_TO_KILL 2>/dev/null; cd '$SCRIPT_DIR' && docker-compose down 2>/dev/null; rm -f '$SCRIPT_DIR/.dev-pids'; echo '✅ Gestoppt.'; exit" INT

wait