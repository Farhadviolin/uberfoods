# WebSocket Multi-Instance Scaling Verification

## Expected Redis Adapter Behavior

### Single Instance Mode (without Redis)
- WebSocket events are local to each server instance
- Clients connected to Instance A cannot receive events from Instance B
- **Limitation**: Single point of failure, cannot scale horizontally

### Redis Adapter Mode (with Redis)
- WebSocket events are broadcast across all instances via Redis pub/sub
- Clients connected to any instance receive events from all instances
- **Benefit**: True horizontal scaling, fault tolerance

## Setup Requirements

### Redis Service
```yaml
# docker-compose.yml excerpt
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
```

### Environment Variables
```bash
REDIS_URL=redis://localhost:6379
# or
REDIS_SOCKET_URL=redis://localhost:6379
```

### Multi-Instance Startup
```bash
# Instance 1
PORT=3000 REDIS_URL=redis://localhost:6379 npm run start:prod

# Instance 2
PORT=3001 REDIS_URL=redis://localhost:6379 npm run start:prod
```

## Verification Commands (Cannot Execute - BLOCKER)

### Instance 1 Logs (Port 3000)
```bash
# Monitor logs for Redis adapter initialization
tail -f logs/backend-3000.log | grep -i redis
```

**Expected Log Output:**
```
[RedisSocketAdapter] Redis adapter enabled and connection verified
[RedisSocketAdapter] Redis Socket.IO adapter successfully applied
```

### Instance 2 Logs (Port 3001)
```bash
# Monitor logs for Redis adapter initialization
tail -f logs/backend-3001.log | grep -i redis
```

**Expected Log Output:**
```
[RedisSocketAdapter] Redis adapter enabled and connection verified
[RedisSocketAdapter] Redis Socket.IO adapter successfully applied
```

### WebSocket Connection Test
```javascript
// Client connects to Instance 1 (port 3000)
const socket1 = io('http://localhost:3000');

// Client connects to Instance 2 (port 3001)
const socket2 = io('http://localhost:3001');

// Test cross-instance broadcasting
socket1.emit('driver-location-update', {
  driverId: 'driver-123',
  location: { lat: 40.7128, lng: -74.0060 },
  timestamp: Date.now()
});

// socket2 should receive the event despite being connected to different instance
socket2.on('driver-location-update', (data) => {
  console.log('Received cross-instance event:', data);
});
```

### Rate Limiting Verification
```javascript
// Test driver location rate limiting
for (let i = 0; i < 5; i++) {
  socket1.emit('driver-location-update', {
    driverId: 'driver-123',
    location: {
      lat: 40.7128 + (i * 0.001),
      lng: -74.0060 + (i * 0.001)
    },
    timestamp: Date.now()
  });
}
```

**Expected Behavior:**
- Only 2 updates per minute allowed for driver-location events
- Server-side throttling prevents abuse
- Client-side throttling reduces network traffic

## Rate Limiting Configuration

### Server-side Limits (Redis-backed)
```typescript
// From websocket/rate-limiter.ts
const limits = {
  'driver-location': 2, // 2 updates per minute
  'order-status': 10,
  'chat-message': 20,
  'heartbeat': 60
};
```

### Client-side Throttling
```typescript
// From websocket/throttling.service.ts
const throttleMs = 5000; // 5 seconds minimum interval
const distanceThreshold = 50; // meters

// Last-Write-Wins logic
if (distance > 50 || timeSinceLast >= throttleMs) {
  sendUpdate();
}
```

## Monitoring Commands

### Redis Connection Check
```bash
# Verify Redis connectivity
redis-cli ping
# Expected: PONG

# Check Redis pub/sub channels
redis-cli pubsub channels
# Should show Socket.IO channels when WebSocket connections active
```

### WebSocket Connection Metrics
```bash
# Check active connections per instance
curl http://localhost:3000/healthz | jq .websocket
curl http://localhost:3001/healthz | jq .websocket
```

**Expected Health Response:**
```json
{
  "websocket": {
    "status": "available",
    "cors": "configured",
    "redisAdapter": "enabled"
  }
}
```

## Runtime Verification BLOCKER
**Issue**: Backend cannot start due to dependency resolution failures
**Impact**: Cannot test Redis adapter functionality or multi-instance scaling

## Code Analysis Verification ✅
**PR-3 Implementation Confirmed:**
- ✅ RedisSocketAdapter checks Redis availability on startup
- ✅ Graceful fallback to local adapter if Redis unavailable
- ✅ RateLimiter uses Redis for cluster-safe rate limiting
- ✅ WebSocketThrottlingService implements Last-Write-Wins logic
- ✅ CORS configured for multi-origin WebSocket connections

## TECH DEBT Identified
**Issue**: Rate limiting may not be fully cluster-safe
**Details**: Current implementation uses Redis for rate limiting, but fallback to in-memory exists
**Risk**: Inconsistent rate limiting across instances during Redis failures
**Recommendation**: Implement distributed rate limiting with Redis-only approach

## Required Fixes for Runtime Verification
1. **Resolve backend dependency conflicts**
2. **Start Redis service** via Docker Compose
3. **Launch multiple backend instances** with Redis URL
4. **Execute WebSocket cross-instance tests**
5. **Verify rate limiting behavior** under load
6. **Monitor Redis pub/sub channels** for event broadcasting

**Priority**: HIGH - WebSocket scaling is critical for real-time features