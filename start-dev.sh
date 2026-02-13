#!/bin/bash

# UberFoods - Vollautomatisches Development Startup Script
# Startet alle Services automatisch mit vollständiger Konfiguration

# Stelle sicher, dass wir im Projektverzeichnis sind
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || { echo "❌ Konnte nicht ins Projektverzeichnis wechseln!"; exit 1; }

echo "🍕 UberFoods - Vollautomatischer Start"
echo "======================================"
echo ""

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funktion: Prüfe ob Port belegt ist
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}⚠️  Port $1 ist bereits belegt. Versuche Prozess zu beenden...${NC}"
        lsof -ti:$1 | xargs kill -9 2>/dev/null
        sleep 2
    fi
}

# Prüfe ob Docker läuft
if ! docker ps > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker läuft nicht! Bitte starten Sie Docker Desktop.${NC}"
    exit 1
fi

# Prüfe und befreie Ports
echo -e "${BLUE}🔍 Prüfe Ports...${NC}"
check_port 3000
check_port 3001
check_port 3002
check_port 3003
check_port 3004
check_port 5434

# Starte Datenbank
echo -e "${YELLOW}📦 Starte PostgreSQL Datenbank...${NC}"
cd "$SCRIPT_DIR" || exit 1
docker-compose up -d
sleep 5

# Warte bis Datenbank bereit ist
echo -e "${BLUE}⏳ Warte auf Datenbank...${NC}"
for i in {1..30}; do
    if docker exec uberfoods_postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Datenbank ist bereit!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Datenbank konnte nicht gestartet werden!${NC}"
        exit 1
    fi
    sleep 1
done

# Erstelle vollständige Backend .env Datei
echo -e "${YELLOW}⚙️  Konfiguriere Backend...${NC}"
if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
    echo -e "${YELLOW}📝 Erstelle backend/.env Datei...${NC}"
    cat > "$SCRIPT_DIR/backend/.env" << 'EOF'
DATABASE_URL="postgresql://postgres:postgres123@localhost:5434/uberfoods?schema=public"
PORT=3000
JWT_SECRET=dev-secret-key-min-32-characters-long-for-development-only-change-in-production
NODE_ENV=development
UPLOAD_DIR="./uploads"
ALLOWED_ORIGINS="http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004"
ENABLE_SWAGGER=true
LOG_LEVEL=debug
ALLOW_DEV_AUTH=true
EOF
    echo -e "${GREEN}✅ .env Datei erstellt${NC}"
else
    echo -e "${GREEN}✅ .env Datei existiert bereits${NC}"
    # Prüfe ob JWT_SECRET vorhanden ist, falls nicht hinzufügen
    if ! grep -q "JWT_SECRET" "$SCRIPT_DIR/backend/.env"; then
        echo -e "${YELLOW}⚠️  JWT_SECRET fehlt in .env, füge es hinzu...${NC}"
        echo "" >> "$SCRIPT_DIR/backend/.env"
        echo "JWT_SECRET=dev-secret-key-min-32-characters-long-for-development-only-change-in-production" >> "$SCRIPT_DIR/backend/.env"
    fi
    # Prüfe ob DATABASE_URL korrekt ist (Port 5434)
    if grep -q "localhost:5432" "$SCRIPT_DIR/backend/.env"; then
        echo -e "${YELLOW}⚠️  Korrigiere DATABASE_URL Port auf 5434...${NC}"
        sed -i '' 's/localhost:5432/localhost:5434/g' "$SCRIPT_DIR/backend/.env"
    fi
    # Prüfe ob ALLOW_DEV_AUTH vorhanden ist, falls nicht hinzufügen
    if ! grep -q "ALLOW_DEV_AUTH" "$SCRIPT_DIR/backend/.env"; then
        echo -e "${YELLOW}⚠️  ALLOW_DEV_AUTH fehlt in .env, füge es hinzu...${NC}"
        echo "" >> "$SCRIPT_DIR/backend/.env"
        echo "ALLOW_DEV_AUTH=true" >> "$SCRIPT_DIR/backend/.env"
    fi
