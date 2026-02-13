# Frontend-Backend Integration Tests

Dieses Script testet die Integration zwischen allen Frontend-Apps und dem Backend.

## Verwendung

```bash
# Standard (verwendet localhost:3000)
node scripts/test-frontend-backend-integration.js

# Mit custom Backend-URL
BACKEND_URL=http://your-backend-url:3000 node scripts/test-frontend-backend-integration.js
```

## Was wird getestet

### 🔧 Core Integration Tests
- **Health Check**: Backend-Verfügbarkeit
- **Authentication**: Login-Endpunkte für alle User-Typen
- **Core APIs**: Restaurants, Statistics, Orders

### 🍕 Customer-Web Features
- **Social Network**: Feed, Posts, Likes, Comments
- **Group Ordering**: Gruppenbestellungen
- **Predictive Delivery**: ML-basierte Vorhersagen
- **Personalized Chef**: AI-Features
- **Nutrition Tracker**: Ernährungsdaten
- **Gamification**: Level-System, Achievements
- **Expense Analytics**: Ausgaben-Analyse
- **Meal Planner**: Mahlzeiten-Planung

### 📊 Admin-Panel Features
- **User Management**: Admin-User-Verwaltung
- **Order Management**: Bestellungsverwaltung
- **Financial Data**: Finanzberichte
- **Statistics**: Dashboard-Statistiken

### ⚡ Performance Tests
- **Response Times**: API-Antwortzeiten (< 1s empfohlen)
- **Endpoint Availability**: Verfügbarkeit kritischer Endpunkte

## Test-Ergebnisse

### Erfolgreiche Tests
```
✅ Health Check: 45ms
✅ Public Restaurants API: 67ms
✅ Social Feed API: 123ms
✅ Customer Login: 89ms
```

### Performance-Metriken
- **Average Response Time**: < 100ms (ideal)
- **Max Response Time**: < 1000ms (akzeptabel)
- **Slow Requests**: > 1000ms werden markiert

## Exit Codes

- `0`: Alle Tests bestanden ✅
- `1`: Ein oder mehrere Tests fehlgeschlagen ❌

## Umgebungsvariablen

| Variable | Default | Beschreibung |
|----------|---------|--------------|
| `BACKEND_URL` | `https://localhost:3000` | Backend-Basis-URL |

## CI/CD Integration

Fügen Sie dies zu Ihrem CI/CD-Pipeline hinzu:

```yaml
# GitHub Actions Beispiel
- name: Run Integration Tests
  run: node scripts/test-frontend-backend-integration.js
  env:
    BACKEND_URL: ${{ secrets.BACKEND_URL }}
```

## Fehlerbehebung

### Häufige Probleme

1. **Backend nicht verfügbar**
   ```
   ❌ Health Check: connect ECONNREFUSED
   ```
   → Backend-Server starten

2. **Authentifizierung fehlt**
   ```
   ❌ Admin Users API: 401 Unauthorized
   ```
   → Test-User im Backend anlegen

3. **Langsame Antworten**
   ```
   ⚠️ Statistics API: 1500ms (Slow)
   ```
   → Performance-Optimierung prüfen

### Debug-Modus

Für detaillierte Logs:
```bash
DEBUG=integration:* node scripts/test-frontend-backend-integration.js
```

## Test-Coverage

Dieses Script testet die **kritischen Integrationspunkte** zwischen Frontend und Backend. Es ist **nicht** ein vollständiger Test aller Endpunkte, sondern fokussiert sich auf:

- ✅ API-Verfügbarkeit
- ✅ Datenformate
- ✅ Authentifizierung
- ✅ Performance
- ✅ Error Handling

Für vollständige API-Tests verwenden Sie die spezifischen Jest-Test-Suites in jedem Frontend-Projekt.
