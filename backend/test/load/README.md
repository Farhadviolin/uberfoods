# Enterprise Sync Load Testing

## Übersicht

Diese Load Tests simulieren hohe Last auf die Enterprise Sync Endpoints und messen Performance-Metriken wie Response Time, Throughput und Error Rate.

## Voraussetzungen

- Node.js 18+
- Backend API läuft auf `http://localhost:3000` (oder setze `API_URL` Environment Variable)
- Admin Token (setze `ADMIN_TOKEN` Environment Variable)

## Konfiguration

### Environment Variables

```bash
export API_URL=http://localhost:3000/api
export ADMIN_TOKEN=your-admin-token
```

### Test-Parameter

Die Tests können in `enterprise-sync-load.test.ts` konfiguriert werden:

- `CONCURRENT_REQUESTS`: Anzahl gleichzeitiger Requests (Standard: 50)
- `REQUESTS_PER_ENDPOINT`: Anzahl Requests pro Endpoint (Standard: 100)

## Ausführung

### Alle Tests ausführen

```bash
npm run test:load
```

### Spezifischen Test ausführen

```bash
npm run test:load -- --testNamePattern="Unified Notifications Load Test"
```

### Mit Custom Parametern

```bash
CONCURRENT_REQUESTS=100 REQUESTS_PER_ENDPOINT=200 npm run test:load
```

## Ergebnisse

Die Tests geben folgende Metriken aus:

- **Total Requests**: Gesamtanzahl der Requests
- **Successful Requests**: Erfolgreiche Requests (mit Prozent)
- **Failed Requests**: Fehlgeschlagene Requests (mit Prozent)
- **Average Response Time**: Durchschnittliche Response Time in ms
- **Min/Max Response Time**: Minimale/Maximale Response Time
- **P95/P99 Response Time**: 95./99. Perzentil der Response Time
- **Requests/Second**: Durchsatz in Requests pro Sekunde
- **Errors**: Liste der ersten 10 Fehler

## Erwartete Performance

### Unified Notifications
- Success Rate: > 95%
- Average Response Time: < 500ms
- P95 Response Time: < 1000ms

### Financial Sync
- Success Rate: > 95%
- Average Response Time: < 300ms

### Analytics Sync
- Success Rate: > 95%
- Average Response Time: < 500ms

### Security Sync
- Success Rate: > 95%
- Average Response Time: < 300ms

### Performance Monitoring
- Success Rate: > 95%
- Average Response Time: < 200ms

### AI/ML Sync
- Success Rate: > 90%
- Average Response Time: < 1000ms

## Beispiel-Output

```
=== Load Test Results ===

Endpoint: /notifications/unified
  Total Requests: 100
  Successful: 98 (98.00%)
  Failed: 2 (2.00%)
  Average Response Time: 245.32ms
  Min Response Time: 120.45ms
  Max Response Time: 890.12ms
  P95 Response Time: 456.78ms
  P99 Response Time: 678.90ms
  Requests/Second: 45.67

=== Summary ===
Total Requests: 500
Total Successful: 485 (97.00%)
Total Failed: 15 (3.00%)
Average Response Time: 312.45ms
Average Requests/Second: 42.30
```

## Troubleshooting

### Tests schlagen fehl

1. **API nicht erreichbar**: Prüfe ob Backend läuft und `API_URL` korrekt ist
2. **Authentication Fehler**: Prüfe ob `ADMIN_TOKEN` gültig ist
3. **Timeout Fehler**: Erhöhe `timeout` in den Test-Configs oder reduziere `CONCURRENT_REQUESTS`

### Performance-Probleme

1. **Hohe Response Times**: Prüfe Backend-Logs und Database-Performance
2. **Viele Fehler**: Prüfe Backend-Health und Resource-Limits
3. **Niedrige Throughput**: Prüfe Network-Latency und Backend-Capacity

## Erweiterte Nutzung

### Custom Test Suite

```typescript
import { LoadTester } from './enterprise-sync-load.test';

const tester = new LoadTester();

// Custom test
await tester.testEndpoint('/custom/endpoint', 'GET');
tester.printResults();
```

### CI/CD Integration

```yaml
# .github/workflows/load-test.yml
- name: Run Load Tests
  run: |
    npm run test:load
  env:
    API_URL: ${{ secrets.API_URL }}
    ADMIN_TOKEN: ${{ secrets.ADMIN_TOKEN }}
```

## Best Practices

1. **Starte mit niedrigen Werten**: Beginne mit `CONCURRENT_REQUESTS=10` und steigere langsam
2. **Monitor Backend**: Beobachte Backend-Metriken während der Tests
3. **Isoliere Tests**: Führe Tests in isolierter Test-Umgebung aus
4. **Dokumentiere Ergebnisse**: Speichere Ergebnisse für Vergleich und Trend-Analyse