fi

# Backend Setup
echo -e "${YELLOW}🔧 Backend Setup...${NC}"
cd "$SCRIPT_DIR/backend" || { echo -e "${RED}❌ Backend-Verzeichnis nicht gefunden!${NC}"; exit 1; }

if [ ! -d "node_modules" ]; then
    echo "📦 Installiere Backend Dependencies..."
    npm install
fi

echo "🔨 Generiere Prisma Client..."
export DATABASE_URL="postgresql://postgres:postgres123@localhost:5434/uberfoods?schema=public"
if npm run prisma:generate; then
    echo -e "${GREEN}✅ Prisma Client generiert${NC}"
else
    echo -e "${YELLOW}⚠️  Prisma Generate fehlgeschlagen, versuche direkt...${NC}"
    npx prisma generate || echo -e "${YELLOW}⚠️  Prisma Generate übersprungen${NC}"
fi

echo "🗄️  Führe Datenbank-Migrationen aus..."
export DATABASE_URL="postgresql://postgres:postgres123@localhost:5434/uberfoods?schema=public"
if npm run prisma:migrate deploy 2>/dev/null; then
    echo -e "${GREEN}✅ Migrationen ausgeführt${NC}"
elif npm run prisma:migrate 2>/dev/null; then
    echo -e "${GREEN}✅ Migrationen ausgeführt${NC}"
else
    echo -e "${YELLOW}⚠️  Migrationen übersprungen${NC}"
fi

echo "🌱 Lade Seed-Daten..."
export DATABASE_URL="postgresql://postgres:postgres123@localhost:5434/uberfoods?schema=public"
export SEED_CUSTOMER_PASSWORD=test123
if npm run prisma:seed 2>/dev/null; then
    echo -e "${GREEN}✅ Seed-Daten geladen${NC}"
else
    echo -e "${YELLOW}⚠️  Seed-Daten übersprungen${NC}"
fi

echo "👤 Erstelle Admin-Account..."
export DATABASE_URL="postgresql://postgres:postgres123@localhost:5434/uberfoods?schema=public"
export ADMIN_PASSWORD=admin123
if npm run prisma:seed-admin 2>/dev/null; then
    echo -e "${GREEN}✅ Admin-Account erstellt${NC}"
else
    # Fallback: Direkt ausführen
    if [ -f "prisma/seed-admin.ts" ]; then
        npx ts-node prisma/seed-admin.ts 2>/dev/null && echo -e "${GREEN}✅ Admin-Account erstellt${NC}" || echo -e "${YELLOW}⚠️  Admin-Account Erstellung übersprungen${NC}"
    fi
fi

cd "$SCRIPT_DIR" || exit 1

# Starte Backend im Hintergrund
echo -e "${GREEN}🚀 Starte Backend (Port 3000)...${NC}"
cd "$SCRIPT_DIR/backend" || exit 1
export DATABASE_URL="postgresql://postgres:postgres123@localhost:5434/uberfoods?schema=public"
npm run start:dev > "$SCRIPT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
cd "$SCRIPT_DIR" || exit 1
sleep 5

