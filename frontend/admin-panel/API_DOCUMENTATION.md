# 📚 Admin Panel API-Dokumentation

**Erstellt:** 2025-01-27  
**Status:** ✅ Vollständig dokumentiert

---

## 🔗 Zugriff auf API-Dokumentation

### Swagger UI (Interaktiv)

Die vollständige interaktive API-Dokumentation ist verfügbar unter:

- **Development:** http://localhost:3000/api/docs
- **Production:** https://api.uberfoods.com/api/docs

### OpenAPI JSON/YAML

Die OpenAPI-Spezifikation kann generiert werden:

```bash
cd backend
npm run generate:openapi
```

Dies erstellt:
- `openapi.json` - OpenAPI 3.0 JSON
- `openapi.yaml` - OpenAPI 3.0 YAML

---

## 📋 Admin Panel Endpunkte Übersicht

### 🔐 Authentifizierung

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/auth/login` | POST | Admin-Login |
| `/api/auth/refresh` | POST | Token-Refresh |

**Request Body (Login):**
```json
{
  "email": "admin@uberfoods.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "access_token": "jwt-token",
  "refresh_token": "refresh-token",
  "user": {
    "id": "user-id",
    "name": "Admin User",
    "email": "admin@uberfoods.com"
  }
}
```

---

### 👥 Admin Users Management

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/admin/users` | GET | Alle Admin-User abrufen |
| `/api/admin/users` | POST | Admin-User erstellen |
| `/api/admin/users/:id` | PUT | Admin-User aktualisieren |
| `/api/admin/users/:id` | DELETE | Admin-User löschen |
| `/api/admin/users/:id/toggle-status` | PATCH | Status umschalten |

---

### 🍽️ Restaurants

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/restaurants` | GET | Alle Restaurants abrufen |
| `/api/restaurants` | POST | Restaurant erstellen |
| `/api/restaurants/:id` | GET | Restaurant-Details |
| `/api/restaurants/:id` | PUT | Restaurant aktualisieren |
| `/api/restaurants/:id` | DELETE | Restaurant löschen |
| `/api/restaurants/:id/toggle-status` | PATCH | Status umschalten |

**Request Body (Create):**
```json
{
  "name": "Restaurant Name",
  "description": "Description",
  "address": "Address",
  "phone": "+43...",
  "email": "restaurant@example.com"
}
```

**Multipart Form Data:** Für Image-Upload `image`-Feld hinzufügen.

---

### 🍕 Dishes

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/dishes` | GET | Alle Gerichte abrufen |
| `/api/dishes` | POST | Gericht erstellen |
| `/api/dishes/:id` | PUT | Gericht aktualisieren |
| `/api/dishes/:id` | DELETE | Gericht löschen |
| `/api/dishes/:id/toggle-availability` | PATCH | Verfügbarkeit umschalten |

---

### 📦 Orders

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/orders` | GET | Alle Bestellungen abrufen (paginated) |
| `/api/orders/:id/status` | PATCH | Bestellstatus aktualisieren |
| `/api/orders/:id/assign` | PATCH | Fahrer zuweisen |
| `/api/orders/routing/optimize` | POST | Route optimieren |
| `/api/orders/batches` | POST | Batch erstellen |
| `/api/orders/:id/priority` | PATCH | Priorität aktualisieren |

**Query Parameters (GET /orders):**
- `page` (number): Seitennummer
- `limit` (number): Anzahl pro Seite
- `status` (string): Filter nach Status
- `restaurantId` (string): Filter nach Restaurant
- `driverId` (string): Filter nach Fahrer

**Request Body (Update Status):**
```json
{
  "status": "CONFIRMED",
  "version": 1  // Optional: Optimistic Locking
}
```

**Request Body (Assign Driver):**
```json
{
  "driverId": "driver-id"
}
```

**Request Body (Update Priority):**
```json
{
  "priority": "URGENT"  // LOW, MEDIUM, HIGH, URGENT
}
```

---

### 👥 Customers

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/customers` | GET | Alle Kunden abrufen |
| `/api/customers` | POST | Kunde erstellen |
| `/api/customers/:id` | PUT | Kunde aktualisieren |
| `/api/customers/:id` | DELETE | Kunde löschen |

