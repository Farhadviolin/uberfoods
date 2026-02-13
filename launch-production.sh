#!/bin/bash

# UberFoods Production Launch Script
echo "🚀 UberFoods Production Launch Sequence"
echo "========================================"

set -e  # Exit on any error

# Configuration
DOMAIN="yourdomain.com"
API_DOMAIN="api.$DOMAIN"
ADMIN_DOMAIN="admin.$DOMAIN"

echo "Launching for domain: $DOMAIN"
echo ""

# Phase 1: Pre-Launch Verification
echo "📋 Phase 1: Pre-Launch Verification"
echo "-----------------------------------"

# Domain DNS Check
echo "🔍 Checking DNS resolution..."
if nslookup $DOMAIN >/dev/null 2>&1; then
    echo "✅ DNS: $DOMAIN resolves"
else
    echo "❌ DNS: $DOMAIN not resolving - FIX DNS first!"
    exit 1
fi

if nslookup $API_DOMAIN >/dev/null 2>&1; then
    echo "✅ DNS: $API_DOMAIN resolves"
else
    echo "❌ DNS: $API_DOMAIN not resolving"
fi

if nslookup $ADMIN_DOMAIN >/dev/null 2>&1; then
    echo "✅ DNS: $ADMIN_DOMAIN resolves"
else
    echo "❌ DNS: $ADMIN_DOMAIN not resolving"
fi

# SSL Check
echo ""
echo "🔒 Checking SSL certificates..."
SSL_MAIN=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" || echo "000")
if [ "$SSL_MAIN" = "200" ]; then
    echo "✅ SSL: $DOMAIN certificate valid"
else
    echo "❌ SSL: $DOMAIN certificate issue (HTTP $SSL_MAIN)"
    echo "   Run: ./nginx/ssl-setup.sh"
    exit 1
fi

# ENV Files Check
echo ""
echo "📄 Checking environment files..."
if [ -f "backend/.env" ] && grep -q "ALLOWED_ORIGINS=https://" backend/.env; then
    echo "✅ Backend ENV: Configured with production values"
else
    echo "❌ Backend ENV: Missing or not configured for production"
    echo "   Run: cp production.env backend/.env && nano backend/.env"
    exit 1
fi

if [ -f "frontend/customer-web/.env" ] && grep -q "VITE_API_URL=https://" frontend/customer-web/.env; then
    echo "✅ Frontend ENV: Configured with production domain"
else
    echo "❌ Frontend ENV: Missing or not configured"
    echo "   Run: cp frontend-production.env frontend/customer-web/.env && nano frontend/customer-web/.env"
    exit 1
fi

echo ""
echo "✅ Pre-Launch Verification: PASSED"
echo ""

# Phase 2: Database Setup
echo "🗄️  Phase 2: Database & Infrastructure Setup"
echo "-------------------------------------------"

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Start database and redis first
echo "🐘 Starting PostgreSQL & Redis..."
docker-compose -f docker-compose.prod.yml up -d postgres redis

# Wait for database
echo "⏳ Waiting for database to be ready..."
sleep 30

# Test database connection
echo "🔗 Testing database connection..."
if docker exec uberfoods_postgres psql -U uberfoods_prod_user -d uberfoods_production -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Database: Connection successful"
else
    echo "❌ Database: Connection failed"
    echo "   Check DATABASE_URL in backend/.env"
    exit 1
fi

# Setup Prisma
echo "🗃️  Setting up Prisma..."
cd backend
npm run prisma:generate
npm run prisma:db:push
cd ..

echo "✅ Database & Infrastructure: READY"
echo ""

# Phase 3: Build & Deploy
echo "🏗️  Phase 3: Build & Deploy Services"
echo "-----------------------------------"

# Build production images
echo "🔨 Building production images..."
docker-compose -f docker-compose.prod.yml build

# Start all services
echo "▶️  Starting all services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 60

echo "✅ Build & Deploy: COMPLETED"
echo ""

# Phase 4: Post-Launch Verification
echo "🧪 Phase 4: Post-Launch Verification"
echo "-----------------------------------"

# Health Checks
echo "🏥 Testing health endpoints..."
HEALTH_API=$(curl -s -o /dev/null -w "%{http_code}" "https://$API_DOMAIN/api/health" || echo "000")
HEALTH_WEB=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/health" || echo "000")

