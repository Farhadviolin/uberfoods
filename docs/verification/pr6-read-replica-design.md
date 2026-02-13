# PR-6 Read-Replica Readiness Implementation

## Environment Configuration
**DATABASE_URL**: Primary (write) database connection (required)
**DATABASE_URL_READ**: Read replica connection (optional)

## DbClientProvider Architecture
- **Write Client**: Always connected to primary database
- **Read Client**: Optional connection to read replica
- **Automatic Fallback**: Read operations fall back to write client if read replica fails
- **Health Checks**: Both clients monitored independently

## Query Routing Strategy
### Read Operations (Safe for Replicas)
- Orders pagination (`GET /api/orders`)
- Dashboard aggregations
- User profile queries
- Static data queries

### Write Operations (Always Primary)
- Order status updates (`PATCH /orders/:id/status`)
- User registration/modification
- Payment processing
- Any state-changing operations

## Fallback Behavior
1. **Normal Operation**: Read queries use read replica, writes use primary
2. **Read Replica Down**: Read queries automatically use primary (with warning log)
3. **Primary Down**: System becomes unavailable (readiness probe fails)
4. **Network Issues**: Automatic retry with exponential backoff

## Configuration Examples
**Single Database (Development)**:
```
DATABASE_URL=postgresql://user:pass@localhost:5432/uberfoods
# DATABASE_URL_READ not set
```

**Read Replica Setup**:
```
DATABASE_URL=postgresql://user:pass@primary:5432/uberfoods
DATABASE_URL_READ=postgresql://user:pass@replica:5432/uberfoods
```

## Metrics & Monitoring
- `uberfoods_db_read_replica_fallback_total`: Count of fallback operations
- `uberfoods_db_read_replica_enabled`: Gauge (1 if read replica enabled)
- `uberfoods_db_read_replica_healthy`: Gauge (1 if read replica healthy)

## Migration Strategy
1. **Phase 1**: Deploy with DATABASE_URL_READ unset (no behavior change)
2. **Phase 2**: Set DATABASE_URL_READ in staging, test fallback behavior
3. **Phase 3**: Enable in production region by region
4. **Phase 4**: Monitor performance improvements and adjust replica sizing