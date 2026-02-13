# CI/CD Testing Guide

## CI-Pipeline

Die CI-Pipeline läuft automatisch bei Push auf `main` oder `develop`.

### Jobs

1. **Lint & Type Check** - Code-Qualität
2. **Tests** - Unit + Integration Tests
3. **Build** - Application Build
4. **Security** - npm audit + Snyk Code Scan

### Snyk Integration

Snyk wird blockierend ausgeführt (nur wenn `SNYK_TOKEN` Secret gesetzt ist):

```yaml
- name: Run Snyk Code Scan
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    args: --severity-threshold=high --json-file-output=snyk-report.json
```

**Ergebnisse:**
- High/Critical Vulnerabilities → Build fails
- Report wird als Artifact hochgeladen

### Test-Umgebungsvariablen

Folgende ENV-Vars werden in CI automatisch gesetzt:
- `NODE_ENV=test`
- `PAYMENT_WEBHOOK_TEST_MODE=true`
- `PAYPAL_WEBHOOK_TEST_MODE=true`

### E2E Tests

Separater Workflow (`e2e-tests.yml`) testet:
- Backend Health
- Frontend Health
- API Endpoints
- Admin Panel (Playwright, wenn konfiguriert)

## Lokales Testen

```bash
# Backend Tests
cd backend
npm test

# E2E Tests
npm run test:e2e

# Mit Coverage
npm run test:cov
```
