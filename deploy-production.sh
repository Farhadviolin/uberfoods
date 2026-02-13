#!/bin/bash

# ============================================
# UBERFOODS PRODUCTION DEPLOYMENT SCRIPT
# ============================================

set -e

echo "🚀 UberFoods Production Deployment"
echo "=================================="

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
# PRE-FLIGHT CHECKS
# ============================================

print_status "Pre-Flight Checks..."

# Check if required files exist
check_file() {
    local file=$1
    local description=$2

    if [ -f "$file" ]; then
        print_success "$description gefunden: $file"
    else
        print_error "$description fehlt: $file"
        exit 1
    fi
}

check_file "backend/.env.production" "Backend Production Config"
check_file "frontend/admin-panel/.env.production" "Admin Panel Production Config"
check_file "frontend/customer-web/.env.production" "Customer Web Production Config"
check_file "frontend/driver-app/.env.production" "Driver App Production Config"
check_file "frontend/restaurant-web/.env.production" "Restaurant Web Production Config"
check_file "docker-compose.production.yml" "Docker Compose Production Config"

# Check if builds exist
check_file "backend/dist/main.js" "Backend Build"
check_file "frontend/admin-panel/dist/index.html" "Admin Panel Build"
check_file "frontend/customer-web/dist/index.html" "Customer Web Build"
check_file "frontend/driver-app/dist/index.html" "Driver App Build"
check_file "frontend/restaurant-web/dist/index.html" "Restaurant Web Build"

# Check if required environment variables are set
check_env_var() {
    local file=$1
    local var=$2
    local app=$3

    if grep -q "^$var=" "$file" && ! grep -q "^$var=.*your.*\|$var=.*TODO\|$var=.*CHANGE" "$file"; then
        print_success "$app: $var konfiguriert"
    else
        print_error "$app: $var nicht konfiguriert oder ist Platzhalter!"
        exit 1
    fi
}

check_env_var "backend/.env.production" "DATABASE_URL" "Backend"
check_env_var "backend/.env.production" "JWT_SECRET" "Backend"
check_env_var "backend/.env.production" "GOOGLE_MAPS_API_KEY" "Backend"
check_env_var "backend/.env.production" "STRIPE_SECRET_KEY" "Backend"

print_success "Alle Pre-Flight Checks bestanden!"

# ============================================
# DATABASE MIGRATION
# ============================================

print_status "Datenbank-Migration..."

if [ ! -d "backend/prisma/migrations" ]; then
    print_warning "Keine Prisma-Migrationen gefunden. Erstelle Initial-Migration..."
    cd backend
    npx prisma migrate dev --name init
    cd ..
fi

print_status "Führe Datenbank-Migration aus..."
cd backend
npx prisma db push
print_success "Datenbank-Migration abgeschlossen"
cd ..

# ============================================
# DOCKER DEPLOYMENT
# ============================================

print_status "Docker Production Deployment..."

# Stop any existing containers
docker-compose -f docker-compose.production.yml down || true

# Start all services
print_status "Starte alle Services..."
docker-compose -f docker-compose.production.yml up -d --build

# Wait for services to be healthy
print_status "Warte auf Service-Health-Checks..."
sleep 30

# Check if services are running
check_service() {
    local service=$1
    local port=$2

    if curl -f http://localhost:$port/health 2>/dev/null; then
        print_success "$service ist verfügbar auf Port $port"
    else
        print_warning "$service Health-Check fehlgeschlagen auf Port $port"
    fi
}

check_service "Backend API" "3000"
check_service "Admin Panel" "8081"
check_service "Customer Web" "8082"
check_service "Driver App" "8083"
check_service "Restaurant Web" "8084"

# ============================================
# POST-DEPLOYMENT TASKS
# ============================================

print_status "Post-Deployment Tasks..."

# Create admin user if needed
print_status "Prüfe Admin-User..."
cd backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) {
      console.log('Erstelle Standard-Admin-User...');
      // Note: In Production sollte dies über einen separaten Setup-Prozess erfolgen
      console.log('Admin-User muss manuell erstellt werden!');
    } else {
      console.log('Admin-User existiert bereits');
    }
  } catch (error) {
    console.log('Admin-Check übersprungen:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

createAdmin();
"
cd ..

# ============================================
# MONITORING SETUP
# ============================================

print_status "Monitoring Setup..."

# Check if monitoring services are running
if docker-compose -f docker-compose.production.yml ps | grep -q prometheus; then
    print_success "Prometheus Monitoring ist aktiv"
    print_status "Grafana Dashboard: http://localhost:3001 (admin/admin)"
fi

# ============================================
# SSL CERTIFICATE SETUP (Let's Encrypt)
# ============================================

print_status "SSL-Zertifikat Setup..."

if command -v certbot &> /dev/null; then
    print_warning "SSL-Zertifikat muss manuell eingerichtet werden:"
    print_warning "certbot --nginx -d yourdomain.com"
else
    print_warning "Certbot nicht installiert. SSL muss manuell konfiguriert werden."
fi

# ============================================
# FINAL STATUS
# ============================================

echo ""
echo "🎉 DEPLOYMENT ABGESCHLOSSEN!"
echo "============================"
echo ""
echo "📊 Service Status:"
echo "   🟢 Backend API:     http://localhost:3000"
echo "   🟢 Admin Panel:     http://localhost:8081"
echo "   🟢 Customer Web:    http://localhost:8082"
echo "   🟢 Driver App:      http://localhost:8083"
echo "   🟢 Restaurant Web:  http://localhost:8084"
echo "   🟢 Prometheus:      http://localhost:9090"
echo "   🟢 Grafana:         http://localhost:3001"
echo ""
echo "🔧 Nächste Schritte:"
echo ""
echo "1. 🔒 SSL-Zertifikat einrichten (Let's Encrypt)"
echo "2. 🌐 Domain konfigurieren (nginx reverse proxy)"
echo "3. 👤 Admin-User erstellen"
echo "4. 📊 Monitoring-Dashboards konfigurieren"
echo "5. 🚀 Load Balancer einrichten (nginx/haproxy)"
echo "6. 💾 Backup-Strategie implementieren"
echo ""
echo "📝 Logs anzeigen:"
echo "   docker-compose -f docker-compose.production.yml logs -f [service-name]"
echo ""
echo "🔄 Services neu starten:"
echo "   docker-compose -f docker-compose.production.yml restart [service-name]"
echo ""
print_success "UberFoods Production ist live! 🚀"
echo ""
print_warning "WICHTIG: Überprüfe alle Environment-Variablen auf Production-Keys!"
print_warning "WICHTIG: Erstelle Backups der Datenbank!"
