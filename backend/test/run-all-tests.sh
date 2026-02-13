#!/bin/bash

# HMOR Food Delivery Platform - Complete Test Suite
# This script runs all tests: unit, integration, e2e, and performance

set -e

echo "🚀 Starting HMOR Food Delivery Platform Test Suite"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if environment is properly set up
check_environment() {
    print_status "Checking test environment..."

    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL not set. Please configure your test database."
        exit 1
    fi

    if [ -z "$JWT_SECRET" ]; then
        print_error "JWT_SECRET not set. Please configure JWT secret."
        exit 1
    fi

    # Check if database is accessible
    if ! npm run db:check 2>/dev/null; then
        print_warning "Database connection check failed. Make sure database is running."
    fi

    print_success "Environment check completed"
}

# Run unit tests
run_unit_tests() {
    print_status "Running unit tests..."

    if npm test -- --testPathPattern="\.spec\.ts$" --coverage --coverageDirectory=coverage/unit; then
        print_success "Unit tests passed"
        return 0
    else
        print_error "Unit tests failed"
        return 1
    fi
}

# Run integration tests
run_integration_tests() {
    print_status "Running integration tests..."

    if npm run test:integration; then
        print_success "Integration tests passed"
        return 0
    else
        print_error "Integration tests failed"
        return 1
    fi
}

# Run E2E tests
run_e2e_tests() {
    print_status "Running E2E tests..."

    if npm run test:e2e; then
        print_success "E2E tests passed"
        return 0
    else
        print_error "E2E tests failed"
        return 1
    fi
}

# Run performance tests
run_performance_tests() {
    print_status "Running performance tests..."

    # Check if Artillery is installed
    if ! command -v artillery &> /dev/null; then
        print_warning "Artillery not installed. Installing..."
        npm install -g artillery
    fi

    # Run performance tests
    if artillery run artillery-config.yml --output performance-results.json; then
        print_success "Performance tests completed"

        # Generate performance report
        artillery report performance-results.json
        print_success "Performance report generated: artillery_report.html"
        return 0
    else
        print_error "Performance tests failed"
        return 1
    fi
}

# Run security tests
run_security_tests() {
    print_status "Running security tests..."

    # Check for common security issues
    if npm audit --audit-level moderate; then
        print_success "Security audit passed"
    else
        print_warning "Security vulnerabilities found. Check npm audit output."
    fi

    # Run custom security tests if they exist
    if [ -f "test/security.test.js" ]; then
        if node test/security.test.js; then
            print_success "Custom security tests passed"
        else
            print_error "Custom security tests failed"
            return 1
        fi
    fi

    return 0
}

# Generate test reports
generate_reports() {
    print_status "Generating test reports..."

    # Combine coverage reports
    if [ -d "coverage" ]; then
        npx istanbul-combine coverage/unit/coverage-final.json coverage/e2e/coverage-final.json -o coverage/combined/coverage-final.json
        npx istanbul-report lcov --include coverage/combined/coverage-final.json --output-dir coverage/combined/lcov-report
        print_success "Combined coverage report generated"
    fi

    # Generate HTML test report
    if [ -f "test-results.json" ]; then
        npx junit-viewer --results=test-results.json --save=test-report.html
        print_success "HTML test report generated: test-report.html"
    fi
}

# Main test execution
main() {
    local start_time=$(date +%s)
    local test_results=()

    echo ""
    print_status "Test Environment: $(uname -s) $(uname -m)"
    print_status "Node Version: $(node --version)"
    print_status "NPM Version: $(npm --version)"
    echo ""

    # Pre-flight checks
    check_environment

    # Run all test suites
    print_status "Starting test execution..."

    # Unit tests
    if run_unit_tests; then
        test_results+=("unit:pass")
    else
        test_results+=("unit:fail")
    fi

    # Integration tests
    if run_integration_tests; then
        test_results+=("integration:pass")
    else
        test_results+=("integration:fail")
    fi

    # E2E tests
    if run_e2e_tests; then
        test_results+=("e2e:pass")
    else
        test_results+=("e2e:fail")
    fi

    # Performance tests
    if run_performance_tests; then
        test_results+=("performance:pass")
    else
        test_results+=("performance:fail")
    fi

    # Security tests
    if run_security_tests; then
        test_results+=("security:pass")
    else
        test_results+=("security:fail")
    fi

    # Generate reports
    generate_reports

    # Calculate results
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    echo "=================================================="
    print_status "Test Results Summary"
    echo "=================================================="

    local passed=0
    local failed=0

    for result in "${test_results[@]}"; do
        local test_name=$(echo $result | cut -d: -f1)
        local test_status=$(echo $result | cut -d: -f2)

        if [ "$test_status" = "pass" ]; then
            print_success "$test_name tests: PASSED"
            ((passed++))
        else
            print_error "$test_name tests: FAILED"
            ((failed++))
        fi
    done

    echo ""
    print_status "Total execution time: ${duration}s"
    print_status "Tests passed: $passed"
    print_status "Tests failed: $failed"

    if [ $failed -eq 0 ]; then
        print_success "🎉 All tests passed! Ready for deployment."
        exit 0
    else
        print_error "❌ Some tests failed. Please fix issues before deployment."
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    "unit")
        run_unit_tests
        ;;
    "integration")
        run_integration_tests
        ;;
    "e2e")
        run_e2e_tests
        ;;
    "performance")
        run_performance_tests
        ;;
    "security")
        run_security_tests
        ;;
    "check-env")
        check_environment
        ;;
    *)
        main
        ;;
esac
