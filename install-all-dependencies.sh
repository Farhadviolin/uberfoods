#!/bin/bash

# Install All Dependencies Script
# Installiert alle Abhängigkeiten für alle Projekte

set -e  # Exit on error

echo "🚀 Starte Installation aller Abhängigkeiten..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to install dependencies
install_deps() {
    local dir=$1
    local name=$2
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}📦 Installiere Abhängigkeiten für: ${name}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    cd "$dir"
    
    if [ -f "package.json" ]; then
        if [ -d "node_modules" ]; then
            echo -e "${GREEN}✓ node_modules existiert bereits${NC}"
            echo "  Prüfe auf fehlende/aktualisierte Abhängigkeiten..."
            # Try normal install first, fallback to legacy-peer-deps if needed
            npm install || npm install --legacy-peer-deps
        else
            echo "  node_modules fehlt - installiere alle Abhängigkeiten..."
            # Try normal install first, fallback to legacy-peer-deps if needed
            npm install || npm install --legacy-peer-deps
        fi
        
        # Check if installation was successful
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ ${name} Abhängigkeiten erfolgreich installiert${NC}"
        else
            echo -e "${RED}❌ Fehler bei Installation von ${name}${NC}"
            exit 1
        fi
    else
        echo -e "${RED}✗ package.json nicht gefunden in ${dir}${NC}"
        exit 1
    fi
    
    cd - > /dev/null
    echo ""
}

# Root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}📁 Root-Verzeichnis: ${ROOT_DIR}${NC}"
echo ""

# 1. Backend
install_deps "$ROOT_DIR/backend" "Backend"

# 2. Frontend - Admin Panel
install_deps "$ROOT_DIR/frontend/admin-panel" "Admin Panel"

# 3. Frontend - Customer Web
install_deps "$ROOT_DIR/frontend/customer-web" "Customer Web"

# 4. Frontend - Driver App
install_deps "$ROOT_DIR/frontend/driver-app" "Driver App"

# 5. Frontend - Restaurant Web
install_deps "$ROOT_DIR/frontend/restaurant-web" "Restaurant Web"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Alle Abhängigkeiten wurden erfolgreich installiert!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}📊 Zusammenfassung:${NC}"
echo "  ✅ Backend"
echo "  ✅ Admin Panel"
echo "  ✅ Customer Web"
echo "  ✅ Driver App"
echo "  ✅ Restaurant Web"
echo ""
echo -e "${BLUE}🎉 Installation abgeschlossen!${NC}"

