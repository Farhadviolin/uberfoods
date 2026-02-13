# 📡 UberFoods - API Examples & Usage Guide

**Version:** 1.0  
**Base URL**: `http://localhost:3000/api`  
**Production URL**: `https://api.uberfoods.com/api`

---

## 🔐 **Authentication**

### **Login**
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "admin@uberfoods.com",
  "password": "AdminPass123!"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "admin@uberfoods.com",
    "name": "Admin",
    "role": "ADMIN"
  }
}
```

### **Register (Customer)**
```bash
POST /auth/register
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "phone": "+43 664 1234567"
}
```

### **Refresh Token**
```bash
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 🍕 **Restaurants**

### **List All Restaurants**
```bash
GET /restaurants?page=1&limit=20&search=pizza&cuisine=Italian
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": [
    {
      "id": "rest_123",
      "name": "Pizza Paradise",
      "description": "Best Italian Pizza in Town",
      "address": "Hauptstrasse 1, 1010 Wien",
      "phone": "+43 1 1234567",
      "email": "info@pizzaparadise.at",
      "imageUrl": "/uploads/restaurants/rest_123.jpg",
      "cuisines": ["Italian", "Pizza"],
      "rating": 4.8,
      "isActive": true,
      "status": "OPEN",
      "deliveryTime": "30-45 min"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

### **Get Restaurant Details**
```bash
GET /restaurants/rest_123
Authorization: Bearer <token>
```

### **Create Restaurant (Admin)**
```bash
POST /restaurants
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

name=Pizza Paradise
description=Best Italian Pizza
address=Hauptstrasse 1, 1010 Wien
phone=+43 1 1234567
email=info@pizzaparadise.at
image=<file>
```

### **Update Restaurant Status**
```bash
PATCH /restaurants/rest_123/toggle-status
Authorization: Bearer <admin_token>
```

---

## 🍔 **Dishes/Menu**

### **List Restaurant Menu**
```bash
GET /dishes?restaurantId=rest_123
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": [
    {
      "id": "dish_456",
      "name": "Margherita Pizza",
      "description": "Classic Italian pizza with mozzarella and basil",
      "price": 12.90,
      "imageUrl": "/uploads/dishes/dish_456.jpg",
      "category": "Pizza",
      "isAvailable": true,
      "restaurantId": "rest_123",
      "allergens": ["gluten", "dairy"],
      "nutrition": {
        "calories": 850,
        "protein": 32,
        "carbs": 120,
        "fat": 28
      }
    }
  ]
}
```

### **Create Dish (Restaurant Owner)**
```bash
POST /dishes
Authorization: Bearer <restaurant_token>
Content-Type: multipart/form-data

