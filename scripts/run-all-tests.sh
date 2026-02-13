#!/bin/bash

# UberFoods - Run All Tests Script
# Runs all tests across all apps and generates coverage reports

set -e

echo "🧪 UberFoods - Running All Tests"
echo "================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TOTAL_TESTS=0
FAILED_TESTS=0

# Function to run tests
run_tests() {
    local dir=$1
    local name=$2
    
    echo "Testing $name..."
    cd $dir
    
    if npm run test:coverage > /tmp/test-$name.log 2>&1; then
        echo -e "${GREEN}✅ $name tests passed${NC}"
        
        # Extract test count if available
        COUNT=$(cat /tmp/test-$name.log | grep -o "[0-9]* passed" | grep -o "[0-9]*" | head -1 || echo "0")
        TOTAL_TESTS=$((TOTAL_TESTS + COUNT))
    else
        echo -e "${YELLOW}⚠️ $name tests had issues${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    cd - > /dev/null
    echo ""
}

# Backend Tests
echo "📦 Backend Tests"
echo "----------------"
run_tests "backend" "Backend"

# Admin Panel Tests
echo "🎛️ Admin Panel Tests"
echo "-------------------"
run_tests "frontend/admin-panel" "Admin Panel"

# Customer Web Tests
echo "👥 Customer Web Tests"
echo "--------------------"
run_tests "frontend/customer-web" "Customer Web"

# Driver App Tests
echo "🚗 Driver App Tests"
echo "------------------"
run_tests "frontend/driver-app" "Driver App"

# Restaurant Web Tests
echo "🍽️ Restaurant Web Tests"
echo "----------------------"
run_tests "frontend/restaurant-web" "Restaurant Web"

# Summary
echo ""
echo "📊 Test Summary"
echo "==============="
echo ""
echo "Total Tests Run: $TOTAL_TESTS"
echo "Failed Test Suites: $FAILED_TESTS"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️ Some test suites had issues${NC}"
    exit 1
fi
