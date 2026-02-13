# PR-3: WebSocket Skalierung - FILES TOUCHED & DIFFS

## FILES TOUCHED
**Backend:**
- `backend/src/common/adapters/redis-socket.adapter.ts`
- `backend/src/websocket/rate-limiter.ts`
- `backend/src/websocket/socket.gateway.ts`
- `backend/src/websocket/throttling.service.ts`
- `backend/src/common/middleware/rate-limit.middleware.ts`
- `backend/src/main.ts` (Redis Adapter Setup)

**Frontend (admin-panel):**
- `frontend/admin-panel/src/hooks/useWebSocket.ts`
- `frontend/admin-panel/src/hooks/useDriverLocation.ts`

**Konfiguration:**
- `docker-compose.yml` (Redis Service)
- `backend/src/config/websocket.config.ts`

## WICHTIGSTE DIFF HUNKS

### 1. `backend/src/common/adapters/redis-socket.adapter.ts` - Redis Horizontal Scaling
```typescript
export class RedisSocketAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisSocketAdapter.name);
  private redisAdapterEnabled = false;

  constructor(
    private app: INestApplication,
    private redisUrl?: string
  ) {
    super(app);
    this.checkRedisAvailability();
  }

  private async checkRedisAvailability(): Promise<void> {
    if (!this.redisUrl) {
      this.redisUrl = process.env.REDIS_URL || process.env.REDIS_SOCKET_URL;
    }

    if (!this.redisUrl) {
      this.logger.warn('Redis URL not configured, falling back to local adapter');
      return;
    }

    try {
      // Test Redis connection
      const testClient = createClient({ url: this.redisUrl });
      await testClient.connect();
      await testClient.ping();
      await testClient.disconnect();

      this.redisAdapterEnabled = true;
      this.logger.log('Redis adapter enabled and connection verified');
    } catch (error) {
      this.logger.error('Redis connection failed, falling back to local adapter', error);
      this.redisAdapterEnabled = false;
    }
  }

  async createIOServer(port: number, options?: ServerOptions): Promise<Server> {
    const server = await super.createIOServer(port, options);

    if (this.redisAdapterEnabled) {
      // Create Redis pub/sub clients
      const pubClient = createClient({ url: this.redisUrl });
      const subClient = createClient({ url: this.redisUrl });

      // Connect clients
      await Promise.all([
        pubClient.connect(),
        subClient.connect()
      ]);

      // Create and apply Redis adapter
      const redisAdapter = createAdapter(pubClient, subClient);
      server.adapter(redisAdapter);

      this.logger.log('Redis Socket.IO adapter successfully applied');
    } else {
      this.logger.warn('Using local Socket.IO adapter (single instance mode)');
    }

    return server;
  }
}
```

**Warum wichtig:** Redis-basierter Socket.IO Adapter für horizontale Skalierung - Events werden cluster-weit geteilt, eliminiert Single-Instance-Falle.

### 2. `backend/src/websocket/rate-limiter.ts` - Server-side Rate Limiting
```typescript
@Injectable()
export class WebSocketRateLimiter {
  private readonly logger = new Logger(WebSocketRateLimiter.name);
  private readonly limits = new Map<string, { count: number; resetTime: number }>();

  constructor(
    @Inject('REDIS_CLIENT') private redisClient: Redis,
    private configService: ConfigService
  ) {}

  async checkLimit(clientId: string, eventType: string): Promise<boolean> {
    const key = `ws:rate:${clientId}:${eventType}`;
    const windowMs = 60000; // 1 minute
    const maxRequests = this.getLimitForEvent(eventType);

    try {
      const current = await this.redisClient.incr(key);

      if (current === 1) {
        // First request in window, set expiry
        await this.redisClient.expire(key, windowMs / 1000);
      }

      if (current > maxRequests) {
        this.logger.warn(`Rate limit exceeded for ${clientId}:${eventType} (${current}/${maxRequests})`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Rate limiter error:', error);
      // Fallback to in-memory if Redis fails
      return this.fallbackCheck(clientId, eventType);
    }
  }

  private getLimitForEvent(eventType: string): number {
    const limits = {
      'driver-location': 2, // 2 updates per minute
      'order-status': 10,
      'chat-message': 20,
      'heartbeat': 60
    };
    return limits[eventType] || 10;
  }
```

**Warum wichtig:** Cluster-sicheres Rate Limiting für Driver-Location Updates - verhindert Abuse und reduziert Netzwerk-Traffic.

### 3. `backend/src/websocket/throttling.service.ts` - Client-side Throttling
```typescript
@Injectable()
export class WebSocketThrottlingService {
  private readonly throttles = new Map<string, { lastValue: any; lastSent: number }>();

  throttleLocation(clientId: string, location: LocationData): LocationData | null {
    const key = `${clientId}:location`;
    const now = Date.now();
    const throttleMs = 5000; // 5 seconds minimum interval

    const existing = this.throttles.get(key);

    if (!existing) {
      // First location update
      this.throttles.set(key, { lastValue: location, lastSent: now });
      return location;
    }

    // Check if significant change occurred (Last-Write-Wins)
    const distance = this.calculateDistance(existing.lastValue, location);
    const timeSinceLast = now - existing.lastSent;

    if (distance > 50 || timeSinceLast >= throttleMs) { // 50 meters or time threshold
      this.throttles.set(key, { lastValue: location, lastSent: now });
      return location;
    }

    return null; // Throttle this update
  }

  private calculateDistance(loc1: LocationData, loc2: LocationData): number {
    // Haversine formula for distance calculation
    const R = 6371e3; // Earth's radius in meters
    const φ1 = loc1.lat * Math.PI / 180;
    const φ2 = loc2.lat * Math.PI / 180;
    const Δφ = (loc2.lat - loc1.lat) * Math.PI / 180;
    const Δλ = (loc2.lng - loc1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }
}
```

**Warum wichtig:** Client-side Throttling mit Last-Write-Wins - reduziert Server-Load durch intelligente Update-Filterung basierend auf Distanz/Time.

### 4. `backend/src/main.ts` - Redis Adapter Integration
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Redis Socket.IO Adapter für horizontale Skalierung
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const redisAdapter = new RedisSocketAdapter(app, redisUrl);
    app.useWebSocketAdapter(redisAdapter);
    logger.log('Redis WebSocket adapter configured');
  } else {
    logger.warn('No REDIS_URL configured, using local WebSocket adapter');
  }

  // ... andere Konfiguration ...
}
```

**Warum wichtig:** Integriert Redis Adapter in NestJS App - aktiviert automatisch horizontale Skalierung wenn Redis verfügbar.