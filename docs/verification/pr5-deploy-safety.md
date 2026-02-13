# PR-5 Deployment Safety Implementation

## Readiness vs Liveness Probes

### Liveness Probe (`/health/liveness`)
**Purpose**: Check if application is running and should be restarted
**Checks**: Basic process health, no external dependencies
**Response**: Always 200 if application is running
**Kubernetes Usage**: Restarts pod if fails

**Example Response**:
```json
{
  "status": "alive",
  "timestamp": "2025-12-21T23:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

### Readiness Probe (`/health/readiness`)
**Purpose**: Check if application is ready to serve traffic
**Checks**: Critical dependencies (DB, Redis), resource usage
**Response**: 200 if ready, detailed failure info if not
**Kubernetes Usage**: Routes traffic only to ready pods

**Example Response (Healthy)**:
```json
{
  "status": "ready",
  "timestamp": "2025-12-21T23:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "checks": {
    "database": { "status": "healthy", "response_time_ms": 15 },
    "redis": { "status": "healthy", "response_time_ms": 5 },
    "memory": { "status": "healthy", "usage": {"rss": 120, "heapUsed": 85}, "usage_percent": 65.4 }
  }
}
```

**Example Response (Unhealthy)**:
```json
{
  "status": "not ready",
  "timestamp": "2025-12-21T23:00:00.000Z",
  "checks": {
    "database": { "status": "unhealthy", "error": "Connection timeout" },
    "redis": { "status": "healthy" }
  }
}
```

## Migration Safety

### Zero-Downtime Migration Process
1. **Pre-deployment**: Run migrations on separate connection (not affecting live traffic)
2. **Blue-Green Deployment**: Deploy new version alongside old
3. **Traffic Shift**: Route traffic to new version only after readiness probes pass
4. **Rollback**: Keep old version ready for instant rollback

### Migration Scripts Safety
- **Transactional**: All migrations wrapped in transactions
- **Idempotent**: Can be run multiple times safely
- **Backward Compatible**: New code works with old schema during transition
- **Fast**: Migrations complete within deployment timeout

## Deployment Checklist

### Pre-deployment
- [ ] Migrations tested on staging environment
- [ ] Rollback scripts prepared
- [ ] Feature flags ready for emergency disable
- [ ] Monitoring dashboards configured
- [ ] Alert thresholds set

### Deployment
- [ ] Blue environment deployed and ready
- [ ] Readiness probes passing on new instances
- [ ] Load balancer health checks configured
- [ ] Rollback plan documented and tested

### Post-deployment
- [ ] Traffic fully shifted to new version
- [ ] Error rates and latency monitored
- [ ] Performance baselines updated
- [ ] Old environment kept running for rollback window

## Emergency Procedures

### Fast Rollback
```bash
# Immediate traffic shift back to blue environment
kubectl set image deployment/uberfoods-backend uberfoods-backend=uberfoods-backend:v1.0.0
```

### Feature Disable
```bash
# Disable problematic features via config
export NEW_FEATURE_ENABLED=false
docker compose restart backend
```

### Traffic Throttling
```bash
# Reduce traffic to problematic instances
kubectl set env deployment/uberfoods-backend TRAFFIC_PERCENTAGE=50
```