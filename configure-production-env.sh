#!/bin/bash

# ============================================
# UBERFOODS PRODUCTION ENVIRONMENT SETUP
# ============================================

set -e

echo "🔧 UberFoods Production Environment Configuration"
echo "================================================"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

print_header() {
    echo -e "${PURPLE}$1${NC}"
    echo "----------------------------------------"
}

# ============================================
# BACKEND ENVIRONMENT SETUP
# ============================================

print_header "BACKEND ENVIRONMENT KONFIGURATION"

BACKEND_ENV="backend/.env.production"

if [ ! -f "$BACKEND_ENV" ]; then
    print_error "Backend .env.production nicht gefunden! Führe zuerst ./setup-production.sh aus."
    exit 1
fi

print_status "Konfiguriere Backend Environment-Variablen..."

# Datenbank
if ! grep -q "^DATABASE_URL=" "$BACKEND_ENV" || grep -q "your_database_url\|localhost" "$BACKEND_ENV"; then
    read -p "PostgreSQL DATABASE_URL (postgres://user:password@host:5432/db): " DB_URL
    if [ -n "$DB_URL" ]; then
        sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=$DB_URL|" "$BACKEND_ENV"
        print_success "DATABASE_URL konfiguriert"
    else
        print_warning "DATABASE_URL nicht geändert - bitte manuell setzen"
    fi
fi

# JWT Secret
if ! grep -q "^JWT_SECRET=" "$BACKEND_ENV" || grep -q "your.*secret\|change.*production" "$BACKEND_ENV"; then
    JWT_SECRET=$(openssl rand -base64 32)
    sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$BACKEND_ENV"
    print_success "JWT_SECRET generiert: ${JWT_SECRET:0:16}..."
fi

# Google Maps API Key
if ! grep -q "^GOOGLE_MAPS_API_KEY=" "$BACKEND_ENV" || grep -q "your.*key\|TODO\|CHANGE" "$BACKEND_ENV"; then
    echo ""
    print_header "GOOGLE MAPS API KEY ERFORDERLICH"
    echo "🔗 Gehe zu: https://console.cloud.google.com"
    echo "📋 Erstelle Projekt > APIs & Services > Credentials"
    echo "🔑 Aktiviere: Maps JavaScript API, Directions API, Geocoding API, Places API"
    echo "⚠️  Setze API Restrictions (HTTP referrers) für deine Domain"
    echo ""
    read -p "Google Maps API Key: " GOOGLE_KEY
    if [ -n "$GOOGLE_KEY" ]; then
        sed -i.bak "s|^GOOGLE_MAPS_API_KEY=.*|GOOGLE_MAPS_API_KEY=$GOOGLE_KEY|" "$BACKEND_ENV"
        print_success "GOOGLE_MAPS_API_KEY konfiguriert"
    fi
fi

# Stripe Keys
if ! grep -q "^STRIPE_SECRET_KEY=" "$BACKEND_ENV" || grep -q "your.*key\|test\|TODO" "$BACKEND_ENV"; then
    echo ""
    print_header "STRIPE PAYMENT KEYS ERFORDERLICH"
    echo "🔗 Gehe zu: https://dashboard.stripe.com"
    echo "📋 Erstelle Account > Developers > API keys"
    echo "🔑 Verwende LIVE KEYS für Production (nicht Test Keys!)"
    echo ""
    read -p "Stripe Secret Key (STRIPE_SECRET_KEY_PLACEHOLDER_...): " STRIPE_SECRET
    if [ -n "$STRIPE_SECRET" ]; then
        sed -i.bak "s|^STRIPE_SECRET_KEY=.*|STRIPE_SECRET_KEY=$STRIPE_SECRET|" "$BACKEND_ENV"
        print_success "STRIPE_SECRET_KEY konfiguriert"
    fi
fi

