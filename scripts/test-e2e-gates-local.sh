#!/bin/bash

# UberFoods - Local E2E Gates Test Script
# Runs all E2E gates locally to verify "All Green" status

set -e

echo "🚀 Starting UberFoods Local E2E Gates Test"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to run gate and check exit code
run_gate() {
    local app_name=$1
    local gate_name=$2
    local command=$3

    echo -e "${BLUE}▶️  Running ${app_name} ${gate_name}...${NC}"

    if eval "$command"; then
        echo -e "${GREEN}✅ ${app_name} ${gate_name} PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ ${app_name} ${gate_name} FAILED${NC}"
        return 1
    fi
}

# Check if Docker infrastructure is running
echo -e "${BLUE}🔍 Checking infrastructure...${NC}"
if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend not running on port 3000${NC}"
    echo -e "${YELLOW}💡 Start with: docker-compose up -d${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend running${NC}"

# Run all gates
failed_gates=()

# Admin Panel
run_gate "Admin Panel" "Gate A" "cd frontend/admin-panel && E2E_ORCHESTRATED=1 npm run e2e:gate:a" || failed_gates+=("Admin Panel Gate A")
run_gate "Admin Panel" "Gate B" "cd frontend/admin-panel && E2E_ORCHESTRATED=1 npm run e2e:gate:b" || failed_gates+=("Admin Panel Gate B")

# Customer Web
run_gate "Customer Web" "Gate A" "cd frontend/customer-web && E2E_ORCHESTRATED=1 npm run e2e:gate:a" || failed_gates+=("Customer Web Gate A")
run_gate "Customer Web" "Gate B" "cd frontend/customer-web && E2E_ORCHESTRATED=1 npm run e2e:gate:b" || failed_gates+=("Customer Web Gate B")

# Driver App
run_gate "Driver App" "Gate A" "cd frontend/driver-app && E2E_ORCHESTRATED=1 npm run e2e:gate:a" || failed_gates+=("Driver App Gate A")
run_gate "Driver App" "Gate B" "cd frontend/driver-app && E2E_ORCHESTRATED=1 npm run e2e:gate:b" || failed_gates+=("Driver App Gate B")

# Restaurant Web
run_gate "Restaurant Web" "Gate A" "cd frontend/restaurant-web && E2E_ORCHESTRATED=1 npm run e2e:gate:a" || failed_gates+=("Restaurant Web Gate A")
run_gate "Restaurant Web" "Gate B" "cd frontend/restaurant-web && E2E_ORCHESTRATED=1 npm run e2e:gate:b" || failed_gates+=("Restaurant Web Gate B")

# Results
echo ""
echo "=========================================="
if [ ${#failed_gates[@]} -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL GATES PASSED - RELEASE READY!${NC}"
    echo -e "${GREEN}✅ Zero flakies achieved${NC}"
    exit 0
else
    echo -e "${RED}❌ ${#failed_gates[@]} gate(s) failed:${NC}"
    for gate in "${failed_gates[@]}"; do
        echo -e "${RED}   - $gate${NC}"
    done
    exit 1
fi
