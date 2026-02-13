# PR-3 Redis Adapter Wiring Analysis

## Adapter Implementation
**File**: `backend/src/common/adapters/redis-socket.adapter.ts`
**Class**: `RedisSocketAdapter extends IoAdapter`

## Wiring in main.ts
```typescript
const { RedisSocketAdapter } = await import("./common/adapters/redis-socket.adapter");
const redisUrl = process.env.REDIS_URL || process.env.REDIS_SOCKET_URL;
app.useWebSocketAdapter(new RedisSocketAdapter(app, redisUrl));
```

## Redis Availability Check
- **Environment Variables**: `REDIS_URL` or `REDIS_SOCKET_URL`
- **Fallback**: If Redis not available, falls back to local adapter
- **Connection Test**: Creates test client, calls `ping()`, disconnects
- **Flag**: `redisAdapterEnabled` boolean

## Adapter Setup Process
1. Check Redis URL from environment
2. Test Redis connection with ping
3. If successful: `redisAdapterEnabled = true`
4. Create pub/sub clients using `@socket.io/redis-adapter`
5. Handle connection errors and reconnections
6. Attach adapter to Socket.IO server

## Runtime Determination
- **Enabled**: When `redisAdapterEnabled = true` AND Redis connection successful
- **Disabled**: When Redis URL missing OR connection fails
- **Logging**: "Redis adapter enabled and connection verified" on success
- **Fallback**: "Redis connection failed, falling back to local adapter" on failure

## Multi-Instance Behavior
- **With Redis**: Events broadcast across all instances via Redis pub/sub
- **Without Redis**: Events only broadcast within same instance
- **Detection**: Check startup logs for Redis adapter messages