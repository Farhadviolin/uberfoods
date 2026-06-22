# Environment Variables Matrix - UberFoods Production Deployment

This matrix reflects the current runtime names used by the application and deployment manifests.
Legacy names may still appear in old logs or historical notes, but they should be treated as deprecated.

## Backend Service (backend-web)

| Variable | Scope | Required | Notes |
|---|---|---:|---|
| `DATABASE_URL` | runtime | yes | PostgreSQL connection string |
| `JWT_SECRET` | runtime | yes | JWT signing secret |
| `JWT_REFRESH_SECRET` | runtime | yes | Refresh-token signing secret |
| `NODE_ENV` | runtime | yes | Must be `production` in production |
| `PORT` | runtime | yes | Render assigns this automatically |
| `REDIS_URL` | runtime | yes | Redis connection string |
| `ALLOWED_ORIGINS` | runtime | yes | Comma-separated frontend origins |
| `SENTRY_DSN` | runtime | no | Optional error tracking |
| `STRIPE_SECRET_KEY` | runtime | yes | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | runtime | yes | Stripe webhook signing secret |
| `PAYPAL_CLIENT_ID` | runtime | yes | PayPal client ID |
| `PAYPAL_CLIENT_SECRET` | runtime | yes | PayPal client secret |
| `PAYPAL_ENVIRONMENT` | runtime | yes | `sandbox` or `live` |
| `SMTP_HOST` | runtime | yes | SMTP server hostname |
| `SMTP_PORT` | runtime | yes | SMTP port |
| `SMTP_USER` | runtime | yes | SMTP username |
| `SMTP_PASSWORD` | runtime | yes | SMTP password |
| `SMTP_FROM_EMAIL` | runtime | yes | Sender email address |
| `SMTP_FROM_NAME` | runtime | yes | Sender display name |
| `SENDGRID_API_KEY` | runtime | no | Only if SendGrid is used |
| `SENDGRID_FROM_EMAIL` | runtime | no | SendGrid sender email |
| `SENDGRID_FROM_NAME` | runtime | no | SendGrid sender name |
| `VAPID_PUBLIC_KEY` | runtime | no | Push notifications |
| `VAPID_PRIVATE_KEY` | runtime | no | Push notifications |
| `DEFAULT_DRIVER_PASSWORD` | seed/dev | no | Never set in production |
| `SEED_ADMIN_*` | seed/dev | no | Never set in production |
| `SEED_CUSTOMER_*` | seed/dev | no | Never set in production |
| `SEED_RESTAURANT_*` | seed/dev | no | Never set in production |
| `SEED_DRIVER_*` | seed/dev | no | Never set in production |

Legacy names you may still see in older docs/logs:

- `SMTP_PASS` → deprecated in favor of `SMTP_PASSWORD`
- `FROM_EMAIL` → deprecated in favor of `SMTP_FROM_EMAIL`
- `SUPPORT_EMAIL` → deprecated; use the runtime mail sender fields above

## Frontend Services

All frontends are built with Vite and deployed as static sites. Their variables are build-time inputs.

### Customer Web (`frontend/customer-web`)

| Variable | Required | Notes |
|---|---:|---|
| `VITE_API_BASE_URL` | yes | Backend API base URL, including `/api` |
| `VITE_WS_URL` | yes | WebSocket URL |
| `VITE_APP_NAME` | yes | Display name |
| `VITE_STRIPE_PUBLISHABLE_KEY` | no | Stripe publishable key |
| `VITE_GOOGLE_MAPS_API_KEY` | no | Maps key |
| `VITE_ENABLE_SOCIAL_FEATURES` | no | Feature flag |
| `VITE_ENABLE_VOICE_ASSISTANT` | no | Feature flag |
| `VITE_ENABLE_GAMIFICATION` | no | Feature flag |
| `VITE_ENABLE_ANALYTICS` | no | Feature flag |
| `VITE_ENABLE_NOTIFICATIONS` | no | Feature flag |
| `VITE_ENABLE_GEOCODING` | no | Feature flag |

### Admin Panel (`frontend/admin-panel`)

| Variable | Required | Notes |
|---|---:|---|
| `VITE_API_URL` | yes | Backend API base URL |
| `VITE_WS_URL` | yes | WebSocket URL |
| `VITE_APP_NAME` | yes | Display name |
| `VITE_CUSTOMER_WEB_URL` | yes | Customer-web base URL |
| `VITE_DRIVER_APP_URL` | yes | Driver-app base URL |
| `VITE_RESTAURANT_WEB_URL` | yes | Restaurant-web base URL |
| `VITE_SKIP_AUTH` | no | Development only |
| `VITE_DEV_AUTH_TOKEN` | no | Development only |

### Restaurant Web (`frontend/restaurant-web`)

| Variable | Required | Notes |
|---|---:|---|
| `VITE_API_URL` | yes | Backend API base URL |
| `VITE_WS_URL` | yes | WebSocket URL |
| `VITE_APP_NAME` | yes | Display name |
| `VITE_ALLOWED_EXTERNAL_HOSTS` | no | Optional host allow-list |

### Driver App (`frontend/driver-app`)

| Variable | Required | Notes |
|---|---:|---|
| `VITE_API_URL` | yes | Backend API base URL |
| `VITE_WS_URL` | yes | WebSocket URL |
| `VITE_APP_NAME` | yes | Display name |
| `VITE_GOOGLE_MAPS_API_KEY` | no | Maps key |
| `VITE_TOMTOM_API_KEY` | no | Routing/traffic key |
| `VITE_TRAFFIC_API_URL` | no | Optional traffic API endpoint |
| `VITE_ALLOW_SIMULATION` | no | Development/testing only |

### Build vs Runtime Notes

- `VITE_*` variables are embedded in the frontend bundle during build.
- Non-`VITE_` variables are backend/runtime-only.
- Customer Web intentionally uses `VITE_API_BASE_URL`.
- Admin Panel, Restaurant Web, and Driver App intentionally use `VITE_API_URL`.

### CORS / Origin Notes

`ALLOWED_ORIGINS` should include all production frontend URLs, for example:

`https://customer-web.onrender.com,https://admin-panel.onrender.com,https://restaurant-web.onrender.com,https://driver-app.onrender.com`
