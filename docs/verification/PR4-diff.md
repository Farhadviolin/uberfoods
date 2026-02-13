# PR-4: k6 Load Lab Benchmarks - FILES TOUCHED & DIFFS

## FILES TOUCHED
**K6 Scripts:**
- `backend/k6/scripts/orders-paging.js`
- `backend/k6/scripts/dashboard-aggregations.js`
- `backend/k6/scripts/order-status-updates.js`
- `backend/k6/scripts/websocket-connections.js`
- `backend/k6/scripts/driver-locations.js`

**Konfiguration:**
- `backend/k6/config/options.js`
- `backend/k6/config/thresholds.js`
- `docker-compose.k6.yml`

**Shared Libraries:**
- `backend/k6/lib/auth.js`
- `backend/k6/lib/data.js`
- `backend/k6/lib/metrics.js`

**CI/CD Integration:**
- `.github/workflows/k6-load-test.yml`
- `scripts/run-k6-tests.sh`

## WICHTIGSTE DIFF HUNKS

### 1. `backend/k6/scripts/orders-paging.js` - Cursor Pagination Load Test
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { authenticateUser } from '../lib/auth.js';
import { generateCursorTestData } from '../lib/data.js';

export let options = {
  stages: [
    { duration: '1m', target: 10 },   // Warm up
    { duration: '2m', target: 50 },   // Load testing
    { duration: '1m', target: 100 },  // Peak load
    { duration: '1m', target: 100 },  // Sustained load
    { duration: '1m', target: 0 },    // Cool down
  ],
  thresholds: {
    'http_req_duration{type:orders}': ['p(95)<500'], // 95% of requests < 500ms
    'http_req_failed{type:orders}': ['rate<0.1'],     // < 10% errors
  },
};

export default function () {
  const authToken = authenticateUser();

  // Test cursor pagination through multiple pages
  let cursor = null;
  let pageCount = 0;

  do {
    const params = {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    };

    const queryParams = cursor ? `?cursor=${cursor}&limit=20` : '?limit=20';
    const response = http.get(`${__ENV.BASE_URL}/api/orders${queryParams}`, params);

    check(response, {
      'orders page status is 200': (r) => r.status === 200,
      'orders page has data array': (r) => {
        const data = JSON.parse(r.body);
        return Array.isArray(data.data);
      },
      'orders page has valid cursor': (r) => {
        const data = JSON.parse(r.body);
        return data.nextCursor === null || typeof data.nextCursor === 'string';
      },
      'orders page response time < 200ms': (r) => r.timings.duration < 200,
    });

    const data = JSON.parse(response.body);
    cursor = data.nextCursor;
    pageCount++;

    // Prevent infinite loops in case of cursor issues
    if (pageCount > 50) break;

    sleep(0.1); // 100ms between pages
  } while (cursor);

  console.log(`User completed ${pageCount} pages of orders`);
}
```

**Warum wichtig:** Testet Cursor-basierte Pagination unter Load - prüft Performance, Stabilität und Fehlerquoten bei realistischer Nutzung.

### 2. `backend/k6/config/thresholds.js` - Performance Thresholds
```javascript
export const thresholds = {
  // HTTP Request Duration Thresholds
  'http_req_duration{scenario:orders-paging}': ['p(95)<300', 'p(99)<500'],
  'http_req_duration{scenario:dashboard}': ['p(95)<200', 'p(99)<400'],
  'http_req_duration{scenario:websocket}': ['p(95)<100'],

  // Error Rate Thresholds
  'http_req_failed{scenario:orders-paging}': ['rate<0.05'], // < 5% errors
  'http_req_failed{scenario:dashboard}': ['rate<0.02'],    // < 2% errors
  'http_req_failed{scenario:websocket}': ['rate<0.1'],     // < 10% errors

  // Custom Business Metrics
  'orders_loaded': ['rate>10'],           // At least 10 orders/sec
  'websocket_connections': ['value>0'],   // At least some connections
  'location_updates_processed': ['rate>1'], // At least 1 location update/sec

  // Resource Usage
  'http_req_duration': ['p(95)<1000'],    // Overall p95 < 1s
  'http_req_failed': ['rate<0.1'],        // Overall error rate < 10%
};

