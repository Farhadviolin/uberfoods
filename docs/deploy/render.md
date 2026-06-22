# Render Deployment Guide

## Overview

This guide covers deploying UberFoods to Render using the provided `render.yaml` blueprint. The deployment consists of:

- **Backend Web Service** (Node.js/NestJS) - API server with database and Redis
- **Admin Panel** (Static Site) - React admin interface
- **Customer Web** (Static Site) - React customer-facing application
- **Restaurant Web** (Static Site) - React restaurant management interface
- **Driver App** (Static Site) - React driver mobile interface

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Push this code to a GitHub repository
3. **External Services**: Set up the following services and obtain API keys:
   - PostgreSQL database (Render managed or external)
   - Redis instance (Render managed or external)
   - Stripe account for payments
   - Google Maps API key
   - SMTP service for emails
   - Sentry for error tracking (optional but recommended)
   - PayPal developer account (optional)

## Deployment Steps

### 1. Connect Repository to Render

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Select the repository containing this UberFoods code
5. Render will automatically detect the `render.yaml` file

### 2. Configure Environment Variables

Before deploying, you need to set environment variables for each service. Click on each service in Render and add the following variables:

#### Backend Service (backend-web)
```
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-min-32-chars
REDIS_URL=redis://host:port  # or use Render's Redis addon
ALLOWED_ORIGINS=https://customer-web.onrender.com,https://admin-panel.onrender.com,https://restaurant-web.onrender.com,https://driver-app.onrender.com
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id  # Optional
STRIPE_SECRET_KEY=STRIPE_SECRET_KEY_PLACEHOLDER_...
STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET_PLACEHOLDER_...
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@uberfoods.com
SMTP_FROM_NAME=UberFoods
# Optional alternative if you send via SendGrid instead of SMTP:
# SENDGRID_API_KEY=your-sendgrid-api-key
# SENDGRID_FROM_EMAIL=noreply@uberfoods.com
# SENDGRID_FROM_NAME=UberFoods
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
SUPPORT_PHONE=+43-1-234-5678
```

#### Admin Panel (admin-panel)
```
VITE_API_URL=https://your-backend-service.onrender.com/api
VITE_APP_TITLE=UberFoods Admin Panel
```

#### Customer Web (customer-web)
```
VITE_API_BASE_URL=https://your-backend-service.onrender.com/api
VITE_STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY_PLACEHOLDER_...
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_ENABLE_SOCIAL_FEATURES=true
VITE_ENABLE_VOICE_ASSISTANT=true
VITE_ENABLE_GAMIFICATION=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_GEOCODING=true
```

#### Restaurant Web (restaurant-web)
```
VITE_API_URL=https://your-backend-service.onrender.com/api
VITE_APP_NAME=UberFoods Restaurant
```

#### Driver App (driver-app)
```
VITE_API_URL=https://your-backend-service.onrender.com/api
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_APP_VERSION=1.0.0
```

### 3. Database Setup

#### Option A: Use Render's Managed PostgreSQL
1. In Render dashboard, create a new PostgreSQL database
2. Copy the `DATABASE_URL` from the database page
3. Set this URL in the backend service environment variables

#### Option B: Use External PostgreSQL
1. Set up PostgreSQL on services like:
   - AWS RDS
   - Google Cloud SQL
   - DigitalOcean Managed Database
   - Supabase
2. Ensure the database is accessible from Render's IP ranges
3. Set the `DATABASE_URL` accordingly

### 4. Redis Setup

#### Option A: Use Render's Managed Redis
1. In Render dashboard, create a new Redis instance
2. Copy the Redis URL and set it as `REDIS_URL` in backend

#### Option B: Use External Redis
1. Set up Redis on services like:
   - Redis Labs
   - AWS ElastiCache
   - Google Cloud Memorystore
2. Set the `REDIS_URL` accordingly

### 5. Deploy the Services

1. In Render dashboard, click "Apply" on the blueprint
2. Render will build and deploy all services in the correct order
3. The backend will be deployed first, followed by the frontend applications
4. Monitor the build logs for any issues

### 6. Database Migration

After the backend is deployed, you need to run database migrations:

```bash
# If you have SSH access to the Render service, or via Render's shell
npx prisma migrate deploy
```

Alternatively, you can run this locally by connecting to your production database:

```bash
# Set DATABASE_URL to production database
export DATABASE_URL="your-production-database-url"
cd backend
npx prisma migrate deploy
```

### 7. Post-Deployment Verification

Use the smoke test script to verify your deployment:

```bash
# Test backend health
node scripts/smoke.mjs https://your-backend-service.onrender.com

# Test frontend accessibility
curl -I https://your-admin-panel.onrender.com
curl -I https://your-customer-web.onrender.com
curl -I https://your-restaurant-web.onrender.com
curl -I https://your-driver-app.onrender.com
```

### 8. Manual Reporting/PDF Smoke Check

- Open the Admin reporting / PDF area after deployment.
- Verify the page loads without a 500 error.
- Trigger an export/download if the feature is implemented.
- If reporting or PDF export is not yet fully implemented, record it as a manual verification item rather than marking it green.

## Troubleshooting

### Common Issues

#### Backend Build Fails
- Check that all environment variables are set correctly
- Ensure `DATABASE_URL` is valid and accessible
- Verify Node.js version compatibility (currently set to Node 20)

#### Frontend Build Fails
- Check that `VITE_API_BASE_URL` is correctly set
- Verify build commands are working locally first

#### Database Connection Issues
- Ensure database is running and accessible
- Check firewall settings allow Render's IP ranges
- Verify `DATABASE_URL` format is correct

#### CORS Issues
- Update `ALLOWED_ORIGINS` with the correct frontend URLs
- Ensure URLs include `https://` and no trailing slashes

### Logs and Monitoring

- **Build Logs**: Available in Render dashboard for each service
- **Runtime Logs**: View application logs in real-time
- **Error Monitoring**: Set up Sentry for production error tracking
- **Performance**: Monitor response times and resource usage

## Security Considerations

1. **Environment Variables**: Never commit secrets to version control
2. **Database**: Use strong passwords and restrict access
3. **API Keys**: Rotate keys regularly and use restricted API keys where possible
4. **HTTPS**: Render provides SSL certificates automatically
5. **CORS**: Only allow necessary origins in production

## Scaling

Render services can be scaled vertically by upgrading plans. For horizontal scaling, consider:

- Database read replicas for read-heavy workloads
- Redis clustering for high-traffic WebSocket connections
- CDN integration for static assets
- Load balancing for multiple backend instances

## Backup and Recovery

- **Database**: Set up automated backups in your database provider
- **Application**: Use Render's deployment history for rollbacks
- **Assets**: Consider using cloud storage (S3, Cloudinary) for user uploads

## Cost Optimization

- **Free Tier**: Suitable for development and testing
- **Paid Plans**: Required for production workloads
- **Database**: Start with smaller instances and scale up as needed
- **Monitoring**: Set up alerts for unusual resource usage
