#!/bin/bash

# 🚀 UberFoods - Production Setup Script
# Komplettes Production Environment Setup

set -e

echo "🚀 UberFoods - Production Setup"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check prerequisites
echo "🔍 Prerequisites prüfen..."
MISSING=0

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker nicht gefunden${NC}"
    MISSING=1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose nicht gefunden${NC}"
    MISSING=1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js nicht gefunden${NC}"
    MISSING=1
fi

if [ $MISSING -eq 1 ]; then
    echo -e "${RED}❌ Bitte fehlende Tools installieren${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites OK${NC}"
echo ""

# Create necessary directories
echo "📁 Verzeichnisse erstellen..."
mkdir -p backup
mkdir -p logs
mkdir -p uploads
mkdir -p nginx/ssl
mkdir -p nginx/logs
mkdir -p monitoring/grafana/dashboards
mkdir -p monitoring/grafana/datasources
echo -e "${GREEN}✅ Verzeichnisse erstellt${NC}"
echo ""

# Environment files
echo "🌍 Environment Files prüfen..."
if [ ! -f "backend/.env.production" ]; then
    echo -e "${YELLOW}⚠️  backend/.env.production nicht gefunden${NC}"
    echo "Erstelle Template..."
    cat > backend/.env.production << EOF
NODE_ENV=production
DATABASE_URL=postgresql://uberfoods_user:CHANGE_ME@postgres:5432/uberfoods_production
JWT_SECRET=CHANGE_ME_TO_STRONG_SECRET_KEY
REDIS_URL=redis://redis:6379
ALLOWED_ORIGINS=https://yourdomain.com
EOF
    echo -e "${YELLOW}⚠️  Bitte backend/.env.production konfigurieren!${NC}"
fi

if [ ! -f "frontend/customer-web/.env.production" ]; then
    echo -e "${YELLOW}⚠️  frontend/customer-web/.env.production nicht gefunden${NC}"
    echo "Erstelle Template..."
    cat > frontend/customer-web/.env.production << EOF
VITE_API_URL=https://api.yourdomain.com/api
NODE_ENV=production
EOF
    echo -e "${YELLOW}⚠️  Bitte frontend/customer-web/.env.production konfigurieren!${NC}"
fi

echo -e "${GREEN}✅ Environment Files vorhanden${NC}"
echo ""

# SSL Certificates
echo "🔒 SSL Zertifikate prüfen..."
if [ ! -f "nginx/ssl/fullchain.pem" ] || [ ! -f "nginx/ssl/privkey.pem" ]; then
    echo -e "${YELLOW}⚠️  SSL Zertifikate nicht gefunden${NC}"
    echo "Optionen:"
    echo "  1. Let's Encrypt verwenden (empfohlen)"
    echo "  2. Eigene Zertifikate in nginx/ssl/ kopieren"
    echo ""
    read -p "SSL Setup jetzt durchführen? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Für Let's Encrypt:"
        echo "  certbot certonly --standalone -d yourdomain.com"
        echo "  cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/"
        echo "  cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/"
    fi
else
    echo -e "${GREEN}✅ SSL Zertifikate vorhanden${NC}"
fi
echo ""

# Database Setup
echo "🗄️  Database Setup..."
read -p "Database Migration ausführen? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd backend
    if [ -f ".env.production" ]; then
        export $(grep -v '^#' .env.production | xargs)
        npx prisma migrate deploy
        echo -e "${GREEN}✅ Migration erfolgreich${NC}"
    else
        echo -e "${YELLOW}⚠️  .env.production nicht gefunden - Migration übersprungen${NC}"
    fi
    cd ..
fi
echo ""

# Build applications
echo "🔧 Applications bauen..."
read -p "Backend & Frontend bauen? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Backend
    echo "Backend Build..."
    cd backend
    npm ci
    npm run build
    cd ..
    
    # Frontend
    echo "Frontend Build..."
    cd frontend/customer-web
    npm ci
    npm run build
    cd ../..
    
    echo -e "${GREEN}✅ Builds erfolgreich${NC}"
fi
echo ""

# Docker Images
echo "🐳 Docker Images..."
read -p "Docker Images bauen? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose -f docker-compose.prod.yml build
    echo -e "${GREEN}✅ Docker Images gebaut${NC}"
fi
echo ""

# Final Summary
echo "========================================"
echo -e "${GREEN}🎊 Production Setup abgeschlossen!${NC}"
echo ""
echo "📋 Nächste Schritte:"
echo "   1. Environment Variables konfigurieren:"
echo "      - backend/.env.production"
echo "      - frontend/customer-web/.env.production"
echo ""
echo "   2. SSL Zertifikate einrichten:"
echo "      - nginx/ssl/fullchain.pem"
echo "      - nginx/ssl/privkey.pem"
echo ""
echo "   3. Production Services starten:"
echo "      docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "   4. Health Check durchführen:"
echo "      ./scripts/health-check.sh"
echo ""
echo "   5. Monitoring starten:"
echo "      cd monitoring && docker-compose -f docker-compose.monitoring.yml up -d"
echo ""
echo -e "${GREEN}✅ Setup erfolgreich!${NC}"
echo ""
