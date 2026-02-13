# CI/CD Integration - API Verification Scripts

This document explains the CI/CD integration for the UberFoods API verification scripts that ensure backend functionality works correctly.

## 🚀 CI Workflows

### 1. Main CI Pipeline (`ci.yml`)
- **Triggers**: Push/PR to `main` and `develop` branches
- **Jobs**:
  - `api-verification`: Tests backend API endpoints and functionality
  - `frontend-e2e`: Runs Playwright E2E tests for all frontend apps
  - `build`: Ensures all applications build successfully

### 2. API Verification (`api-verification.yml`)
- **Triggers**: Push/PR to `main` and `develop`, manual dispatch
- **Purpose**: Dedicated API testing with comprehensive verification
- **Databases**: PostgreSQL service for isolated testing

### 3. Local Development (`local-development.yml`)
- **Triggers**: Manual dispatch only
- **Purpose**: On-demand testing for development verification
- **Options**: Run all tests, API-only, or frontend-only

## 🧪 Verification Scripts

### `final-verification.ps1` - Complete System Test
Tests the entire API ecosystem:

1. **Health Check**: `GET /api/health` → 200
2. **Driver Authentication**: JWT login → 200 + token
3. **RBAC Security**: 401 without token, 200 with token
4. **E2E Order Lifecycle**:
   - Customer creates order → 201
   - Restaurant sets READY_FOR_PICKUP → 200
   - Driver accepts order → 200/201
   - Driver marks DELIVERED → 200
   - Admin verifies DELIVERED + driverId → 200

### `smoke-driver.ps1` - Driver Operations Test
Focuses on driver-specific functionality:

1. **Authentication**: JWT token generation
2. **Security**: All endpoints require Bearer token (401)
3. **Operations**: Order creation, status updates, availability checks
4. **RBAC**: Driver-specific access controls

## 🔧 Technical Implementation

### PowerShell + curl.exe Architecture
The scripts use a robust `Invoke-CurlJson` function that:

- **Handles JSON safely**: Writes to UTF-8 no-BOM temp files
- **Cross-platform**: Works on Windows, Linux, macOS
- **CI/CD compatible**: No PowerShell-specific dependencies
- **Error resilient**: Proper status code and JSON parsing

```powershell
# Example usage
$result = Invoke-CurlJson -Method "POST" -Url "http://localhost:3000/api/orders" -Body @{
  customerId = "test123"
  restaurantId = "rest123"
  totalAmount = 25.99
}
```

### Database Setup
- **PostgreSQL**: Isolated test database per workflow run
- **Migrations**: Automatic Prisma schema application
- **Test Data**: Programmatic creation of test users/drivers

## 🏃‍♂️ Running Locally

### Prerequisites
- PowerShell 7+ (recommended) or Windows PowerShell
- Node.js 20+
- PostgreSQL (local or Docker)

### Quick Test
```bash
# Start backend in E2E mode
cd backend
npm run start:e2e

# Run verification scripts
pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File ./scripts/final-verification.ps1
pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke-driver.ps1
```

### Full Local Setup
```bash
# Database
docker run -d -p 5434:5432 -e POSTGRES_PASSWORD=postgres123 postgres:15

# Backend setup
cd backend
npm ci
npx prisma generate
npx prisma db push
node scripts/create-test-driver.js

# Start E2E backend
npm run start:e2e &

# Run tests
pwsh -ExecutionPolicy Bypass -File ./scripts/final-verification.ps1
pwsh -ExecutionPolicy Bypass -File ./scripts/smoke-driver.ps1
```

## 📊 Test Results

### Expected Output
```
🚀 Starting Final Verification...

1. Testing Health Check...
✅ Health Check: 200 - Status: ok

2. Testing Driver Login...
✅ Driver Login: 201
   Access Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

3. Testing Driver Authentication RBAC...
✅ Driver Auth (no token): 401 (correct)
✅ Driver Auth (with token): 200

4. Testing E2E Order Lifecycle...
   Step 1: Customer creates order...
✅ Order Created: 201 - ID: order_xxx
   Step 2: Restaurant sets READY_FOR_PICKUP...
✅ Order Status Updated: 200 - Status: READY_FOR_PICKUP
   Step 3: Driver accepts order...
✅ Order Accepted: 201 - Status: IN_TRANSIT, Driver: driver_xxx
   Step 4: Driver marks DELIVERED...
✅ Order Delivered: 200 - Status: DELIVERED
   Step 5: Admin verifies final status...
✅ Admin Verification: 200 - Status: DELIVERED, Driver: driver_xxx

🎉 Final Verification PASSED!
```

## 🔒 Security Gates

The scripts enforce these critical security requirements:

- **Authentication Required**: All driver endpoints return 401 without JWT
- **Valid JWT Accepted**: Proper Bearer tokens allow access (200)
- **RBAC Enforced**: Only assigned drivers can update orders
- **Data Integrity**: Real Prisma IDs, proper status transitions
- **Admin Verification**: Final state includes correct driver assignment

## 🚨 Troubleshooting

### Common Issues

**"Invoke-WebRequest not available"**
- Use `pwsh` (PowerShell 7+) instead of `powershell.exe`
- Scripts automatically fall back to curl.exe

**"Database connection failed"**
- Ensure PostgreSQL is running on port 5434
- Check DATABASE_URL environment variable

**"Backend not responding"**
- Wait for backend to fully start (15+ seconds)
- Verify `/api/health` endpoint responds

**"Script hangs"**
- Check for background processes consuming ports
- Kill any existing Node.js processes on port 3000

### Debug Mode
Add `-Verbose` to PowerShell commands for detailed logging:
```bash
pwsh -ExecutionPolicy Bypass -File ./scripts/final-verification.ps1 -Verbose
```

## 📈 CI/CD Benefits

- **Automated Testing**: Every PR automatically tested
- **Security Gates**: Authentication and authorization verified
- **Regression Prevention**: E2E flow ensures feature integrity
- **Cross-Platform**: Works on all CI environments
- **Fast Feedback**: Failures caught before deployment

## 🎯 Next Steps

1. **Enable workflows** in GitHub repository settings
2. **Configure branch protection** to require CI passing
3. **Add Slack notifications** for CI failures
4. **Extend coverage** to additional API endpoints
5. **Performance testing** integration
