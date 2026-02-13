# Driver API - Vollständige Dokumentation

## Übersicht

Die Driver API bietet umfassende Funktionalität für Fahrer-Management, Routen-Optimierung, Finanzverwaltung, Performance-Analytics, Gamification und Emergency-Features.

**Base URL:** `/api/drivers`

**Authentication:** JWT Bearer Token erforderlich

**Rate Limiting:** Endpoint-spezifisch (siehe Details unten)

---

## 📋 Inhaltsverzeichnis

1. [CRUD Operations](#crud-operations)
2. [Route Management](#route-management)
3. [Financial Management](#financial-management)
4. [Performance & Analytics](#performance--analytics)
5. [Gamification](#gamification)
6. [Emergency & Safety](#emergency--safety)
7. [Order Management](#order-management)
8. [Subscription Management](#subscription-management)
9. [Notifications](#notifications)
10. [Meta Glasses & Voice](#meta-glasses--voice)

---

## CRUD Operations

### Get All Drivers
```http
GET /api/drivers
```

**Query Parameters:**
- `isActive` (boolean): Filter by active status
- `currentStatus` (string): Filter by driver status
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `search` (string): Search query (name, email, phone)
- `subscriptionTier` (string): Filter by subscription tier
- `minRating` (number): Minimum rating (0-5)
- `maxRating` (number): Maximum rating (0-5)
- `vehicleType` (string): Filter by vehicle type
- `minDeliveries` (number): Minimum number of deliveries
- `maxDeliveries` (number): Maximum number of deliveries
- `registeredFrom` (string): Registration date from (ISO string)
- `registeredTo` (string): Registration date to (ISO string)

**Rate Limit:** 100 requests/minute

**Response:**
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### Get Driver by ID
```http
GET /api/drivers/:id
```

**Rate Limit:** 100 requests/minute

### Create Driver
```http
POST /api/drivers
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+43123456789",
  "password": "optional",
  "location": {
    "lat": 48.2082,
    "lng": 16.3738
  },
  "vehicleInfo": {
    "type": "CAR",
    "licensePlate": "W-12345",
    "make": "Toyota",
    "model": "Corolla",
    "year": 2020
  }
}
```

**Response:**
```json
{
  "id": "driver-123",
  "name": "John Doe",
  "email": "john@example.com",
  "temporaryPassword": "TempPass123!",
  "welcomeEmailSent": true
}
```

### Update Driver
```http
PUT /api/drivers/:id
```

**Rate Limit:** 50 requests/minute

### Delete Driver
```http
DELETE /api/drivers/:id
```

**Rate Limit:** 10 requests/minute

---

## Route Management

### Get Active Routes
```http
GET /api/drivers/:id/routes/active
```

**Response:**
```json
{
  "routes": [
    {
      "routeId": "route-123",
      "orders": [...],
      "totalDistance": 5.2,
      "estimatedDuration": 15
    }
  ]
}
```

### Calculate Route
```http
POST /api/drivers/:id/routes/calculate
```

**Rate Limit:** 30 requests/minute

**Request Body:**
```json
{
  "origin": { "lat": 48.2082, "lng": 16.3738 },
  "destination": { "lat": 48.2100, "lng": 16.3750 },
  "waypoints": [
    { "lat": 48.2090, "lng": 16.3740 }
  ]
}
```

**Response:**
```json
{
  "route": {
    "distance": 2.5,
    "duration": 8,
    "waypoints": [...]
  }
}
```

### Advanced Route Optimization
```http
POST /api/drivers/:id/route/optimize-advanced
```

**Rate Limit:** 20 requests/minute (ML intensive)

**Request Body:**
```json
{
  "location": { "lat": 48.2082, "lng": 16.3738 },
  "orders": [
    {
      "orderId": "order-123",
      "restaurant": { "lat": 48.2100, "lng": 16.3750 },
      "customer": { "lat": 48.2120, "lng": 16.3770 },
      "totalAmount": 25.50
    }
  ]
}
```

### Save Route
```http
POST /api/drivers/:id/routes/save
```

**Rate Limit:** 10 requests/minute

**Request Body:**
```json
{
  "name": "Daily Route 1",
  "waypoints": [
    { "lat": 48.2082, "lng": 16.3738 }
  ],
  "description": "My favorite route"
}
```

### Get Saved Routes
```http
GET /api/drivers/:id/routes/saved
```

**Cached:** 10 minutes

### Recalculate Route
```http
POST /api/drivers/:id/routes/recalculate
```

**Rate Limit:** 30 requests/minute

### Create Emergency Route
```http
POST /api/drivers/:id/routes/emergency
```

**Rate Limit:** 5 requests/minute

**Request Body:**
```json
{
  "destination": { "lat": 48.2082, "lng": 16.3738 },
  "priority": "urgent"
}
```

---

## Financial Management

### Get Financial Balance
```http
GET /api/drivers/:id/financial/balance
```

**Cached:** 2 minutes

**Response:**
```json
{
  "driverId": "driver-123",
  "totalBalance": 1000.00,
  "availableBalance": 950.00,
  "pendingAmount": 50.00,
  "currency": "EUR",
  "lastUpdated": "2024-01-15T10:00:00Z"
}
```

### Transfer Funds
```http
POST /api/drivers/:id/financial/transfer
```

**Rate Limit:** 10 requests/minute

**Request Body:**
```json
{
  "amount": 100.50,
  "recipientId": "driver-456",
  "reason": "Emergency payment"
}
```

### Calculate Taxes
```http
POST /api/drivers/:id/financial/taxes/calculate
```

**Rate Limit:** 20 requests/minute

**Request Body:**
```json
{
  "year": 2024,
  "deductions": {
    "vehicle": 500,
    "fuel": 200
  }
}
```

### Get Bonuses
```http
GET /api/drivers/:id/financial/bonuses
```

**Query Parameters:**
- `status` (string): Filter by status

**Cached:** 3 minutes

### Get Penalties
```http
GET /api/drivers/:id/financial/penalties
```

**Cached:** 3 minutes

### Generate Financial Report
```http
POST /api/drivers/:id/financial/reports/generate
```

**Rate Limit:** 5 requests/minute (resource intensive)

**Request Body:**
```json
{
  "type": "earnings",
  "period": "month",
  "format": "pdf"
}
```

---

## Performance & Analytics

### Get Performance Dashboard
```http
GET /api/drivers/:id/performance/dashboard
```

**Query Parameters:**
- `period` (string): 'day' | 'week' | 'month'

**Response:**
```json
{
  "metrics": {
    "deliveries": 50,
    "onTimeRate": 95.5,
    "rating": 4.8,
    "earnings": 1250.00
  },
  "period": "week"
}
```

### Start Performance Training
```http
POST /api/drivers/:id/performance/training
```

**Rate Limit:** 10 requests/minute

**Request Body:**
```json
{
  "trainingType": "route_optimization",
  "duration": 30
}
```

### Request Certification
```http
POST /api/drivers/:id/performance/certifications
```

**Rate Limit:** 5 requests/minute

**Request Body:**
```json
{
  "certificationType": "safety",
  "reason": "Required for premium tier"
}
```

### Create Performance Review
```http
POST /api/drivers/:id/performance/reviews
```

**Rate Limit:** 3 requests/minute

**Request Body:**
```json
{
  "period": "2024-01",
  "selfAssessment": {
    "rating": 4.5,
    "strengths": ["Punctuality", "Communication"],
    "improvements": ["Route optimization"]
  }
}
```

### Submit Performance Feedback
```http
POST /api/drivers/:id/performance/feedback
```

**Rate Limit:** 20 requests/minute

**Request Body:**
```json
{
  "feedback": "Great performance this week!",
  "type": "positive"
}
```

### Create Action Plan
```http
POST /api/drivers/:id/performance/action-plan
```

**Rate Limit:** 5 requests/minute

**Request Body:**
```json
{
  "goals": [
    "Improve on-time delivery",
    "Increase customer ratings"
  ],
  "timeline": "30 days",
  "milestones": []
}
```

---

## Gamification

### Redeem Points
```http
POST /api/drivers/:id/gamification/points/redeem
```

**Rate Limit:** 15 requests/minute

**Request Body:**
```json
{
  "amount": 1000,
  "rewardId": "reward-123"
}
```

### Unlock Badge
```http
POST /api/drivers/:id/gamification/badges/unlock
```

**Rate Limit:** 20 requests/minute

**Request Body:**
```json
{
  "badgeId": "badge-first-delivery"
}
```

### Upgrade Level
```http
POST /api/drivers/:id/gamification/levels/upgrade
```

**Rate Limit:** 10 requests/minute

### Claim Reward
```http
POST /api/drivers/:id/gamification/rewards/claim
```

**Rate Limit:** 15 requests/minute

### Join Event
```http
POST /api/drivers/:id/gamification/events/join
```

**Rate Limit:** 10 requests/minute

### Register for Tournament
```http
POST /api/drivers/:id/gamification/tournaments/register
```

**Rate Limit:** 5 requests/minute

---

## Emergency & Safety

### Send Emergency Alert
```http
POST /api/drivers/:id/emergency/alert
```

**Request Body:**
```json
{
  "type": "accident",
  "location": { "lat": 48.2082, "lng": 16.3738 },
  "message": "Need immediate assistance"
}
```

### Trigger Panic Button
```http
POST /api/drivers/:id/safety/panic
```

**Response:**
```json
{
  "alertId": "alert-123",
  "status": "active",
  "respondersNotified": true
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid input data",
  "errors": [...]
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Driver not found"
}
```

### 429 Too Many Requests
```json
{
  "statusCode": 429,
  "message": "Too many requests. Please try again later.",
  "retryAfter": 60
}
```

---

## Rate Limiting

Rate Limits sind endpoint-spezifisch:

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Read Operations | 100/min | 1 minute |
| Write Operations | 50/min | 1 minute |
| Financial Transfers | 10/min | 1 minute |
| Report Generation | 5/min | 1 minute |
| Route Optimization | 20/min | 1 minute |
| Route Calculation | 30/min | 1 minute |
| Emergency Routes | 5/min | 1 minute |
| Gamification Actions | 15-20/min | 1 minute |

---

## Caching

Folgende Endpoints verwenden Caching:

- **Financial Balance:** 2 minutes TTL
- **Route History:** 5 minutes TTL
- **Saved Routes:** 10 minutes TTL
- **Bonuses:** 3 minutes TTL
- **Penalties:** 3 minutes TTL

Cache wird automatisch invalidiert bei:
- Driver Updates
- Driver Creation
- Driver Deletion

---

## WebSocket Events

### Driver Status Updates
```javascript
socket.emit('status_update', {
  driverId: 'driver-123',
  status: 'ONLINE'
});
```

### Location Updates
```javascript
socket.emit('location_update', {
  driverId: 'driver-123',
  location: { lat: 48.2082, lng: 16.3738 }
});
```

### Order Updates
```javascript
socket.emit('order_update', {
  orderId: 'order-123',
  status: 'IN_TRANSIT'
});
```

---

## Best Practices

1. **Authentication:** Verwenden Sie immer JWT Bearer Tokens
2. **Rate Limiting:** Beachten Sie die endpoint-spezifischen Limits
3. **Caching:** Nutzen Sie Caching für wiederholte Abfragen
4. **Error Handling:** Implementieren Sie Retry-Logik für 429 Errors
5. **WebSockets:** Verwenden Sie WebSockets für Real-time Updates

---

## Support

Bei Fragen oder Problemen:
- **API Documentation:** `/api/docs` (Swagger UI)
- **Support Email:** support@uberfoods.com
- **Status Page:** https://status.uberfoods.com

