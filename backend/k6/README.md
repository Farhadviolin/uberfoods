# k6 Load Testing Suite

This directory contains k6-based load tests for the UberFoods platform, designed to validate performance, scalability, and reliability under various load conditions.

## Directory Structure

```
k6/
├── lib/                    # Shared libraries and utilities
│   ├── auth.js            # Authentication helpers
│   ├── config.js          # Test configuration
│   ├── data.js            # Test data generators
│   └── metrics.js         # Custom metrics and thresholds
├── scenarios/             # Test scenarios
│   ├── orders-paging.js   # Orders cursor pagination tests
│   ├── dashboard-aggregations.js
│   ├── order-status-updates.js
│   ├── websocket-connections.js
│   └── driver-locations.js
├── reports/               # Generated reports (gitignored)
├── run-all-tests.js       # Main test runner
└── regression-tests.js    # Regression detection
```

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Backend API running on http://localhost:3000
- Test database with seeded data

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Run all tests
docker-compose -f docker-compose.k6.yml up

# Run specific test
docker-compose -f docker-compose.k6.yml run --rm k6 run /scripts/scenarios/orders-paging.js

# Run with custom environment
K6_VUS=50 K6_DURATION=30s docker-compose -f docker-compose.k6.yml run --rm k6 run /scripts/scenarios/orders-paging.js
```

### Local Development

```bash
# Install k6 locally
# macOS
brew install k6

# Ubuntu/Debian
sudo apt update
sudo apt install k6

# Run tests
k6 run scenarios/orders-paging.js

# Run with custom options
k6 run -e K6_VUS=10 -e K6_DURATION=30s scenarios/orders-paging.js
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `K6_VUS` | 10 | Number of virtual users |
| `K6_DURATION` | 60s | Test duration |
| `API_BASE_URL` | http://localhost:3000/api | Backend API URL |
| `ADMIN_TOKEN` | - | Admin authentication token |
| `K6_PROMETHEUS_RW_SERVER_URL` | - | Prometheus remote write URL |
| `TEST_DATA_SIZE` | medium | Test data size (small/medium/large) |

## Test Scenarios

### 1. Orders Cursor Pagination (`orders-paging.js`)
Tests the new cursor-based pagination for orders listing.

**Load Pattern:**
- 80% read recent orders with status filter
- 15% search with restaurant filter
- 5% deep pagination (stress test)

**Performance Targets:**
- p95 < 500ms
- Error rate < 1%
- Throughput > 100 req/s

### 2. Dashboard Aggregations (`dashboard-aggregations.js`)
Tests admin dashboard statistics endpoints under load.

**Load Pattern:**
- Statistics endpoints with different time ranges
- Concurrent chart data requests
- Cache performance validation

**Performance Targets:**
- p95 < 800ms
- Error rate < 1%
- Cache hit rate > 80%

### 3. Order Status Updates (`order-status-updates.js`)
Tests write operations with optimistic locking and idempotency.

**Load Pattern:**
- PATCH /orders/:id/status operations
- Race condition simulation
- Version conflict handling

**Performance Targets:**
- p95 < 400ms
- Error rate < 1%
- Lock contention < 5%

### 4. WebSocket Connections (`websocket-connections.js`)
Tests WebSocket scaling and connection handling.

**Load Pattern:**
- Ramp up to 1000+ concurrent connections
- Connection lifecycle testing
- Memory usage monitoring

**Performance Targets:**
- Connection success rate > 95%
- Memory growth < 10%
- Message latency < 50ms

### 5. Driver Location Events (`driver-locations.js`)
Tests rate-limited driver location broadcasting.

**Load Pattern:**
- High-frequency location updates
- Server-side throttling validation
- Client-side rendering performance

**Performance Targets:**
- Rate limiting accuracy 100%
- Message throughput > 1000 msg/s
- End-to-end latency < 100ms

## Custom Metrics

The tests collect additional custom metrics:

```javascript
// Response time percentiles
http_req_duration{percentile="0.5"}  // p50
http_req_duration{percentile="0.95"} // p95
http_req_duration{percentile="0.99"} // p99

// Custom business metrics
orders_pagination_duration
dashboard_aggregation_duration
order_status_update_duration
websocket_connection_duration
driver_location_broadcast_duration
```

## Reporting

### HTML Reports

```bash
# Generate HTML report
k6 run --out json=results.json scenarios/orders-paging.js
npm run benchmark:report results.json
```

### Prometheus Integration

```bash
# Send metrics to Prometheus
K6_PROMETHEUS_RW_SERVER_URL=http://prometheus:9201/write k6 run scenarios/orders-paging.js
```

### CI/CD Integration

```yaml
# .github/workflows/load-test.yml
- name: Run Load Tests
  run: |
    docker-compose -f docker-compose.k6.yml up --abort-on-container-exit
  env:
    K6_PROMETHEUS_RW_SERVER_URL: ${{ secrets.PROMETHEUS_URL }}
```

## Baseline Management

### Establishing Baselines

```bash
# Run baseline test
npm run benchmark:baseline

# Results stored in k6/baselines/
```

### Regression Detection

```bash
# Run regression tests
npm run benchmark:regression

# Fails if performance degrades beyond thresholds
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure backend API is running
   - Check `API_BASE_URL` environment variable

2. **Authentication Failures**
   - Verify `ADMIN_TOKEN` is valid
   - Check token expiration

3. **High Error Rates**
   - Review backend logs for errors
   - Check database performance
   - Verify test data integrity

4. **Memory Issues**
   - Reduce `K6_VUS` for local testing
   - Use Docker for isolated testing
   - Monitor system resources

### Performance Tuning

- **Increase VUs gradually**: Start with 10 VUs, double until target
- **Adjust ramp-up time**: Give system time to stabilize
- **Monitor backend metrics**: CPU, memory, database connections
- **Use appropriate test data size**: Match production data volumes

## Best Practices

1. **Run tests in isolated environment**
2. **Use realistic test data**
3. **Monitor both client and server metrics**
4. **Establish and maintain performance baselines**
5. **Automate regression testing in CI/CD**
6. **Document performance requirements and thresholds**
7. **Regularly review and update test scenarios**

## Contributing

When adding new test scenarios:

1. Follow the existing naming conventions
2. Include comprehensive documentation
3. Add appropriate custom metrics
4. Define clear performance targets
5. Include error handling and recovery logic
6. Test both success and failure scenarios