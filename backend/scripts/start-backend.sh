#!/bin/bash
# Backend Start Script mit Fehlerbehandlung

cd "$(dirname "$0")/.."

echo "🚀 Starte Backend..."
echo ""

# Prüfe .env
if [ ! -f .env ]; then
    echo "❌ .env fehlt! Kopiere ENV.example zu .env"
    exit 1
fi

# Prüfe Prisma
echo "📦 Prisma Client generieren..."
npx prisma generate --schema=./prisma/schema.prisma > /dev/null 2>&1

# Starte Backend
echo "🚀 Starte Backend auf Port ${PORT:-3000}..."
echo ""

npm run start:dev

