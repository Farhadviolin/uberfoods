# UberFoods Staging ENV Template

## Backend
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
REDIS_URL=redis://HOST:6379
JWT_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://customer.example.com,https://admin.example.com,https://restaurant.example.com,https://driver.example.com
STRIPE_SECRET_KEY=REPLACE_WITH_STRIPE_SECRET
STRIPE_WEBHOOK_SECRET=REPLACE_WITH_STRIPE_WEBHOOK_SECRET
PAYPAL_CLIENT_ID=REPLACE_WITH_PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET=REPLACE_WITH_PAYPAL_CLIENT_SECRET
PAYPAL_MODE=sandbox
FRONTEND_CUSTOMER_URL=https://customer.example.com
FRONTEND_ADMIN_URL=https://admin.example.com
FRONTEND_RESTAURANT_URL=https://restaurant.example.com
FRONTEND_DRIVER_URL=https://driver.example.com
```

## Customer-Web
```env
VITE_API_BASE_URL=https://backend.example.com/api
VITE_WS_URL=wss://backend.example.com
VITE_APP_ENV=staging
VITE_APP_NAME=UberFoods Customer
```

## Admin-Panel
```env
VITE_API_BASE_URL=https://backend.example.com/api
VITE_WS_URL=wss://backend.example.com
VITE_APP_ENV=staging
VITE_APP_NAME=UberFoods Admin
```

## Restaurant-Web
```env
VITE_API_BASE_URL=https://backend.example.com/api
VITE_WS_URL=wss://backend.example.com
VITE_APP_ENV=staging
VITE_APP_NAME=UberFoods Restaurant
```

## Driver-App
```env
VITE_API_BASE_URL=https://backend.example.com/api
VITE_WS_URL=wss://backend.example.com
VITE_APP_ENV=staging
VITE_APP_NAME=UberFoods Driver
```
