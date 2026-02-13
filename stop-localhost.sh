#!/bin/bash

echo "🛑 Stopping UberFoods Localhost Environment"
echo "==========================================="

# Stop all frontend processes
echo "Stopping frontend applications..."
pkill -f "vite" || true
pkill -f "react-scripts" || true
pkill -f "next" || true

# Stop Docker services
echo "Stopping Docker services..."
docker-compose down

echo "✅ All services stopped successfully"