---

### 🚗 Drivers

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/drivers` | GET | Alle Fahrer abrufen |
| `/api/drivers` | POST | Fahrer erstellen |
| `/api/drivers/:id` | PUT | Fahrer aktualisieren |
| `/api/drivers/:id` | DELETE | Fahrer löschen |
| `/api/drivers/:id/toggle-status` | PATCH | Status umschalten |

---

### 📊 Statistics

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/statistics/dashboard` | GET | Dashboard-Statistiken |
| `/api/statistics/revenue` | GET | Umsatz-Statistiken |
| `/api/statistics/top-restaurants` | GET | Top Restaurants |
| `/api/statistics/driver-performance` | GET | Fahrer-Performance |
| `/api/statistics/top-promotions` | GET | Top Promotionen |
| `/api/statistics/promotion-performance` | GET | Promotion-Performance |
| `/api/statistics/customer-growth` | GET | Kunden-Wachstum |
| `/api/statistics/order-status-distribution` | GET | Bestellstatus-Verteilung |
| `/api/statistics/restaurant/:id` | GET | Restaurant-Statistiken |

**Query Parameters:**
- `period` (string): Zeitraum (7d, 30d, 90d, 1y)

**Hinweis:** Einige Endpunkte sind optional und haben Fallbacks im Frontend.

---

### 💰 Financial

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/financial/overview` | GET | Finanzübersicht |
| `/api/financial/payouts` | GET | Payouts abrufen |
| `/api/financial/payouts/bulk` | POST | Bulk Payouts verarbeiten |
| `/api/financial/payouts/:id/process` | POST | Payout verarbeiten |
| `/api/financial/invoices` | GET | Rechnungen abrufen |
| `/api/financial/invoices` | POST | Rechnung erstellen |
| `/api/financial/invoices/:id/pdf` | GET | Rechnung als PDF |

---

### 💳 Subscriptions

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/admin/users/subscriptions` | GET | Alle Subscriptions |
| `/api/admin/users/subscriptions/analytics` | GET | Subscription-Analytics |
| `/api/admin/users/subscriptions/:driverId/upgrade` | POST | Subscription upgraden |
| `/api/admin/users/subscriptions/:driverId/cancel` | POST | Subscription kündigen |
| `/api/admin/users/subscriptions/:driverId/reactivate` | POST | Subscription reaktivieren |
| `/api/admin/users/subscriptions/:driverId` | PUT | Subscription aktualisieren |
| `/api/admin/users/subscriptions/tier-configs` | GET | Tier-Konfigurationen |
| `/api/admin/users/subscriptions/tier-configs/:tier` | PUT | Tier-Konfiguration aktualisieren |
| `/api/admin/users/subscriptions/tier-configs/:tier` | POST | Tier-Konfiguration erstellen |

---

### 🎁 Promotions

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/promotions` | GET | Alle Promotionen |
| `/api/promotions` | POST | Promotion erstellen |
| `/api/promotions/:id` | PUT | Promotion aktualisieren |
| `/api/promotions/:id` | DELETE | Promotion löschen |
| `/api/promotions/:id/toggle-status` | PATCH | Status umschalten |

---

### 🎧 Support

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/support/tickets` | GET | Alle Tickets |
| `/api/support/tickets/:id` | PATCH | Ticket aktualisieren |
| `/api/support/chat/sessions` | GET | Chat-Sessions |
| `/api/support/chat/:sessionId/message` | POST | Chat-Nachricht senden |
| `/api/support/analytics` | GET | Support-Analytics |

**Query Parameters (GET /support/tickets):**
- `status` (string): Filter nach Status
- `priority` (string): Filter nach Priorität
- `limit` (number): Anzahl der Ergebnisse

---

