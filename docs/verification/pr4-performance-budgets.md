# PR-4 Performance Budgets & Thresholds

## Response Time Thresholds (ms)
- **Orders Pagination (GET /api/orders)**: P95 ≤ 500ms, P99 ≤ 1000ms
- **Dashboard Aggregations**: P95 ≤ 800ms, P99 ≤ 1500ms
- **Order Status Updates (PATCH /orders/:id/status)**: P95 ≤ 400ms, P99 ≤ 800ms

## Error Rate Thresholds (%)
- **Maximum Error Rate**: < 1.0% for all scenarios
- **HTTP Status 400/500**: P95 < 300ms response time

## Throughput Minimums (req/sec)
- **Orders Pagination**: ≥ 100 req/sec
- **Dashboard Aggregations**: ≥ 50 req/sec
- **Order Status Updates**: ≥ 200 req/sec

## k6 Configuration
```javascript
thresholds: {
  'http_req_duration{status:200}': ['p(95)<500'],
  'http_req_duration{status:400}': ['p(95)<300'],
  'http_req_failed': ['rate<0.01'], // Error rate < 1%
}
```

## Test Scenarios
1. **orders-paging**: Cursor-based pagination with realistic load distribution
   - 80% recent orders, 15% filtered searches, 5% deep pagination
   - Weight: 1.0 (highest priority)

2. **dashboard-aggregations**: Business metrics and KPIs
   - Concurrent dashboard requests (3 simultaneous)
   - Weight: 0.8

3. **order-status-updates**: PATCH operations with optimistic locking
   - Status transitions with validation
   - Weight: 0.6

4. **websocket-connections**: WebSocket scaling (if k6-compatible)
   - Ramp up to 1000 connections over 30 seconds
   - Weight: 0.4

5. **driver-locations**: Driver location broadcasts
   - Rate limited location updates (2/sec per driver)
   - Weight: 0.4

## Regression Gates
- **P95 Response Time**: ≤ 10% degradation from baseline
- **Error Rate**: Must not increase above current baseline
- **Throughput**: Must maintain minimum thresholds

## Test Environment
- **VUs**: 10 (configurable via K6_VUS)
- **Duration**: 60s (configurable via K6_DURATION)
- **Data Size**: medium (small/medium/large via TEST_DATA_SIZE)
- **Load Pattern**: Realistic distribution based on business logic