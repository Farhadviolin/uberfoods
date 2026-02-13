# PR-5 Database Query Budgets & Performance Monitoring

## Query Performance Budgets
**Hot Path Queries (P95)**:
- Orders pagination: <50ms
- Dashboard aggregations: <100ms
- Order status updates: <30ms
- User authentication: <20ms

**Acceptable P99 Limits**:
- Orders pagination: <200ms
- Dashboard aggregations: <500ms
- Order status updates: <100ms

## Slow Query Logging
**Threshold**: 100ms (queries slower than this are logged)
**Log Level**: WARN
**Implementation**: PostgreSQL `log_min_duration_statement = 100`

## Current Query Analysis
**Orders Pagination Query**:
```sql
SELECT id, status, total_amount, created_at, customer_id, restaurant_id, driver_id
FROM orders
WHERE created_at < $1 OR (created_at = $1 AND id < $2)
ORDER BY created_at DESC, id DESC
LIMIT $3 + 1
```
**Estimated Performance**: <10ms with proper indexing

## Index Recommendations
**Existing Indexes**: Primary keys, foreign keys
**Recommended Additions**:
- `CREATE INDEX idx_orders_created_at_id ON orders(created_at DESC, id DESC)`
- `CREATE INDEX idx_orders_status_created_at ON orders(status, created_at DESC)`
- `CREATE INDEX idx_orders_driver_id_status ON orders(driver_id, status)`

## Monitoring Setup
**Query Performance Tracking**:
- Log slow queries with execution time
- Track query patterns by endpoint
- Alert on budget violations (>P95 threshold)

## Database Configuration
**postgresql.conf settings** (for production):
```
statement_timeout = 30000  # 30 seconds
lock_timeout = 15000       # 15 seconds
idle_in_transaction_session_timeout = 600000  # 10 minutes
log_min_duration_statement = 100  # Log queries >100ms
```