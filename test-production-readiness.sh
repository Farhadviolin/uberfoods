#!/bin/bash

# ============================================
# FairShare Production Readiness Test
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
TOTAL=0

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    ((PASSED++))
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((FAILED++))
}

test_result() {
    ((TOTAL++))
    if [ $? -eq 0 ]; then
        log_success "$1"
    else
        log_error "$1"
    fi
}

# Test 1: Environment Configuration
test_environment() {
    log_info "Testing environment configuration..."

    # Check if production.env exists
    if [ -f "backend/production.env" ]; then
        log_success "Production environment file exists"
    else
        log_error "Production environment file missing"
        return 1
    fi

    # Check required environment variables
    local required_vars=(
        "DATABASE_URL"
        "JWT_SECRET"
        "STRIPE_SECRET_KEY"
        "STRIPE_WEBHOOK_SECRET"
        "SMTP_HOST"
        "SMTP_USER"
        "SMTP_PASSWORD"
    )

    for var in "${required_vars[@]}"; do
        if grep -q "^${var}=" backend/production.env; then
            log_success "Environment variable ${var} configured"
        else
            log_error "Environment variable ${var} missing"
        fi
    done

    # Check Stripe Price IDs
    if grep -q "STRIPE_PRICE_BASIC=" backend/production.env &&
       grep -q "STRIPE_PRICE_PRO=" backend/production.env &&
       grep -q "STRIPE_PRICE_FULLTIME=" backend/production.env &&
       grep -q "STRIPE_PRICE_ENTERPRISE=" backend/production.env; then
        log_success "Stripe Price IDs configured"
    else
        log_warning "Stripe Price IDs not fully configured (will be set by setup script)"
    fi
}

# Test 2: Database Schema
test_database_schema() {
    log_info "Testing database schema..."

    if [ -f "backend/prisma/schema.prisma" ]; then
        log_success "Prisma schema exists"

        # Check for subscription models
        if grep -q "model DriverSubscription" backend/prisma/schema.prisma &&
           grep -q "model SubscriptionTierConfig" backend/prisma/schema.prisma &&
           grep -q "model CommissionTransaction" backend/prisma/schema.prisma; then
            log_success "Subscription models defined in schema"
        else
            log_error "Subscription models missing in schema"
        fi
    else
        log_error "Prisma schema missing"
    fi
}

# Test 3: Backend Services
test_backend_services() {
    log_info "Testing backend services..."

    # Check if required service files exist
    local services=(
        "subscription.service.ts"
        "subscription-email.service.ts"
        "subscription-tier-config.service.ts"
        "subscription-financial.service.ts"
        "subscription-dunning.service.ts"
        "subscription-lifecycle.service.ts"
    )

    for service in "${services[@]}"; do
        if [ -f "backend/src/modules/driver/${service}" ]; then
            log_success "Service ${service} exists"
        else
            log_error "Service ${service} missing"
        fi
    done
}

# Test 4: API Controllers
test_api_controllers() {
    log_info "Testing API controllers..."

    # Check webhook controller
    if [ -f "backend/src/modules/payment/payment-webhook.controller.ts" ]; then
        log_success "Payment webhook controller exists"

        if grep -q "handleSubscriptionEvent" backend/src/modules/payment/payment-webhook.controller.ts; then
            log_success "Subscription webhook handlers implemented"
        else
            log_error "Subscription webhook handlers missing"
        fi
    else
        log_error "Payment webhook controller missing"
    fi

    # Check admin controller
    if [ -f "backend/src/modules/admin/admin.controller.ts" ]; then
        log_success "Admin controller exists"

        if grep -q "grant-grace-period" backend/src/modules/admin/admin.controller.ts &&
           grep -q "retry-payment" backend/src/modules/admin/admin.controller.ts; then
            log_success "Admin intervention endpoints implemented"
        else
            log_error "Admin intervention endpoints missing"
        fi
    else
        log_error "Admin controller missing"
    fi
}

# Test 5: Frontend Components
test_frontend_components() {
    log_info "Testing frontend components..."

    # Admin panel components
    local admin_components=(
        "SubscriptionManagement.tsx"
        "SubscriptionTierConfigManagement.tsx"
        "SubscriptionEditModal.tsx"
    )

    for component in "${admin_components[@]}"; do
        if [ -f "frontend/admin-panel/src/components/${component}" ]; then
            log_success "Admin component ${component} exists"
        else
            log_error "Admin component ${component} missing"
        fi
    done

    # Mobile app subscription screen
    if [ -f "mobile/driver-app/app/(tabs)/subscription.tsx" ]; then
        log_success "Mobile subscription screen exists"

        if grep -q "pastDueWarning\|ZAHLUNG AUSSTEHEND" mobile/driver-app/app/(tabs)/subscription.tsx; then
            log_success "Mobile PAST_DUE warning implemented"
        else
            log_error "Mobile PAST_DUE warning missing"
        fi
    else
        log_error "Mobile subscription screen missing"
    fi
}

