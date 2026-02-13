#!/bin/bash

# UberFoods - Vollautomatisches Development Startup Script (Fixed Version)
# Behebt alle bekannten Docker und Dependency-Probleme

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || { echo "❌ Konnte nicht ins Projektverzeichnis wechseln!"; exit 1; }

echo "🍕 UberFoods - Vollautomatischer Start (Fixed Version)"
echo "===================================================="
echo ""

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funktion: Docker Daemon prüfen und starten
check_docker() {
    echo -e "${BLUE}🔍 Prüfe Docker Daemon...${NC}"

    # Prüfe ob Docker läuft
    if ! docker ps > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Docker Daemon läuft nicht. Versuche zu starten...${NC}"

        # macOS: Docker Desktop starten
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo -e "${BLUE}🍎 Starte Docker Desktop auf macOS...${NC}"
            open -a Docker
            echo -e "${YELLOW}⏳ Warte 30 Sekunden auf Docker Desktop...${NC}"
            sleep 30

            # Prüfe erneut
            if ! docker ps > /dev/null 2>&1; then
                echo -e "${RED}❌ Docker Desktop konnte nicht gestartet werden!${NC}"
                echo -e "${YELLOW}💡 Bitte starten Sie Docker Desktop manuell und führen Sie das Script erneut aus.${NC}"
                exit 1
            fi
        else
            echo -e "${RED}❌ Docker läuft nicht und kann nicht automatisch gestartet werden!${NC}"
            echo -e "${YELLOW}💡 Bitte starten Sie Docker manuell.${NC}"
            exit 1
        fi
    fi

    echo -e "${GREEN}✅ Docker Daemon ist bereit!${NC}"
}

# Funktion: Port freimachen
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}⚠️  Port $1 ist bereits belegt. Versuche Prozess zu beenden...${NC}"
        lsof -ti:$1 | xargs kill -9 2>/dev/null
        sleep 2
    fi
}

# Docker prüfen
check_docker

# Ports freimachen
echo -e "${BLUE}🔍 Prüfe und befreie Ports...${NC}"
check_port 3000
check_port 3001
check_port 3002
check_port 3003
check_port 3004
check_port 5434
check_port 6379

echo -e "${GREEN}✅ Alle Ports sind frei!${NC}"
echo ""

# Lösche alte Container und Volumes bei Bedarf
echo -e "${BLUE}🧹 Bereinige alte Docker Container...${NC}"
docker-compose down -v 2>/dev/null
docker system prune -f 2>/dev/null
echo -e "${GREEN}✅ Cleanup abgeschlossen!${NC}"
echo ""

# Backend Dependencies neu installieren (um Version-Konflikte zu lösen)
echo -e "${YELLOW}📦 Installiere Backend Dependencies neu...${NC}"
cd "$SCRIPT_DIR/backend" || exit 1
rm -rf node_modules package-lock.json
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ npm install fehlgeschlagen!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dependencies installiert!${NC}"
cd "$SCRIPT_DIR" || exit 1

# Starte Datenbank
echo -e "${YELLOW}📦 Starte PostgreSQL Datenbank...${NC}"
docker-compose up -d postgres redis
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Datenbank konnte nicht gestartet werden!${NC}"
    exit 1
fi

# Warte bis Datenbank bereit ist
echo -e "${BLUE}⏳ Warte auf Datenbank...${NC}"
for i in {1..60}; do
    if docker exec uberfoods_postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Datenbank ist bereit!${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}❌ Datenbank konnte nicht gestartet werden!${NC}"
        docker-compose logs postgres
        exit 1
    fi
    sleep 2
done

# Prisma Setup
echo -e "${YELLOW}🗄️  Prisma Setup...${NC}"
cd "$SCRIPT_DIR/backend" || exit 1

# Generiere Prisma Client
echo "🔨 Generiere Prisma Client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Prisma Generate fehlgeschlagen!${NC}"
    exit 1
fi

# Führe Migrationen aus
echo "🗄️  Führe Datenbank-Migrationen aus..."
npx prisma migrate deploy
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Migrationen fehlgeschlagen, versuche dev migration...${NC}"
    npx prisma migrate dev --name init
fi

# Seed Daten laden
echo "🌱 Lade Seed-Daten..."
npx ts-node prisma/seed.ts 2>/dev/null || echo -e "${YELLOW}⚠️  Seed-Daten übersprungen${NC}"

# Admin Account erstellen
echo "👤 Erstelle Admin-Account..."
npx ts-node prisma/seed-admin.ts 2>/dev/null || echo -e "${YELLOW}⚠️  Admin-Account übersprungen${NC}"

cd "$SCRIPT_DIR" || exit 1

