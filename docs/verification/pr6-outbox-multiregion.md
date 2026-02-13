# PR-6 Multi-Region Eventing Readiness

## Publisher Abstraction
**Interface**: `OutboxPublisher`
- `publish(message: OutboxMessage): Promise<void>`
- `getStatus(): Promise<{healthy, destinations[], error?}>`

## Current Implementation
**Primary Publisher**: Redis streams (single region)
**Dual Publisher**: Optional secondary publisher for testing
**Configuration**: `FEATURE_DUAL_PUBLISH=true` enables dual publishing

## Dual Publishing Architecture
```
┌─────────────────┐    ┌─────────────────┐
│   Application   │────│ Primary Publisher │
│                 │    │  (Redis Local)   │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┘
                 │
        ┌────────▼────────┐
        │ Secondary       │
        │ Publisher       │
        │ (Redis Remote)  │
        └─────────────────┘
```

## Usage Example
```typescript
// Single region (default)
const publisher = new RedisPublisher(redisClient);

// Dual region (when enabled)
const dualPublisher = new DualPublisherService(
  new RedisPublisher(localRedis),
  new RedisPublisher(remoteRedis)
);
```

## Status Monitoring
**Endpoint**: `/internal/outbox/publisher/status`
**Response**:
```json
{
  "healthy": true,
  "destinations": ["redis:events:local", "redis:events:remote"],
  "dualPublishEnabled": true,
  "primaryHealthy": true,
  "secondaryConfigured": true,
  "secondaryHealthy": true
}
```

## Migration Strategy
### Phase 1: Abstraction (Current)
- Publisher interface defined
- Single-region publishing working
- Dual publishing ready but disabled

### Phase 2: Dual Publishing Test
- Enable `FEATURE_DUAL_PUBLISH=true` in staging
- Configure secondary Redis connection
- Test event delivery to both regions
- Monitor for duplicate processing

### Phase 3: Production Multi-Region
- Deploy secondary Redis in remote region
- Enable dual publishing in production
- Implement region-specific event routing
- Add cross-region consistency checks

## Event Deduplication
**Challenge**: Same event may arrive in multiple regions
**Solution**: Event ID-based deduplication in consumers
**Implementation**: Redis SET for processed event IDs with TTL

## Performance Considerations
- **Dual Publishing**: ~2x network overhead when enabled
- **Monitoring**: Additional health checks for secondary publisher
- **Failover**: Automatic fallback to single publishing if secondary fails

## Future Enhancements
- **Event Routing**: Region-specific event filtering
- **Priority Queues**: Critical events to multiple regions, others local-only
- **Consistency**: Cross-region event ordering guarantees