name=Margherita Pizza
description=Classic Italian pizza
price=12.90
category=Pizza
restaurantId=rest_123
image=<file>
```

### **Toggle Dish Availability**
```bash
PATCH /dishes/dish_456/toggle-availability
Authorization: Bearer <restaurant_token>
```

---

## 📦 **Orders**

### **Create Order**
```bash
POST /orders
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "restaurantId": "rest_123",
  "items": [
    {
      "dishId": "dish_456",
      "quantity": 2,
      "customizations": ["extra cheese", "no onions"]
    },
    {
      "dishId": "dish_789",
      "quantity": 1
    }
  ],
  "deliveryAddress": {
    "street": "Mariahilfer Strasse 123",
    "city": "Wien",
    "zipCode": "1070",
    "country": "Austria"
  },
  "paymentMethod": "STRIPE",
  "notes": "Please ring the bell"
}
```

**Response:**
```json
{
  "id": "order_789",
  "status": "PENDING",
  "totalAmount": 38.70,
  "estimatedDeliveryTime": "2025-12-11T19:30:00Z",
  "items": [...],
  "paymentIntent": {
    "clientSecret": "pi_...",
    "status": "requires_payment_method"
  }
}
```

### **Get Order Details**
```bash
GET /orders/order_789
Authorization: Bearer <token>
```

### **List My Orders (Customer)**
```bash
GET /orders/my?page=1&limit=10&status=PENDING
Authorization: Bearer <customer_token>
```

### **Update Order Status (Restaurant/Driver)**
```bash
PATCH /orders/order_789/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "PREPARING"
}
```

**Available Statuses:**
- `PENDING` - Neu erstellt
- `CONFIRMED` - Restaurant bestätigt
- `PREPARING` - In Zubereitung
- `READY` - Fertig, wartet auf Abholung
- `ASSIGNED` - Fahrer zugewiesen
- `PICKED_UP` - Fahrer hat abgeholt
- `IN_TRANSIT` - Unterwegs
- `DELIVERED` - Zugestellt
- `CANCELLED` - Storniert

### **Assign Driver (Admin)**
```bash
PATCH /orders/order_789/assign
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "driverId": "driver_101"
}
```

### **Track Order (Real-time)**
```bash
GET /orders/order_789/tracking
Authorization: Bearer <token>
```

**Response:**
```json
{
  "orderId": "order_789",
  "status": "IN_TRANSIT",
  "driver": {
    "id": "driver_101",
    "name": "Max Mustermann",
    "phone": "+43 664 9876543",
    "location": {
      "lat": 48.2082,
      "lng": 16.3738
    },
    "vehicle": "Bike #42"
  },
  "estimatedArrival": "2025-12-11T19:25:00Z",
  "timeline": [
    {
      "status": "PENDING",
      "timestamp": "2025-12-11T18:45:00Z"
    },
    {
      "status": "CONFIRMED",
      "timestamp": "2025-12-11T18:46:00Z"
    },
    {
      "status": "PREPARING",
      "timestamp": "2025-12-11T18:50:00Z"
    },
    {
      "status": "IN_TRANSIT",
      "timestamp": "2025-12-11T19:10:00Z"
    }
  ]
}
```

---

## 💳 **Payments**

### **Create Payment Intent (Stripe)**
```bash
POST /payment/intent
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "amount": 3870,
  "currency": "eur",
  "orderId": "order_789"
}
```

**Response:**
```json
{
  "clientSecret": "pi_3abc123_secret_xyz",
  "paymentIntentId": "pi_3abc123"
}
```

### **Confirm Payment**
```bash
POST /payment/confirm
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "paymentIntentId": "pi_3abc123",
  "orderId": "order_789"
}
```

### **PayPal Checkout**
```bash
POST /payment/paypal/create-order
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "amount": 38.70,
  "currency": "EUR",
  "orderId": "order_789"
}
```

---

## 🏆 **Gamification**

### **Get User Gamification Stats**
```bash
GET /gamification/me
Authorization: Bearer <customer_token>
```

**Response:**
```json
{
  "userId": "user_123",
  "level": 12,
  "xp": 2450,
  "xpToNextLevel": 550,
  "totalOrders": 47,
  "streak": {
    "current": 5,
    "longest": 12
  },
  "badges": [
    {
      "id": "badge_1",
      "name": "First Order",
      "description": "Completed your first order",
      "icon": "🎉",
      "unlockedAt": "2025-10-01T12:00:00Z"
    },
    {
      "id": "badge_2",
      "name": "Foodie Expert",
      "description": "Ordered from 10 different restaurants",
      "icon": "🍔",
      "unlockedAt": "2025-11-15T18:30:00Z"
    }
  ]
}
```

### **Get Leaderboard**
```bash
GET /gamification/leaderboard?period=weekly&limit=50
Authorization: Bearer <token>
```

---

## 📊 **Analytics**

### **Get Dashboard Stats (Admin)**
```bash
GET /analytics/dashboard
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "totalRevenue": 125680.50,
  "totalOrders": 3456,
  "activeOrders": 23,
  "totalRestaurants": 156,
  "totalCustomers": 8934,
  "totalDrivers": 87,
  "revenueGrowth": 15.3,
  "ordersGrowth": 12.8,
  "topRestaurants": [
    {
      "id": "rest_123",
      "name": "Pizza Paradise",
      "revenue": 15678.90,
      "orders": 234
    }
  ],
  "revenueByDay": [
    {
      "date": "2025-12-01",
      "revenue": 4567.80,
      "orders": 89
    }
  ]
}
```

### **Get Expense Analytics (Customer)**
```bash
GET /analytics/expenses?startDate=2025-01-01&endDate=2025-12-11
Authorization: Bearer <customer_token>
```

**Response:**
```json
{
  "totalSpent": 1234.50,
  "ordersCount": 47,
  "averageOrderValue": 26.27,
  "byCategory": {
    "Pizza": 456.70,
    "Burger": 234.80,
    "Asian": 543.00
  },
  "byRestaurant": [
    {
      "restaurant": "Pizza Paradise",
      "spent": 456.70,
      "orders": 12
    }
  ],
  "savingsOpportunities": [
    {
      "type": "BULK_ORDER",
      "potentialSavings": 45.60,
      "suggestion": "Order more from Pizza Paradise to get 10% off"
    }
  ]
}
```

### **Predictive Ordering (AI)**
```bash
GET /analytics/predictions/next-order
Authorization: Bearer <customer_token>
```

**Response:**
```json
{
  "predictedRestaurant": "rest_123",
  "restaurantName": "Pizza Paradise",
  "confidence": 0.87,
  "predictedDishes": [
    {
      "dishId": "dish_456",
      "name": "Margherita Pizza",
      "probability": 0.92
    }
  ],
  "predictedTime": "2025-12-13T19:00:00Z",
  "reasoning": "You usually order pizza on Fridays around 7 PM"
}
```

---

## 🚗 **Driver Management**

### **Get Available Drivers (Admin)**
```bash
GET /drivers?status=ACTIVE&available=true
Authorization: Bearer <admin_token>
```

### **Update Driver Location (Driver)**
```bash
PATCH /drivers/me/location
Authorization: Bearer <driver_token>
Content-Type: application/json

