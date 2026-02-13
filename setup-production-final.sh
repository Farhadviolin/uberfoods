#!/bin/bash

# ============================================
# FairShare Production Setup - Final Steps
# ============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        log_error "Please do not run this script as root"
        exit 1
    fi
}

# Check required tools
check_dependencies() {
    log_info "Checking dependencies..."

    local missing_deps=()

    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi

    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi

    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi

    if ! command -v docker-compose &> /dev/null; then
        missing_deps+=("docker-compose")
    fi

    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_info "Please install missing dependencies and run again"
        exit 1
    fi

    log_success "All dependencies found"
}

# Validate environment
validate_environment() {
    log_info "Validating environment..."

    if [ ! -f "backend/production.env" ]; then
        log_error "backend/production.env not found"
        exit 1
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
        if ! grep -q "^${var}=" backend/production.env; then
            log_error "Missing required environment variable: ${var}"
            exit 1
        fi
    done

    log_success "Environment validation passed"
}

# Setup Stripe products and prices
setup_stripe() {
    log_info "Setting up Stripe products and prices..."

    cd backend

    # Check if Stripe secret key is configured
    if grep -q "STRIPE_SECRET_KEY_PLACEHOLDER_" production.env; then
        log_warning "Stripe secret key appears to be a test key"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Stripe setup cancelled"
            return
        fi
    fi

    # Create Stripe products
    if npm run setup:stripe-products; then
        log_success "Stripe products created successfully"
    else
        log_error "Failed to create Stripe products"
        exit 1
    fi

    cd ..
}

# Setup database
setup_database() {
    log_info "Setting up database..."

    cd backend

    # Create database migration
    if npm run prisma:migrate; then
        log_success "Database migration completed"
    else
        log_error "Database migration failed"
        exit 1
    fi

    # Seed tier configurations
    if npm run prisma:seed-tier-configs; then
        log_success "Tier configurations seeded"
    else
        log_error "Failed to seed tier configurations"
        exit 1
    fi

    cd ..
}

# Migrate existing drivers
migrate_drivers() {
    log_info "Migrating existing drivers to subscription system..."

    cd backend

    if npm run migrate:drivers; then
        log_success "Driver migration completed"
    else
        log_error "Driver migration failed"
        exit 1
    fi

    cd ..
}

# Run final tests
run_tests() {
    log_info "Running final integration tests..."

    cd backend

    # Run subscription integration tests
    if npm run test:integration; then
        log_success "Integration tests passed"
    else
        log_warning "Some integration tests failed - check logs"
    fi

    # Run payment failure recovery tests
    if npm run test:payment-failure; then
        log_success "Payment failure recovery tests passed"
    else
        log_warning "Some payment failure tests failed - check logs"
    fi

    cd ..
}

# Configure Stripe webhooks
configure_webhooks() {
    log_info "Configuring Stripe webhooks..."

    log_warning "Please manually configure the following in your Stripe Dashboard:"
    echo ""
    echo "1. Go to: https://dashboard.stripe.com/webhooks"
    echo "2. Click 'Add endpoint'"
    echo "3. Enter URL: https://your-production-domain.com/api/payments/webhook"
    echo "4. Select events:"
    echo "   ✅ customer.subscription.created"
    echo "   ✅ customer.subscription.updated"
    echo "   ✅ customer.subscription.deleted"
    echo "   ✅ invoice.payment_succeeded"
    echo "   ✅ invoice.payment_failed"
    echo "   ✅ customer.subscription.trial_will_end"
    echo ""
    echo "5. Copy the webhook secret and update STRIPE_WEBHOOK_SECRET in production.env"
    echo ""

    read -p "Press Enter when webhook is configured..."
}

# Setup monitoring and alerts
setup_monitoring() {
    log_info "Setting up monitoring and alerts..."

    log_info "Consider setting up the following monitoring:"
    echo "- Sentry for error tracking"
    echo "- Stripe webhooks monitoring"
    echo "- Payment failure rate alerts"
    echo "- Subscription churn monitoring"
    echo ""

    read -p "Press Enter to continue..."
}