### 🔐 RBAC

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/rbac/roles` | GET | Alle Rollen |
| `/api/rbac/roles` | POST | Rolle erstellen |
| `/api/rbac/permissions` | GET | Alle Berechtigungen |
| `/api/rbac/users` | GET | RBAC-User |
| `/api/rbac/sessions` | GET | Aktive Sessions |
| `/api/rbac/sessions/:id` | DELETE | Session beenden |
| `/api/rbac/2fa/status` | GET | 2FA-Status |

---

### ⚙️ Settings

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/settings/restaurant/:id/hours` | GET | Öffnungszeiten |
| `/api/settings/restaurant/:id/hours` | PUT | Öffnungszeiten aktualisieren |
| `/api/settings/restaurant/:id/holidays` | GET | Feiertage |
| `/api/settings/restaurant/:id/holidays` | PUT | Feiertage aktualisieren |

---

### 📄 Legal Pages

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/legal-pages` | GET | Alle legalen Seiten |
| `/api/legal-pages` | POST | Legale Seite erstellen |
| `/api/legal-pages/:slug` | PUT | Legale Seite aktualisieren |
| `/api/legal-pages/:slug` | DELETE | Legale Seite löschen |

---

## 🔑 Authentifizierung

Alle Endpunkte (außer `/api/auth/login`) benötigen JWT-Authentifizierung:

```http
Authorization: Bearer <access_token>
```

Token wird automatisch im `api.ts` Interceptor hinzugefügt.

---

## 📝 Response-Formate

### Erfolgreiche Response

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Fehler-Response

```json
{
  "statusCode": 400,
  "message": "Fehlerbeschreibung",
  "error": "Bad Request"
}
```

---

## 🧪 Testing

### API-Tests ausführen

```bash
npm run test:api
```

### E2E-Tests (Playwright)

```bash
npm run test:e2e
```

---

## 📚 Weitere Ressourcen

- **Swagger UI:** http://localhost:3000/api/docs
- **API-Endpunkt-Analyse:** [API_ENDPOINT_ANALYSE.md](./API_ENDPOINT_ANALYSE.md)
- **Backend-Dokumentation:** `../backend/README.md`

---

## 🔄 WebSocket Events

Das Admin-Panel nutzt WebSocket für Real-time Updates:

**Verfügbare Events:**
- `order-updated` - Bestellung aktualisiert
- `order-created` - Neue Bestellung
- `driver-location-updated` - Fahrer-Standort aktualisiert
- `driver-status-updated` - Fahrer-Status geändert
- `promotion-created` - Neue Promotion
- `promotion-updated` - Promotion aktualisiert
- `promotion-deleted` - Promotion gelöscht
- `emergency-alert` - Notfall-Alert
- `system-metrics` - System-Metriken
- `admin_command_response` - Admin-Command Response

**WebSocket URL:**
- Development: `ws://localhost:3000`
- Production: `wss://api.uberfoods.com`

**Authentifizierung:** Token wird automatisch über `auth.token` und `Authorization` Header gesendet.

---

## 🆕 Neue Endpunkte (2025-12-09)

### 🏃 Wearables Management

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/drivers/:id/wearables/devices` | GET | Geräte abrufen |
| `/api/drivers/:id/wearables/health` | GET | Gesundheitsdaten abrufen |
| `/api/drivers/:id/wearables/connect` | POST | Gerät verbinden |
| `/api/drivers/:id/wearables/:provider` | DELETE | Gerät trennen |

**Request Body (Connect):**
```json
{
  "provider": "fitbit",
  "authToken": "oauth-token"
}
```

**Response (Devices):**
```json
{
  "data": [
    {
      "provider": "fitbit",
      "status": "connected",
      "connectedAt": "2025-01-01T00:00:00Z",
      "metadata": {}
    }
  ]
}
```

---

### 🚗 Vehicle Diagnostics

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/drivers/:id/vehicle/diagnostics/real-time` | GET | Echtzeit-Diagnosen |
| `/api/drivers/:id/vehicle/maintenance/predict` | GET | Wartungsprognose |
| `/api/drivers/:id/vehicle/obd/connect` | POST | OBD-II verbinden |
| `/api/drivers/:id/vehicle/obd/disconnect` | DELETE | OBD-II trennen |

**Request Body (OBD Connect):**
```json
{
  "deviceId": "OBD-12345"
}
```

**Response (Diagnostics):**
```json
{
  "data": {
    "speed": 60,
    "fuelLevel": 75,
    "batteryHealth": 90,
    "engineTemp": 85
  }
}
```

