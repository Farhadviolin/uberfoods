#!/bin/bash
# Script zum Starten des Backends und Prüfen der Verbindung

echo "🚀 Backend-Verbindungs-Check & Start Script"
echo "=============================================="
echo ""

cd "$(dirname "$0")/.."

# Prüfe ob .env existiert
if [ ! -f .env ]; then
    echo "❌ .env Datei fehlt!"
    echo "💡 Kopiere ENV.example zu .env und fülle die Werte aus:"
    echo "   cp ENV.example .env"
    exit 1
fi

# Prüfe DATABASE_URL
if ! grep -q "DATABASE_URL" .env; then
    echo "❌ DATABASE_URL fehlt in .env!"
    exit 1
fi

echo "✅ .env Datei gefunden"
echo ""

# Prüfe ob Backend bereits läuft
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "✅ Backend läuft bereits auf Port 3000"
    echo ""
    echo "🔍 Führe Verbindungs-Check durch..."
    npm run check:connection
else
    echo "⚠️  Backend läuft nicht"
    echo ""
    echo "💡 Starte Backend mit: npm run start:dev"
    echo "   Dann führe aus: npm run check:connection"
fi

