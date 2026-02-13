# PR-1: Observability Foundation - FILES TOUCHED & DIFFS

## FILES TOUCHED
**Backend:**
- `backend/src/common/middleware/request-id.middleware.ts`
- `backend/src/common/interceptors/logging.interceptor.ts`
- `backend/src/common/health/health.controller.ts`
- `backend/src/common/health/health.service.ts`
- `backend/src/main.ts` (Middleware/Interceptor Setup)

**Frontend (admin-panel):**
- `frontend/admin-panel/src/main.tsx` (Sentry Init)
- `frontend/admin-panel/src/config.ts` (Sentry Config)

## WICHTIGSTE DIFF HUNKS

### 1. `backend/src/common/middleware/request-id.middleware.ts` - UUID Request Tracking
```typescript
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Generiere UUID für diese Request
    const requestId = uuidv4();

    // Setze requestId auf Request-Objekt für spätere Verwendung
    req.requestId = requestId;

    // Setze x-request-id Header in der Response
    res.setHeader("x-request-id", requestId);

    // Setze auch requestId als lokale Variable für Response-Handler
    res.locals.requestId = requestId;

    next();
  }
}
```

**Warum wichtig:** Jede HTTP-Request bekommt eine eindeutige UUID für End-to-End Tracing über alle Services hinweg.

### 2. `backend/src/common/interceptors/logging.interceptor.ts` - Structured JSON Logging
```typescript
intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
  const request = context.switchToHttp().getRequest();
  const response = context.switchToHttp().getResponse();
  const { method, url, body, query, params, ip } = request;
  const user = (request as any).user;
  const requestId = (request as any).requestId;

  const logContext = {
    requestId,
    method,
    url,
    route: `${method} ${url}`,
    user: user ? { id: user.sub, role: user.role } : null,
    ip,
    body: this.sanitizeBody(body),
    query,
    params,
  };

  this.logger.debug(`Incoming request: ${method} ${url}`, logContext);

  return next.handle().pipe(
    tap({
      next: (_data) => {
        const duration = Date.now() - now;
        const statusCode = response.statusCode || 200;

        this.logger.log(
          `Request completed: ${method} ${url}`,
          {
            requestId,
            route: `${method} ${url}`,
            statusCode,
            durationMs: duration,
            userId: user?.sub,
            ip,
          },
        );
      },
```

**Warum wichtig:** Strukturierte JSON-Logs mit requestId, Duration, User-Context für effektives Debugging und Monitoring.

### 3. `backend/src/common/health/health.controller.ts` - Kubernetes Health Checks
```typescript
@Get("healthz")
@ApiOperation({ summary: "Health Check (Kubernetes Standard) - Systemstatus prüfen" })
@ApiResponse({ status: 200, description: "System ist gesund" })
@ApiResponse({ status: 503, description: "System hat Probleme" })
async healthz() {
  return this.check();
}

@Get("readyz")
@ApiOperation({ summary: "Readiness Check (Kubernetes Standard) - Bereit für Traffic" })
async readyz() {
  try {
    // Prüfe kritische Dependencies
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: "ready",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "not ready",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

**Warum wichtig:** Standardisierte /healthz und /readyz Endpoints für Kubernetes Health Checks mit echter Dependency-Prüfung.

### 4. `frontend/admin-panel/src/main.tsx` - Sentry Frontend Integration
```typescript
if (config.sentryDsn && config.sentryDsn.trim() !== '') {
  import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: config.sentryDsn,
      environment: config.sentryEnvironment,
      release: release,
      integrations: [
        new Sentry.BrowserTracing({
          tracePropagationTargets: ['localhost', 'uberfoods.app', /^\//],
        }),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event) {
        // Filter sensitive data
        return event;
      },
    });

    logger.info(`✅ Sentry Error-Tracking initialisiert (Release: ${release}, Environment: ${config.sentryEnvironment})`);
  }).catch((error) => {
    logger.error('❌ Sentry Initialisierung fehlgeschlagen:', error);
  });
}
```

**Warum wichtig:** Frontend Sentry Integration mit Release-Tagging, Environment-Tagging und Sourcemaps für Produktions-Error-Tracking.