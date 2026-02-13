# PR-4 k6 Load Testing Inventory

## k6 Files Structure
**Base Directory**: `backend/k6/`

## Main Files
- `run-all-tests.js` - Main orchestrator script
- `regression-tests.js` - Regression testing utilities
- `README.md` - Documentation

## Scenario Files (`scenarios/`)
- `orders-paging.js` - Orders pagination performance test
- `dashboard-aggregations.js` - Dashboard metrics and aggregations
- `order-status-updates.js` - Order status update operations
- `driver-locations.js` - Driver location updates (WebSocket)
- `websocket-connections.js` - WebSocket connection scaling

## Library Files (`lib/`)
- `config.js` - Test configuration and thresholds
- `auth.js` - Authentication helpers
- `data.js` - Test data generation and fixtures
- `metrics.js` - Custom metrics and reporting

## Docker Integration
**File**: `backend/docker-compose.k6.yml`
- `k6` service: Runs tests with volume mounts (`./k6:/scripts`, `./k6/reports:/reports`)
- `api` service: Backend under test (port 3000)
- `postgres` service: Test database (port 5433)
- `redis` service: Cache/WS scaling (port 6380)

## NPM Scripts (`package.json`)
- `test:k6`: `docker-compose -f docker-compose.k6.yml up --abort-on-container-exit`
- `benchmark:baseline`: `node scripts/benchmark-baseline.js`
- `benchmark:regression`: `node scripts/benchmark-baseline.js regression`
- `benchmark:report`: `node scripts/benchmark-baseline.js list`

## Environment Variables Expected
Based on docker-compose.k6.yml and lib/config.js analysis:
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - Authentication
- `REDIS_URL` - Redis connection for WebSocket scaling
- `ADMIN_EMAIL` - Admin user for tests
- `ADMIN_PASSWORD` - Admin password for tests
- `K6_PROMETHEUS_RW_SERVER_URL` - Optional Prometheus integration
- `K6_PROMETHEUS_RW_TREND_STATS` - Optional Prometheus metrics

## Test Scenarios Available
1. **Orders Pagination**: Cursor-based pagination performance
2. **Dashboard Aggregations**: Business metrics and KPIs
3. **Order Status Updates**: PATCH operations for order lifecycle
4. **Driver Locations**: WebSocket-based location broadcasts
5. **WebSocket Connections**: Connection scaling and stability