---

### 📱 Social Management

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/social/feed` | GET | Feed abrufen |
| `/api/social/posts` | POST | Post erstellen |
| `/api/social/posts/:id/like` | POST | Post liken |
| `/api/social/posts/:id/comments` | POST | Kommentar hinzufügen |

**Request Body (Create Post):**
```json
{
  "content": "Post content"
}
```

**Request Body (Add Comment):**
```json
{
  "message": "Comment text"
}
```

---

### 🪑 Table Management

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/tables` | GET | Tische abrufen |
| `/api/tables` | POST | Tisch anlegen |
| `/api/tables/:id` | PATCH | Tisch aktualisieren |
| `/api/reservations` | GET | Reservierungen abrufen |
| `/api/reservations` | POST | Reservierung anlegen |

**Query Parameters (GET /tables):**
- `restaurantId` (string): Restaurant-ID

**Request Body (Create Table):**
```json
{
  "name": "Table 1",
  "capacity": 4,
  "restaurantId": "restaurant-id"
}
```

**Request Body (Create Reservation):**
```json
{
  "customerName": "John Doe",
  "tableId": "table-id",
  "time": "2025-01-01T18:00:00Z",
  "notes": "Window seat",
  "restaurantId": "restaurant-id"
}
```

---

### 👨‍🍳 Kitchen Display

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/kitchen-display/restaurant/:id/orders` | GET | Bestellungen |
| `/api/kitchen-display/restaurant/:id/stations` | GET | Stationen |
| `/api/kitchen-display/restaurant/:id/performance` | GET | Performance |
| `/api/kitchen-display/items/:id/status` | POST | Item-Status ändern |

**Query Parameters (GET /orders):**
- `status` (string): Filter nach Status (comma-separated)
- `station` (string): Filter nach Station

**Request Body (Update Item Status):**
```json
{
  "status": "ready"
}
```

---

### 🍽️ Meal Planner

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/meal-planner/weekly` | GET | Weekly Plan |
| `/api/meal-planner/meals` | POST | Meal Plan erstellen |
| `/api/meal-planner/shopping-list` | GET | Einkaufsliste |
| `/api/meal-planner/meals/:id/execute` | POST | Plan ausführen |

**Query Parameters (GET /weekly):**
- `weekStart` (string): ISO-Datum (YYYY-MM-DD)

**Query Parameters (GET /shopping-list):**
- `startDate` (string): Start-Datum
- `endDate` (string): End-Datum

**Request Body (Create Meal Plan):**
```json
{
  "title": "Weekly Plan",
  "dishIds": ["dish-1", "dish-2"],
  "notes": "Optional notes"
}
```

---

### 👥 Group Orders

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/group-orders` | POST | Group Order erstellen |
| `/api/group-orders/:code` | GET | Group Order laden |
| `/api/group-orders/:id/expiration` | PUT | Expiration setzen |
| `/api/group-orders/:id/members/:customerId/ready` | PUT | Member ready |

**Request Body (Create):**
```json
{
  "restaurantId": "restaurant-id"
}
```

**Request Body (Set Expiration):**
```json
{
  "expiresAt": "2025-01-02T00:00:00Z"
}
```

---

### 🚚 Supplier Management

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/suppliers` | GET | Lieferanten abrufen |
| `/api/suppliers` | POST | Lieferant anlegen |
| `/api/suppliers/:id/toggle-status` | PATCH | Status toggle |
| `/api/supplier-orders` | GET | Orders abrufen |
| `/api/supplier-orders` | POST | Order erstellen |

**Query Parameters (GET /suppliers):**
- `restaurantId` (string): Restaurant-ID

**Request Body (Create Supplier):**
```json
{
  "name": "Supplier Name",
  "contactEmail": "supplier@example.com",
  "contactPhone": "+43...",
  "restaurantId": "restaurant-id"
}
```

**Request Body (Create Order):**
```json
{
  "supplierId": "supplier-id",
  "restaurantId": "restaurant-id",
  "notes": "Order notes"
}
```

---

**Status:** ✅ Vollständig dokumentiert  
**Letzte Aktualisierung:** 2025-12-09

