# Manual Smoke Test Playbook - UberFoods Monorepo

## Overview

This playbook provides a systematic approach to manually test the UberFoods platform locally. The smoke test validates core functionality across all 4 frontend applications and the backend API, ensuring stable local development and deployment readiness.

## Prerequisites

### System Requirements
- **OS**: Windows 10/11 with PowerShell
- **Node.js**: v18+ (check with `node --version`)
- **npm/pnpm**: Latest version
- **Docker Desktop**: Running and accessible
- **Git**: For version control

### Environment Setup
1. **Clone Repository**
   ```powershell
   git clone <repo-url>
   cd UberFoods
   ```

2. **Install Dependencies**
   ```powershell
   # Root dependencies (if any)
   npm install

   # Frontend apps
   cd frontend/admin-panel && npm install && cd ../..
   cd frontend/customer-web && npm install && cd ../..
   cd frontend/restaurant-web && npm install && cd ../..
   cd frontend/driver-app && npm install && cd ../..
   ```

3. **Environment Files**
   - Copy `.env.example` files to `.env` in each app directory
   - Ensure `backend/.env` has correct `DATABASE_URL` and `REDIS_URL`
   - Verify API endpoints point to `http://localhost:3000`

### Ports Configuration
| Service | Port | URL |
|---------|------|-----|
| Backend API | 3000 | http://localhost:3000 |
| Customer Web | 3001 | http://localhost:3001 |
| Admin Panel | 3002 | http://localhost:3002 |
| Restaurant Web | 3003 | http://localhost:3003 |
| Driver App | 3004 | http://localhost:3004 |
| PostgreSQL | 5434 | localhost:5434 |
| Redis | 6379 | localhost:6379 |

## Start Sequence

### Option A: Manual Start (Recommended for Testing)

1. **Start Infrastructure**
   ```powershell
   docker compose up -d postgres redis
   ```

2. **Start Backend**
   ```powershell
   cd backend
   npm run dev
   # Should start on http://localhost:3000
   ```

3. **Start Frontend Apps** (in separate terminals)
   ```powershell
   # Terminal 1: Admin Panel
   cd frontend/admin-panel
   npm run dev

   # Terminal 2: Customer Web
   cd frontend/customer-web
   npm run dev

   # Terminal 3: Restaurant Web
   cd frontend/restaurant-web
   npm run dev

   # Terminal 4: Driver App
   cd frontend/driver-app
   npm run dev
   ```

### Option B: Automated Start (using existing scripts)
```powershell
# Use existing start script
./scripts/start-dev.sh
```

## Test Matrix

### 1. Admin Panel (http://localhost:3002)

#### Core Functionality Tests
- [ ] **Page Load**: Admin panel loads without errors
- [ ] **Login**: Login with admin@uberfoods.local / Admin123!
- [ ] **Dashboard**: Overview metrics display correctly
- [ ] **Restaurant Management**: View/edit restaurants list
- [ ] **Customer Management**: View customers list
- [ ] **Order Management**: View orders list
- [ ] **Analytics**: Charts and reports load
- [ ] **Settings**: Configuration pages accessible

#### Expected Results
- ✅ Clean login flow
- ✅ No console errors
- ✅ All navigation works
- ✅ Data loads in tables/charts
- ✅ CRUD operations functional

### 2. Customer Web (http://localhost:3001)

#### Core Functionality Tests
- [ ] **Page Load**: Customer app loads without errors
- [ ] **Browse Restaurants**: Restaurant list displays
- [ ] **View Restaurant Menu**: Menu items load correctly
- [ ] **Search/Filter**: Restaurant search works
- [ ] **Cart Functionality**: Add/remove items
- [ ] **Checkout Process**: Order placement flow
- [ ] **Order History**: Previous orders visible
- [ ] **Profile Management**: User settings accessible

#### Expected Results
- ✅ Smooth navigation between pages
- ✅ Real-time cart updates
- ✅ Payment integration (if enabled)
- ✅ Order status updates
- ✅ No broken links/images

### 3. Restaurant Web (http://localhost:3003)

#### Core Functionality Tests
- [ ] **Page Load**: Restaurant portal loads
- [ ] **Restaurant Login**: restaurant@uberfoods.local / Restaurant123!
- [ ] **Dashboard**: Order overview displays
- [ ] **Menu Management**: View/edit menu items
- [ ] **Order Management**: Accept/reject orders
- [ ] **Kitchen Display**: Real-time order updates
- [ ] **Analytics**: Restaurant performance metrics
- [ ] **Settings**: Restaurant configuration

#### Expected Results
- ✅ WebSocket order notifications work
- ✅ Order status updates propagate
- ✅ Menu CRUD operations functional
- ✅ Real-time kitchen updates

### 4. Driver App (http://localhost:3004)

