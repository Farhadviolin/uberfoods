#!/bin/bash

# ============================================
# UberFoods - UI-E2E Test Runner
# ============================================
# Runs full order lifecycle across all frontend apps

set -e  # Exit on any error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Generate unique run ID for test isolation
RUN_ID="${RUN_ID:-$(date +%s)_$RANDOM}"

echo -e "${BLUE}🚀 Starting UberFoods UI-E2E Test Runner${NC}"
echo -e "${BLUE}🆔 Run ID: ${RUN_ID}${NC}"
echo "=============================================="

# Function to check if port is available
check_port() {
  local port=$1
  local service=$2

  if curl -s --max-time 5 "http://localhost:$port" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ $service is running on port $port${NC}"
    return 0
  else
    echo -e "${RED}❌ $service is NOT running on port $port${NC}"
    return 1
  fi
}

# Function to wait for service with timeout
wait_for_service() {
  local port=$1
  local service=$2
  local timeout=${3:-30}

  echo -e "${YELLOW}⏳ Waiting for $service on port $port...${NC}"

  local count=0
  while [ $count -lt $timeout ]; do
    if check_port $port "$service" > /dev/null 2>&1; then
      return 0
    fi
    sleep 1
    count=$((count + 1))
  done

  echo -e "${RED}❌ Timeout waiting for $service${NC}"
  return 1
}

# Check Backend API
echo -e "${BLUE}🔍 Checking Backend API...${NC}"
if ! wait_for_service 3000 "Backend API" 60; then
  echo -e "${RED}❌ Backend not ready. Please start with:${NC}"
  echo "   cd backend && npm run start:e2e"
  exit 1
fi

# Verify API health endpoint
echo -e "${BLUE}🔍 Verifying API health...${NC}"
if ! curl -s -f "http://localhost:3000/api/health" > /dev/null 2>&1; then
  echo -e "${RED}❌ API health check failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ API health check passed${NC}"

# Check Frontend Apps
echo -e "${BLUE}🔍 Checking Frontend Apps...${NC}"

# Customer Web
if ! wait_for_service 3001 "Customer Web"; then
  echo -e "${YELLOW}⚠️  Customer Web not running, will start automatically${NC}"
fi

# Admin Panel
if ! wait_for_service 3002 "Admin Panel"; then
  echo -e "${YELLOW}⚠️  Admin Panel not running, will start automatically${NC}"
fi

# Restaurant Web
if ! wait_for_service 3003 "Restaurant Web"; then
  echo -e "${YELLOW}⚠️  Restaurant Web not running, will start automatically${NC}"
fi

# Driver App
if ! wait_for_service 3004 "Driver App"; then
  echo -e "${YELLOW}⚠️  Driver App not running, will start automatically${NC}"
fi

echo -e "${BLUE}🎯 Running Full Order Lifecycle UI-E2E Test${NC}"
echo "=================================================="

# Change to customer-web directory and run the test
cd customer-web

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}📦 Installing dependencies...${NC}"
  npm install
fi

# Setup authentication states
echo -e "${YELLOW}🔐 Setting up authentication states...${NC}"
npm run test:setup-auth

# Run the full lifecycle test with run ID
echo -e "${BLUE}🚀 Executing test: full-order-lifecycle.spec.ts${NC}"
RUN_ID=${RUN_ID} npm run test:e2e:full-lifecycle

# Check test result
if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}🎉 SUCCESS: Full Order Lifecycle UI-E2E Test Passed!${NC}"
  echo "=================================================="
  echo -e "${GREEN}✅ Customer → Restaurant → Driver → Admin flow completed${NC}"
  echo -e "${GREEN}✅ All frontend apps coordinated successfully${NC}"
  echo -e "${GREEN}✅ Order lifecycle: PENDING → READY_FOR_PICKUP → IN_TRANSIT → DELIVERED${NC}"
  exit 0
else
  echo ""
  echo -e "${RED}❌ FAILURE: UI-E2E Test Failed${NC}"
  echo "=================================="
  echo -e "${YELLOW}💡 Check Playwright report: customer-web/playwright-report/index.html${NC}"
  echo -e "${YELLOW}💡 Check screenshots: customer-web/test-results/${NC}"
  exit 1
fi
