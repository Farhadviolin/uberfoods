# 🏗️ System Architecture - UberFoods Platform

**Version:** 1.0  
**Datum:** 2025-01-27

---

## 📊 System-Übersicht

Das UberFoods System ist eine **Enterprise-Grade Microservices-Architektur** mit folgenden Hauptkomponenten:

- **Backend API** (NestJS)
- **Frontend Apps** (React/Next.js)
- **Real-time Communication** (WebSocket)
- **Database** (PostgreSQL)
- **Cache** (Redis)
- **Monitoring** (Prometheus + Grafana)

---

## 🎯 Architektur-Prinzipien

1. **Microservices:** Modulare, unabhängige Services
2. **Event-Driven:** WebSocket für Real-time Updates
3. **API-First:** RESTful API als Backbone
4. **Scalable:** Horizontale Skalierung möglich
5. **Secure:** Zero-Trust Security Model
6. **Observable:** Comprehensive Monitoring

---

## 🏛️ System-Architektur Diagramm

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  Admin Panel  │  Customer Web  │  Driver App  │  Restaurant Web │
│   (React)     │   (Next.js)    │ (React Native)│    (React)     │
└───────────────┴────────────────┴───────────────┴────────────────┘
                              │
                              │ HTTP/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                          │
├─────────────────────────────────────────────────────────────────┤
│                    Load Balancer (Nginx)                         │
│              Rate Limiting │ CORS │ SSL/TLS                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
├─────────────────────────────────────────────────────────────────┤
│                         Backend API                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   REST API   │  │  WebSocket   │  │  GraphQL     │          │
│  │  (NestJS)    │  │ (Socket.IO)  │  │  (Optional)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  PostgreSQL  │      │    Redis     │      │   External   │
│  (Database)  │      │   (Cache)    │      │   Services   │
└──────────────┘      └──────────────┘      └──────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Monitoring    │
                    │ Prometheus +    │
                    │    Grafana      │
                    └──────────────────┘
```

---

## 🔧 Backend-Architektur

### Module-Struktur

```
backend/
├── src/
│   ├── modules/
│   │   ├── order/          # Order Management
│   │   ├── customer/       # Customer Management
│   │   ├── restaurant/     # Restaurant Management
│   │   ├── driver/         # Driver Management
│   │   ├── payment/        # Payment Processing
│   │   ├── notification/   # Notifications
│   │   ├── analytics/      # Analytics & Reporting
│   │   ├── ai-ml/          # AI/ML Services
│   │   ├── websocket/      # WebSocket Gateway
│   │   └── ...            # 50+ weitere Module
│   ├── common/             # Shared Utilities
│   ├── prisma/             # Database Schema
│   └── main.ts             # Application Entry
```

### Service-Layer

Jedes Modul folgt dem **NestJS Standard Pattern**:

```
module/
├── module.controller.ts    # HTTP Endpoints
├── module.service.ts       # Business Logic
├── module.service.spec.ts  # Unit Tests
├── module.module.ts        # Module Definition
└── dto/                    # Data Transfer Objects
```

### Datenfluss

```
Client Request
    │
    ▼
Controller (Validation)
    │
    ▼
Service (Business Logic)
    │
    ▼
Prisma (Database)
    │
    ▼
Response + WebSocket Broadcast
```

---

## 🎨 Frontend-Architektur

### App-Struktur

```
frontend/
├── admin-panel/        # Admin Dashboard
├── customer-web/      # Customer Portal
├── driver-app/        # Driver Mobile App
└── restaurant-web/    # Restaurant Portal
```

### Komponenten-Architektur

```
app/
├── components/         # Reusable Components
├── pages/             # Route Pages
├── hooks/             # Custom Hooks
├── contexts/          # React Contexts
├── services/          # API Services
└── utils/             # Utilities
```

### State Management

- **React Query:** Server State Management
- **Context API:** Global State (Auth, Theme)
- **Local State:** useState/useReducer

---

## 🔄 Real-time Communication

### WebSocket-Architektur

```
Client
  │
  │ WebSocket Connection
  ▼
WebSocket Gateway (Socket.IO)
  │
  ├── Room Management
  ├── Event Broadcasting
  └── Connection Pooling
  │
  ▼
Services (Order, Notification, etc.)
```

### Event-Types

- `order.created`
- `order.updated`
- `order.status_changed`
- `driver.assigned`
- `notification.new`
- `analytics.update`

---

## 💾 Datenbank-Architektur

### PostgreSQL Schema

- **50+ Tables** (via Prisma)
- **Relations:** Foreign Keys, Indexes
- **Migrations:** Versioniert via Prisma Migrate

### Haupt-Entitäten

- `User` (Customer, Driver, Restaurant, Admin)
- `Order` (mit Items, Status, Timeline)
- `Restaurant` (mit Dishes, Categories)
- `Payment` (Stripe, PayPal, EPS)
- `Notification` (Push, Email, SMS)

---

## 🚀 Deployment-Architektur

### Container-Orchestrierung

```yaml
services:
  backend:
    - API Server
    - WebSocket Server
  frontend:
    - Admin Panel
    - Customer Web
    - Restaurant Web
  database:
    - PostgreSQL
  cache:
    - Redis
  monitoring:
    - Prometheus
    - Grafana
```

### Skalierung

- **Horizontal:** Mehrere Backend-Instanzen
- **Vertical:** Mehr CPU/RAM pro Instanz
- **Database:** Read Replicas
- **Cache:** Redis Cluster

---

## 🔒 Security-Architektur

### Security-Layer

1. **Network Layer:** Firewall, VPN
2. **Application Layer:** JWT, RBAC, Rate Limiting
3. **Data Layer:** Encryption, Backup
4. **Monitoring Layer:** Audit Logs, Threat Detection

### Authentication Flow

```
Client
  │
  │ Login Request
  ▼
Auth Service
  │
  ├── Validate Credentials
  ├── Generate JWT
  └── Set Refresh Token
  │
  ▼
Client (JWT in Header)
```

---

## 📊 Monitoring-Architektur

### Metrics Collection

```
Application
  │
  │ Prometheus Metrics
  ▼
Prometheus (Time-Series DB)
  │
  ├── Query API
  └── Alert Manager
  │
  ▼
Grafana (Visualization)
```

### Logs Collection

```
Application
  │
  │ Winston Logs
  ▼
Centralized Logging
  │
  ├── File System
  └── Sentry (Errors)
```

---

## 🎯 Performance-Optimierungen

### Caching-Strategie

- **Redis:** Frequently accessed data
- **Browser Cache:** Static assets
- **CDN:** Images, Fonts

### Database-Optimierungen

- **Indexes:** On frequently queried columns
- **Connection Pooling:** Optimized pool size
- **Query Optimization:** Prisma Query optimization

---

## 🔄 CI/CD Pipeline

```
Git Push
  │
  ▼
GitHub Actions
  │
  ├── Lint
  ├── Tests
  ├── Build
  └── Deploy
  │
  ▼
Production
```

---

**Letzte Aktualisierung:** 2025-01-27

