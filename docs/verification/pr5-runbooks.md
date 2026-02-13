# PR-5 Runbooks - Incident Response Procedures

## 🚨 High Error Rate (>5% in 5 minutes)

### Detection
- **Alert**: `HighErrorRate` from Prometheus
- **Metrics**: Check `uberfoods_http_requests_total{status_code=~"5.."}`

### Investigation Steps
1. **Check Application Logs**
   ```bash
   docker logs uberfoods_backend --since "10m" | grep "ERROR\|FATAL"
   ```

2. **Check Database Connectivity**
   ```bash
   docker exec uberfoods_backend curl -f http://localhost:3000/healthz
   ```

3. **Check External Dependencies**
   ```bash
   # Check Redis
   docker exec uberfoods_redis redis-cli ping

   # Check PostgreSQL
   docker exec uberfoods_postgres pg_isready -U postgres
   ```

4. **Check Circuit Breaker Status**
   ```bash
   curl http://localhost:3000/internal/circuit-breaker/status
   ```

### Resolution Steps
1. **If Database Issue**: Restart database or check connection pool
2. **If External Service**: Check circuit breaker, may need to disable failing service
3. **If Application Code**: Rollback deployment or scale up instances
4. **If Load Issue**: Scale horizontally or implement rate limiting

### Prevention
- Implement better error handling
- Add circuit breakers for external calls
- Monitor error patterns for early detection

## ⚠️ High Latency (>1s P95 in 5 minutes)

### Detection
- **Alert**: `HighLatency` from Prometheus
- **Metrics**: Check `uberfoods_http_request_duration_seconds`

### Investigation Steps
1. **Check Slow Queries**
   ```sql
   SELECT query, total_time, calls, mean_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

2. **Check Database Performance**
   ```bash
   docker stats uberfoods_postgres
   ```

3. **Check Application CPU/Memory**
   ```bash
   docker stats uberfoods_backend
   ```

4. **Check Outbox Processing**
   ```bash
   curl http://localhost:3000/internal/outbox/stats
   ```

### Resolution Steps
1. **Database Tuning**: Add missing indexes, optimize queries
2. **Scale Up**: Increase instance size or count
3. **Cache Optimization**: Check Redis hit rates
4. **Background Job Processing**: Ensure outbox is being processed

## 🔴 Database Connection Pool Exhausted

### Detection
- **Symptoms**: 500 errors, "connection pool exhausted" in logs
- **Metrics**: Check `uberfoods_db_connections_total`

### Resolution Steps
1. **Check Current Connections**
   ```sql
   SELECT count(*) FROM pg_stat_activity WHERE datname = 'uberfoods';
   ```

2. **Increase Pool Size** (temporary)
   ```bash
   # Update environment variable
   export DATABASE_POOL_MAX=20
   docker compose restart backend
   ```

3. **Identify Connection Leaks**
   ```sql
   SELECT pid, usename, client_addr, query_start, query
   FROM pg_stat_activity
   WHERE state = 'idle in transaction'
   AND query_start < now() - interval '5 minutes';
   ```

4. **Long-term**: Implement connection pool monitoring and alerts

## 🟡 WebSocket Connection Storm

### Detection
- **Metrics**: `uberfoods_ws_connections_active` spikes
- **Symptoms**: High CPU, memory usage

### Resolution Steps
1. **Check Connection Count**
   ```bash
   curl http://localhost:3000/internal/ws/stats
   ```

2. **Implement Connection Limits**
   - Server-side connection limits
   - Client-side reconnection backoff

3. **Scale WebSocket Instances**
   ```bash
   docker compose up -d backend3 backend4
   ```

## 🔵 Outbox Queue Growing

### Detection
- **Metrics**: `uberfoods_outbox_queue_depth` increasing
- **Threshold**: >100 pending messages

### Resolution Steps
1. **Check Processor Status**
   ```bash
   curl http://localhost:3000/internal/outbox/stats
   ```

2. **Check Redis Connectivity**
   ```bash
   docker exec uberfoods_backend redis-cli -h uberfoods_redis ping
   ```

3. **Restart Outbox Processor**
   ```bash
   docker compose restart backend
   ```

4. **Manual Processing** (if needed)
   ```bash
   # Trigger manual processing
   curl -X POST http://localhost:3000/internal/outbox/process
   ```

## General Procedures

### Deployment Rollback
```bash
# Rollback to previous version
docker tag uberfoods-backend:v1 uberfoods-backend:latest
docker compose up -d backend
```

### Emergency Scaling
```bash
# Scale to 4 instances
docker compose up -d --scale backend=4
```

### Log Collection for Debugging
```bash
# Collect logs from last hour
docker logs uberfoods_backend --since "1h" > backend_logs.txt
docker logs uberfoods_postgres --since "1h" > postgres_logs.txt
docker logs uberfoods_redis --since "1h" > redis_logs.txt
```