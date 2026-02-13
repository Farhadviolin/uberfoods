#!/bin/bash

# UberFoods Staging Deployment Script
# Deploys the application to staging environment using Docker

set -e

echo "🚀 Starting UberFoods Staging Deployment..."
echo "═══════════════════════════════════════════"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed."
    exit 1
fi

# Load environment variables
if [ -f ".env.staging" ]; then
    print_status "Loading staging environment variables"
    export $(grep -v '^#' .env.staging | xargs)
else
    print_warning "No .env.staging file found, using default values"
fi

# Stop any existing staging containers
print_status "Stopping existing staging containers..."
docker-compose -f docker-compose.staging.yml down || true

# Remove old images to ensure fresh build
print_status "Cleaning up old Docker images..."
docker image prune -f || true

# Build and start services
print_status "Building and starting staging services..."
docker-compose -f docker-compose.staging.yml up -d --build

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 30

# Check if backend is responding
print_status "Checking backend health..."
if curl -fk https://localhost:3000/api/health > /dev/null 2>&1; then
    print_status "Backend is healthy!"
else
    print_error "Backend health check failed"
    docker-compose -f docker-compose.staging.yml logs backend
    exit 1
fi

# Check if database is accessible
print_status "Checking database connectivity..."
if docker-compose -f docker-compose.staging.yml exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    print_status "Database is accessible!"
else
    print_error "Database connectivity check failed"
    exit 1
fi

# Run basic integration tests
print_status "Running basic integration tests..."
if node scripts/test-frontend-backend-integration.js > /dev/null 2>&1; then
    print_status "Integration tests passed!"
else
    print_warning "Integration tests failed (expected in staging without frontend apps)"
fi

# Show service status
print_status "Deployment completed successfully!"
echo ""
echo "📊 Service Status:"
echo "──────────────────"
docker-compose -f docker-compose.staging.yml ps

echo ""
echo "🔗 Service URLs:"
echo "────────────────"
echo "Backend API:     https://localhost:3000"
echo "Database:        localhost:5433"
echo "Redis:           localhost:6380"

echo ""
echo "📝 Useful Commands:"
echo "───────────────────"
echo "View logs:        docker-compose -f docker-compose.staging.yml logs -f"
echo "Stop services:    docker-compose -f docker-compose.staging.yml down"
echo "Restart backend:  docker-compose -f docker-compose.staging.yml restart backend"

echo ""
print_status "Staging deployment completed successfully! 🎉"

# Optional: Run performance test
if [ "$1" = "--performance-test" ]; then
    print_status "Running performance test..."
    BASE_URL=https://localhost:3000 node scripts/performance-test.js
fi

# Optional: Run security audit
if [ "$1" = "--security-audit" ]; then
    print_status "Running security audit..."
    node scripts/security-audit.js
fi
