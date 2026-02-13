# Environment Variables Matrix - UberFoods Production Deployment

## Backend Service (backend-web)

### Required Environment Variables

#### Critical (Application will fail to start without these)
- `DATABASE_URL` - PostgreSQL connection string (e.g., `postgresql://user:pass@host:port/db`)
- `JWT_SECRET` - Secret key for JWT token signing (minimum 32 characters)
- `JWT_REFRESH_SECRET` - Secret key for refresh token signing (minimum 32 characters)

#### Essential (Required for production functionality)
- `NODE_ENV` - Must be set to `production`
- `PORT` - Server port (Render provides this automatically)
- `REDIS_URL` - Redis connection URL for caching and WebSocket adapter
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins (production frontend URLs)
- `SENTRY_DSN` - Sentry DSN for error tracking (optional but recommended)

#### Payment & External Services
- `STRIPE_SECRET_KEY` - Stripe secret key for payment processing
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret for payment confirmation
- `PAYPAL_CLIENT_ID` - PayPal client ID
- `PAYPAL_CLIENT_SECRET` - PayPal client secret
- `PAYPAL_ENVIRONMENT` - `sandbox` or `live`

#### Email & Communication
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port
- `SMTP_USER` - SMTP authentication username
- `SMTP_PASS` - SMTP authentication password
- `FROM_EMAIL` - Default from email address
- `SUPPORT_EMAIL` - Support contact email

#### Push Notifications
- `VAPID_PUBLIC_KEY` - VAPID public key for push notifications
- `VAPID_PRIVATE_KEY` - VAPID private key for push notifications

#### Development/Test Variables (DO NOT SET in production)
- `DEFAULT_DRIVER_PASSWORD` - Only for development seeding
- `SEED_ADMIN_*` - Only for development seeding
- `SEED_CUSTOMER_*` - Only for development seeding
- `SEED_RESTAURANT_*` - Only for development seeding
- `SEED_DRIVER_*` - Only for development seeding

## Frontend Services

All frontend services are built with Vite and deployed as static sites.

### Build-time Environment Variables (VITE_* prefix)

#### Required for all frontends
- `VITE_API_BASE_URL` - Backend API base URL (e.g., `https://your-backend.onrender.com/api`)

#### Admin Panel (admin-panel)
- `VITE_APP_TITLE` - Application title (optional, defaults to "UberFoods Admin")
- `VITE_SKIP_AUTH` - Set to `true` to skip authentication in development (NEVER in production)
- `VITE_DEV_AUTH_TOKEN` - Development authentication token (NEVER in production)

#### Customer Web (customer-web)
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key for frontend payment processing
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API key for location services
- `VITE_ENABLE_SOCIAL_FEATURES` - `true`/`false` to enable social features
- `VITE_ENABLE_VOICE_ASSISTANT` - `true`/`false` to enable voice assistant
- `VITE_ENABLE_GAMIFICATION` - `true`/`false` to enable gamification
- `VITE_ENABLE_ANALYTICS` - `true`/`false` to enable analytics
- `VITE_ENABLE_NOTIFICATIONS` - `true`/`false` to enable push notifications
- `VITE_ENABLE_GEOCODING` - `true`/`false` to enable geocoding features

#### Restaurant Web (restaurant-web)
- `VITE_APP_NAME` - Application name (optional)

#### Driver App (driver-app)
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API key for navigation
- `VITE_APP_VERSION` - Application version (optional)

## Deployment Notes

### Environment Variable Security
- Never commit actual values to version control
- Use Render's environment variable management for production
- Rotate secrets regularly
- Use different values for staging/production environments

### Build vs Runtime Variables
- `VITE_*` variables are embedded in the built JavaScript bundle
- Regular variables (without VITE_ prefix) are server-side only
- Frontend can only access VITE_ prefixed variables

### Database Considerations
- `DATABASE_URL` should point to a production PostgreSQL instance
- Ensure connection pooling is configured appropriately
- Database should be in the same region as the application for performance

### Redis Considerations
- `REDIS_URL` should point to a production Redis instance
- Consider using managed Redis services (Render provides this)
- Redis is required for WebSocket functionality and caching

### CORS Configuration
- `ALLOWED_ORIGINS` should include all production frontend URLs
- Format: `https://customer-web.onrender.com,https://admin-panel.onrender.com,https://restaurant-web.onrender.com,https://driver-app.onrender.com`
