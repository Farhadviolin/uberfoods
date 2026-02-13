# UberFoods Driver App

Moderne, produktionsreife Driver-App für die UberFoods-Plattform.

## 🚀 Features

- ✅ **Vollständige Backend-Integration** - Alle API-Endpunkte implementiert
- ✅ **Real-time Updates** - WebSocket-basierte Echtzeit-Kommunikation
- ✅ **Offline-Support** - Funktioniert auch ohne Internetverbindung
- ✅ **Smart Acceptance** - KI-gestützte Bestellungsempfehlungen
- ✅ **Performance Monitoring** - Web Vitals Tracking
- ✅ **Error Tracking** - Zentrale Fehlerverfolgung
- ✅ **Umfassendes Testing** - Unit, Integration und E2E Tests

## 📦 Installation

```bash
npm install
```

## 🛠️ Entwicklung

```bash
# Dev-Server starten
npm run dev

# Tests ausführen
npm test

# E2E Tests
npm run test:e2e

# Coverage
npm run test:coverage
```

## 🏗️ Architektur

### Komponenten-Struktur

```
src/
├── components/          # React-Komponenten
│   ├── Dashboard.tsx   # Haupt-Dashboard
│   ├── OrderCard.tsx   # Bestellungs-Karte
│   ├── OrdersList.tsx # Bestellungsliste (optimiert)
│   └── ...
├── hooks/              # Custom Hooks
│   ├── useWebSocket.ts # WebSocket-Verbindung
│   ├── useRetry.ts     # Retry-Logik
│   └── ...
├── services/           # Services
│   ├── api.ts          # API-Client
│   ├── offline.ts      # Offline-Support
│   ├── errorTrackingService.ts
│   └── performanceMonitor.ts
└── utils/              # Utilities
    ├── phoneSanitizer.ts
    ├── retryWithBackoff.ts
    └── ...
```

### Backend-Integration

Alle kritischen Endpunkte sind implementiert:

- `GET /drivers/push/public-key` - Push Notifications
- `POST /drivers/:id/orders/:orderId/call` - Anruf initiieren
- `POST /drivers/:id/orders/:orderId/sms` - SMS senden
- `GET /orders/driver/:driverId` - Bestellungen abrufen
- `POST /orders/:id/accept` - Bestellung akzeptieren
- `POST /orders/:id/reject` - Bestellung ablehnen
- `PATCH /orders/:id/status` - Status aktualisieren
- `PUT /drivers/:id/location` - Standort aktualisieren
- `PUT /drivers/:id/status` - Fahrer-Status aktualisieren

## 🔒 Sicherheit

- ✅ Telefonnummer-Sanitization (XSS-Schutz)
- ✅ JWT Token-basierte Authentifizierung
- ✅ Automatischer Token Refresh
- ✅ Input-Validierung
- ✅ Error Tracking ohne sensible Daten

## 📊 Performance

- ✅ Code Splitting (Lazy Loading)
- ✅ React.memo() für optimierte Re-Renders
- ✅ Priorisierte Offline-Queue
- ✅ Performance Monitoring (Web Vitals)
- ✅ Optimierte Bundle-Größe

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm test -- tests/integration
```

### E2E Tests (Playwright)
```bash
npm run test:e2e
```

## 📱 Offline-Support

Die App funktioniert auch offline:

- Requests werden in Queue gespeichert
- Priorisierung nach Wichtigkeit
- Automatische Synchronisation bei Wiederverbindung
- IndexedDB für persistente Speicherung

## 🔄 WebSocket

Real-time Updates über WebSocket:

- Automatische Reconnection
- Circuit Breaker Pattern
- Event-basierte Updates
- Location Tracking

## 🎯 Best Practices

1. **Komponenten**: Kleine, fokussierte Komponenten
2. **Hooks**: Wiederverwendbare Custom Hooks
3. **Services**: Zentrale Business-Logik
4. **Utils**: Pure Functions ohne Side-Effects
5. **Types**: Vollständige TypeScript-Typisierung

## 📈 Monitoring

- **Error Tracking**: Automatische Fehlerverfolgung
- **Performance**: Web Vitals Metriken
- **Analytics**: User-Interaktionen (optional)

## 🚀 Deployment

```bash
# Production Build
npm run build

# Preview
npm run preview
```

## 📝 License

Proprietary - UberFoods Platform
