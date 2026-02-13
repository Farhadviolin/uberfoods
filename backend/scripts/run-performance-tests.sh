#!/bin/bash

# Performance Test Script
# Führt Load-Tests für kritische Endpunkte durch

echo "🚀 Starting Performance Tests"
echo "=============================="

# Check if backend is running
if ! curl -s http://localhost:3000/api/health > /dev/null; then
    echo "❌ Backend is not running on http://localhost:3000"
    echo "   Please start the backend first: npm run start:dev"
    exit 1
fi

# Set environment variables
export TEST_BASE_URL=${TEST_BASE_URL:-"http://localhost:3000"}
export CONCURRENT_REQUESTS=${CONCURRENT_REQUESTS:-10}
export TOTAL_REQUESTS=${TOTAL_REQUESTS:-100}

echo "📍 Base URL: $TEST_BASE_URL"
echo "⚙️  Concurrent Requests: $CONCURRENT_REQUESTS"
echo "📊 Total Requests per Endpoint: $TOTAL_REQUESTS"
echo ""

# Run performance tests
npx ts-node test/performance/load-test.ts

echo ""
echo "✅ Performance tests completed"

