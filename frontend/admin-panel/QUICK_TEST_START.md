# 🚀 Quick Start: Tests ausführen

## Schnellstart

```bash
# 1. Alle Tests ausführen
npm test

# 2. Mit Coverage-Report
npm run test:coverage

# 3. API-Endpunkte testen (Backend muss laufen)
npm run test:api

# 4. E2E Tests (Dev-Server muss laufen)
npm run test:e2e
```

## Alle Tests in einem Durchlauf

```bash
# Automatisches Test-Script
./scripts/run-all-tests.sh

# Oder
npm run test:all
```

## Was wurde implementiert?

### ✅ Unit Tests
- **Hooks:** `useFormValidation`, `useDashboardData`, `useRBACData`
- **Components:** `Dashboard`, `LoadingSpinner`, `ErrorBoundary`
- **Utils:** `errorHandler` (vollständig)

### ✅ Integration Tests
- API-Error-Handling
- Form-Validierung
- React Query Integration

### ✅ E2E Tests (Playwright)
- Authentifizierung
- Dashboard-Navigation
- Sidebar-Navigation

### ✅ API-Verifizierung
- Automatisches Testen aller 50+ Backend-Endpunkte
- Status-Check für required vs. optional Endpoints

## Test-Coverage

Aktuell: **~15%** (Grundlage gelegt)
Ziel: **80%+** für alle kritischen Komponenten

## Nächste Schritte

1. **Mehr Unit Tests:** Erweitere Tests für alle Komponenten
2. **E2E Tests:** Füge Tests für CRUD-Operationen hinzu
3. **Performance Tests:** Lighthouse CI Integration
4. **Visual Tests:** Screenshot-Vergleiche

## Hilfe

Siehe [TESTING.md](./TESTING.md) für detaillierte Dokumentation.

