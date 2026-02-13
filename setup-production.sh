#!/bin/bash

# ============================================
# UBERFOODS PRODUCTION SETUP SCRIPT
# ============================================

set -e

echo "🚀 UberFoods Production Setup"
echo "=============================="

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Hilfsfunktion für farbigen Output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================
# 1. ENVIRONMENT SETUP
# ============================================

print_status "Schritt 1: Environment-Dateien konfigurieren..."

# Backend .env.production erstellen
if [ ! -f "backend/.env.production" ]; then
    cp backend/.env.example backend/.env.production
    print_warning "backend/.env.production wurde erstellt. Bitte bearbeiten!"
else
    print_success "backend/.env.production existiert bereits"
fi

# Frontend .env.production Dateien erstellen
for app in admin-panel customer-web driver-app restaurant-web; do
    if [ ! -f "frontend/$app/.env.production" ]; then
        if [ -f "frontend/$app/.env.example" ]; then
            cp "frontend/$app/.env.example" "frontend/$app/.env.production"
            print_warning "frontend/$app/.env.production wurde erstellt. Bitte bearbeiten!"
        else
            print_warning "frontend/$app/.env.example nicht gefunden"
        fi
    else
        print_success "frontend/$app/.env.production existiert bereits"
    fi
done

# ============================================
# 2. DEPENDENCIES INSTALL
# ============================================

print_status "Schritt 2: Dependencies installieren..."

# Backend dependencies
if [ -d "backend" ]; then
    cd backend
    if [ ! -d "node_modules" ]; then
        print_status "Installiere Backend Dependencies..."
        npm install
        print_success "Backend Dependencies installiert"
    else
        print_success "Backend Dependencies bereits installiert"
    fi
    cd ..
fi

# Frontend dependencies
for app in admin-panel customer-web driver-app restaurant-web; do
    if [ -d "frontend/$app" ]; then
        cd "frontend/$app"
        if [ ! -d "node_modules" ]; then
            print_status "Installiere $app Dependencies..."
            npm install
            print_success "$app Dependencies installiert"
        else
            print_success "$app Dependencies bereits installiert"
        fi
        cd ../..
    fi
done

# ============================================
# 3. BUILD APPLICATIONS
# ============================================

print_status "Schritt 3: Anwendungen bauen..."

# Backend build
if [ -d "backend" ]; then
    cd backend
    print_status "Baue Backend..."
    npm run build
    print_success "Backend gebaut"
    cd ..
fi

# Frontend builds
for app in admin-panel customer-web driver-app restaurant-web; do
    if [ -d "frontend/$app" ]; then
        cd "frontend/$app"
        print_status "Baue $app..."
        npm run build
        print_success "$app gebaut"
        cd ../..
    fi
done

# ============================================
# 4. DATABASE MIGRATION
# ============================================

print_status "Schritt 4: Datenbank-Migration..."

if [ -d "backend" ]; then
    cd backend
    print_status "Führe Prisma Migration aus..."
    npx prisma generate --schema=./prisma/schema.prisma
    print_warning "Datenbank-Migration muss manuell ausgeführt werden:"
    print_warning "npx prisma db push --schema=./prisma/schema.prisma"
    cd ..
fi

# ============================================
# 5. PRODUCTION CHECKS
# ============================================

print_status "Schritt 5: Production-Checks..."

# Check if .env files exist and have required variables
check_env_file() {
    local file=$1
    local app=$2

    if [ -f "$file" ]; then
        # Check for critical variables
        if grep -q "DATABASE_URL=" "$file" 2>/dev/null; then
            print_success "$app: DATABASE_URL konfiguriert"
        else
            print_error "$app: DATABASE_URL fehlt!"
        fi

        if grep -q "JWT_SECRET=" "$file" 2>/dev/null; then
            print_success "$app: JWT_SECRET konfiguriert"
        else
            print_error "$app: JWT_SECRET fehlt!"
        fi

        if grep -q "GOOGLE_MAPS_API_KEY=" "$file" 2>/dev/null; then
            print_success "$app: GOOGLE_MAPS_API_KEY konfiguriert"
        else
            print_error "$app: GOOGLE_MAPS_API_KEY fehlt!"
        fi

        if grep -q "STRIPE_SECRET_KEY=" "$file" 2>/dev/null; then
            print_success "$app: STRIPE_SECRET_KEY konfiguriert"
        else
            print_error "$app: STRIPE_SECRET_KEY fehlt!"
        fi
    else
        print_error "$file nicht gefunden!"
    fi
}

check_env_file "backend/.env.production" "Backend"
check_env_file "frontend/admin-panel/.env.production" "Admin Panel"
check_env_file "frontend/customer-web/.env.production" "Customer Web"
check_env_file "frontend/driver-app/.env.production" "Driver App"
check_env_file "frontend/restaurant-web/.env.production" "Restaurant Web"

# ============================================
# 6. FINAL SUMMARY
# ============================================

echo ""
echo "🎉 SETUP ABGESCHLOSSEN!"
echo "======================="
echo ""
echo "📋 Nächste Schritte:"
echo ""
echo "1. 🔧 Environment-Variablen bearbeiten:"
echo "   - backend/.env.production"
echo "   - frontend/*/env.production"
echo ""
echo "2. 🗄️  Datenbank einrichten:"
echo "   cd backend && npx prisma db push"
echo ""
echo "3. 🚀 Deployment starten:"
echo "   - Backend: cd backend && npm run start:prod"
echo "   - Frontend: nginx oder CDN für dist/ Ordner"
echo ""
echo "4. 🔒 SSL-Zertifikat einrichten"
echo ""
echo "5. 📊 Monitoring einrichten (Sentry, etc.)"
echo ""
echo "⚠️  WICHTIG: Alle API-Keys müssen von Demo/Test auf Production umgestellt werden!"
echo ""
print_success "UberFoods ist bereit für Production! 🚀"
