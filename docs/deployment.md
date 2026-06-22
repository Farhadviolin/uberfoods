# 🚀 UberFoods - Deployment Guide

**Vollständige Anleitung für Production Deployment**

## 📋 Übersicht

Diese Anleitung beschreibt den Deployment-Prozess für das UberFoods System in verschiedenen Umgebungen.

## 🐳 Docker Deployment (Empfohlen)

### Voraussetzungen
- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 20GB Disk space

### Production Setup

1. **Repository klonen**
   ```bash
   git clone <repository-url>
   cd uberfoods
   ```

2. **Environment konfigurieren**
   ```bash
   cp backend/.env.example backend/.env.production
   cp frontend/customer-web/.env.example frontend/customer-web/.env.production

   # Bearbeite .env.production mit Production-Werten
   nano backend/.env.production
   ```

3. **SSL Zertifikate vorbereiten**
   ```bash
   # Let's Encrypt oder eigene Zertifikate
   mkdir -p nginx/ssl
   # Kopiere fullchain.pem und privkey.pem hierhin
   ```

4. **Production Build erstellen**
   ```bash
   # Backend
   cd backend
   npm run build

   # Frontend
   cd ../frontend/customer-web
   npm run build
   ```

5. **Docker Container starten**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

6. **Health Check durchführen**
   ```bash
   curl https://your-domain.com/api/health
   ```

### Docker Compose Konfiguration

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: uberfoods_prod
      POSTGRES_USER: hmor_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backup:/backup
    networks:
      - hmor_network

  # Redis Cache
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - hmor_network

  # Backend API
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend/dist:/app/dist
      - ./uploads:/app/uploads
    networks:
      - hmor_network

  # Frontend App
  web:
    build:
      context: ./frontend/customer-web
      dockerfile: Dockerfile.prod
    environment:
      - VITE_API_BASE_URL=${VITE_API_BASE_URL}
    depends_on:
      - api
    networks:
      - hmor_network

  # Reverse Proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./frontend/customer-web/dist:/var/www/html
    depends_on:
      - api
      - web
    networks:
      - hmor_network

volumes:
  postgres_data:
  redis_data:

networks:
  hmor_network:
    driver: bridge
```

## ☁️ Cloud Deployment

### AWS Deployment

#### 1. Infrastructure Setup
```bash
# ECS Cluster erstellen
aws ecs create-cluster --cluster-name hmor-prod

# RDS PostgreSQL Instance
aws rds create-db-instance \
  --db-instance-identifier hmor-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --master-username hmor_user \
  --master-user-password ${DB_PASSWORD} \
  --allocated-storage 20
```

#### 2. Container Registry
```bash
# ECR Repository erstellen
aws ecr create-repository --repository-name hmor/api
aws ecr create-repository --repository-name hmor/web