# Stripe Webhook Secret
if ! grep -q "^STRIPE_WEBHOOK_SECRET=" "$BACKEND_ENV" || grep -q "your.*secret\|TODO" "$BACKEND_ENV"; then
    echo ""
    print_header "STRIPE WEBHOOK SECRET ERFORDERLICH"
    echo "🔗 Gehe zu: https://dashboard.stripe.com > Developers > Webhooks"
    echo "📋 Erstelle Webhook für: https://api.uberfoods.com/api/payments/webhook"
    echo "🔑 Kopiere den Signing Secret"
    echo ""
    read -p "Stripe Webhook Secret (STRIPE_WEBHOOK_SECRET_PLACEHOLDER_...): " WEBHOOK_SECRET
    if [ -n "$WEBHOOK_SECRET" ]; then
        sed -i.bak "s|^STRIPE_WEBHOOK_SECRET=.*|STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET|" "$BACKEND_ENV"
        print_success "STRIPE_WEBHOOK_SECRET konfiguriert"
    fi
fi

# SendGrid Email
if ! grep -q "^SENDGRID_API_KEY=" "$BACKEND_ENV" || grep -q "your.*key\|TODO" "$BACKEND_ENV"; then
    echo ""
    print_header "SENDGRID EMAIL SERVICE (OPTIONAL)"
    echo "🔗 Gehe zu: https://sendgrid.com"
    echo "📋 Erstelle Account > Settings > API Keys"
    echo "📧 Verifiziere deine Domain für besseren Deliverability"
    echo ""
    read -p "SendGrid API Key (SG....) oder Enter zum Überspringen: " SENDGRID_KEY
    if [ -n "$SENDGRID_KEY" ]; then
        sed -i.bak "s|^SENDGRID_API_KEY=.*|SENDGRID_API_KEY=$SENDGRID_KEY|" "$BACKEND_ENV"
        print_success "SENDGRID_API_KEY konfiguriert"
    fi
fi

# VAPID Keys für Push Notifications
if ! grep -q "^VAPID_PRIVATE_KEY=" "$BACKEND_ENV" || grep -q "your.*key\|TODO" "$BACKEND_ENV"; then
    echo ""
    print_header "VAPID KEYS FÜR PUSH NOTIFICATIONS"
    echo "🔧 Generiere VAPID Keys automatisch..."
    if command -v web-push &> /dev/null; then
        VAPID_KEYS=$(web-push generate-vapid-keys --json 2>/dev/null)
        if [ $? -eq 0 ]; then
            PUBLIC_KEY=$(echo "$VAPID_KEYS" | grep -o '"publicKey":"[^"]*"' | cut -d'"' -f4)
            PRIVATE_KEY=$(echo "$VAPID_KEYS" | grep -o '"privateKey":"[^"]*"' | cut -d'"' -f4)

            sed -i.bak "s|^VAPID_PUBLIC_KEY=.*|VAPID_PUBLIC_KEY=$PUBLIC_KEY|" "$BACKEND_ENV"
            sed -i.bak "s|^VAPID_PRIVATE_KEY=.*|VAPID_PRIVATE_KEY=$PRIVATE_KEY|" "$BACKEND_ENV"
            sed -i.bak "s|^VAPID_EMAIL=.*|VAPID_EMAIL=mailto:admin@uberfoods.com|" "$BACKEND_ENV"
            print_success "VAPID Keys generiert"
        else
            print_warning "web-push CLI nicht installiert. Installiere mit: npm install -g web-push"
        fi
    else
        print_warning "web-push CLI nicht installiert. VAPID Keys müssen manuell generiert werden."
    fi
fi

print_success "Backend Environment konfiguriert"

# ============================================
# FRONTEND ENVIRONMENT SETUP
# ============================================

print_header "FRONTEND ENVIRONMENT KONFIGURATION"

FRONTEND_APPS=("admin-panel" "customer-web" "driver-app" "restaurant-web")

