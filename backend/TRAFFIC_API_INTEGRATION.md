# Traffic-API-Integration - Vollständige Anleitung

## Übersicht

Das System unterstützt jetzt echte Traffic-Daten von mehreren Anbietern:
- **Google Maps** (Directions API mit Traffic-Daten)
- **TomTom Traffic API** (Empfohlen für Traffic Incidents)
- **HERE Traffic API** (Alternative)

## Konfiguration

### 1. Google Maps API (Bereits vorhanden)

Google Maps wird bereits für Routing verwendet und liefert auch Traffic-Daten:

```env
GOOGLE_MAPS_API_KEY=AIzaSyYourGoogleMapsAPIKeyHere
```

**Aktivierte APIs:**
- Directions API (mit `traffic_model` Parameter)
- Geocoding API
- Distance Matrix API

**Vorteile:**
- Bereits konfiguriert
- Gute Traffic-Daten für Routen
- Keine zusätzliche Konfiguration nötig

**Nachteile:**
- Keine direkte Incidents API
- Traffic-Daten nur für Routen, nicht für Bereiche

### 2. TomTom Traffic API (Empfohlen)

TomTom bietet eine dedizierte Traffic Incidents API:

```env
TOMTOM_API_KEY=your_tomtom_api_key_here
```

**Setup:**
1. Account erstellen: https://developer.tomtom.com
2. Traffic Flow API aktivieren
3. Traffic Incidents API aktivieren
4. API Key generieren

**Vorteile:**
- Dedizierte Incidents API
- Echtzeit-Traffic-Daten
- Gute Abdeckung in Europa

**Kosten:**
- Free Tier: 2,500 Requests/Tag
- Pay-as-you-go: Ab $0.50/1,000 Requests

### 3. HERE Traffic API (Alternative)

```env
HERE_API_KEY=your_here_api_key_here
HERE_APP_ID=your_here_app_id
HERE_APP_CODE=your_here_app_code
```

**Setup:**
1. Account erstellen: https://developer.here.com
2. Traffic API aktivieren
3. App ID und App Code generieren

**Vorteile:**
- Gute Abdeckung weltweit
- Detaillierte Traffic-Daten

**Kosten:**
- Free Tier: 250,000 Transactions/Monat
- Pay-as-you-go: Ab $0.50/1,000 Transactions

## API-Endpoints

### 1. Traffic Incidents

**Endpoint:** `GET /api/drivers/routing/traffic/incidents`

**Query-Parameter:**
- `lat` (required): Breitengrad
- `lng` (required): Längengrad
- `radius` (optional): Radius in Metern (Standard: 5000m)

**Beispiel:**
```bash
GET /api/drivers/routing/traffic/incidents?lat=48.2082&lng=16.3738&radius=5000
```

**Response:**
```json
{
  "incidents": [
    {
      "id": "tomtom-12345",
      "type": "accident",
      "location": {
        "lat": 48.2082,
        "lng": 16.3738
      },
      "description": "Unfall auf der A1",
      "severity": "high",
      "estimatedDelay": 15,
      "reportedAt": "2025-01-27T10:30:00Z",
      "source": "tomtom"
    }
  ],
  "lastUpdated": "2025-01-27T10:35:00Z",
  "source": "tomtom",
  "center": {
    "lat": 48.2082,
    "lng": 16.3738
  },
  "radius": 5000
}
```

### 2. Traffic Flow

**Endpoint:** `GET /api/drivers/routing/traffic/flow`

**Query-Parameter:**
- `originLat` (required): Start-Breitengrad
- `originLng` (required): Start-Längengrad
- `destLat` (required): Ziel-Breitengrad
- `destLng` (required): Ziel-Längengrad

**Beispiel:**
```bash
GET /api/drivers/routing/traffic/flow?originLat=48.2082&originLng=16.3738&destLat=48.2200&destLng=16.3800
```

**Response:**
```json
{
  "flow": {
    "currentSpeed": 35,
    "averageSpeed": 50,
    "freeFlowSpeed": 60,
    "congestionLevel": 42,
    "confidence": 85
  },
  "origin": {
    "lat": 48.2082,
    "lng": 16.3738
  },
  "destination": {
    "lat": 48.2200,
    "lng": 16.3800
  },
  "lastUpdated": "2025-01-27T10:35:00Z"
}
```

## Fallback-Verhalten

Das System verwendet automatisch Fallbacks:

1. **TomTom** (wenn konfiguriert) → Beste Incidents-Daten
2. **HERE** (wenn konfiguriert) → Alternative Incidents-Daten
3. **Google Maps** (wenn konfiguriert) → Traffic-Daten aus Directions API
4. **Simulation** → Fallback wenn keine API verfügbar

## Integration in Route-Optimierung

Der `RoutingService` verwendet automatisch Traffic-Daten:

```typescript
// Route-Optimierung mit Traffic-Daten
const optimizedRoute = await routingService.optimizeAdvancedRoute(
  driverLocation,
  orders,
  driverId
);

// Enthält Traffic-Daten:
optimizedRoute.trafficData = {
  currentSpeed: 35,
  averageSpeed: 50,
  congestionLevel: 42,
  incidents: [...]
}
```

## Kosten-Optimierung

### Caching

Traffic-Daten werden nicht gecacht (Echtzeit-Daten). Für Production sollte ein Cache implementiert werden:

```typescript
// Beispiel: 5-Minuten Cache
const cacheKey = `traffic:${lat}:${lng}:${radius}`;
const cached = await cache.get(cacheKey);
if (cached) return cached;

const incidents = await trafficService.getTrafficIncidents(...);
await cache.set(cacheKey, incidents, 300); // 5 Minuten
```

### Rate Limiting

Implementiere Rate Limiting für Traffic-API-Calls:

```typescript
// Max 10 Requests pro Minute pro Driver
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Get('routing/traffic/incidents')
```

## Testing

### Ohne API-Keys (Simulation)

Das System funktioniert auch ohne API-Keys mit simulierten Daten:

```bash
# Funktioniert ohne API-Keys
GET /api/drivers/routing/traffic/incidents?lat=48.2082&lng=16.3738
```

### Mit API-Keys (Echte Daten)

1. Setze API-Keys in `.env`
2. Starte Backend neu
3. Teste Endpoints

## Production-Empfehlungen

1. **TomTom API Key setzen** für beste Incidents-Daten
2. **Caching implementieren** (5-10 Minuten TTL)
3. **Rate Limiting** aktivieren
4. **Monitoring** für API-Quotas
5. **Fallback-Strategie** testen

## Troubleshooting

### Keine Incidents zurückgegeben

- Prüfe API-Keys in `.env`
- Prüfe API-Quotas
- Prüfe Logs für Fehler
- Fallback auf Simulation funktioniert immer

### Hohe API-Kosten

- Implementiere Caching
- Reduziere Request-Frequenz
- Verwende nur eine API (nicht alle drei)

### API-Fehler

- Prüfe API-Status (Status-Seiten der Anbieter)
- Prüfe API-Keys (gültig, nicht abgelaufen)
- Prüfe Rate Limits
- System fällt automatisch auf Simulation zurück

## Nächste Schritte

1. ✅ Traffic-Service implementiert
2. ✅ Multi-Provider-Support
3. ⏳ Caching implementieren (optional)
4. ⏳ Monitoring/Alerting (optional)
5. ⏳ Cost-Tracking (optional)