export const scenarios = {
  'orders-paging': {
    executor: 'ramping-vus',
    stages: [
      { duration: '30s', target: 10 },
      { duration: '1m', target: 50 },
      { duration: '2m', target: 100 },
      { duration: '1m', target: 100 },
      { duration: '30s', target: 0 },
    ],
    tags: { scenario: 'orders-paging' },
  },

  'dashboard-aggregations': {
    executor: 'constant-vus',
    vus: 20,
    duration: '3m',
    tags: { scenario: 'dashboard' },
  },

  'websocket-scaling': {
    executor: 'ramping-vus',
    stages: [
      { duration: '1m', target: 100 },
      { duration: '2m', target: 500 },
      { duration: '1m', target: 500 },
    ],
    tags: { scenario: 'websocket' },
  },
};
```

**Warum wichtig:** Definiert Performance-SLAs und Regression-Schutz - automatische Test-Failures bei Performance-Degradation.

### 3. `backend/k6/lib/auth.js` - Authentication Library
```javascript
import http from 'k6/http';
import { check } from 'k6';

export function authenticateUser(userType = 'admin') {
  const loginPayload = {
    email: __ENV[`${userType.toUpperCase()}_EMAIL`] || `test-${userType}@uberfoods.test`,
    password: __ENV[`${userType.toUpperCase()}_PASSWORD`] || 'testpassword123',
  };

  const loginResponse = http.post(`${__ENV.BASE_URL}/api/auth/login`, JSON.stringify(loginPayload), {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'has access token': (r) => {
      const body = JSON.parse(r.body);
      return body.accessToken && body.accessToken.length > 0;
    },
  });

  if (loginResponse.status !== 200) {
    console.error('Authentication failed:', loginResponse.body);
    return null;
  }

  const body = JSON.parse(loginResponse.body);
  return body.accessToken;
}

export function getAuthHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
```

**Warum wichtig:** Zentralisierte Authentifizierung für alle Load-Tests - stellt sicher, dass Tests mit validen Tokens laufen.

### 4. `docker-compose.k6.yml` - Containerized Test Execution
```yaml
version: '3.8'
services:
  k6:
    image: grafana/k6:latest
    command: run /scripts/orders-paging.js
    volumes:
      - ./k6:/scripts
      - ./k6/config:/config
    environment:
      - K6_PROMETHEUS_RW_SERVER_URL=http://prometheus:9090/api/v1/write
      - BASE_URL=http://host.docker.internal:3000
      - ADMIN_EMAIL=admin@uberfoods.test
      - ADMIN_PASSWORD=testpassword123
    networks:
      - uberfoods-network
    depends_on:
      - prometheus
      - grafana

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - uberfoods-network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - uberfoods-network
```

**Warum wichtig:** Containerisierte Test-Ausführung mit Metriken-Collection - ermöglicht reproduzierbare Load-Tests in CI/CD.

### 5. `.github/workflows/k6-load-test.yml` - CI/CD Integration
```yaml
name: K6 Load Testing
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  load-test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpassword
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Start backend
        run: npm run start:prod &
        env:
          DATABASE_URL: postgresql://postgres:testpassword@localhost:5432/uberfoods_test
          REDIS_URL: redis://localhost:6379

      - name: Wait for backend
        run: |
          timeout 60 bash -c 'until curl -f http://localhost:3000/healthz; do sleep 2; done'

      - name: Run K6 load tests
        uses: grafana/k6-action@v0.2.0
        with:
          filename: backend/k6/scripts/orders-paging.js
          flags: --out json=results.json

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: k6-results
          path: results.json
```

**Warum wichtig:** Automatische Load-Tests in CI/CD Pipeline - Regression-Schutz und kontinuierliche Performance-Validierung.