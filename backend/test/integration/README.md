# Integration Tests

## Übersicht

Diese Tests validieren die vollständige Integration zwischen Frontend-Apps und Backend.

## Test-Dateien

1. **api-endpoints.e2e-spec.ts** - Testet alle kritischen API-Endpunkte
2. **frontend-backend-integration.e2e-spec.ts** - Spezifische Frontend-Backend-Integration

## Ausführung

```bash
# Alle Integrationstests
npm run test:integration

# Frontend-Backend Integration
npm run test:frontend-backend

# Alle E2E Tests
npm run test:e2e
```

## Voraussetzungen

- Backend muss laufen (Port 3000)
- Datenbank muss verfügbar sein
- Test-Daten sollten vorhanden sein (optional)

## Test-Coverage

- ✅ Authentication (alle Rollen)
- ✅ CRUD-Operationen (Restaurants, Dishes, Orders, etc.)
- ✅ Premium-Features (Social, Gamification, Group Ordering)
- ✅ Analytics & Predictions
- ✅ Payment Integration
- ✅ Real-time Features