# Test 6: Email Templates
test_email_templates() {
    log_info "Testing email templates..."

    if [ -f "backend/src/modules/driver/subscription-email.service.ts" ]; then
        log_success "Email service exists"

        local email_methods=(
            "sendWelcomeEmail"
            "sendPaymentFailedEmail"
            "sendDunningEmail1"
            "sendCancellationEmail"
        )

        for method in "${email_methods[@]}"; do
            if grep -q "${method}" backend/src/modules/driver/subscription-email.service.ts; then
                log_success "Email method ${method} implemented"
            else
                log_error "Email method ${method} missing"
            fi
        done
    else
        log_error "Email service missing"
    fi
}

# Test 7: Migration Scripts
test_migration_scripts() {
    log_info "Testing migration scripts..."

    local scripts=(
        "setup-stripe-products.ts"
        "migrate-drivers-to-subscriptions.ts"
    )

    for script in "${scripts[@]}"; do
        if [ -f "backend/scripts/${script}" ]; then
            log_success "Migration script ${script} exists"
        else
            log_error "Migration script ${script} missing"
        fi
    done
}

# Test 8: Test Scripts
test_test_scripts() {
    log_info "Testing test scripts..."

    local test_scripts=(
        "test-full-subscription-integration.js"
        "test-payment-failure-recovery.js"
        "test-email-templates.js"
        "test-webhooks.js"
    )

    for script in "${test_scripts[@]}"; do
        if [ -f "backend/scripts/${script}" ]; then
            log_success "Test script ${script} exists"
        else
            log_warning "Test script ${script} missing (optional)"
        fi
    done
}

# Test 9: Package.json Scripts
test_package_scripts() {
    log_info "Testing package.json scripts..."

    if [ -f "backend/package.json" ]; then
        local required_scripts=(
            "setup:production"
            "test:integration"
            "test:payment-failure"
            "migrate:drivers"
            "prisma:seed-tier-configs"
        )

        for script in "${required_scripts[@]}"; do
            if grep -q "\"${script}\":" backend/package.json; then
                log_success "Package script ${script} defined"
            else
                log_error "Package script ${script} missing"
            fi
        done
    else
        log_error "Package.json missing"
    fi
}

# Test 10: Documentation
test_documentation() {
    log_info "Testing documentation..."

    local docs=(
        "SUBSCRIPTION_SYSTEM.md"
        "SUBSCRIPTION_PRODUCTION_LAUNCH.md"
        "PAYMENT_FAILURE_RECOVERY_IMPLEMENTATION.md"
        "setup-production-final.sh"
        "test-production-readiness.sh"
    )

    for doc in "${docs[@]}"; do
        if [ -f "${doc}" ]; then
            log_success "Documentation ${doc} exists"
        else
            log_warning "Documentation ${doc} missing"
        fi
    done
}

# Main test execution
main() {
    echo "========================================"
    echo "🧪 FairShare Production Readiness Test"
    echo "========================================"
    echo ""

    test_environment
    echo ""
    test_database_schema
    echo ""
    test_backend_services
    echo ""
    test_api_controllers
    echo ""
    test_frontend_components
    echo ""
    test_email_templates
    echo ""
    test_migration_scripts
    echo ""
    test_test_scripts
    echo ""
    test_package_scripts
    echo ""
    test_documentation

    echo ""
    echo "========================================"
    echo "📊 TEST RESULTS SUMMARY"
    echo "========================================"

    local success_rate=$(( PASSED * 100 / TOTAL ))

    echo -e "${BLUE}Total Tests:${NC} ${TOTAL}"
    echo -e "${GREEN}Passed:${NC} ${PASSED}"
    echo -e "${RED}Failed:${NC} ${FAILED}"
    echo -e "${BLUE}Success Rate:${NC} ${success_rate}%"

    echo ""

    if [ $success_rate -ge 90 ]; then
        echo -e "${GREEN}🎉 SYSTEM IS PRODUCTION READY!${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Run: ./setup-production-final.sh"
        echo "2. Deploy to production"
        echo "3. Monitor first transactions"
    elif [ $success_rate -ge 75 ]; then
        echo -e "${YELLOW}⚠️  SYSTEM MOSTLY READY${NC}"
        echo ""
        echo "Fix remaining issues before production deployment"
    else
        echo -e "${RED}❌ SYSTEM NOT READY FOR PRODUCTION${NC}"
        echo ""
        echo "Critical issues need to be resolved first"
    fi

    echo ""
    echo "For detailed deployment checklist, see: PRODUCTION_DEPLOYMENT_CHECKLIST.md"
}

# Run main function
main "$@"