{
  "lat": 48.2082,
  "lng": 16.3738,
  "accuracy": 10
}
```

### **Accept Order (Driver)**
```bash
POST /drivers/me/accept-order
Authorization: Bearer <driver_token>
Content-Type: application/json

{
  "orderId": "order_789"
}
```

### **Get Driver Earnings**
```bash
GET /drivers/me/earnings?period=weekly
Authorization: Bearer <driver_token>
```

**Response:**
```json
{
  "period": "2025-W49",
  "totalEarnings": 456.80,
  "deliveries": 34,
  "averagePerDelivery": 13.44,
  "breakdown": {
    "basePayment": 340.00,
    "tips": 89.60,
    "bonuses": 27.20
  }
}
```

---

## 🔔 **Notifications**

### **Get Notifications**
```bash
GET /notifications?page=1&limit=20&unread=true
Authorization: Bearer <token>
```

### **Mark as Read**
```bash
PATCH /notifications/notif_123/read
Authorization: Bearer <token>
```

### **Subscribe to Push Notifications**
```bash
POST /notifications/subscribe
Authorization: Bearer <token>
Content-Type: application/json

{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

---

## 🌐 **WebSocket Events**

### **Connect to WebSocket**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'Bearer <your_token>'
  }
});

// Listen for events
socket.on('order.created', (data) => {
  console.log('New order:', data);
});

socket.on('order.updated', (data) => {
  console.log('Order updated:', data);
});

socket.on('driver.location', (data) => {
  console.log('Driver location:', data);
});
```

### **Events**
- `order.created` - Neue Bestellung
- `order.updated` - Bestellung aktualisiert
- `order.status_changed` - Status geändert
- `driver.assigned` - Fahrer zugewiesen
- `driver.location` - Fahrer-Position Update
- `notification.new` - Neue Benachrichtigung

---

## ⚙️ **System**

### **Health Check**
```bash
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "uptime": 3456789,
  "timestamp": "2025-12-11T18:45:00Z",
  "services": {
    "database": "ok",
    "redis": "ok",
    "stripe": "ok"
  }
}
```

### **API Version**
```bash
GET /version
```

---

## 🛠️ **Error Handling**

### **Error Response Format**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Email must be a valid email address"
    }
  ]
}
```

### **Common Error Codes**
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (no/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable Entity (validation failed)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## 📝 **Rate Limiting**

- **General**: 100 requests/minute/IP
- **Auth endpoints**: 5 requests/minute/IP
- **Payment endpoints**: 10 requests/minute/user

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1639242000
```

---

## 🔗 **Additional Resources**

- **Swagger API Docs**: http://localhost:3000/api/docs
- **Postman Collection**: [Download](./postman_collection.json)
- **GraphQL Playground**: http://localhost:3000/graphql (optional)

---

**Happy API Testing! 🚀**
