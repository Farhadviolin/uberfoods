#!/bin/bash

# ============================================
# UberFoods Production Setup Script
# ============================================
# Dieses Script hilft beim Setup für Production

set -e

echo "🚀 UberFoods Production Setup"
echo "================================"
echo ""

# Prüfe ob .env bereits existiert
if [ -f .env ]; then
    echo "⚠️  .env Datei existiert bereits!"
    read -p "Möchtest du sie überschreiben? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Abgebrochen"
        exit 1
    fi
fi

# Kopiere ENV.example zu .env
if [ -f ENV.example ]; then
    cp ENV.example .env
    echo "✅ .env Datei erstellt aus ENV.example"
else
    echo "❌ ENV.example nicht gefunden!"
    exit 1
fi

echo ""
echo "📝 Bitte bearbeite jetzt die .env Datei und setze alle Werte:"
echo "   nano .env"
echo "   # oder"
echo "   vim .env"
echo ""

# Prüfe ob Node.js installiert ist
if ! command -v node &> /dev/null; then
    echo "❌ Node.js ist nicht installiert!"
    exit 1
fi

# Prüfe ob npm installiert ist
if ! command -v npm &> /dev/null; then
    echo "❌ npm ist nicht installiert!"
    exit 1
fi

echo ""
echo "🔑 Möchtest du VAPID Keys generieren? (y/N)"
read -p "> " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v web-push &> /dev/null; then
        node scripts/generate-vapid-keys.js
    else
        echo "⚠️  web-push ist nicht installiert"
        echo "   Installiere: npm install -g web-push"
        echo "   Dann führe aus: node scripts/generate-vapid-keys.js"
    fi
fi

echo ""
echo "📦 Installiere Dependencies..."
npm install

echo ""
echo "🗄️  Prisma Setup..."
npx prisma generate --schema=./prisma/schema.prisma
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo ""
echo "✅ Setup abgeschlossen!"
echo ""
echo "📋 Nächste Schritte:"
echo "   1. Bearbeite .env und setze alle API Keys"
echo "   2. Siehe PRODUCTION_SETUP.md für detaillierte Anleitung"
echo "   3. Starte Backend: npm run start:prod"
echo ""

