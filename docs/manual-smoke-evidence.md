# Manual Smoke Test Evidence Collection

**Test Date:** YYYY-MM-DD  
**Tester:** [Your Name]  
**Environment:** Windows/PowerShell  
**Test Run ID:** [From artifacts/manual-smoke/results-*.json]

## Test Results Summary

### Overall Status
- [ ] PASS - All critical functionality works
- [ ] FAIL - Critical issues found
- [ ] PARTIAL - Some issues but core flows work

### Quick Checklist
- [ ] All apps load without blank screens
- [ ] Authentication works for all user types
- [ ] Core business flows complete
- [ ] No 5xx backend errors
- [ ] WebSocket connections establish
- [ ] No blocking console errors

---

## 1. Admin Panel (http://localhost:3002)

### Test Results
- [ ] Page loads successfully
- [ ] Login works (admin@uberfoods.local / Admin123!)
- [ ] Dashboard displays metrics
- [ ] Restaurant management functional
- [ ] Customer management works
- [ ] Order management accessible
- [ ] Analytics/charts load
- [ ] Settings/configuration works

### Browser Console Errors
```
[Paste console output here - errors, warnings, uncaught exceptions]
[Include timestamps if available]
```

### Network Tab Failures
```
URL: [failed endpoint]
Method: [GET/POST/PUT/DELETE]
Status: [HTTP status code]
Request Headers: [key headers]
Response: [error message or first 500 chars of response]
---
URL: [another failed endpoint if any]
...
```

### Screenshots Taken
- [ ] Screenshot of error page/modal
- [ ] Screenshot of console errors
- [ ] Screenshot of network failures
- [ ] Screenshot of broken UI elements

**Location:** `artifacts/manual-smoke/screenshots/admin-panel-*.png`

### Notes
[Any additional observations, performance issues, UI glitches]

---

## 2. Customer Web (http://localhost:3001)

### Test Results
- [ ] Page loads successfully
- [ ] Restaurant browsing works
- [ ] Menu viewing functional
- [ ] Search/filter works
- [ ] Cart operations work
- [ ] Checkout process completes
- [ ] Order history accessible
- [ ] Profile management works

### Browser Console Errors
```
[Paste console output here]
```

### Network Tab Failures
```
URL: [failed endpoint]
Method: [GET/POST/PUT/DELETE]
Status: [HTTP status code]
Request Headers: [key headers]
Response: [error message or first 500 chars]
---
...
```

### Screenshots Taken
- [ ] Screenshot of error page/modal
- [ ] Screenshot of console errors
- [ ] Screenshot of network failures
- [ ] Screenshot of broken UI/cart issues

**Location:** `artifacts/manual-smoke/screenshots/customer-web-*.png`

### Notes
[Any additional observations]

---

## 3. Restaurant Web (http://localhost:3003)

### Test Results
- [ ] Page loads successfully
- [ ] Restaurant login works (restaurant@uberfoods.local / Restaurant123!)
- [ ] Dashboard displays orders
- [ ] Menu management works
- [ ] Order management functional
- [ ] Kitchen display updates
- [ ] Analytics load
- [ ] Settings accessible

### Browser Console Errors
```
[Paste console output here]
```

### Network Tab Failures
```
URL: [failed endpoint]
Method: [GET/POST/PUT/DELETE]
Status: [HTTP status code]
Request Headers: [key headers]
Response: [error message or first 500 chars]
---
...
```

### WebSocket Issues
- [ ] WebSocket connection established
- [ ] Real-time order updates work
- [ ] Kitchen display live updates
- [ ] Connection reconnects on failure

**WebSocket URL:** ws://localhost:3000/socket.io/

### Screenshots Taken
- [ ] Screenshot of error page/modal
- [ ] Screenshot of console errors
- [ ] Screenshot of WebSocket failures
- [ ] Screenshot of broken order display

**Location:** `artifacts/manual-smoke/screenshots/restaurant-web-*.png`

### Notes
[Any additional observations]

---

## 4. Driver App (http://localhost:3004)

### Test Results
- [ ] Page loads successfully
- [ ] Driver login works
- [ ] Dashboard shows deliveries
- [ ] Route optimization works
- [ ] Order acceptance functional
- [ ] Delivery tracking works
- [ ] Status updates work
- [ ] Earnings dashboard loads

### Browser Console Errors
```
[Paste console output here]
```

### Network Tab Failures
```
URL: [failed endpoint]
Method: [GET/POST/PUT/DELETE]
Status: [HTTP status code]
Request Headers: [key headers]
Response: [error message or first 500 chars]
---
...
```

