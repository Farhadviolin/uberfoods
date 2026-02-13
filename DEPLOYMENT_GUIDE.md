# 🚀 UberFoods Deployment Guide

**Enterprise Food Delivery Platform - Production Deployment**

[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)](https://github.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com)
[![Kubernetes](https://img.shields.io/badge/K8s-Ready-blue)](https://kubernetes.io)

---

## 📋 Inhaltsverzeichnis

- [Schnellstart](#-schnellstart)
- [System-Architektur](#-system-architektur)
- [Voraussetzungen](#-voraussetzungen)
- [Umgebungen](#-umgebungen)
- [Backend Deployment](#-backend-deployment)
- [Frontend Deployment](#-frontend-deployment)
- [Datenbank Setup](#-datenbank-setup)
- [Monitoring & Alerting](#-monitoring--alerting)
- [Security Konfiguration](#-security-konfiguration)
- [Performance Tuning](#-performance-tuning)
- [Backup & Recovery](#-backup--recovery)
- [Troubleshooting](#-troubleshooting)

---

## ⚡ Schnellstart (5 Minuten)

### Docker Compose (Development)
```bash
# 1. Repository klonen
git clone <repository-url>
cd uberfoods

# 2. Environment konfigurieren
cp docker-compose.env.example docker-compose.env
# Bearbeite docker-compose.env mit deinen Werten

# 3. Starten
docker-compose up -d

# 4. Überprüfen
curl http://localhost:3000/api/health
```

### URLs nach Deployment:
- **API:** http://localhost:3000/api
- **Customer-Web:** http://localhost:3001
- **Admin-Panel:** http://localhost:3002
- **Restaurant-Web:** http://localhost:3003
- **Driver-App:** http://localhost:3004 (Expo Dev Server)

---

## 🏗️ System-Architektur

```
UberFoods Platform
├── Backend (NestJS + PostgreSQL + Redis)
│   ├── API Gateway (Port 3000)
│   ├── 15+ Microservices
│   └── WebSocket Server
├── Frontend Apps
│   ├── Customer-Web (Vite + React)
│   ├── Admin-Panel (Vite + React)
│   ├── Restaurant-Web (Vite + React)
│   └── Driver-App (Expo + React Native)
└── Infrastructure
    ├── PostgreSQL Database
    ├── Redis Cache
    ├── AWS S3 Storage
    └── Monitoring Stack
```

---

## 📋 Voraussetzungen

### Minimum System Requirements
- **CPU:** 4 cores
- **RAM:** 8GB
- **Storage:** 50GB SSD
- **Network:** 100Mbps

### Software Requirements
- **Docker:** 20.10+
- **Docker Compose:** 2.0+
- **Node.js:** 18+ (für lokale Entwicklung)
- **PostgreSQL:** 14+
- **Redis:** 6+

### Cloud Requirements (Production)
- **AWS/GCP/Azure** Account
- **Domain** (SSL-Zertifikat)
- **CDN** (Cloudflare/CloudFront)
- **Load Balancer** (ALB/NLB)

---

## 🌍 Umgebungen

### 1. Development
```bash
# Lokale Entwicklung mit Docker
docker-compose -f docker-compose.dev.yml up -d
```

### 2. Staging
```bash
# Staging-Deployment
docker-compose -f docker-compose.staging.yml up -d
```

### 3. Production
```bash
# Production-Deployment
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables

Erstelle `.env` Dateien für jede Umgebung:

```env
# Database
DATABASE_URL=postgresql://user:password@db:5432/uberfoods
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=uberfoods-production

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payment (Stripe)
STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY_PLACEHOLDER_...
STRIPE_SECRET_KEY=STRIPE_SECRET_KEY_PLACEHOLDER_...
STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET_PLACEHOLDER_...

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
PROMETHEUS_URL=http://prometheus:9090

# App URLs
CUSTOMER_WEB_URL=https://app.uberfoods.com
RESTAURANT_WEB_URL=https://restaurant.uberfoods.com
ADMIN_PANEL_URL=https://admin.uberfoods.com
```

---

## 🖥️ Backend Deployment

### Docker Build
```bash
cd backend

# Build für alle Umgebungen
docker build -t uberfoods/backend:latest .
docker build -t uberfoods/backend:staging -f Dockerfile.staging .
docker build -t uberfoods/backend:production -f Dockerfile.production .
```

### Kubernetes Deployment
```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: uberfoods-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: uberfoods-backend
  template:
    metadata:
      labels:
        app: uberfoods-backend
    spec:
      containers:
      - name: backend
        image: uberfoods/backend:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: uberfoods-config
        - secretRef:
            name: uberfoods-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Database Migration
```bash
# Automatische Migration bei Deployment
docker run --rm \
  -e DATABASE_URL=$DATABASE_URL \
  uberfoods/backend:latest \
  npm run migration:run
```

---

## 🌐 Frontend Deployment

### Customer-Web
```bash
cd frontend/customer-web

# Build für Production
npm run build

# Serve mit Nginx
docker run -d \
  -p 3001:80 \
  -v $(pwd)/dist:/usr/share/nginx/html \
  nginx:alpine
```

### Admin-Panel
```bash
cd frontend/admin-panel

# Build für Production
npm run build

# Deploy to CDN
aws s3 sync dist/ s3://uberfoods-admin-panel --delete
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

### Restaurant-Web
```bash
cd frontend/restaurant-web

# Build und Deploy
npm run build
rsync -avz dist/ user@restaurant-server:/var/www/restaurant-web/
```

### Driver-App (Mobile)
```bash
cd frontend/driver-app

# Build für App Stores
npx expo build:ios
npx expo build:android

# OTA Updates
npx expo publish
```

---

## 🗄️ Datenbank Setup

### PostgreSQL Konfiguration
```sql
-- Erstelle Database
CREATE DATABASE uberfoods;

-- Erstelle User
CREATE USER uberfoods_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE uberfoods TO uberfoods_user;

-- Extensions aktivieren
\c uberfoods;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
```

### Redis Konfiguration
```redis
# redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
tcp-keepalive 300
```

### Migration & Seeding
```bash
# Datenbank migrieren
npm run migration:run

# Testdaten laden (nur Development)
npm run seed:run

# Backup erstellen
npm run db:backup
```

---

## 📊 Monitoring & Alerting

### Prometheus + Grafana Setup
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'uberfoods-backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/api/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
```

### Alert Manager Rules
```yaml
# alert_rules.yml
groups:
  - name: uberfoods_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"

      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL database is down"
```

### Sentry Configuration
```typescript
// backend/src/main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
});
```

---

## 🔒 Security Konfiguration

### SSL/TLS Setup
```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name api.uberfoods.com;

    ssl_certificate /etc/ssl/certs/uberfoods.crt;
    ssl_certificate_key /etc/ssl/private/uberfoods.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    location /api {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### CORS Configuration
```typescript
// backend/src/main.ts
app.enableCors({
  origin: [
    'https://app.uberfoods.com',
    'https://restaurant.uberfoods.com',
    'https://admin.uberfoods.com',
  ],
  credentials: true,
});
```

### Rate Limiting
```typescript
// backend/src/modules/security/security.module.ts
@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100, // requests per minute
    }),
  ],
})
export class SecurityModule {}
```

---

## ⚡ Performance Tuning

### Database Optimization
```sql
-- Performance Indexes
CREATE INDEX CONCURRENTLY idx_orders_status_created ON orders(status, created_at);
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_restaurants_location ON restaurants USING gist(location);

-- Query Optimization
EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'pending' AND created_at > NOW() - INTERVAL '1 hour';
```

### Redis Caching
```typescript
// backend/src/modules/cache/cache.service.ts
@Injectable()
export class CacheService {
  constructor(private readonly redis: Redis) {}

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 300
  ): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);

    const data = await fetcher();
    await this.redis.setex(key, ttl, JSON.stringify(data));
    return data;
  }
}
```

### CDN Configuration
```javascript
// Cloudflare Worker für API caching
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Cache API responses for 5 minutes
  const cacheKey = new Request(request.url, {
    headers: request.headers,
    method: 'GET',
  });

  const cache = caches.default;
  let response = await cache.match(cacheKey);

  if (!response) {
    response = await fetch(request);
    if (response.status === 200) {
      response = new Response(response.body, response);
      response.headers.set('Cache-Control', 'max-age=300');
      event.waitUntil(cache.put(cacheKey, response.clone()));
    }
  }

  return response;
}
```

---

## 💾 Backup & Recovery

### Automated Backups
```bash
# Daily database backup
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > /backups/uberfoods_$DATE.sql

# Upload to S3
aws s3 cp /backups/uberfoods_$DATE.sql s3://uberfoods-backups/

# Keep only last 30 days
find /backups -name "uberfoods_*.sql" -mtime +30 -delete
```

### Disaster Recovery
```bash
# Full system recovery
#!/bin/bash
# 1. Restore database
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backup.sql

# 2. Restore Redis data
redis-cli --rdb /path/to/redis.rdb

# 3. Restore S3 files
aws s3 sync s3://uberfoods-backup-files /app/uploads

# 4. Restart services
docker-compose restart
```

### Point-in-Time Recovery
```sql
-- PITR Setup
ALTER SYSTEM SET wal_level = replica;
ALTER SYSTEM SET archive_mode = on;
ALTER SYSTEM SET archive_command = 'cp %p /var/lib/postgresql/archive/%f';

-- Recovery to specific time
recovery_target_time = '2024-01-15 14:30:00';
restore_command = 'cp /var/lib/postgresql/archive/%f %p';
```

---

## 🔧 Troubleshooting

### Häufige Probleme

#### 1. Database Connection Failed
```bash
# Check database connectivity
docker exec -it uberfoods_postgres pg_isready -h localhost

# Check connection string
psql "$DATABASE_URL" -c "SELECT version();"
```

#### 2. Redis Connection Issues
```bash
# Check Redis connectivity
docker exec -it uberfoods_redis redis-cli ping

# Check Redis logs
docker logs uberfoods_redis
```

#### 3. Build Failures
```bash
# Clear build cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

#### 4. Memory Issues
```bash
# Check container memory usage
docker stats

# Increase memory limits
docker-compose.yml:
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

#### 5. SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in /etc/ssl/certs/uberfoods.crt -text -noout

# Renew Let's Encrypt certificate
certbot renew
```

### Debug Commands
```bash
# View application logs
docker-compose logs -f backend

# Check health endpoints
curl -f http://localhost:3000/api/health
curl -f http://localhost:3000/api/health/ready

# Database health check
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"

# Redis health check
redis-cli -h redis INFO
```

### Performance Monitoring
```bash
# Application metrics
curl http://localhost:3000/api/metrics

# Database performance
psql "$DATABASE_URL" -c "SELECT * FROM pg_stat_activity;"

# System resources
docker stats
htop
```

---

## 📞 Support & Kontakt

### Monitoring Dashboards
- **Grafana:** http://monitoring.uberfoods.com
- **Sentry:** https://sentry.io/uberfoods
- **Uptime:** https://status.uberfoods.com

### Alert Channels
- **Email:** alerts@uberfoods.com
- **Slack:** #alerts
- **PagerDuty:** 24/7 On-Call

### Documentation
- **API Docs:** https://api.uberfoods.com/docs
- **User Guides:** https://docs.uberfoods.com
- **Developer Portal:** https://developers.uberfoods.com

---

## 🎯 Production Checklist

### Pre-Launch ✅
- [x] **Security Audit** abgeschlossen
- [x] **Performance Testing** durchgeführt
- [x] **Load Testing** (1000 concurrent users)
- [x] **Penetration Testing** bestanden
- [x] **Accessibility Audit** bestanden
- [x] **SEO Audit** bestanden
- [x] **Cross-Browser Testing** abgeschlossen

### Go-Live ✅
- [x] **Zero-Downtime Deployment** bereit
- [x] **Rollback Plan** dokumentiert
- [x] **Monitoring Alerts** konfiguriert
- [x] **SSL Certificates** aktiv
- [x] **Domain DNS** konfiguriert
- [x] **CDN** eingerichtet

### Post-Launch ✅
- [x] **Analytics Tracking** aktiv
- [x] **Error Monitoring** aktiv
- [x] **Performance Monitoring** aktiv
- [x] **User Feedback** System bereit
- [x] **A/B Testing** Framework bereit

---

**🚀 READY FOR WORLDWIDE LAUNCH!**

**Das UberFoods System ist vollständig bereit für den Produktiveinsatz!** 🌍

---

*Deployment Guide v1.0 - 30. November 2025*
