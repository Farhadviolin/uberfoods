# Production Deployment Runbook - UberFoods

## Overview

This runbook guides you through deploying UberFoods to Render using the provided Blueprint. The deployment creates 5 services:

- **backend-web**: NestJS API server
- **admin-panel**: Admin dashboard (static site)
- **customer-web**: Customer-facing app (static site)
- **restaurant-web**: Restaurant management (static site)
- **driver-app**: Driver mobile interface (static site)

## Prerequisites

- Render account with billing enabled
- Database (PostgreSQL) and Redis instances
- Payment processor accounts (Stripe, PayPal)
- Email service (SMTP) credentials
- Push notification keys (VAPID)

## Render Deployment Steps

### Step 1: Import Blueprint

1. Render Dashboard → New → Blueprint → Import from Git
2. Wähle das Repository aus, das mit deinem Render Account verbunden ist (aus "git remote -v" ersichtlich)
3. Wähle den Branch, den du deployen willst (aus "git branch --show-current")
4. Render erkennt render.yaml automatisch
5. Setze ENV Variablen laut docs/deploy/env-matrix.md (Backend vs Static Sites getrennt)
6. Deploy

### Step 2: Configure Services

The blueprint will create 5 services. Configure each one:

#### Backend Service (backend-web)
Set these environment variables:

```bash
# Required - Copy from env-matrix.md
NODE_ENV=production
PORT=10000  # Render sets this automatically
DATABASE_URL=postgresql://...
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
REDIS_URL=redis://...
ALLOWED_ORIGINS=https://customer-web.onrender.com,https://admin-panel.onrender.com,https://restaurant-web.onrender.com,https://driver-app.onrender.com
STRIPE_SECRET_KEY=STRIPE_SECRET_KEY_PLACEHOLDER_...
STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET_PLACEHOLDER_...
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_ENVIRONMENT=live
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=UberFoods
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
SUPPORT_PHONE=+1234567890
```

#### Frontend Services
Each frontend service needs:

```bash
# Admin Panel
VITE_API_URL=https://your-backend-service.onrender.com/api
VITE_WS_URL=wss://your-backend-service.onrender.com
VITE_APP_NAME=UberFoods Admin Panel
VITE_CUSTOMER_WEB_URL=https://customer-web.onrender.com
VITE_DRIVER_APP_URL=https://driver-app.onrender.com
VITE_RESTAURANT_WEB_URL=https://restaurant-web.onrender.com

# Customer Web
VITE_API_BASE_URL=https://your-backend-service.onrender.com/api
VITE_WS_URL=wss://your-backend-service.onrender.com
VITE_APP_NAME=UberFoods
VITE_STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY_PLACEHOLDER_...
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key

# Restaurant Web
VITE_API_URL=https://your-backend-service.onrender.com/api
VITE_WS_URL=wss://your-backend-service.onrender.com
VITE_APP_NAME=UberFoods Restaurant

# Driver App
VITE_API_URL=https://your-backend-service.onrender.com/api
VITE_WS_URL=wss://your-backend-service.onrender.com
VITE_APP_NAME=UberFoods Driver
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key
VITE_TOMTOM_API_KEY=your-tomtom-api-key
VITE_TRAFFIC_API_URL=https://your-traffic-api.example.com
VITE_ALLOW_SIMULATION=false
```

### Step 3: Deploy

1. After configuring all environment variables, click "Create Blueprint"
2. Render will build and deploy all services
3. Monitor deployment logs for each service
4. Backend deployment includes database migrations (`prisma migrate deploy`)

## Post-Deployment Verification

### Run Smoke Tests

After all services are deployed, run the smoke test:

```bash
# Install Node.js locally if needed
node scripts/smoke.mjs https://your-backend-service.onrender.com
```

Expected output:
```
🚀 Starting UberFoods Production Smoke Tests
===========================================
Base URL: https://your-backend-service.onrender.com
🔍 Testing Backend Health Check (/api/health)...
✅ Backend Health Check (/api/health) - Status: 200
🔍 Testing Alternative Health Check (/health)...
✅ Alternative Health Check (/health) - Status: 200
🔍 Testing API Root (/api)...
✅ API Root (/api) - Status: 200
===========================================
🎉 All smoke tests passed! (3/3)
✅ Production deployment appears healthy
```

### Manual Verification

1. **Backend Health**: Visit `https://your-backend-service.onrender.com/api/health`
2. **Frontend Access**: Test each frontend URL loads correctly
3. **API Connectivity**: Check browser dev tools for successful API calls

## Environment Variables Reference

See `docs/deploy/env-matrix.md` for complete list of required environment variables.

## Troubleshooting

### Common Issues

#### Backend Won't Start
- Check `JWT_SECRET` and `DATABASE_URL` are set
- Verify database is accessible
- Check Render logs for specific errors

#### Frontend Shows API Errors
- Verify the app-specific frontend API variable points to the correct backend URL (`VITE_API_BASE_URL` for customer-web, `VITE_API_URL` for admin-panel/restaurant-web/driver-app)
- Check CORS configuration (`ALLOWED_ORIGINS`)

#### Database Migration Fails
- Ensure `DATABASE_URL` has correct permissions
- Check database server allows connections from Render IPs

### Logs and Monitoring

- **Render Logs**: Available in each service's dashboard
- **Health Checks**: Use `/api/health` endpoint
- **Database**: Monitor connection pools and query performance

## Rollback

If deployment fails:

1. Go to Render service dashboard
2. Click "Manual Deploy" → "Deploy latest commit" (previous working version)
3. Or redeploy previous working commit from Git history

## Security Notes

- Never commit real secrets to repository
- Use Render's environment variable management
- Rotate API keys regularly
- Monitor for unusual activity

## Performance Optimization

- Backend includes automatic compression
- Frontends are optimized static builds
- Enable Redis for session storage and caching
- Monitor response times and scale as needed

## Support

For deployment issues:
1. Check Render documentation
2. Review this runbook and `docs/deploy/` files
3. Check GitHub issues for known problems
4. Contact development team with specific error messages
