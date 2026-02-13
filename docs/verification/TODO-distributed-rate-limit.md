# TECH DEBT: Distributed Rate Limiting Implementation

## Issue Summary
**Current State**: Rate limiting implementation has fallback to in-memory storage
**Risk**: Inconsistent rate limiting across WebSocket instances during Redis failures
**Impact**: Potential abuse vectors if Redis becomes unavailable

## Current Implementation Analysis

### Redis-Based Rate Limiting (✅ Good)
```typescript
@Injectable()
export class WebSocketRateLimiter {
  async checkLimit(clientId: string, eventType: string): Promise<boolean> {
    const key = `ws:rate:${clientId}:${eventType}`;
    const current = await this.redisClient.incr(key);

    if (current === 1) {
      await this.redisClient.expire(key, windowMs / 1000);
    }

    if (current > maxRequests) {
      return false; // Rate limit exceeded
    }

    return true;
  }

  private fallbackCheck(clientId: string, eventType: string): boolean {
    // ❌ FALLBACK TO IN-MEMORY - NOT CLUSTER SAFE
    const existing = this.limits.get(clientId);
    // ... in-memory logic
  }
}
```

### Problem Areas
1. **Fallback Logic**: When Redis fails, falls back to in-memory rate limiting
2. **Instance Isolation**: In-memory limits only work per instance
3. **Race Conditions**: Multiple instances may have different views of rate limits

## Required Implementation

### Option 1: Redis-Only Approach (Recommended)
```typescript
@Injectable()
export class DistributedRateLimiter {
  async checkLimit(clientId: string, eventType: string): Promise<boolean> {
    const key = `ws:rate:${clientId}:${eventType}`;
    const windowMs = 60000; // 1 minute
    const maxRequests = this.getLimitForEvent(eventType);

    try {
      // Use Redis Lua script for atomic operations
      const result = await this.redisClient.eval(`
        local key = KEYS[1]
        local maxRequests = tonumber(ARGV[1])
        local windowMs = tonumber(ARGV[2])

        local current = redis.call('INCR', key)
        if current == 1 then
          redis.call('PEXPIRE', key, windowMs)
        end

        return current <= maxRequests
      `, 1, key, maxRequests, windowMs);

      return result === 1;
    } catch (error) {
      // Log error but don't fail - allow request through
      this.logger.error('Rate limiter Redis error:', error);
      return true; // Fail-open to avoid blocking legitimate traffic
    }
  }
}
```

### Option 2: Circuit Breaker Pattern
```typescript
@Injectable()
export class ResilientRateLimiter {
  private redisHealthy = true;
  private lastHealthCheck = 0;
  private readonly healthCheckInterval = 30000; // 30 seconds

  async checkLimit(clientId: string, eventType: string): Promise<boolean> {
    // Health check with caching
    if (Date.now() - this.lastHealthCheck > this.healthCheckInterval) {
      this.redisHealthy = await this.checkRedisHealth();
      this.lastHealthCheck = Date.now();
    }

    if (this.redisHealthy) {
      return this.redisCheck(clientId, eventType);
    } else {
      // Circuit breaker open - fail-open
      this.logger.warn('Redis unavailable, allowing request (fail-open)');
      return true;
    }
  }

  private async checkRedisHealth(): Promise<boolean> {
    try {
      await this.redisClient.ping();
      return true;
    } catch {
      return false;
    }
  }
}
```

## Implementation Plan

### Phase 1: Redis-Only Migration
1. Remove in-memory fallback logic
2. Implement Redis Lua scripts for atomic operations
3. Add comprehensive error handling
4. Update tests to verify Redis-only behavior

### Phase 2: Circuit Breaker Enhancement
1. Add Redis health monitoring
2. Implement fail-open strategy for Redis outages
3. Add metrics for rate limiter effectiveness
4. Update monitoring dashboards

### Phase 3: Advanced Features
1. Sliding window rate limiting
2. Burst allowance configuration
3. Dynamic limit adjustment based on system load
4. Per-user/per-endpoint limit configuration

## Testing Strategy

### Unit Tests
```typescript
describe('DistributedRateLimiter', () => {
  it('should enforce rate limits across instances', async () => {
    // Test with multiple Redis clients simulating different instances
  });

  it('should handle Redis failures gracefully', async () => {
    // Test fail-open behavior
  });
});
```

### Integration Tests
```typescript
describe('Multi-Instance Rate Limiting', () => {
  it('should prevent abuse across WebSocket instances', async () => {
    // Start 3 backend instances
    // Connect clients to different instances
    // Verify rate limiting works cluster-wide
  });
});
```

### Load Tests
```javascript
// k6 scenario for rate limit testing
export default function () {
  // Send requests at rate limit boundary
  // Verify consistent behavior across instances
  // Test Redis failure scenarios
}
```

## Monitoring & Alerting

### Metrics to Add
- `rate_limiter_requests_total`: Total requests checked
- `rate_limiter_blocked_total`: Total requests blocked
- `rate_limiter_redis_errors_total`: Redis operation failures
- `rate_limiter_health_status`: Current health status (0=unhealthy, 1=healthy)

### Alerts to Configure
- Rate limiter blocking > 10% of requests (potential DoS)
- Redis connection failures > 5% of checks
- Circuit breaker open for > 5 minutes

## Migration Steps

1. **Deploy Redis-Only Version** to staging
2. **Monitor Rate Limiting Effectiveness** (1 week)
3. **Gradual Rollout** to production instances
4. **Monitor Error Rates** and user impact
5. **Full Production Deployment** after validation

## Risk Mitigation

### Rollback Plan
- Keep old implementation as backup
- Feature flag to switch between implementations
- Immediate rollback if error rates spike

### Performance Impact
- Expected: Minimal (Redis operations are fast)
- Monitoring: Response time impact < 5ms
- Scaling: Linear with Redis performance

## Timeline
- **Week 1**: Implement Redis-only solution
- **Week 2**: Testing and validation
- **Week 3**: Staging deployment and monitoring
- **Week 4**: Production rollout

## Success Criteria
- [ ] Rate limiting works consistently across all instances
- [ ] No in-memory fallback logic remaining
- [ ] Redis failures don't break rate limiting
- [ ] Performance impact < 5ms per request
- [ ] Error rate remains < 0.1% during rollout

## Related Issues
- WebSocket horizontal scaling reliability
- Abuse prevention effectiveness
- System resilience during Redis outages

**Priority**: MEDIUM
**Effort**: 2-3 weeks
**Business Impact**: Improved security and reliability