# Warte bis Backend bereit ist
echo -e "${BLUE}⏳ Warte auf Backend...${NC}"
for i in {1..60}; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend ist bereit!${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${YELLOW}⚠️  Backend startet langsam, fahre fort...${NC}"
    fi
    sleep 1
done

# Starte Frontend-Apps
echo -e "${GREEN}🚀 Starte Frontend-Apps...${NC}"

# Customer Web
echo "  📱 Customer Web (Port 3001)..."
if [ -d "$SCRIPT_DIR/frontend/customer-web" ]; then
    cd "$SCRIPT_DIR/frontend/customer-web" || exit 1
    if [ ! -d "node_modules" ]; then
        echo "    📦 Installiere Dependencies..."
        npm install > /dev/null 2>&1
    fi
    npm run dev > "$SCRIPT_DIR/customer-web.log" 2>&1 &
    CUSTOMER_PID=$!
    cd "$SCRIPT_DIR" || exit 1
    echo -e "    ${GREEN}✅ Customer Web gestartet${NC}"
else
    echo -e "    ${RED}❌ Customer Web Verzeichnis nicht gefunden!${NC}"
    CUSTOMER_PID=""
fi
sleep 2

# Admin Panel
echo "  🛠️  Admin Panel (Port 3002)..."
if [ -d "$SCRIPT_DIR/frontend/admin-panel" ]; then
    cd "$SCRIPT_DIR/frontend/admin-panel" || exit 1
    if [ ! -d "node_modules" ]; then
        echo "    📦 Installiere Dependencies..."
        npm install > /dev/null 2>&1
    fi
    npm run dev > "$SCRIPT_DIR/admin-panel.log" 2>&1 &
    ADMIN_PID=$!
    cd "$SCRIPT_DIR" || exit 1
    echo -e "    ${GREEN}✅ Admin Panel gestartet${NC}"
else
    echo -e "    ${RED}❌ Admin Panel Verzeichnis nicht gefunden!${NC}"
    ADMIN_PID=""
fi
sleep 2

# Restaurant Web
echo "  🍽️  Restaurant Web (Port 3003)..."
if [ -d "$SCRIPT_DIR/frontend/restaurant-web" ]; then
    cd "$SCRIPT_DIR/frontend/restaurant-web" || exit 1
    if [ ! -d "node_modules" ]; then
        echo "    📦 Installiere Dependencies..."
        npm install > /dev/null 2>&1
    fi
    npm run dev > "$SCRIPT_DIR/restaurant-web.log" 2>&1 &
    RESTAURANT_PID=$!
    cd "$SCRIPT_DIR" || exit 1
    echo -e "    ${GREEN}✅ Restaurant Web gestartet${NC}"
else
    echo -e "    ${RED}❌ Restaurant Web Verzeichnis nicht gefunden!${NC}"
    RESTAURANT_PID=""
fi
sleep 2

# Driver App
echo "  🚗 Driver App (Port 3004)..."
if [ -d "$SCRIPT_DIR/frontend/driver-app" ]; then
    cd "$SCRIPT_DIR/frontend/driver-app" || exit 1
    if [ ! -d "node_modules" ]; then
        echo "    📦 Installiere Dependencies..."
        npm install > /dev/null 2>&1
    fi
    npm run dev > "$SCRIPT_DIR/driver-app.log" 2>&1 &
    DRIVER_PID=$!
    cd "$SCRIPT_DIR" || exit 1
    echo -e "    ${GREEN}✅ Driver App gestartet${NC}"
else
    echo -e "    ${RED}❌ Driver App Verzeichnis nicht gefunden!${NC}"
    DRIVER_PID=""
fi
sleep 2

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

# Speichere PIDs in Datei für stop-dev.sh
PIDS_TO_KILL="$BACKEND_PID"
[ -n "$CUSTOMER_PID" ] && PIDS_TO_KILL="$PIDS_TO_KILL $CUSTOMER_PID"
[ -n "$ADMIN_PID" ] && PIDS_TO_KILL="$PIDS_TO_KILL $ADMIN_PID"
[ -n "$RESTAURANT_PID" ] && PIDS_TO_KILL="$PIDS_TO_KILL $RESTAURANT_PID"
[ -n "$DRIVER_PID" ] && PIDS_TO_KILL="$PIDS_TO_KILL $DRIVER_PID"
echo "$PIDS_TO_KILL" > "$SCRIPT_DIR/.dev-pids"

# Warte auf Ctrl+C
trap "echo ''; echo '🛑 Stoppe alle Services...'; kill $PIDS_TO_KILL 2>/dev/null; cd '$SCRIPT_DIR' && docker-compose down 2>/dev/null; rm -f '$SCRIPT_DIR/.dev-pids'; echo '✅ Alle Services gestoppt.'; exit" INT

# Warte unbegrenzt
wait
