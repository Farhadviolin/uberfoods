# Enterprise Sync API Documentation

## Übersicht

Die Enterprise Sync API ermöglicht die Synchronisation von Daten und Events zwischen allen Apps (Admin Panel, Customer Web, Driver App, Restaurant Web) in Echtzeit.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Alle Endpoints erfordern JWT-Authentifizierung:

```
Authorization: Bearer <token>
```

---

## 1. Unified Notifications API

### POST /notifications/unified

Sendet eine einheitliche Benachrichtigung an mehrere Apps.

**Request Body:**
```json
{
  "id": "notification-123",
  "type": "order",
  "priority": "high",
  "title": "New Order",
  "message": "Order #123 has been placed",
  "data": {},
  "recipients": [
    {
      "app": "admin",
      "broadcast": true
    },
    {
      "app": "customer",
      "userIds": ["customer-1"]
    }
  ],
  "channels": ["websocket", "push", "email"],
  "metadata": {
    "orderId": "order-123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification sent"
}
```

### POST /notifications/unified/order/:orderId

Sendet eine Order-Benachrichtigung.

**Request Body:**
```json
{
  "event": "created",
  "data": {
    "status": "PENDING"
  }
}
```

### POST /notifications/unified/payment/:paymentId

Sendet eine Payment-Benachrichtigung.

**Request Body:**
```json
{
  "event": "completed",
  "data": {
    "amount": 100
  }
}
```

---

## 2. Financial Sync API

### POST /financial/sync/payment/:paymentId

Synchronisiert Payment-Completion.

**Request Body:**
```json
{
  "orderId": "order-123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment synced"
}
```

### POST /financial/sync/payout/:payoutId

Synchronisiert Payout-Processing.

**Request Body:**
```json
{
  "restaurantId": "restaurant-1",
  "amount": 500
}
```

### POST /financial/sync/invoice

Synchronisiert Invoice-Generation.

**Request Body:**
```json
{
  "invoiceId": "invoice-123",
  "orderId": "order-123",
  "customerId": "customer-1",
  "restaurantId": "restaurant-1",
  "amount": 100
}
```

### POST /financial/sync/refund/:refundId

Synchronisiert Refund-Processing.

**Request Body:**
```json
{
  "orderId": "order-123",
  "amount": 50
}
```

### GET /financial/sync/summary/:app/:userId

Gibt Financial Summary für eine App zurück.

**Query Parameters:**
- `period`: `7d` | `30d` | `90d` | `1y` (default: `30d`)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 10000,
    "totalPayouts": 5000,
    "netRevenue": 5000,
    "transactionCount": 100,
    "payoutCount": 50
  }
}
```

---

## 3. Analytics Sync API

### POST /analytics/sync/performance/:restaurantId

Synchronisiert Performance-Metriken.

**Request Body:**
```json
{
  "metrics": {
    "ordersPerHour": 10,
    "averagePreparationTime": 15,
    "customerSatisfaction": 4.5
  }
}
```

### POST /analytics/sync/revenue-forecast/:restaurantId

Synchronisiert Revenue-Forecast.

**Request Body:**
```json
{
  "forecast": {
    "nextWeek": 5000,
    "nextMonth": 20000
  },
  "period": "7d"
}
```

### POST /analytics/sync/demand-prediction/:restaurantId

Synchronisiert Demand-Prediction.

**Request Body:**
```json
{
  "prediction": {
    "peakHours": ["12:00", "18:00"],
    "expectedOrders": 50
  },
  "confidence": 0.85
}
```

### GET /analytics/sync/summary/:app/:userId

Gibt Analytics Summary zurück.

**Query Parameters:**
- `period`: `7d` | `30d` | `90d` | `1y` (default: `30d`)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalOrders": 1000,
    "totalRevenue": 50000,
    "newCustomers": 50,
    "averageOrderValue": 50
  }
}
```

---

## 4. Security Sync API

### POST /security/sync/event

Synchronisiert Security-Event.

**Request Body:**
```json
{
  "type": "suspicious_activity",
  "severity": "high",
  "data": {
    "userId": "user-123",
    "ipAddress": "192.168.1.1",
    "description": "Multiple failed login attempts"
  }
}
```

### POST /security/sync/suspicious-activity

Meldet verdächtige Aktivität.

**Request Body:**
```json
{
  "userId": "user-123",
  "description": "Unusual access pattern",
  "metadata": {}
}
```

### POST /security/sync/unauthorized-access

Meldet unautorisierten Zugriff.

**Request Body:**
```json
{
  "ipAddress": "192.168.1.1",
  "endpoint": "/api/admin/users",
  "userAgent": "Mozilla/5.0..."
}
```

### GET /security/sync/events

Gibt Security-Events zurück.

