#!/bin/bash

# ============================================
# UberFoods Master Setup Script
# ============================================
# Führt alle Setup-Schritte automatisch aus

set -e

echo "🚀 UberFoods Master Setup"
echo "=========================="
echo ""

# Prüfe ob wir im Root-Verzeichnis sind
if [ ! -f "README.md" ]; then
    echo "❌ Bitte führe dieses Script aus dem Root-Verzeichnis aus!"
    exit 1
fi

# 1. Backend Setup
echo "📦 Backend Setup..."
echo "-------------------"
cd backend

# Prüfe ob .env existiert
if [ ! -f .env ]; then
    if [ -f ENV.example ]; then
        echo "📝 Erstelle .env aus ENV.example..."
        cp ENV.example .env
        echo "✅ .env erstellt"
        echo ""
        echo "⚠️  WICHTIG: Bearbeite jetzt .env und setze alle Werte!"
        echo "   nano .env"
        echo ""
        read -p "Drücke Enter wenn du .env bearbeitet hast..."
    else
        echo "❌ ENV.example nicht gefunden!"
        exit 1
    fi
else
    echo "✅ .env bereits vorhanden"
fi

# Validiere Environment-Variablen
echo ""
echo "🔍 Validiere Environment-Variablen..."
if npm run setup:validate-env 2>/dev/null; then
    echo "✅ Environment-Variablen OK"
else
    echo "⚠️  Einige Environment-Variablen fehlen oder sind nicht gesetzt"
    echo "   Bitte bearbeite .env und setze alle Werte"
    echo "   Siehe: PRODUCTION_SETUP.md"
fi

# Installiere Dependencies
echo ""
echo "📦 Installiere Dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    echo "✅ Dependencies installiert"
else
    echo "✅ Dependencies bereits installiert"
fi

# Prisma Setup
echo ""
echo "🗄️  Prisma Setup..."
cd backend && npm run prisma:generate:abs
echo "✅ Prisma Client generiert"

# VAPID Keys generieren (wenn nicht vorhanden)
echo ""
echo "🔑 Prüfe VAPID Keys..."
if ! grep -q "VAPID_PUBLIC_KEY=your_vapid" .env 2>/dev/null; then
    echo "✅ VAPID Keys bereits gesetzt"
else
    echo "⚠️  VAPID Keys nicht gesetzt"
    read -p "Möchtest du VAPID Keys jetzt generieren? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v web-push &> /dev/null; then
            npm run setup:generate-vapid
        else
            echo "⚠️  web-push nicht installiert"
            echo "   Installiere: npm install -g web-push"
            echo "   Dann führe aus: npm run setup:generate-vapid"
        fi
    fi
fi

cd ..

# 2. Frontend Setup
echo ""
echo "📦 Frontend Setup..."
echo "-------------------"
cd frontend/customer-web

# Prüfe ob .env existiert
if [ ! -f .env ]; then
    if [ -f ENV.example ]; then
        echo "📝 Erstelle .env aus ENV.example..."
        cp ENV.example .env
        echo "✅ .env erstellt"
        echo ""
        echo "⚠️  WICHTIG: Bearbeite jetzt .env und setze alle Werte!"
        echo "   nano .env"
        echo ""
        read -p "Drücke Enter wenn du .env bearbeitet hast..."
    else
        echo "❌ ENV.example nicht gefunden!"
        exit 1
    fi
else
    echo "✅ .env bereits vorhanden"
fi

# Validiere Environment-Variablen
echo ""
echo "🔍 Validiere Environment-Variablen..."
if npm run setup:validate-env 2>/dev/null; then
    echo "✅ Environment-Variablen OK"
else
    echo "⚠️  Einige Environment-Variablen fehlen oder sind nicht gesetzt"
fi

# Installiere Dependencies
echo ""
echo "📦 Installiere Dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    echo "✅ Dependencies installiert"
else
    echo "✅ Dependencies bereits installiert"
fi

cd ../..

# 3. Zusammenfassung
echo ""
echo "=========================="
echo "✅ Setup abgeschlossen!"
echo ""
echo "📋 Nächste Schritte:"
echo ""
echo "1. Setze alle Environment-Variablen:"
echo "   - Backend: backend/.env"
echo "   - Frontend: frontend/customer-web/.env"
echo ""
echo "2. Konfiguriere externe Services:"
echo "   - Siehe: PRODUCTION_SETUP.md"
echo ""
echo "3. Starte Services:"
echo "   - Backend: cd backend && npm run start:dev"
echo "   - Frontend: cd frontend/customer-web && npm run dev"
echo ""
echo "4. Teste Setup:"
echo "   - Backend: npm run setup:check-services (im backend Verzeichnis)"
echo "   - Health: curl http://localhost:3000/api/health"
echo ""

