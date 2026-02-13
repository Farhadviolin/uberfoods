#!/bin/bash

# E2E Setup Script - idempotent and robust
set -e

echo "🚀 Setting up E2E environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if service is ready
wait_for_service() {
    local url=$1
    local timeout=$2
    local service_name=$3
    local start_time=$(date +%s)

    echo -n "⏳ Waiting for $service_name to be ready at $url..."

    while ! curl -s -f "$url" > /dev/null 2>&1; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        if [ $elapsed -ge $timeout ]; then
            echo -e "\n${RED}❌ Timeout waiting for $service_name after ${timeout}s${NC}"
            exit 1
        fi

        echo -n "."
        sleep 2
    done

    echo -e "\n${GREEN}✅ $service_name is ready!${NC}"
}

# Start Docker containers (idempotent)
echo "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for database to be ready
wait_for_service "http://127.0.0.1:3000/api/health" 120 "Database/Backend"

# Run migrations (idempotent)
echo "🗃️  Running database migrations..."
docker-compose exec -T backend npx prisma migrate deploy || echo "Migration might have already been applied"

# Run seed (idempotent)
echo "🌱 Seeding database..."
docker-compose exec -T backend npm run prisma:seed || echo "Seed might have already been applied"

# Final health check
wait_for_service "http://127.0.0.1:3000/api/health" 30 "Backend after seeding"

echo -e "${GREEN}🎉 E2E environment is ready!${NC}"
