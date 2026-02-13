#!/bin/bash

# ============================================
# UberFoods Monitoring Setup Script
# ============================================
# Konfiguriert Monitoring & Observability Tools

set -e

echo "🔧 Setup Monitoring & Observability..."

# Prüfe ob .env Datei existiert
if [ ! -f "./backend/.env.production" ]; then
    echo "⚠️  .env.production nicht gefunden. Erstelle aus Beispiel..."
    cp ./backend/.env.production.example ./backend/.env.production
    echo "✅ Bitte fülle .env.production aus!"
fi

# Sentry Setup
echo ""
echo "📊 Sentry Configuration:"
echo "1. Erstelle ein Sentry-Projekt unter https://sentry.io"
echo "2. Kopiere den DSN in .env.production:"
echo "   SENTRY_DSN=https://your_dsn@sentry.io/project_id"
echo ""

# Prometheus Setup
echo "📈 Prometheus Configuration:"
echo "Prometheus wird automatisch über Docker Compose gestartet."
echo ""

# Health Check Endpoint
echo "✅ Health Check Endpoint: https://localhost:3000/api/health"
echo ""

echo "✅ Monitoring Setup abgeschlossen!"
echo "📝 Nächste Schritte:"
echo "   1. Konfiguriere Sentry DSN in .env.production"
echo "   2. Starte Monitoring: docker-compose -f docker-compose.production.yml up -d"
echo "   3. Prüfe Health: curl https://localhost:3000/api/health"

