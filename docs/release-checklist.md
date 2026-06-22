# 🚀 UberFoods MVP-PROD-Web Release Checklist

## Definition of Done (100%)
- [ ] All builds succeed (backend + 4 web apps)
- [ ] All automated tests pass (unit/integration)
- [ ] Playwright E2E full lifecycle passes 10 consecutive runs
- [ ] Manual smoke checklist passes (happy path + error path)
- [ ] Staging/production config checks pass (env validation + CORS + proxies)
- [ ] No new code unless it reduces risk (test stability, scripts, docs, CI hardening)

## 📋 Pre-Release Validation

### Backend Build & Tests
```bash
cd backend
npm install
npm run build  # Should succeed without TypeScript errors
npm test       # All tests should pass
```

### Frontend Builds (All 4 apps)
```bash
# Customer Web
cd frontend/customer-web && npm install && npm run build

# Admin Panel
cd frontend/admin-panel && npm install && npm run build

# Restaurant Web
cd frontend/restaurant-web && npm install && npm run build

# Driver App
cd frontend/driver-app && npm install && npm run build
```

### Release Gate Runner
```bash
# Run the automated release validation (requires Node.js)
node scripts/release-gate.mjs
```

## 🔧 Environment Configuration

### Backend Production Variables (REQUIRED)
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/uberfoods_prod

# JWT (Generate new secrets for production)
JWT_SECRET=your-production-jwt-secret-here
JWT_REFRESH_SECRET=your-production-refresh-secret-here

# CORS (CRITICAL - App won't start without this)
ALLOWED_ORIGINS=https://customer.yourdomain.com,https://admin.yourdomain.com,https://restaurant.yourdomain.com,https://driver.yourdomain.com

# Stripe Production Keys
STRIPE_SECRET_KEY=STRIPE_SECRET_KEY_PLACEHOLDER
STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET_PLACEHOLDER
STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY_PLACEHOLDER

# PayPal Production Keys
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id

# Email (runtime keys)
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=UberFoods

# Optional SendGrid runtime keys
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=UberFoods
```

### Frontend Production Variables (REQUIRED)
```bash
# API Configuration
# Customer Web uses VITE_API_BASE_URL; Admin/Restaurant/Driver continue to use VITE_API_URL
VITE_API_BASE_URL=https://api.yourdomain.com/api
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com

# Google Maps (CRITICAL)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_production_key

# Stripe (CRITICAL)
VITE_STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY_PLACEHOLDER

# Optional but recommended
VITE_SENTRY_DSN=https://your_sentry_dsn@sentry.io/project_id
VITE_SENTRY_ENVIRONMENT=production
```

## 🌐 Nginx Production Configuration

### Main Server Block (nginx.production.conf)
```nginx
# API Proxy
location /api {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}

# WebSocket Proxy
location /socket.io {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}
```

### Frontend-Specific Nginx Configs
Each frontend app should have its own server block:
- `nginx/customer-web.conf` - serves customer.yourdomain.com
- `nginx/admin-panel.conf` - serves admin.yourdomain.com
- `nginx/restaurant-web.conf` - serves restaurant.yourdomain.com
- `nginx/driver-app.conf` - serves driver.yourdomain.com

## 🧪 Testing Checklist

### E2E Test Execution
```bash
# Run 10 consecutive E2E tests
cd frontend/customer-web
npx playwright test --project=full-lifecycle --repeat-each=10
```

### Manual Smoke Tests

#### Customer Journey
- [ ] Register new customer account
- [ ] Login with credentials
- [ ] Browse restaurants
- [ ] Add items to cart
- [ ] Complete checkout with payment
- [ ] Track order in real-time
- [ ] Receive order completion notification

#### Restaurant Journey
- [ ] Login to restaurant account
- [ ] View incoming orders
- [ ] Mark order as ready for pickup
- [ ] Monitor order status updates

#### Driver Journey
- [ ] Login to driver account
- [ ] Accept available order
- [ ] Update status to picked up
- [ ] Update status to in transit
- [ ] Complete delivery

#### Admin Journey
- [ ] Login to admin panel
- [ ] Monitor all active orders
- [ ] View order details
- [ ] Override order status if needed
- [ ] Open reporting/PDF area without a 500 error
- [ ] Download/export works if the feature is implemented

## 🚀 Deployment Steps

### 1. Database Migration
```bash
cd backend
npm run prisma:deploy  # Apply migrations to production DB
npm run prisma:seed    # Seed initial data
```

### 2. Backend Deployment
```bash
# Build and start backend
npm run build
npm run start:prod
```

### 3. Frontend Deployment
```bash
# Deploy each frontend to its domain
# customer-web → customer.yourdomain.com
# admin-panel → admin.yourdomain.com
# restaurant-web → restaurant.yourdomain.com
# driver-app → driver.yourdomain.com
```

### 4. Nginx Configuration
```bash
# Copy nginx.production.conf to /etc/nginx/nginx.conf
# Restart nginx
sudo nginx -t
sudo systemctl restart nginx
```

### 5. SSL Certificate Setup
```bash
# Use Let's Encrypt for SSL certificates
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 🔍 Post-Deployment Validation

### Health Checks
```bash
# Backend health
curl https://api.yourdomain.com/health

# Frontend health checks
curl https://customer.yourdomain.com/health
curl https://admin.yourdomain.com/health
curl https://restaurant.yourdomain.com/health
curl https://driver.yourdomain.com/health
```

### CORS Validation
```bash
# Test CORS headers from each frontend domain
curl -H "Origin: https://customer.yourdomain.com" \
     https://api.yourdomain.com/api/health
```

### WebSocket Connection Test
```bash
# Test WebSocket connection from frontend
# Should establish connection without CORS errors
```

## 📊 Monitoring Setup

### Error Tracking
- [ ] Sentry DSN configured in all frontends
- [ ] Backend error logging enabled
- [ ] Alert rules for critical errors

### Performance Monitoring
- [ ] Response time monitoring for API endpoints
- [ ] Frontend bundle size monitoring
- [ ] Database query performance tracking

## 🛡️ Security Checklist

### Secrets Management
- [ ] All production secrets rotated
- [ ] No development keys in production
- [ ] Environment variables properly secured

### Network Security
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] SSL/TLS properly configured
- [ ] Security headers present

### Data Protection
- [ ] Database backups configured
- [ ] Sensitive data encryption
- [ ] GDPR compliance verified

---

## GO/NO-GO Decision Criteria

### GO ✅
- All builds successful
- All tests passing (including 10x E2E)
- All configurations validated
- Security checklist complete
- Manual testing successful

### NO-GO ❌
- Any build failures
- Test failure rate > 20%
- Configuration issues
- Security vulnerabilities
- Manual test failures

**Decision Maker:** Tech Lead / Release Manager
**Approval Required:** Yes
**Rollback Plan:** Available (database backup + previous deployment)
