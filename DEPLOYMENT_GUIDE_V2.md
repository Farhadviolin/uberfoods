# 🚀 Production Deployment Guide - UberFoods Platform

**Version:** 2.0  
**Datum:** 2025-01-27  
**Status:** ✅ Production Ready (98%+)

---

## 📋 Inhaltsverzeichnis

1. [Voraussetzungen](#voraussetzungen)
2. [System-Architektur](#system-architektur)
3. [Deployment-Schritte](#deployment-schritte)
4. [Konfiguration](#konfiguration)
5. [Monitoring & Health Checks](#monitoring--health-checks)
6. [Troubleshooting](#troubleshooting)
7. [Rollback-Strategie](#rollback-strategie)

---

## 📦 Voraussetzungen

### System-Anforderungen

- **OS:** Linux (Ubuntu 20.04+ / Debian 11+) oder macOS / Windows mit WSL2
- **Docker:** 20.10+
- **Docker Compose:** 2.0+
- **Node.js:** 20.x (für lokale Entwicklung)
- **PostgreSQL:** 14+ (via Docker)
- **Redis:** 7+ (via Docker)
- **RAM:** Minimum 8GB, Empfohlen 16GB+
- **CPU:** Minimum 4 Cores, Empfohlen 8+ Cores
- **Disk:** Minimum 50GB freier Speicherplatz

### Externe Services

- **Stripe Account** (Payment Processing)
- **PayPal Business Account** (Payment Processing)
- **AWS S3** (Optional, für File Storage)
- **SendGrid/Mailgun** (Optional, für E-Mails)
- **Sentry** (Optional, für Error Tracking)

---

## 🏗️ System-Architektur

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer (Nginx)                    │
└──────────────────────┬──────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│  Backend API │ │  Frontend   │ │  WebSocket  │
│  (NestJS)    │ │  (Next.js)  │ │  (Socket.IO)│
└───────┬──────┘ └─────────────┘ └──────┬──────┘
        │                                │
        └──────────────┬─────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
│  PostgreSQL  │ │   Redis   │ │  Prometheus │
│  (Database)  │ │  (Cache)  │ │ (Monitoring)│
└──────────────┘ └───────────┘ └─────────────┘
```

### Microservices

1. **Backend API** (`backend/`)
   - NestJS 10
   - REST API + WebSocket
   - 77 Services, 65+ Tests (84% Coverage)

2. **Frontend Apps** (`frontend/`)
   - Admin Panel (React 18)
   - Customer Web (Next.js 14)
   - Driver App (React Native)
   - Restaurant Web (React 18)

3. **Monitoring Stack**
   - Prometheus (Metrics)
   - Grafana (Dashboards)
   - Node Exporter (System Metrics)

---

## 🚀 Deployment-Schritte

### Schritt 1: Repository klonen

```bash
git clone <repository-url>
cd UberFoods
```

### Schritt 2: Environment-Variablen konfigurieren

```bash
# Backend Environment
cp backend/.env.example backend/.env
# Bearbeite backend/.env mit deinen Werten

# Frontend Environments
cp frontend/admin-panel/.env.example frontend/admin-panel/.env.local
cp frontend/customer-web/.env.example frontend/customer-web/.env.local
cp frontend/driver-app/.env.example frontend/driver-app/.env.local
cp frontend/restaurant-web/.env.example frontend/restaurant-web/.env.local
```

### Schritt 3: Dependencies installieren

```bash
# Automatisch für alle Projekte
./install-all-dependencies.sh

# Oder manuell:
cd backend && npm install
cd ../frontend/admin-panel && npm install
cd ../frontend/customer-web && npm install --legacy-peer-deps
cd ../frontend/driver-app && npm install
cd ../frontend/restaurant-web && npm install
```

### Schritt 4: Datenbank initialisieren

```bash
# Starte PostgreSQL
docker-compose up -d postgres redis

# Warte auf Datenbank (10 Sekunden)
sleep 10

# Führe Migrationen aus
cd backend
npm run prisma:migrate
npm run prisma:seed
npm run prisma:seed-admin
npm run prisma:seed-rbac
```

### Schritt 5: Backend bauen und starten

```bash
cd backend

# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### Schritt 6: Frontend bauen und starten

```bash
# Admin Panel
cd frontend/admin-panel
npm run build
npm run start

# Customer Web
cd frontend/customer-web
npm run build
npm run start

# Restaurant Web
cd frontend/restaurant-web
npm run build
npm run start
```

### Schritt 7: Monitoring Stack starten

```bash
# Prometheus + Grafana
docker-compose -f backend/docker-compose.monitoring.yml up -d
```

### Schritt 8: Health Checks durchführen

```bash
# Backend Health
curl http://localhost:3000/health

# Frontend Health
curl http://localhost:3001/health  # Admin Panel
curl http://localhost:3002/health  # Customer Web
curl http://localhost:3003/health  # Restaurant Web
```

---

## ⚙️ Konfiguration

### Backend Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/uberfoods"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="24h"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379

# Payment Providers
STRIPE_SECRET_KEY="STRIPE_SECRET_KEY_PLACEHOLDER_..."
PAYPAL_CLIENT_ID="..."
PAYPAL_CLIENT_SECRET="..."

# AWS (Optional)
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="..."

# Sentry (Optional)
SENTRY_DSN="..."
```

### Frontend Environment Variables

```env
# API URL
NEXT_PUBLIC_API_URL="http://localhost:3000"
NEXT_PUBLIC_WS_URL="ws://localhost:3000"

# Features
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_CHAT=true
```

---

## 📊 Monitoring & Health Checks

### Prometheus Metrics

- **Endpoint:** `http://localhost:9090`
- **Metrics:** `http://localhost:3000/metrics`

### Grafana Dashboards

- **URL:** `http://localhost:3001`
- **Default Credentials:** admin/admin

### Health Check Endpoints

- **Backend:** `GET /health`
- **Database:** `GET /health/db`
- **Redis:** `GET /health/redis`

### Key Metrics

- Request Rate
- Response Time (p50, p95, p99)
- Error Rate
- Database Connection Pool
- Redis Cache Hit Rate
- WebSocket Connections

---

## 🔧 Troubleshooting

### Problem: Datenbank-Verbindung fehlgeschlagen

```bash
# Prüfe PostgreSQL Status
docker ps | grep postgres

# Prüfe Connection String
echo $DATABASE_URL

# Teste Verbindung
cd backend
npm run check:connection
```

### Problem: Frontend baut nicht

```bash
# Lösche node_modules und cache
rm -rf node_modules .next
npm install
npm run build
```

### Problem: WebSocket-Verbindung fehlgeschlagen

```bash
# Prüfe WebSocket Gateway
curl http://localhost:3000/health/ws

# Prüfe Firewall
sudo ufw status
```

### Problem: High Memory Usage

```bash
# Prüfe Memory
docker stats

# Reduziere Cache Size
# In backend/.env:
CACHE_MAX_SIZE=100
```

---

## 🔄 Rollback-Strategie

### Schritt 1: Backup erstellen

```bash
# Datenbank Backup
pg_dump -U user -d uberfoods > backup_$(date +%Y%m%d).sql

# Code Backup
git tag backup-$(date +%Y%m%d)
```

### Schritt 2: Rollback durchführen

```bash
# Code Rollback
git checkout <previous-version>

# Datenbank Rollback
psql -U user -d uberfoods < backup_YYYYMMDD.sql

# Services neu starten
docker-compose restart
```

---

## 📝 Production Checklist

### Pre-Deployment

- [ ] Environment-Variablen konfiguriert
- [ ] Dependencies installiert
- [ ] Datenbank-Migrationen ausgeführt
- [ ] Tests erfolgreich (`npm test`)
- [ ] Build erfolgreich (`npm run build`)
- [ ] Security Audit durchgeführt

### Deployment

- [ ] Backend gestartet
- [ ] Frontend Apps gestartet
- [ ] Monitoring Stack gestartet
- [ ] Health Checks erfolgreich
- [ ] WebSocket-Verbindungen funktionieren

### Post-Deployment

- [ ] Smoke Tests durchgeführt
- [ ] Monitoring Dashboards aktiv
- [ ] Alerts konfiguriert
- [ ] Backup-Strategie aktiv
- [ ] Dokumentation aktualisiert

---

## 🎯 Performance-Optimierungen

### Backend

- **Caching:** Redis für häufig abgerufene Daten
- **Connection Pooling:** PostgreSQL Connection Pool optimiert
- **Rate Limiting:** Throttler für API-Endpunkte
- **Compression:** Gzip für API-Responses

### Frontend

- **Code Splitting:** Automatisch via Next.js/Vite
- **Image Optimization:** Next.js Image Component
- **Caching:** Service Worker für Offline-Support
- **Lazy Loading:** React.lazy für Komponenten

---

## 🔒 Security Best Practices

1. **HTTPS:** Immer HTTPS in Production verwenden
2. **Secrets:** Niemals Secrets in Code committen
3. **Rate Limiting:** API-Rate-Limiting aktiviert
4. **CORS:** CORS korrekt konfiguriert
5. **Helmet:** Security Headers via Helmet
6. **Input Validation:** Class-Validator für alle Inputs

---

## 📞 Support

Bei Problemen:
1. Prüfe Logs: `docker-compose logs -f`
2. Prüfe Health Checks: `curl http://localhost:3000/health`
3. Prüfe Monitoring: Grafana Dashboards
4. Erstelle Issue im Repository

---

**Letzte Aktualisierung:** 2025-01-27