**Query Parameters:**
- `period`: `24h` | `7d` | `30d` (default: `7d`)
- `severity`: `low` | `medium` | `high` | `critical`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "event-123",
      "type": "suspicious_activity",
      "severity": "high",
      "description": "Multiple failed login attempts",
      "userId": "user-123",
      "ipAddress": "192.168.1.1",
      "timestamp": "2025-01-27T10:00:00Z"
    }
  ]
}
```

---

## 5. Performance Monitoring Sync API

### POST /monitoring/sync/metrics

Synchronisiert Performance-Metriken.

**Request Body:**
```json
{
  "cpu": 45,
  "memory": 60,
  "disk": 30,
  "network": 20,
  "responseTime": 120,
  "errorRate": 0.01,
  "throughput": 1000,
  "timestamp": "2025-01-27T10:00:00Z"
}
```

### POST /monitoring/sync/health

Synchronisiert System-Health.

**Request Body:**
```json
{
  "status": "healthy",
  "services": [
    {
      "name": "api",
      "status": "up",
      "responseTime": 50
    },
    {
      "name": "database",
      "status": "up",
      "responseTime": 10
    }
  ],
  "timestamp": "2025-01-27T10:00:00Z"
}
```

### GET /monitoring/sync/summary

Gibt Performance Summary zurück.

**Query Parameters:**
- `period`: `1h` | `24h` | `7d` (default: `1h`)

**Response:**
```json
{
  "success": true,
  "data": {
    "averageCpu": 45,
    "averageMemory": 60,
    "averageResponseTime": 120,
    "errorRate": 0.01,
    "throughput": 1000
  }
}
```

---

## 6. AI/ML Sync API

### POST /ai-ml/sync/eta/:orderId

Synchronisiert ETA-Prediction.

**Request Body:**
```json
{
  "eta": 25,
  "confidence": 0.9,
  "metadata": {}
}
```

### POST /ai-ml/sync/demand/:restaurantId

Synchronisiert Demand-Prediction.

**Request Body:**
```json
{
  "prediction": {
    "peakHours": ["12:00", "18:00"],
    "expectedOrders": 50
  },
  "confidence": 0.85
}
```

### POST /ai-ml/sync/fraud/:orderId

Synchronisiert Fraud-Detection.

**Request Body:**
```json
{
  "fraudProbability": 0.15,
  "riskLevel": "medium"
}
```

### GET /ai-ml/sync/predictions/:app/:userId

Gibt ML-Predictions zurück.

**Query Parameters:**
- `type`: `eta` | `demand` | `pricing` | `churn` | `fraud` | `recommendation`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "eta",
      "data": {
        "orderId": "order-123",
        "prediction": { "eta": 25 },
        "confidence": 0.9
      },
      "timestamp": "2025-01-27T10:00:00Z"
    }
  ]
}
```

---

## WebSocket Events

Alle Apps können folgende WebSocket-Events empfangen:

### Unified Notifications
- `unified-notification`: Empfängt einheitliche Benachrichtigungen

### Financial Events
- `financial-event`: Empfängt Financial-Events (Payment, Payout, Invoice, Refund)

### Analytics Events
- `analytics-event`: Empfängt Analytics-Updates (Performance, Revenue Forecast, Demand Prediction)

### Security Events
- `security-event`: Empfängt Security-Events (Suspicious Activity, Unauthorized Access, etc.)

### Performance Monitoring
- `performance-metrics`: Empfängt Performance-Metriken
- `system-health`: Empfängt System-Health-Status
- `error-event`: Empfängt Error-Events

### AI/ML Predictions
- `ml-prediction`: Empfängt ML-Predictions (ETA, Demand, Pricing, Churn, Fraud, Recommendations)

---

## Error Responses

Alle Endpoints können folgende Fehler zurückgeben:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

```json
{
  "statusCode": 403,
  "message": "Forbidden",
  "error": "Forbidden"
}
```

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## Rate Limiting

Alle Endpoints haben Rate Limiting:
- **Standard**: 100 Requests pro Minute
- **Admin Endpoints**: 200 Requests pro Minute

Bei Überschreitung:
```json
{
  "statusCode": 429,
  "message": "Too Many Requests",
  "error": "Too Many Requests"
}
```

---

## Best Practices

1. **WebSocket-Verbindungen**: Verwende WebSocket für Real-time Updates, REST API für einmalige Abfragen
2. **Error Handling**: Implementiere Retry-Logik für fehlgeschlagene Requests
3. **Caching**: Cache Summary-Daten für bessere Performance
4. **Filtering**: Verwende Filter-Parameter, um nur relevante Daten zu erhalten
5. **Security**: Validiere alle Inputs und verwende HTTPS in Production

---

## Support

Bei Fragen oder Problemen:
- **Email**: support@uberfoods.com
- **Documentation**: https://docs.uberfoods.com
- **Status**: https://status.uberfoods.com

