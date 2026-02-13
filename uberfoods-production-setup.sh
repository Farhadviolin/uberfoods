#!/bin/bash

# ============================================
# UBERFOODS COMPLETE PRODUCTION SETUP
# One-Click Production Deployment
# ============================================

set -e

echo "🚀 UberFoods Complete Production Setup"
echo "====================================="
echo ""

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_header() {
    echo -e "${PURPLE}$1${NC}"
    echo "----------------------------------------"
}

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
# PRE-FLIGHT CHECKS
# ============================================

print_header "PRE-FLIGHT CHECKS"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker ist nicht installiert! Installiere Docker Desktop oder Docker Engine."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose ist nicht verfügbar!"
    exit 1
fi

# Check if required files exist
REQUIRED_FILES=(
    "backend/package.json"
    "frontend/admin-panel/package.json"
    "frontend/customer-web/package.json"
    "frontend/driver-app/package.json"
    "frontend/restaurant-web/package.json"
    "docker-compose.production.yml"
    "nginx/admin-panel.conf"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Erforderliche Datei fehlt: $file"
        exit 1
    fi
done

print_success "Alle erforderlichen Dateien vorhanden"

# ============================================
# STEP 1: API KEYS GUIDE
# ============================================

print_header "STEP 1: API KEYS BESCHAFFEN"

echo "Du benötigst API-Keys von verschiedenen Services."
echo "Eine detaillierte Anleitung findest du hier:"
echo ""

./get-api-keys.sh

echo ""
read -p "Hast du alle API-Keys bereit? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Hole zuerst die API-Keys und starte dann dieses Script erneut."
    exit 0
fi

# ============================================
# STEP 2: ENVIRONMENT SETUP
# ============================================

print_header "STEP 2: ENVIRONMENT KONFIGURATION"

print_status "Führe Environment Setup aus..."
./configure-production-env.sh

# ============================================
# STEP 3: BUILD APPLICATIONS
# ============================================

print_header "STEP 3: ANWENDUNGEN BAUEN"

print_status "Führe Production Setup aus..."
./setup-production.sh

# ============================================
# STEP 4: DEPLOYMENT
# ============================================

print_header "STEP 4: PRODUCTION DEPLOYMENT"

print_status "Starte Production Deployment..."
./deploy-production.sh

# ============================================
# POST-DEPLOYMENT CHECKS
# ============================================

print_header "POST-DEPLOYMENT VERIFIKATION"

print_status "Überprüfe Service-Health..."

# Wait a moment for services to start
sleep 10

# Check services
SERVICES=(
    "Backend API:http://localhost:3000/health"
    "Admin Panel:http://localhost:8081"
    "Customer Web:http://localhost:8082"
    "Driver App:http://localhost:8083"
    "Restaurant Web:http://localhost:8084"
)

ALL_HEALTHY=true

for service_info in "${SERVICES[@]}"; do
    SERVICE_NAME=$(echo "$service_info" | cut -d: -f1)
    SERVICE_URL=$(echo "$service_info" | cut -d: -f2)

    if curl -f -s "$SERVICE_URL" > /dev/null 2>&1; then
        print_success "$SERVICE_NAME ist verfügbar"
    else
        print_error "$SERVICE_NAME ist nicht erreichbar: $SERVICE_URL"
        ALL_HEALTHY=false
    fi
done

# Check monitoring services
if docker-compose -f docker-compose.production.yml ps | grep -q prometheus; then
    print_success "Prometheus Monitoring ist aktiv"
fi

if docker-compose -f docker-compose.production.yml ps | grep -q grafana; then
    print_success "Grafana Dashboard ist aktiv"
fi

# ============================================
# FINAL SUMMARY
# ============================================

echo ""
if [ "$ALL_HEALTHY" = true ]; then
    print_header "🎉 PRODUCTION DEPLOYMENT ERFOLGREICH!"
    echo ""
    echo "🌐 LIVE URLS:"
    echo "   🟢 Backend API:     http://localhost:3000"
    echo "   🟢 Admin Panel:     http://localhost:8081"
    echo "   🟢 Customer Web:    http://localhost:8082"
    echo "   🟢 Driver App:      http://localhost:8083"
    echo "   🟢 Restaurant Web:  http://localhost:8084"
    echo "   📊 Prometheus:      http://localhost:9090"
    echo "   📈 Grafana:         http://localhost:3001 (admin/admin)"
    echo ""
    echo "🔧 NÄCHSTE SCHRITTE:"
    echo "   1. 🔒 SSL-Zertifikat einrichten (Let's Encrypt)"
    echo "   2. 🌐 Domain konfigurieren"
    echo "   3. 👤 Admin-User erstellen"
    echo "   4. 📊 Monitoring einrichten"
    echo ""
    print_success "UberFoods ist live in Production! 🚀"
else
    print_error "EINIGE SERVICES SIND NICHT VERFÜGBAR!"
    echo ""
    echo "🔍 Debugging:"
    echo "   docker-compose -f docker-compose.production.yml logs"
    echo "   docker-compose -f docker-compose.production.yml ps"
    echo ""
    print_warning "Überprüfe die Logs und starte bei Bedarf neu."
fi

# ============================================
# USEFUL COMMANDS
# ============================================

echo ""
print_header "NÜTZLICHE BEFEHLE"

echo "📊 Logs anzeigen:"
echo "   docker-compose -f docker-compose.production.yml logs -f [service-name]"
echo ""
echo "🔄 Service neu starten:"
echo "   docker-compose -f docker-compose.production.yml restart [service-name]"
echo ""
echo "📈 Monitoring:"
echo "   docker-compose -f docker-compose.production.yml up -d prometheus grafana"
echo ""
echo "🛑 Alle Services stoppen:"
echo "   docker-compose -f docker-compose.production.yml down"
echo ""
echo "📁 Backup erstellen:"
echo "   docker exec uberfoods-postgres-prod pg_dump -U uberfoods uberfoods_prod > backup_$(date +%Y%m%d).sql"