if [ "$HEALTH_API" = "200" ]; then
    echo "✅ API Health: OK"
else
    echo "❌ API Health: FAILED (HTTP $HEALTH_API)"
fi

if [ "$HEALTH_WEB" = "200" ]; then
    echo "✅ Web Health: OK"
else
    echo "❌ Web Health: FAILED (HTTP $HEALTH_WEB)"
fi

# API Functionality
echo ""
echo "🔌 Testing API functionality..."
RESTAURANTS=$(curl -s -o /dev/null -w "%{http_code}" "https://$API_DOMAIN/api/restaurants" || echo "000")
AUTH=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@uberfoods.com","password":"admin123"}' \
    "https://$API_DOMAIN/api/auth/login" | jq -r '.access_token // empty' 2>/dev/null || echo "")

if [ "$RESTAURANTS" = "200" ]; then
    echo "✅ Restaurants API: OK"
else
    echo "❌ Restaurants API: FAILED (HTTP $RESTAURANTS)"
fi

if [ -n "$AUTH" ] && [ "$AUTH" != "null" ]; then
    echo "✅ Authentication: OK"
else
    echo "❌ Authentication: FAILED"
fi

# Frontend Check
echo ""
echo "🌐 Testing frontend..."
FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" || echo "000")
if [ "$FRONTEND" = "200" ]; then
    echo "✅ Frontend: LOADING"
else
    echo "❌ Frontend: FAILED (HTTP $FRONTEND)"
fi

echo ""
echo "✅ Post-Launch Verification: COMPLETED"
echo ""

# Phase 5: Final Status
echo "🎉 Phase 5: Launch Status"
echo "========================"

# Overall Assessment
PASSED=0
TOTAL=0

# DNS & SSL
((TOTAL++))
if nslookup $DOMAIN >/dev/null 2>&1; then ((PASSED++)); fi

((TOTAL++))
if [ "$SSL_MAIN" = "200" ]; then ((PASSED++)); fi

# ENV
((TOTAL++))
if [ -f "backend/.env" ] && grep -q "ALLOWED_ORIGINS=https://" backend/.env; then ((PASSED++)); fi

# Database
((TOTAL++))
if docker exec uberfoods_postgres psql -U uberfoods_prod_user -d uberfoods_production -c "SELECT 1;" >/dev/null 2>&1; then ((PASSED++)); fi

# Services
((TOTAL++))
if [ "$HEALTH_API" = "200" ]; then ((PASSED++)); fi

((TOTAL++))
if [ "$RESTAURANTS" = "200" ]; then ((PASSED++)); fi

((TOTAL++))
if [ -n "$AUTH" ]; then ((PASSED++)); fi

((TOTAL++))
if [ "$FRONTEND" = "200" ]; then ((PASSED++)); fi

echo "📊 Launch Score: $PASSED/$TOTAL checks passed"

if [ "$PASSED" = "$TOTAL" ]; then
    echo ""
    echo "🎉🎉🎉 LAUNCH SUCCESSFUL! 🎉🎉🎉"
    echo ""
    echo "🚀 Your UberFoods system is now LIVE at:"
    echo "   🌐 Frontend: https://$DOMAIN"
    echo "   🔌 API:     https://$API_DOMAIN"
    echo "   👤 Admin:   https://$ADMIN_DOMAIN"
    echo ""
    echo "📞 Next steps:"
    echo "   1. Test user registration & orders"
    echo "   2. Configure payment webhooks"
    echo "   3. Set up monitoring alerts"
    echo "   4. Create user documentation"
    echo ""
    echo "📊 Monitor your system:"
    echo "   docker-compose -f docker-compose.prod.yml logs -f"
    echo "   ./test-production.sh"
    echo "   ./test-payments.sh"
    echo ""
    echo "🎊 Congratulations on your successful launch!"
else
    echo ""
    echo "⚠️  PARTIAL LAUNCH - Some checks failed"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   - Check failed services: docker-compose -f docker-compose.prod.yml ps"
    echo "   - View logs: docker-compose -f docker-compose.prod.yml logs"
    echo "   - Run diagnostics: ./test-production.sh"
    echo ""
    echo "🛟 Emergency rollback:"
    echo "   docker-compose -f docker-compose.prod.yml down"
    echo "   docker-compose -f docker-compose.yml up -d  # Fallback"
fi

echo ""
echo "📋 Launch completed at: $(date)"