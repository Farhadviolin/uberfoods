# 🚀 UberFoods API Documentation

**Vollständige REST API Dokumentation für das UberFoods System**

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Authentication](#authentication)
- [Restaurants](#restaurants)
- [Orders](#orders)
- [Customers](#customers)
- [Analytics](#analytics)
- [Gamification](#gamification)
- [Search](#search)
- [WebSocket Events](#websocket-events)
- [Error Handling](#error-handling)

## 📖 Übersicht

### Base URL
```
Production: https://api.uberfoods.com
Development: http://localhost:3000/api
```

### API Version
```
Current: v1.0.0
Accept: application/json
Content-Type: application/json
```

### Rate Limiting
```
100 requests per minute per IP
X-RateLimit-Remaining: Headers included
```

## 🔐 Authentication

### JWT Token Required
Alle geschützten Endpunkte benötigen einen gültigen JWT Token im Authorization Header:

```
Authorization: Bearer <jwt_token>
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "customer@example.com",
    "role": "customer"
  }
}
```

### Token Refresh
```http
POST /auth/refresh
Authorization: Bearer <refresh_token>
```

## 🍕 Restaurants

### Get Public Restaurants
```http
GET /restaurants/public
```

**Query Parameters:**
- `limit` (number): Max results (default: 20)
- `offset` (number): Pagination offset (default: 0)
- `cuisine` (string): Filter by cuisine type
- `rating` (number): Minimum rating filter

**Response:**
```json
[
  {
    "id": "rest_123",
    "name": "Pizza Palace",
    "description": "Authentic Italian Pizza",
    "imageUrl": "https://...",
    "rating": 4.5,
    "totalOrders": 1250,
    "estimatedDeliveryTime": 30,
    "deliveryFee": 2.50,
    "minOrderAmount": 10.00,
    "cuisines": ["Italian", "Pizza"],
    "address": "Hauptstraße 123, Berlin",
    "isOpen": true,
    "dishes": [
      {
        "id": "dish_123",
        "name": "Margherita Pizza",
        "description": "Tomato, mozzarella, basil",
        "price": 8.50,
        "category": "Pizza",
        "isAvailable": true,
        "imageUrl": "https://...",
        "calories": 650
      }
    ]
  }
]
```

### Get Restaurant Details
```http
GET /restaurants/{id}
```

**Path Parameters:**
- `id` (string): Restaurant ID

### Get Restaurant Menu
```http
GET /restaurants/{id}/menu
```

**Query Parameters:**
- `category` (string): Filter by category
- `available` (boolean): Only available items

## 🛒 Orders

### Create Order
```http
POST /orders
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "restaurantId": "rest_123",
  "items": [
    {
      "dishId": "dish_123",
      "quantity": 2,
      "specialInstructions": "Extra cheese"
    }
  ],
  "deliveryAddress": {
    "street": "Hauptstraße 123",
    "city": "Berlin",
    "postalCode": "10115"
  },
  "paymentMethodId": "pm_123",
  "deliveryTime": "ASAP"
}
```

**Response:**
```json
{
  "id": "order_123",
  "status": "confirmed",
  "totalAmount": 19.50,
  "deliveryFee": 2.50,
  "estimatedDeliveryTime": 25,
  "createdAt": "2024-01-15T14:30:00Z"
}
```

### Get Order Status
```http
GET /orders/{id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "order_123",
  "status": "preparing",
  "items": [...],
  "driver": {
    "id": "driver_456",
    "name": "Max Mustermann",
    "phone": "+49123456789",
    "location": {
      "lat": 52.5200,
      "lng": 13.4050
    }
  },
  "timeline": [
    {
      "status": "confirmed",
      "timestamp": "2024-01-15T14:30:00Z"
    },
    {
      "status": "preparing",
      "timestamp": "2024-01-15T14:35:00Z"
    }
  ]
}
```

### Cancel Order
```http
PUT /orders/{id}/cancel
Authorization: Bearer <token>
```

## 👤 Customers

### Get Profile
```http
GET /customers/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "user_123",
  "email": "customer@example.com",
  "name": "Max Mustermann",
  "phone": "+49123456789",
  "addresses": [
    {
      "id": "addr_123",
      "type": "home",
      "street": "Hauptstraße 123",
      "city": "Berlin",
      "postalCode": "10115",
      "isDefault": true
    }
  ],
  "gamification": {
    "level": 5,
    "xp": 1250,
    "totalXP": 1250,
    "currentStreak": 7
  }
}
```

### Update Profile
```http
PUT /customers/me
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Maximilian Mustermann",
  "phone": "+49987654321"
}
```

### Add Address
```http
POST /customers/me/addresses
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "work",
  "street": "Friedrichstraße 100",
  "city": "Berlin",
  "postalCode": "10117"
}
```

## 📊 Analytics

### Get Expense Analytics
```http
GET /analytics/expenses/{period}?customerId={id}
Authorization: Bearer <token>
```

**Path Parameters:**
- `period`: `week` | `month` | `year`

**Response:**
```json
{
  "period": {
    "type": "month",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-31T23:59:59Z"
  },
  "summary": {
    "totalSpent": 247.50,
    "totalOrders": 12,
    "averageOrderValue": 20.63,
    "spendingChangePercent": 15.2
  },
  "expensesByDate": [
    {
      "date": "2024-01-15",
      "amount": 45.80
    }
  ],
  "expensesByCategory": [
    {
      "category": "Pizza",
      "amount": 120.50,
      "percentage": 48.7
    }
  ]
}
```

### Get Spending Patterns
```http
GET /analytics/spending-patterns?customerId={id}
Authorization: Bearer <token>
```

### Get Savings Opportunities
```http
GET /analytics/savings-opportunities?customerId={id}
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "type": "frequent_small_orders",
    "title": "Kombiniere kleine Bestellungen",
    "description": "Du hast 8 kleine Bestellungen unter €15 aufgegeben",
    "potentialSavings": 12.00,
    "impact": "high"
  }
]
```

## 🎮 Gamification

### Get User Stats
```http
GET /gamification/stats?customerId={id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "level": 5,
  "xp": 1250,
  "xpToNextLevel": 750,
  "totalXP": 1250,
  "currentStreak": 7,
  "longestStreak": 14,
  "achievements": [
    {
      "id": "ach_123",
      "type": "first_order",
      "title": "First Order",
      "description": "Place your first order",
      "icon": "🎉",
      "points": 100,
      "unlocked": true,
      "unlockedAt": "2024-01-10T10:00:00Z"
    }
  ]
}
```

### Get Leaderboard
```http
GET /gamification/leaderboard?type={type}&limit={limit}
```

**Query Parameters:**
- `type`: `level` | `xp` | `orders` | `spent` | `reviews`
- `limit`: Number of results (default: 50)

### Claim Achievement Reward
```http
POST /gamification/achievements/{id}/claim
Authorization: Bearer <token>
```

## 🔍 Search

### Mega Search
```http
GET /search?q={query}&customerId={id}
Authorization: Bearer <token>
```

**Query Parameters:**
- `q`: Search query
- `customerId`: User ID for personalization
- `limit`: Max results (default: 20)
- `type`: `restaurant` | `dish` | `all`

**Response:**
```json
{
  "query": "pizza margherita",
  "totalResults": 15,
  "results": [
    {
      "type": "dish",
      "id": "dish_123",
      "name": "Pizza Margherita",
      "restaurant": {
        "id": "rest_123",
        "name": "Pizza Palace",
        "rating": 4.5
      },
      "price": 8.50,
      "category": "Pizza",
      "score": 0.95
    }
  ],
  "suggestions": [
    "pizza napoli",
    "pizza quattro formaggi"
  ]
}
```

### Restaurant Search
```http
GET /search/restaurants?q={query}&location={location}
```

**Query Parameters:**
- `q`: Restaurant name or cuisine
- `location`: User location for distance sorting
- `cuisine`: Filter by cuisine
- `rating`: Minimum rating
- `priceRange`: `budget` | `moderate` | `expensive`

## 📡 WebSocket Events

### Connection
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'jwt_token' }
});
```

### Order Updates
```javascript
// Listen for order status updates
socket.on('order.status', (data) => {
  console.log('Order update:', data);
  // { orderId: 'order_123', status: 'preparing', timestamp: '...' }
});

// Listen for driver location updates
socket.on('order.driver.location', (data) => {
  console.log('Driver location:', data);
  // { orderId: 'order_123', location: { lat: 52.5, lng: 13.4 } }
});
```

### Gamification Events
```javascript
// Listen for XP gains
socket.on('gamification.xp', (data) => {
  console.log('XP gained:', data);
  // { amount: 50, reason: 'order_completed', newTotal: 1300 }
});

// Listen for achievement unlocks
socket.on('gamification.achievement', (data) => {
  console.log('Achievement unlocked:', data);
  // { achievementId: 'ach_123', title: 'First Order', points: 100 }
});
```

### Restaurant Updates
```javascript
// Listen for restaurant status changes
socket.on('restaurant.status', (data) => {
  console.log('Restaurant status:', data);
  // { restaurantId: 'rest_123', isOpen: false, reason: 'maintenance' }
});
```

## ❌ Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `429` - Rate Limited
- `500` - Internal Server Error

### Error Response Format
```json
{
  "statusCode": 400,
  "timestamp": "2024-01-15T14:30:00Z",
  "path": "/api/orders",
  "method": "POST",
  "message": "Validation failed",
  "errors": [
    {
      "field": "items",
      "message": "At least one item is required"
    }
  ]
}
```

### Common Error Codes
```json
{
  "VALIDATION_ERROR": "Input validation failed",
  "UNAUTHORIZED": "Authentication required",
  "FORBIDDEN": "Insufficient permissions",
  "NOT_FOUND": "Resource not found",
  "RATE_LIMITED": "Too many requests",
  "PAYMENT_FAILED": "Payment processing failed",
  "RESTAURANT_CLOSED": "Restaurant is currently closed"
}
```

## 🔧 SDK & Integration

### JavaScript SDK
```javascript
import { UberFoodsClient } from '@uberfoods/sdk';

const client = new HMORClient({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.hmor-food.com'
});

// Authenticate
await client.auth.login('email@example.com', 'password');

// Get restaurants
const restaurants = await client.restaurants.list();

// Place order
const order = await client.orders.create({
  restaurantId: 'rest_123',
  items: [{ dishId: 'dish_456', quantity: 2 }]
});
```

### Mobile SDK (React Native)
```typescript
import HMOR from 'react-native-hmor-sdk';

HMOR.configure({
  apiKey: 'your_api_key'
});

// Real-time order tracking
HMOR.onOrderUpdate((order) => {
  console.log('Order status:', order.status);
});
```

## 📞 Support & Contact

### API Support
- **Email**: api-support@hmor-food.com
- **Documentation**: https://docs.hmor-food.com
- **Status Page**: https://status.hmor-food.com

### Developer Community
- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Slack**: Join our developer community

---

## 📈 API Versioning

### Current Version: v1.0.0
- Stable production release
- Full backward compatibility
- Long-term support until v2.0.0

### Version Header
```
Accept: application/vnd.hmor.v1+json
```

### Deprecation Policy
- 12 months notice for breaking changes
- Gradual migration path provided
- Legacy version support maintained

---

**🎯 Diese API ist vollständig funktional und bereit für Production-Einsatz**

**📖 Für detaillierte Beispiele siehe [API Examples](examples.md)**
