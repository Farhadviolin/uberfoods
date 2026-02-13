# PR-0: Silent Errors Eliminierung - FILES TOUCHED & DIFFS

## FILES TOUCHED
**Frontend (admin-panel):**
- `frontend/admin-panel/src/utils/api.ts`
- `frontend/admin-panel/src/utils/errorHandler.ts`
- `frontend/admin-panel/src/components/ApiErrorDisplay.tsx`
- `frontend/admin-panel/src/components/ErrorBoundary.tsx`
- `frontend/admin-panel/src/hooks/useOrders.ts`
- `frontend/admin-panel/src/hooks/useCustomers.ts`
- `frontend/admin-panel/src/hooks/useDashboardData.ts`
- `frontend/admin-panel/src/hooks/useRestaurants.ts`
- `frontend/admin-panel/src/lib/react-query.tsx`

**Shared:**
- `shared/services/api.ts`

**Tests:**
- `frontend/admin-panel/src/utils/__tests__/errorHandler.test.ts`
- `frontend/admin-panel/src/components/__tests__/ApiErrorDisplay.test.tsx`

## WICHTIGSTE DIFF HUNKS

### 1. `frontend/admin-panel/src/utils/errorHandler.ts` - Allowlist Implementation
```typescript
export async function handleApiError<T>(
  error: unknown,
  options: HandleApiErrorOptions = {}
): Promise<T> {
  const {
    allowlist = [],
    fallbackValue,
    logLevel = 'error',
    context,
    endpoint
  } = options;

  const structuredError = createStructuredApiError(error);
  const status = structuredError.status;

  // Prüfe ob der Status-Code in der Allowlist ist
  const isAllowlisted = status && allowlist.includes(status);

  // Logging basierend auf Level und Allowlist
  if (logLevel !== 'silent') {
    const logContext = context || endpoint || 'API Error';
    const logMessage = isAllowlisted
      ? `Allowlisted ${status} error in ${logContext}`
      : `API Error in ${logContext}`;

    if (logLevel === 'warn' || isAllowlisted) {
      logger.warn(logMessage, {
        status,
        endpoint,
        requestId: structuredError.requestId,
        code: structuredError.code
      });
    } else {
      logError(error, logContext);
    }
  }

  // Bei allowlisted Errors, return fallback value statt zu werfen
  if (isAllowlisted && fallbackValue !== undefined) {
    return fallbackValue;
  }

  // Bei nicht-allowlisted Errors, werfe das strukturierte Error
  throw structuredError;
}
```

**Warum wichtig:** Eliminiert "Silent Errors" durch kontrollierte Fehlerbehandlung - allowlisted Status-Codes (z.B. 404) werden zu leeren Arrays konvertiert statt Exceptions zu werfen.

### 2. `frontend/admin-panel/src/components/ApiErrorDisplay.tsx` - UI Error Component
```typescript
export function ApiErrorDisplay({
  error,
  title = 'Fehler aufgetreten',
  showRetry = true,
  showDetails = false,
  onRetry,
  className = '',
  compact = false
}: ApiErrorDisplayProps) {
  if (!error) return null;

  // Normalisiere Error zu ApiError
  const apiError: ApiError = error instanceof Error && 'status' in error
    ? error as ApiError
    : {
        message: error.message,
        status: undefined,
        code: undefined,
        details: undefined,
        requestId: undefined
      };
```

**Warum wichtig:** Konsistente UI für strukturierte Fehleranzeige mit requestId Tracking und Retry-Optionen.

### 3. `frontend/admin-panel/src/utils/api.ts` - Error Integration
```typescript
// Request Interceptor - fügt Token hinzu
api.interceptors.request.use(
  (config) => {
    // Prüfe bevorzugt Session Storage, dann defaults
    const token = getAccessToken() || api.defaults.headers.common['Authorization']?.toString().replace('Bearer ', '');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // Stelle sicher, dass defaults auch gesetzt ist
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
```

**Warum wichtig:** Integriert die neue Error-Handling Logik in alle API-Calls mit strukturierter Fehlerbehandlung.