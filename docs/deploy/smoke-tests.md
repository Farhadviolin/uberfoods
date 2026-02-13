# Smoke Tests for Production Deployment

## Overview

The smoke test script (`scripts/smoke.mjs`) performs basic health checks on your deployed UberFoods application to ensure it's functioning correctly after deployment.

## Usage

### Prerequisites

- Node.js installed on your local machine
- Deployed UberFoods backend accessible via HTTP/HTTPS

### Running Smoke Tests

#### Method 1: Environment Variable
```bash
BASE_URL=https://your-backend-service.onrender.com node scripts/smoke.mjs
```

#### Method 2: Command Line Argument
```bash
node scripts/smoke.mjs https://your-backend-service.onrender.com
```

#### Method 3: Using npm script (if configured)
```bash
npm run smoke -- https://your-backend-service.onrender.com
```

## What It Tests

The smoke test script checks the following endpoints:

1. **Backend Health Check** (`/api/health`)
   - Verifies the main health endpoint responds with HTTP 200
   - Tests basic backend connectivity

2. **Alternative Health Check** (`/health`)
   - Tests alternative health endpoint (some deployments use this)

3. **API Root** (`/api`)
   - Verifies the API root endpoint is accessible

4. **API Documentation** (`/api/docs`)
   - Tests if Swagger/OpenAPI documentation is accessible
   - May fail if docs are disabled in production (this is OK)

5. **OpenAPI Specification** (`/api/docs-json`)
   - Tests if the OpenAPI JSON specification is available
   - May fail if docs are disabled in production (this is OK)

## Expected Results

### Successful Deployment
```
🚀 Starting UberFoods Production Smoke Tests
===========================================
Base URL: https://your-backend.onrender.com
🔍 Testing Backend Health Check (/api/health)...
✅ Backend Health Check (/api/health) - Status: 200
🔍 Testing Alternative Health Check (/health)...
✅ Alternative Health Check (/health) - Status: 200
🔍 Testing API Root (/api)...
✅ API Root (/api) - Status: 200
🔍 Testing API Documentation (/api/docs)...
✅ API Documentation (/api/docs) - Status: 200
🔍 Testing OpenAPI Specification (/api/docs-json)...
✅ OpenAPI Specification (/api/docs-json) - Status: 200

===========================================
🎉 All smoke tests passed! (5/5)
✅ Production deployment appears healthy
```

### Partial Success (Common Scenario)
```
🚀 Starting UberFoods Production Smoke Tests
===========================================
Base URL: https://your-backend.onrender.com
🔍 Testing Backend Health Check (/api/health)...
✅ Backend Health Check (/api/health) - Status: 200
🔍 Testing Alternative Health Check (/health)...
❌ Alternative Health Check (/health) - Expected: 200, Got: 404
🔍 Testing API Root (/api)...
✅ API Root (/api) - Status: 200
🔍 Testing API Documentation (/api/docs)...
❌ API Documentation (/api/docs) - Expected: 200, Got: 404
🔍 Testing OpenAPI Specification (/api/docs-json)...
❌ OpenAPI Specification (/api/docs-json) - Expected: 200, Got: 404

===========================================
❌ Some smoke tests failed! (2/5 passed)
```

In this case, the deployment is still healthy - API docs are often disabled in production for security reasons.

## Troubleshooting Failed Tests

### Backend Health Check Fails

**Symptoms:**
- `/api/health` returns non-200 status or times out

**Possible Causes:**
1. **Backend not fully started**: Wait 2-3 minutes after deployment
2. **Environment variables missing**: Check `JWT_SECRET`, `DATABASE_URL`
3. **Database connection failed**: Verify `DATABASE_URL` is correct
4. **Port configuration**: Ensure backend binds to `process.env.PORT`

**Debug Steps:**
```bash
# Check Render logs for the backend service
# Verify environment variables are set
# Test database connectivity locally
```

### API Root Fails

**Symptoms:**
- `/api` returns non-200 status

**Possible Causes:**
1. **CORS issues**: Check `ALLOWED_ORIGINS` includes your test origin
2. **Routing issues**: Verify NestJS routing is configured correctly
3. **Middleware blocking**: Check security middleware configuration

### Timeout Errors

**Symptoms:**
- Tests time out after 10 seconds

**Possible Causes:**
1. **Service not responding**: Backend may have crashed
2. **Network issues**: Firewall blocking requests
3. **Cold start**: Serverless platforms may have startup delays

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run Smoke Tests
  run: |
    BASE_URL=https://your-production-url.onrender.com node scripts/smoke.mjs
  continue-on-error: false
```

### Render Post-Deploy Hook
Add this to your Render service settings:

```bash
curl -f https://your-backend.onrender.com/api/health || exit 1
```

## Advanced Testing

For more comprehensive testing after smoke tests pass:

### Frontend Accessibility
```bash
# Test that frontends are accessible
curl -I https://your-admin-panel.onrender.com
curl -I https://your-customer-web.onrender.com
curl -I https://your-restaurant-web.onrender.com
curl -I https://your-driver-app.onrender.com
```

### Database Connectivity
```bash
# Test database migrations (run locally with prod DATABASE_URL)
export DATABASE_URL="your-production-database-url"
cd backend
npx prisma migrate deploy
npx prisma db push --accept-data-loss
```

### API Functionality
```bash
# Test basic API endpoints
curl https://your-backend.onrender.com/api/health
curl https://your-backend.onrender.com/api/docs-json
```

## Security Notes

- Smoke tests use basic HTTP requests without authentication
- No sensitive data is transmitted
- Tests respect CORS policies
- Safe to run against production deployments

## Exit Codes

- `0`: All tests passed (success)
- `1`: One or more tests failed (failure)
- `1`: Script error (configuration issue)