# Images pushen
docker tag hmor/api:latest ${AWS_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/hmor/api:latest
docker push ${AWS_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/hmor/api:latest
```

#### 3. ECS Service deployen
```bash
# Task Definition erstellen
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json

# Service erstellen
aws ecs create-service \
  --cluster hmor-prod \
  --service-name hmor-api \
  --task-definition hmor-api \
  --desired-count 2 \
  --load-balancers [...]
```

### Google Cloud Run

#### 1. Container bauen und pushen
```bash
# Artifact Registry erstellen
gcloud artifacts repositories create hmor-repo \
  --repository-format=docker \
  --location=europe-west1

# Images bauen und pushen
gcloud builds submit --tag europe-west1-docker.pkg.dev/${PROJECT}/hmor-repo/api
```

#### 2. Cloud Run Services deployen
```bash
# Backend API
gcloud run deploy hmor-api \
  --image europe-west1-docker.pkg.dev/${PROJECT}/hmor-repo/api \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,DATABASE_URL=${DATABASE_URL}"

# Frontend
gcloud run deploy hmor-web \
  --image europe-west1-docker.pkg.dev/${PROJECT}/hmor-repo/web \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated
```

### Azure Container Apps

#### 1. Container Apps Environment
```bash
az containerapp env create \
  --name hmor-env \
  --resource-group hmor-prod \
  --location germanywestcentral
```

#### 2. PostgreSQL Flexible Server
```bash
az postgres flexible-server create \
  --name hmor-db \
  --resource-group hmor-prod \
  --location germanywestcentral \
  --admin-user hmor_admin \
  --admin-password ${DB_PASSWORD} \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32
```

#### 3. Container Apps deployen
```bash
az containerapp create \
  --name hmor-api \
  --resource-group hmor-prod \
  --environment hmor-env \
  --image ${ACR_NAME}.azurecr.io/hmor/api:latest \
  --target-port 3000 \
  --ingress external \
  --env-vars NODE_ENV=production DATABASE_URL=${DATABASE_URL}
```

## 🔒 Security Checklist

### Pre-Deployment
- [ ] Environment Variables gesetzt
- [ ] SSL/TLS Zertifikate installiert
- [ ] Database credentials rotiert
- [ ] API Keys für externe Services
- [ ] CORS Policy konfiguriert

### Production Security
- [ ] Rate Limiting aktiviert (100 req/min)
- [ ] Helmet Security Headers
- [ ] Content Security Policy (CSP)
- [ ] SQL Injection Protection
- [ ] XSS Prevention

### Monitoring
- [ ] Application Performance Monitoring (APM)
- [ ] Error Tracking (Sentry)
- [ ] Log Aggregation (ELK Stack)
- [ ] Metrics Dashboard (Grafana)

## 📊 Monitoring & Observability

### Application Monitoring
```bash
# Prometheus Metrics
curl http://localhost:3000/metrics

# Health Endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/ready
curl http://localhost:3000/api/health/live
```

### Log Management
```bash
# Container Logs
docker logs hmor-api

# Application Logs
docker exec hmor-api tail -f /app/logs/application.log

# Structured Logging with Winston
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "message": "Order created",
  "orderId": "order_123",
  "userId": "user_456",
  "amount": 25.50
}
```

### Alerting
```yaml
# Prometheus Alert Rules
groups:
  - name: hmor_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        labels:
          severity: critical
      - alert: DatabaseConnectionLost
        expr: pg_up == 0
        labels:
          severity: warning
```

## 🔄 Backup & Recovery

### Database Backup
```bash
# Automatische Backups
docker exec hmor-postgres pg_dump -U hmor_user hmor_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Point-in-Time Recovery
docker exec hmor-postgres pg_restore -U hmor_user -d hmor_prod < backup.sql
```

### Application Backup
```bash
# Uploads sichern
docker run --rm -v hmor_uploads:/data -v $(pwd)/backup:/backup alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /data .

# Configuration Backup
cp .env.production backup/env_$(date +%Y%m%d).bak
```

## 🚀 Scaling Strategy

### Horizontal Scaling
```bash
# Mehr API Instances
docker-compose up -d --scale api=3

# Load Balancer konfigurieren
upstream api_backend {
    server api1:3000;
    server api2:3000;
    server api3:3000;
}
```

### Database Scaling
```bash
# Read Replicas für Lese-Operationen
# Connection Pooling mit PgBouncer
# Database Sharding für große Datasets
```

### CDN Integration
```bash
# Static Assets über CDN ausliefern
# Image Optimization
# Global Content Delivery
```

## 🔧 Troubleshooting

### Common Issues

#### Backend startet nicht
```bash
# Logs prüfen
docker logs hmor-api

# Environment Variables
docker exec hmor-api env

# Dependencies
docker exec hmor-api npm ls
```

#### Database Connection Failed
```bash
# DB Status prüfen
docker exec hmor-postgres pg_isready -U hmor_user -d hmor_prod

# Connection String testen
docker exec hmor-api npx prisma db push --preview-feature
```

#### Frontend Build fehlt
```bash
# Build Logs
docker logs hmor-web

# Build Cache leeren
docker build --no-cache -t hmor/web ./frontend/customer-web
```

#### High Memory Usage
```bash
# Memory Monitoring
docker stats hmor-api

# Node.js Memory Limits
NODE_OPTIONS="--max-old-space-size=1024"
```

### Performance Optimization

#### Database Queries
```sql
-- Slow Queries identifizieren
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- Indexes hinzufügen
CREATE INDEX CONCURRENTLY idx_orders_customer_date
ON orders (customer_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_orders_status
ON orders (status) WHERE status NOT IN ('delivered', 'cancelled');
```

#### API Response Times
```bash
# Response Time Monitoring
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health

# Cache Strategy implementieren
# Redis für Session Storage
# CDN für Static Assets
```

## ⚠️ Expo Web Build (Einschränkung)

- Die Driver-App (Expo) unterstützt aktuell keinen Web-Build; bitte **nicht** `expo build:web` oder `expo start --web` verwenden.
- Grund: Native Dependencies (z.B. `react-native-maps`, `expo-location`, `expo-notifications`) sind webseitig nicht vollständig verfügbar.
- Unterstützte Wege:
  - Lokale Entwicklung: `expo start` mit iOS/Android (Simulator oder Gerät).
  - CI/Release: `eas build --platform ios` bzw. `eas build --platform android`.
- Für Web-Preview bitte ein separates Web-Target planen; die bestehende Expo-App ist nicht für Web vorgesehen.

## 📞 Support & Maintenance

### Regular Maintenance
- **Weekly**: Log Rotation, Backup Verification
- **Monthly**: Security Updates, Performance Review
- **Quarterly**: Major Version Updates, Architecture Review

### Emergency Contacts
- **Infrastructure**: DevOps Team (+49 123 456789)
- **Application**: Development Team (+49 987 654321)
- **Security**: Security Team (+49 555 123456)

### Documentation Updates
- Keep deployment guides current
- Update API documentation
- Maintain runbooks for common issues

---

## 🎯 Deployment Status

### ✅ Completed
- [x] Docker Containerization
- [x] Production Environment Setup
- [x] SSL/TLS Configuration
- [x] Database Backup Strategy
- [x] Monitoring & Alerting
- [x] Security Hardening

### 🚧 In Progress
- [ ] Cloud Migration (AWS/GCP/Azure)
- [ ] CI/CD Pipeline Setup
- [ ] Blue-Green Deployment
- [ ] Multi-Region Setup

### 📋 Planned
- [ ] Kubernetes Orchestration
- [ ] Service Mesh (Istio)
- [ ] Advanced Caching (Varnish)
- [ ] Real-time Analytics

---

**🚀 Das HMOR System ist bereit für Production Deployment!**

**Für individuelle Deployment-Anpassungen oder Support kontaktieren Sie unser Team.**