### GPS/Map Issues
- [ ] Maps load correctly
- [ ] GPS tracking works
- [ ] Route calculation functional
- [ ] Location updates work

### WebSocket Issues
- [ ] WebSocket connection established
- [ ] Real-time delivery updates
- [ ] Location sharing works

### Screenshots Taken
- [ ] Screenshot of error page/modal
- [ ] Screenshot of console errors
- [ ] Screenshot of map/GPS failures
- [ ] Screenshot of WebSocket issues

**Location:** `artifacts/manual-smoke/screenshots/driver-app-*.png`

### Notes
[Any additional observations]

---

## 5. Backend API (http://localhost:3000)

### Health Check Results
- [ ] GET /api/health returns 200
- [ ] Database connectivity OK
- [ ] Redis connectivity OK
- [ ] WebSocket server running

### API Test Results
- [ ] Admin authentication works
- [ ] Restaurant authentication works
- [ ] Customer authentication works
- [ ] Public restaurant listings work
- [ ] Protected admin endpoints work
- [ ] File uploads functional
- [ ] WebSocket events fire

### Backend Logs (During Test)
```
[Paste relevant backend logs from artifacts/manual-smoke/*.log]
[Include timestamps, error messages, stack traces]
[Filter for the time period of your manual testing]
```

### Database Issues
- [ ] PostgreSQL connection OK
- [ ] Prisma migrations applied
- [ ] Seed data loaded
- [ ] No connection timeouts

### Cache Issues
- [ ] Redis connection OK
- [ ] Cache operations work
- [ ] Session storage functional

### Notes
[Any additional backend observations]

---

## Infrastructure Status

### Docker Containers
- [ ] PostgreSQL container running
- [ ] Redis container running
- [ ] All containers healthy

**Check Command:** `docker ps`

### Port Availability
- [ ] Port 3000 (Backend) accessible
- [ ] Port 3001 (Customer) accessible
- [ ] Port 3002 (Admin) accessible
- [ ] Port 3003 (Restaurant) accessible
- [ ] Port 3004 (Driver) accessible
- [ ] Port 5434 (PostgreSQL) accessible
- [ ] Port 6379 (Redis) accessible

**Check Command:** `netstat -ano | findstr :300[0-4]`

### Environment Files
- [ ] backend/.env exists and valid
- [ ] frontend/*/(.env) files exist
- [ ] DATABASE_URL configured correctly
- [ ] JWT_SECRET configured
- [ ] API endpoints configured

---

## Performance Observations

### Load Times
- Admin Panel: [ ] < 3 seconds [ ] 3-5 seconds [ ] > 5 seconds
- Customer Web: [ ] < 3 seconds [ ] 3-5 seconds [ ] > 5 seconds
- Restaurant Web: [ ] < 3 seconds [ ] 3-5 seconds [ ] > 5 seconds
- Driver App: [ ] < 3 seconds [ ] 3-5 seconds [ ] > 5 seconds

### API Response Times
- Health check: [ ] < 500ms [ ] 500ms-2s [ ] > 2s
- Authentication: [ ] < 1s [ ] 1-3s [ ] > 3s
- Data fetching: [ ] < 1s [ ] 1-3s [ ] > 3s

### Memory/CPU Issues
- [ ] No memory leaks observed
- [ ] CPU usage normal
- [ ] Browser responsive
- [ ] No hanging processes

---

## Critical Issues Found

### Blocking Issues (Must Fix)
1. [Issue description - what broke, steps to reproduce]
2. [Issue description]
3.

### Non-Blocking Issues (Should Fix)
1. [Issue description - UI glitches, slow responses]
2. [Issue description]
3.

### Root Cause Analysis
- **Most Likely Cause:** [Database connection / Env config / Port conflict / etc.]
- **Evidence:** [Logs/console output supporting this]
- **Fix Priority:** [High/Medium/Low]

---

## Recommendations

### Immediate Actions
1. [What to fix first]
2. [Next priority]
3.

### Long-term Improvements
1. [Monitoring/logging enhancements]
2. [Performance optimizations]
3.

---

## Test Environment Cleanup

**Commands run to stop services:**
```powershell
# Stop Docker containers
docker compose down

# Kill any remaining Node processes
Get-Process node | Stop-Process -Force

# Clean up artifacts (optional)
Remove-Item artifacts/manual-smoke/* -Recurse -Force
```

**Cleanup completed:** [ ] Yes [ ] No [ ] Partial

---

## Sign-off

**Test completed by:** [Your Name]  
**Date:** YYYY-MM-DD  
**Next steps:** [What to do next - fix issues, re-test, deploy, etc.]