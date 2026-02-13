#!/bin/bash

# UberFoods - Stop Development Script
# Stoppt alle laufenden Services

# Stelle sicher, dass wir im Projektverzeichnis sind
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || { echo "❌ Konnte nicht ins Projektverzeichnis wechseln!"; exit 1; }

echo "🛑 Stoppe alle UberFoods Services..."

# Lese PIDs aus Datei falls vorhanden
if [ -f "$SCRIPT_DIR/.dev-pids" ]; then
    PIDS=$(cat "$SCRIPT_DIR/.dev-pids")
    if [ -n "$PIDS" ]; then
        echo "🔄 Stoppe Prozesse: $PIDS"
        kill $PIDS 2>/dev/null
        sleep 2
        # Force kill falls noch aktiv
        kill -9 $PIDS 2>/dev/null
    fi
    rm -f "$SCRIPT_DIR/.dev-pids"
fi

# Stoppe alle Node-Prozesse die mit den Services zu tun haben
echo "🔄 Stoppe Vite-Prozesse..."
pkill -f "vite.*customer-web" 2>/dev/null
pkill -f "vite.*admin-panel" 2>/dev/null
pkill -f "vite.*restaurant-web" 2>/dev/null
pkill -f "vite.*driver-app" 2>/dev/null

echo "🔄 Stoppe NestJS-Prozesse..."
pkill -f "nest start" 2>/dev/null
pkill -f "node.*backend" 2>/dev/null
pkill -f "node.*dist/main" 2>/dev/null

# Stoppe Docker Container
echo "🔄 Stoppe Docker Container..."
cd "$SCRIPT_DIR" || exit 1
docker-compose down 2>/dev/null

# Beende Prozesse auf den Ports (Fallback)
echo "🔄 Bereinige Ports..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3002 | xargs kill -9 2>/dev/null
lsof -ti:3003 | xargs kill -9 2>/dev/null
lsof -ti:3004 | xargs kill -9 2>/dev/null

echo "✅ Alle Services gestoppt."