#### Core Functionality Tests
- [ ] **Page Load**: Driver app loads without errors
- [ ] **Driver Login**: Use test driver credentials
- [ ] **Dashboard**: Available deliveries display
- [ ] **Route Optimization**: Maps and directions work
- [ ] **Order Acceptance**: Accept delivery assignments
- [ ] **Delivery Tracking**: GPS/location updates
- [ ] **Status Updates**: Mark orders delivered
- [ ] **Earnings Dashboard**: Driver earnings visible

#### Expected Results
- ✅ WebSocket real-time updates
- ✅ Map integration functional
- ✅ GPS tracking works
- ✅ Order status synchronization

### 5. Backend API (http://localhost:3000)

#### Health Checks
- [ ] **Health Endpoint**: GET /api/health returns 200
- [ ] **Database Connection**: No connection errors in logs
- [ ] **Redis Connection**: Cache operations work
- [ ] **WebSocket Server**: Socket.io connections accepted

#### API Tests
- [ ] **Authentication**: Login endpoints work
- [ ] **Public APIs**: Restaurant listings, menus
- [ ] **Protected APIs**: Admin/customer/restaurant endpoints
- [ ] **File Upload**: Image/document uploads work
- [ ] **WebSocket Events**: Real-time notifications

## Prüfpunkte

### Network & CORS
- [ ] All API calls return 200/201 (not 5xx)
- [ ] CORS headers present on all requests
- [ ] No network errors in browser dev tools
- [ ] WebSocket connections establish successfully

### Authentication & Authorization
- [ ] JWT tokens generated and validated
- [ ] Role-based access control works
- [ ] Session persistence across page reloads
- [ ] Logout clears tokens properly

### WebSocket & Real-time Features
- [ ] Socket.io connection establishes on app load
- [ ] Order status updates propagate in real-time
- [ ] Driver location updates work
- [ ] Kitchen display updates live

### Error Handling
- [ ] 404 pages display correctly
- [ ] 500 errors show user-friendly messages
- [ ] Network failures handled gracefully
- [ ] Form validation works properly

### Performance
- [ ] Initial page loads < 3 seconds
- [ ] API responses < 500ms
- [ ] No memory leaks (check dev tools)
- [ ] Images/assets load without errors

## Evidence Collection Template

For each test step, document the following in `docs/manual-smoke-evidence.md`:

### Browser Console (Copy/Paste)
```
[Timestamp] Console output during test
Any errors, warnings, or important logs
```

### Network Tab (Key Failures)
```
URL: [failed endpoint]
Status: [HTTP status code]
Response: [error message/snippet]
```

### Backend Logs (During Test)
```
[Timestamp] Backend logs during the failing operation
Stack traces, database errors, etc.
```

### Screenshots
- [ ] Error pages/screenshots
- [ ] Console errors
- [ ] Network failures
- [ ] Broken UI elements

## Abbruchkriterien

### Critical Failures (Stop Testing)
- ❌ Backend won't start or crashes immediately
- ❌ Database connection failures
- ❌ Any app fails to load (blank screen, infinite loading)
- ❌ Authentication completely broken
- ❌ WebSocket connections fail to establish

### Non-Critical Issues (Continue Testing)
- ⚠️ UI styling issues
- ⚠️ Minor API response delays
- ⚠️ Missing placeholder data
- ⚠️ Non-essential features broken

### Typical Root Causes
1. **Port Conflicts**: Check `netstat -ano | findstr :300[0-4]`
2. **Environment Variables**: Verify `.env` files exist and are correct
3. **Database Issues**: Check `docker ps` and `docker logs postgres`
4. **Dependencies**: Run `npm install` in all directories
5. **CORS Issues**: Backend not running or misconfigured
6. **WebSocket**: Firewall blocking or backend WebSocket server down

## Success Criteria

A smoke test **PASSES** when:
- ✅ All 5 applications load without critical errors
- ✅ Authentication works for all user types
- ✅ Core business flows complete successfully
- ✅ No 5xx errors in backend
- ✅ WebSocket connections establish
- ✅ No console errors blocking functionality
- ✅ All manual test steps complete within 30 minutes

## Post-Test Actions

1. **Log Results**: Update evidence template with findings
2. **Stop Services**:
   ```powershell
   docker compose down
   # Kill any remaining Node processes
   ```
3. **Report Issues**: Create GitHub issues for any failures
4. **Next Steps**: Fix critical issues before proceeding to automated tests

## Troubleshooting

### Quick Diagnosis Commands
```powershell
# Check running processes
Get-Process node

# Check ports
netstat -ano | findstr :300[0-4]

# Check Docker
docker ps
docker compose logs postgres

# Check backend health
curl http://localhost:3000/api/health
```

### Common Issues & Solutions
- **Port already in use**: `netstat -ano | findstr :3002` then kill process
- **Database not ready**: Wait for health checks or `docker compose restart postgres`
- **Dependencies missing**: `rm -rf node_modules && npm install` in each app
- **CORS errors**: Check backend CORS configuration
- **WebSocket fails**: Verify backend WebSocket server is running

---

**Test Duration**: ~20-30 minutes
**Tester**: Manual QA / Developer
**Environment**: Local Windows Development
**Success Rate Target**: 100% for core functionality