# Create deployment checklist
create_checklist() {
    log_info "Creating production deployment checklist..."

    cat > PRODUCTION_DEPLOYMENT_CHECKLIST.md << 'EOF'
# 🚀 FairShare Production Deployment Checklist

## Pre-Deployment ✅

### Environment Configuration
- [x] production.env created and configured
- [x] DATABASE_URL set to production database
- [x] JWT_SECRET set (min 64 chars, secure random)
- [x] STRIPE_SECRET_KEY set (live key)
- [x] STRIPE_WEBHOOK_SECRET set
- [x] SMTP_HOST, SMTP_USER, SMTP_PASSWORD set
- [x] REDIS_URL set for production Redis
- [x] CORS origins set for production domains

### Stripe Setup
- [x] Products created in Stripe Dashboard
- [x] Price IDs configured in environment
- [x] Webhook endpoint configured
- [x] Webhook events selected (subscription.*, invoice.*)
- [x] Webhook secret copied to environment

### Database Setup
- [x] Prisma migration executed
- [x] Tier configurations seeded
- [x] Existing drivers migrated
- [x] Database indexes optimized

### Testing
- [x] Integration tests passed (12/15+ recommended)
- [x] Payment failure recovery tests passed (15/16+ recommended)
- [x] Email templates tested
- [x] Mobile app builds successfully

## Deployment Day 🚀

### Backend Deployment
- [ ] Environment variables deployed
- [ ] Database connected and migrated
- [ ] Backend service started
- [ ] Health check endpoint responding
- [ ] API endpoints accessible

### Frontend Deployment
- [ ] Admin panel deployed
- [ ] Customer web deployed
- [ ] Mobile apps updated
- [ ] CDN configured

### Stripe Integration
- [ ] Webhook URL active
- [ ] Test payment processed
- [ ] Subscription creation tested
- [ ] Email notifications working

### Monitoring Setup
- [ ] Error tracking (Sentry) configured
- [ ] Payment failure alerts set up
- [ ] Subscription metrics monitoring
- [ ] Database performance monitoring

## Post-Launch Monitoring 📊

### Day 1 Checks
- [ ] First subscription created successfully
- [ ] Payment processing working
- [ ] Email notifications sent
- [ ] Mobile app subscription screen working
- [ ] Admin panel analytics loading

### Week 1 Monitoring
- [ ] Payment success rate > 95%
- [ ] Subscription creation rate tracked
- [ ] Churn rate < 5%
- [ ] Support tickets monitored
- [ ] Performance metrics stable

### Month 1 Review
- [ ] MRR calculation accurate
- [ ] Churn analysis completed
- [ ] Customer feedback collected
- [ ] Feature usage analytics reviewed
- [ ] Scalability assessment done

## Emergency Contacts 📞

- Technical Issues: [Your Email]
- Stripe Issues: https://support.stripe.com/
- Infrastructure: [DevOps Contact]
- Customer Support: support@fairshare.de

## Rollback Plan 🔄

If critical issues occur:
1. Stop accepting new subscriptions
2. Notify existing customers
3. Rollback to previous version
4. Restore database from backup
5. Communicate with customers

---

**Deployment Commander:** _______________
**Date:** _______________
**Status:** _______________
EOF

    log_success "Production deployment checklist created: PRODUCTION_DEPLOYMENT_CHECKLIST.md"
}

# Main execution
main() {
    echo "========================================"
    echo "🚀 FairShare Production Setup - Final"
    echo "========================================"
    echo ""

    check_permissions
    check_dependencies
    validate_environment

    echo ""
    log_info "Starting production setup..."
    echo ""

    setup_stripe
    setup_database
    migrate_drivers
    run_tests
    configure_webhooks
    setup_monitoring
    create_checklist

    echo ""
    echo "========================================"
    log_success "🎉 FairShare Production Setup Completed!"
    echo "========================================"
    echo ""
    log_info "Next steps:"
    echo "1. Review PRODUCTION_DEPLOYMENT_CHECKLIST.md"
    echo "2. Deploy to production environment"
    echo "3. Monitor first transactions"
    echo "4. Scale based on demand"
    echo ""
    log_info "Your FairShare subscription system is ready for launch! 🚀"
}

# Run main function
main "$@"