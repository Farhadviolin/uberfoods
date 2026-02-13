# Testing Guide für Admin Panel

## Übersicht

Dieses Dokument beschreibt alle verfügbaren Test-Methoden für das Admin Panel.

## Test-Typen

### 1. Unit Tests

Unit Tests testen einzelne Komponenten, Hooks und Utilities isoliert.

```bash
# Alle Unit Tests
npm test

# Watch Mode
npm run test:watch

# Mit Coverage
npm run test:coverage

# Spezifische Test-Gruppen
npm run test:components  # Nur Komponenten-Tests
npm run test:hooks       # Nur Hook-Tests
npm run test:utils       # Nur Utility-Tests
```

**Coverage-Ziel:** 80%+ für alle kritischen Komponenten

### 2. Integration Tests

Integration Tests prüfen die Zusammenarbeit zwischen Komponenten und APIs.

```bash
# Integration Tests sind Teil der Unit Tests
npm test
```

### 3. API Endpoint Verification

Testet alle benötigten Backend-Endpunkte:

```bash
# Backend muss auf http://localhost:3000 laufen
npm run test:api

# Mit Custom URL
API_URL=http://localhost:3000 ADMIN_TOKEN=your-token npm run test:api
```

**Was wird getestet:**
- ✅ Alle CRUD-Operationen (Restaurants, Dishes, Orders, etc.)
- ✅ Authentifizierung (Login, Token Refresh)
- ✅ Statistiken-Endpunkte
- ✅ RBAC-Endpunkte
- ✅ Monitoring-Endpunkte
- ✅ Inventory-Endpunkte

### 4. E2E Tests (Playwright)

End-to-End Tests simulieren echte User-Interaktionen:

```bash
# Alle E2E Tests
npm run test:e2e

# Mit UI (interaktiv)
npm run test:e2e:ui

# Headed Mode (Browser sichtbar)
npm run test:e2e:headed
```

**Voraussetzungen:**
- Dev-Server läuft auf `http://localhost:3002`
- Playwright installiert: `npx playwright install`

**Getestete Flows:**
- ✅ Authentifizierung (Login/Logout)
- ✅ Dashboard-Navigation
- ✅ Sidebar-Navigation
- ✅ Responsive Design

### 5. Comprehensive Test Suite

Führt alle Tests automatisch aus:

```bash
# Alle Tests in einem Durchlauf
./scripts/run-all-tests.sh

# Oder mit npm
npm run test:all
```

## Test-Struktur

```
frontend/admin-panel/
├── src/
│   ├── components/
│   │   └── __tests__/          # Komponenten-Tests
│   ├── hooks/
│   │   └── __tests__/          # Hook-Tests
│   └── utils/
│       └── __tests__/          # Utility-Tests
├── e2e/                        # E2E Tests
│   ├── auth.spec.ts
│   ├── dashboard.spec.ts
│   └── navigation.spec.ts
└── scripts/
    ├── test-api-endpoints.ts   # API-Verifizierung
    └── run-all-tests.sh        # Test-Runner
```

## Best Practices

### Unit Tests

1. **Isolation:** Jeder Test sollte unabhängig sein
2. **Mocking:** API-Calls sollten gemockt werden
3. **Coverage:** Mindestens 80% für kritische Komponenten
4. **Naming:** Beschreibende Test-Namen

```typescript
// Beispiel: useFormValidation.test.ts
it('should validate email format', () => {
  // Test implementation
});
```

### E2E Tests

1. **Page Object Pattern:** Für komplexe Seiten
2. **Wait Strategies:** Immer auf Elemente warten
3. **Isolation:** Jeder Test sollte in einem sauberen State starten
4. **Screenshots:** Bei Fehlern automatisch

```typescript
// Beispiel: dashboard.spec.ts
test('should display statistics cards', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[class*="stat"]')).toBeVisible();
});
```

## Continuous Integration

### GitHub Actions Beispiel

```yaml
name: Admin Panel Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:api
      - uses: codecov/codecov-action@v3
```

## Troubleshooting

### Tests schlagen fehl

1. **Backend nicht erreichbar:**
   ```bash
   # Starte Backend
   cd ../../backend
   npm run start:dev
   ```

2. **Dev-Server nicht erreichbar:**
   ```bash
   # Starte Dev-Server
   npm run dev
   ```

3. **Playwright Browser fehlen:**
   ```bash
   npx playwright install
   ```

### Coverage zu niedrig

1. Prüfe welche Dateien nicht getestet sind:
   ```bash
   npm run test:coverage
   # Öffne coverage/lcov-report/index.html
   ```

2. Erstelle fehlende Tests für ungetestete Dateien

### API-Tests schlagen fehl

1. Prüfe ob Backend läuft:
   ```bash
   curl http://localhost:3000/health
   ```

2. Prüfe Admin-Token:
   ```bash
   # In Development: dev-token-no-auth-required
   # In Production: Echter JWT-Token
   ```

## Test-Reporte

### Coverage Report

Nach `npm run test:coverage`:
- HTML Report: `coverage/lcov-report/index.html`
- Terminal Output: Zusammenfassung in der Konsole

### E2E Report

Nach `npm run test:e2e`:
- HTML Report: `playwright-report/index.html`
- Screenshots: `test-results/` (bei Fehlern)

## Nächste Schritte

1. ✅ Unit Tests für alle Komponenten
2. ✅ Integration Tests für API-Calls
3. ✅ E2E Tests für kritische User-Flows
4. ✅ API-Verifizierung für alle Endpunkte
5. ⏳ Performance-Tests
6. ⏳ Accessibility-Tests (A11y)
7. ⏳ Visual Regression Tests

## Kontakt

Bei Fragen zu Tests, öffne ein Issue oder kontaktiere das Entwicklungsteam.

