#!/bin/bash

echo "🚀 Starting UberFoods Localhost Environment"
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${RED}Port $1 is already in use${NC}"
        return 1
    else
        echo -e "${GREEN}Port $1 is available${NC}"
        return 0
    fi
}

# Check required ports
echo "Checking required ports..."
check_port 3000 || exit 1
check_port 3001 || exit 1
check_port 3002 || exit 1
check_port 3003 || exit 1
check_port 3004 || exit 1
check_port 5434 || exit 1
check_port 6379 || exit 1

echo ""
echo "Starting Docker services..."
docker-compose up -d postgres redis

echo "Waiting for database to be ready..."
sleep 10

# Check if database is ready
if docker-compose exec -T postgres pg_isready -U postgres -d uberfoods >/dev/null 2>&1; then
    echo -e "${GREEN}Database is ready!${NC}"
else
    echo -e "${RED}Database is not ready. Please wait and try again.${NC}"
    exit 1
fi

echo ""
echo "Setting up database..."
cd backend
npm run prisma:migrate
npm run prisma:seed

echo ""
echo -e "${GREEN}🎉 All services are starting up!${NC}"
echo ""
echo "🌐 Available applications:"
echo "  📱 Customer Web:    http://localhost:3001"
echo "  👨‍💼 Admin Panel:    http://localhost:3002"
echo "  🍽️  Restaurant Web: http://localhost:3003"
echo "  🚗 Driver App:      http://localhost:3004"
echo "  🚀 Backend API:     http://localhost:3000"
echo "  📊 API Docs:        http://localhost:3000/api/docs"
echo ""
echo "🗄️  Database:         localhost:5434"
echo "🔄 Redis:            localhost:6379"
echo ""
echo "📝 To start frontend apps manually:"
echo "  Customer Web:    cd frontend/customer-web && npm run dev"
echo "  Admin Panel:     cd frontend/admin-panel && npm run dev"
echo "  Restaurant Web:  cd frontend/restaurant-web && npm run dev"
echo "  Driver App:      cd frontend/driver-app && npm run dev"
echo ""
echo "🛑 To stop all services: ./stop-localhost.sh"
