#!/bin/bash

# Comprehensive Test Runner for Admin Panel
# Runs all test types and generates reports

set -e

echo "🚀 Starting Comprehensive Test Suite for Admin Panel"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILURES=0

# Function to run a test command
run_test() {
    local name=$1
    local command=$2
    
    echo -e "${YELLOW}Running: ${name}${NC}"
    echo "Command: $command"
    echo ""
    
    if eval "$command"; then
        echo -e "${GREEN}✅ ${name} passed${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}❌ ${name} failed${NC}"
        echo ""
        FAILURES=$((FAILURES + 1))
        return 1
    fi
}

# 1. Type Checking
run_test "TypeScript Type Check" "npm run type-check"

# 2. Linting
run_test "ESLint" "npm run lint"

# 3. Unit Tests
run_test "Unit Tests (All)" "npm run test"

# 4. Unit Tests with Coverage
run_test "Unit Tests with Coverage" "npm run test:coverage"

# 5. Component Tests
run_test "Component Tests" "npm run test:components"

# 6. Hook Tests
run_test "Hook Tests" "npm run test:hooks"

# 7. Utility Tests
run_test "Utility Tests" "npm run test:utils"

# 8. API Endpoint Verification
echo -e "${YELLOW}Running: API Endpoint Verification${NC}"
echo "Note: This requires the backend to be running on http://localhost:3000"
echo ""

if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    run_test "API Endpoint Tests" "npm run test:api"
else
    echo -e "${YELLOW}⚠️  Backend not running, skipping API tests${NC}"
    echo ""
fi

# 9. E2E Tests (optional, requires Playwright)
if command -v npx &> /dev/null && npx playwright --version &> /dev/null; then
    echo -e "${YELLOW}Running: E2E Tests${NC}"
    echo "Note: This requires the dev server to be running"
    echo ""
    
    if curl -s http://localhost:3002 > /dev/null 2>&1; then
        run_test "E2E Tests" "npm run test:e2e" || echo -e "${YELLOW}⚠️  E2E tests skipped (dev server might not be ready)${NC}"
    else
        echo -e "${YELLOW}⚠️  Dev server not running, skipping E2E tests${NC}"
        echo "Start with: npm run dev"
        echo ""
    fi
else
    echo -e "${YELLOW}⚠️  Playwright not installed, skipping E2E tests${NC}"
    echo "Install with: npm install -D @playwright/test && npx playwright install"
    echo ""
fi

# Summary
echo "=================================================="
echo "📊 TEST SUMMARY"
echo "=================================================="
echo ""

if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}❌ ${FAILURES} test suite(s) failed${NC}"
    echo ""
    exit 1
fi