for app in "${FRONTEND_APPS[@]}"; do
    ENV_FILE="frontend/$app/.env.production"

    if [ -f "$ENV_FILE" ]; then
        print_status "Konfiguriere $app..."

        # API URL
        sed -i.bak "s|VITE_API_URL=.*|VITE_API_URL=https://api.uberfoods.com/api|" "$ENV_FILE"

        # WebSocket URL
        sed -i.bak "s|VITE_WS_URL=.*|VITE_WS_URL=wss://api.uberfoods.com|" "$ENV_FILE"

        # Google Maps (gleicher Key wie Backend)
        if [ -n "$GOOGLE_KEY" ]; then
            sed -i.bak "s|VITE_GOOGLE_MAPS_API_KEY=.*|VITE_GOOGLE_MAPS_API_KEY=$GOOGLE_KEY|" "$ENV_FILE"
        fi

        # Stripe Public Key
        if [ -n "$STRIPE_SECRET" ]; then
            STRIPE_PUBLIC=$(echo "$STRIPE_SECRET" | sed 's/sk_/pk_/; s/live/test/')  # Placeholder - muss manuell gesetzt werden
            echo ""
            print_warning "$app: Setze die korrekte Stripe PUBLIC KEY manuell!"
            print_warning "Gehe zu: https://dashboard.stripe.com > Developers > API keys"
            print_warning "Suche nach 'Publishable key' (STRIPE_PUBLISHABLE_KEY_PLACEHOLDER_... oder STRIPE_PUBLISHABLE_KEY_PLACEHOLDER_...)"
        fi

        print_success "$app konfiguriert"
    else
        print_warning "$app .env.production nicht gefunden"
    fi
done

# ============================================
# OPTIONAL SERVICES
# ============================================

print_header "OPTIONALE SERVICES (KANN SPÄTER KONFIGURIERT WERDEN)"

OPTIONAL_SERVICES=(
    "SENTRY_DSN:Error Monitoring (https://sentry.io)"
    "TOMTOM_API_KEY:Traffic Data (https://developer.tomtom.com)"
    "AWS_S3_BUCKET:File Storage (AWS S3)"
    "LOGROCKET_APP_ID:Session Recording (https://logrocket.com)"
)

for service in "${OPTIONAL_SERVICES[@]}"; do
    KEY=$(echo "$service" | cut -d: -f1)
    DESCRIPTION=$(echo "$service" | cut -d: -f2-)

    if ! grep -q "^$KEY=" "$BACKEND_ENV" || grep -q "your.*\|TODO\|CHANGE" "$BACKEND_ENV"; then
        echo ""
        print_warning "$DESCRIPTION noch nicht konfiguriert"
        print_warning "Kann später hinzugefügt werden"
    fi
done

# ============================================
# FINAL CHECKS
# ============================================

print_header "KONFIGURATION ÜBERPRÜFEN"

REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET" "GOOGLE_MAPS_API_KEY" "STRIPE_SECRET_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^$var=" "$BACKEND_ENV" || grep -q "your.*\|TODO\|CHANGE\|localhost" "$BACKEND_ENV"; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    print_success "Alle kritischen Environment-Variablen sind konfiguriert! ✅"
else
    print_error "FEHLENDE KRITISCHE VARIABLEN:"
    for var in "${MISSING_VARS[@]}"; do
        echo -e "  ❌ $var"
    done
    echo ""
    print_error "Diese müssen konfiguriert werden, bevor Production gestartet werden kann!"
    exit 1
fi

# ============================================
# BACKUP ERSTELLEN
# ============================================

print_status "Erstelle Backup der konfigurierten Dateien..."

BACKUP_DIR="env_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

cp "$BACKEND_ENV" "$BACKUP_DIR/"
for app in "${FRONTEND_APPS[@]}"; do
    if [ -f "frontend/$app/.env.production" ]; then
        cp "frontend/$app/.env.production" "$BACKUP_DIR/${app}.env.production"
    fi
done

print_success "Backup erstellt in: $BACKUP_DIR"

# ============================================
# FINAL SUMMARY
# ============================================

echo ""
print_header "🎉 KONFIGURATION ABGESCHLOSSEN!"
echo ""
echo "📋 Konfigurierte Services:"
echo "   ✅ Datenbank"
echo "   ✅ JWT Authentication"
echo "   ✅ Google Maps API"
echo "   ✅ Stripe Payments"
if [ -n "$SENDGRID_KEY" ]; then echo "   ✅ SendGrid Email"; fi
if [ -n "$WEBHOOK_SECRET" ]; then echo "   ✅ Stripe Webhooks"; fi
echo ""
echo "🚀 Bereit für Deployment:"
echo "   ./deploy-production.sh"
echo ""
echo "📁 Backup gespeichert in: $BACKUP_DIR"
echo ""
print_warning "WICHTIG: Überprüfe alle API-Keys auf Korrektheit!"
print_warning "WICHTIG: Setze Stripe Publishable Keys in Frontend-Apps manuell!"