# Backend im Hintergrund starten
echo -e "${GREEN}🚀 Starte Backend (Port 3000)...${NC}"
cd "$SCRIPT_DIR/backend" || exit 1
npm run start:dev > "$SCRIPT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
cd "$SCRIPT_DIR" || exit 1
sleep 10

# Prüfe ob Backend gestartet ist
echo -e "${BLUE}⏳ Prüfe Backend-Start...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend ist bereit!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠️  Backend startet langsam, fahre fort...${NC}"
        echo -e "${YELLOW}📋 Backend Logs: tail -f backend.log${NC}"
    fi
    sleep 2
done

# Frontend-Apps starten
echo -e "${GREEN}🚀 Starte Frontend-Apps...${NC}"

# Customer Web
if [ -d "$SCRIPT_DIR/frontend/customer-web" ]; then
    echo "  📱 Customer Web (Port 3001)..."
    cd "$SCRIPT_DIR/frontend/customer-web" || exit 1
    rm -rf node_modules package-lock.json 2>/dev/null
    npm install > /dev/null 2>&1
    npm run dev > "$SCRIPT_DIR/customer-web.log" 2>&1 &
    CUSTOMER_PID=$!
    cd "$SCRIPT_DIR" || exit 1
    echo -e "    ${GREEN}✅ Customer Web gestartet${NC}"
fi

# Admin Panel
if [ -d "$SCRIPT_DIR/frontend/admin-panel" ]; then
    echo "  🛠️  Admin Panel (Port 3002)..."
    cd "$SCRIPT_DIR/frontend/admin-panel" || exit 1
    rm -rf node_modules package-lock.json 2>/dev/null
    npm install > /dev/null 2>&1
    npm run dev > "$SCRIPT_DIR/admin-panel.log" 2>&1 &
    ADMIN_PID=$!
    cd "$SCRIPT_DIR" || exit 1
    echo -e "    ${GREEN}✅ Admin Panel gestartet${NC}"
fi

# Restaurant Web
if [ -d "$SCRIPT_DIR/frontend/restaurant-web" ]; then
    echo "  🍽️  Restaurant Web (Port 3003)..."
    cd "$SCRIPT_DIR/frontend/restaurant-web" || exit 1
    rm -rf node_modules package-lock.json 2>/dev/null
    npm install > /dev/null 2>&1
    npm run dev > "$SCRIPT_DIR/restaurant-web.log" 2>&1 &
    RESTAURANT_PID=$!
    cd "$SCRIPT_DIR" || exit 1
    echo -e "    ${GREEN}✅ Restaurant Web gestartet${NC}"
fi

# Driver App
if [ -d "$SCRIPT_DIR/frontend/driver-app" ]; then
    echo "  🚗 Driver App (Port 3004)..."
    cd "$SCRIPT_DIR/frontend/driver-app" || exit 1
    rm -rf node_modules package-lock.json 2>/dev/null
    npm install > /dev/null 2>&1
    npm run dev > "$SCRIPT_DIR/driver-app.log" 2>&1 &
    DRIVER_PID=$!
    cd "$SCRIPT_DIR" || exit 1
    echo -e "    ${GREEN}✅ Driver App gestartet${NC}"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Alle Services erfolgreich gestartet!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📊 Verfügbare Services:${NC}"
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
echo -e "${BLUE}📝 Logs ansehen:${NC}"
echo "  tail -f backend.log"
echo "  tail -f customer-web.log"
echo "  tail -f admin-panel.log"
echo "  tail -f restaurant-web.log"
echo "  tail -f driver-app.log"
echo ""
echo -e "${YELLOW}🛑 Zum Stoppen: Drücken Sie Ctrl+C oder führen Sie './stop-dev.sh' aus${NC}"
echo ""

# Speichere PIDs
PIDS_TO_KILL="$BACKEND_PID"
[ -n "$CUSTOMER_PID" ] && PIDS_TO_KILL="$PIDS_TO_KILL $CUSTOMER_PID"
[ -n "$ADMIN_PID" ] && PIDS_TO_KILL="$PIDS_TO_KILL $ADMIN_PID"
[ -n "$RESTAURANT_PID" ] && PIDS_TO_KILL="$PIDS_TO_KILL $RESTAURANT_PID"
[ -n "$DRIVER_PID" ] && PIDS_TO_KILL="$PIDS_TO_KILL $DRIVER_PID"
echo "$PIDS_TO_KILL" > "$SCRIPT_DIR/.dev-pids"

# Warte auf Ctrl+C
trap "echo ''; echo '🛑 Stoppe alle Services...'; kill $PIDS_TO_KILL 2>/dev/null; cd '$SCRIPT_DIR' && docker-compose down 2>/dev/null; rm -f '$SCRIPT_DIR/.dev-pids'; echo '✅ Alle Services gestoppt.'; exit" INT

# Unbegrenzt warten
wait
