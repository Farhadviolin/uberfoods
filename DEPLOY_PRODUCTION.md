# 🚀 UberFoods Production Deployment Guide

## Phase 4: Production Deployment Execution

### 4.1 Final Preparation

**1. Server Requirements Check:**
```bash
# Mindestens 4GB RAM, 2 CPU Cores, 50GB SSD
free -h
df -h
nproc

# Docker & Docker Compose installiert
docker --version
docker-compose --version

# Ports verfügbar (80, 443, 3000, 5432, 6379)
netstat -tlnp | grep -E ':(80|443|3000|5432|6379)'
```

**2. Backup erstellen:**
```bash
# Falls bereits Daten vorhanden
docker exec uberfoods_postgres pg_dump -U uberfoods_prod_user uberfoods_production > emergency_backup_$(date +%Y%m%d_%H%M%S).sql
```

**3. ENV-Dateien finalisieren:**
```bash
# Backend Production ENV
cp production.env backend/.env
nano backend/.env  # Alle Platzhalter ersetzen

# Frontend Production ENV
cp frontend-production.env frontend/customer-web/.env
nano frontend/customer-web/.env  # API URLs anpassen
```

### 4.2 Production Deployment

**Schritt 1: Build Production Images**
```bash
# Production Images bauen
docker-compose -f docker-compose.prod.yml build --no-cache

# Build erfolgreich prüfen
docker images | grep uberfoods
```

**Schritt 2: Database Migration**
```bash
# Database starten
docker-compose -f docker-compose.prod.yml up -d postgres redis

# Warten auf Database readiness
sleep 30

# Prisma Setup
cd backend
npm run prisma:generate
npm run prisma:db:push

# Seed initial data (optional)
npm run prisma:seed
```

**Schritt 3: System Startup**
```bash
# Vollständiges System starten
docker-compose -f docker-compose.prod.yml up -d

# Startup Logs überwachen
docker-compose -f docker-compose.prod.yml logs -f --tail=100
```

**Schritt 4: Health Verification**
```bash
# Alle Services müssen healthy sein
docker-compose -f docker-compose.prod.yml ps

# Health Checks
curl -f https://yourdomain.com/api/health
curl -f https://api.yourdomain.com/api/health
curl -f https://admin.yourdomain.com/api/health

# Nginx Status
curl -f https://yourdomain.com/health
```

### 4.3 Post-Deployment Verification

**API Tests:**
```bash
# Basis API Tests
./test-production.sh

# Payment Integration Tests
./test-payments.sh

# Domain & SSL Tests
./test-domain.sh
```

**Frontend Tests:**
```bash
# Frontend lädt
curl -I https://yourdomain.com

# API Kommunikation funktioniert
curl "https://api.yourdomain.com/api/restaurants" \
  -H "Origin: https://yourdomain.com"
```

**Database Tests:**
```bash
# Database Verbindung
docker exec uberfoods_postgres psql -U uberfoods_prod_user -d uberfoods_production -c "SELECT COUNT(*) FROM restaurants;"

# Redis Verbindung
docker exec uberfoods_redis redis-cli -a $REDIS_PASSWORD ping
```

### 4.4 Performance Optimization

**Nginx Tuning:**
```bash
# Nginx Config prüfen
docker exec uberfoods_nginx nginx -t

# Worker Processes anpassen
docker exec uberfoods_nginx nginx -s reload
```

**Database Optimization:**
```bash
# PostgreSQL Config prüfen
docker exec uberfoods_postgres psql -U uberfoods_prod_user -d uberfoods_production -c "SHOW shared_buffers;"

# Indexes prüfen
docker exec uberfoods_postgres psql -U uberfoods_prod_user -d uberfoods_production -c "SELECT * FROM pg_indexes WHERE tablename NOT LIKE 'pg_%';"
```

### 4.5 Monitoring Setup

**Logs überwachen:**
```bash
# Realtime Logs
docker-compose -f docker-compose.prod.yml logs -f

# Error Logs filtern
docker-compose -f docker-compose.prod.yml logs 2>&1 | grep -i error
```

**System Resources:**
```bash
# CPU/Memory Usage
docker stats

# Disk Usage
df -h
du -sh /var/lib/docker/volumes/
```

### 4.6 Security Hardening

**Firewall Rules:**
```bash
# Nur notwendige Ports offen (22/SSH, 80/HTTP, 443/HTTPS)
ufw status
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

**SSL Security:**
```bash
# SSL Labs Test (sollte A oder A+ sein)
curl -s "https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com" | grep -o "grade.[A-Z]"
```

**Container Security:**
```bash
# Nicht-root User verwenden
docker exec uberfoods_backend whoami
docker exec uberfoods_frontend whoami
```

---

## 🚨 Emergency Rollback Plan

### Sofortiger Rollback (bei kritischen Issues):
```bash
# System stoppen
docker-compose -f docker-compose.prod.yml down

# Backup wiederherstellen (falls verfügbar)
docker-compose -f docker-compose.yml up -d
```

### Graceful Rollback (mit Daten erhalten):
```bash
# Neue Version stoppen
docker-compose -f docker-compose.prod.yml stop api web

# Alte Version starten
docker-compose -f docker-compose.yml up -d api web
```

### Database Rollback:
```bash
# Backup wiederherstellen
docker exec -i uberfoods_postgres psql -U uberfoods_prod_user uberfoods_production < backup_pre_launch.sql
```

---

## 📊 Success Metrics

**Deployment gilt als erfolgreich wenn:**

### ✅ Functional Metrics:
- [ ] Alle Container `healthy` Status haben
- [ ] Frontend über HTTPS ladbar
- [ ] API Endpoints antworten (200 OK)
- [ ] Database Connections funktionieren
- [ ] Payment Integration Tests bestehen

### ✅ Performance Metrics:
- [ ] API Response Time < 500ms
- [ ] Frontend First Paint < 3s
- [ ] Database Queries < 100ms
- [ ] SSL Labs Grade A/A+

### ✅ Security Metrics:
- [ ] HTTPS erzwungen (kein HTTP)
- [ ] CORS korrekt konfiguriert
- [ ] Keine Secrets in Logs
- [ ] Rate Limiting aktiv

---

## 🔄 Post-Launch Maintenance

### Tägliche Checks:
```bash
# Health Dashboard
curl https://yourdomain.com/api/health

# System Resources
docker stats --no-stream

# Error Logs
docker-compose -f docker-compose.prod.yml logs --since 1h | grep -i error
```

### Wöchentliche Maintenance:
```bash
# SSL Certificate renewal (Let's Encrypt)
certbot renew

# Database Vacuum/Analyze
docker exec uberfoods_postgres psql -U uberfoods_prod_user -d uberfoods_production -c "VACUUM ANALYZE;"

# Security Updates
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### Monatliche Reviews:
- Performance Metrics analysieren
- Security Audits durchführen
- Backup Integrity prüfen
- Cost Optimization review

---

## 📞 Support & Troubleshooting

### Häufige Issues:

**Problem: Container startet nicht**
```
# Lösung: Logs prüfen
docker-compose -f docker-compose.prod.yml logs <service_name>

# ENV-Variablen prüfen
docker exec uberfoods_backend env | grep -E "(DATABASE_URL|JWT_SECRET|STRIPE)"
```

**Problem: API gibt 404 zurück**
```
# Health Check funktioniert?
curl http://localhost:3000/api/health

# Nginx Proxy prüfen
docker exec uberfoods_nginx nginx -t
```

**Problem: Database Connection fehlt**
```
# Database erreichbar?
docker exec uberfoods_postgres psql -U uberfoods_prod_user -d uberfoods_production -c "SELECT 1;"

# Connection String prüfen
docker exec uberfoods_backend env | grep DATABASE_URL
```

---

## 🎉 Deployment Complete!

**Herzlichen Glückwunsch!** 🚀

Dein UberFoods System läuft jetzt in Production mit:
- ✅ Vollständiger SSL/TLS Security
- ✅ Production Payment Integration
- ✅ High-Availability Architecture
- ✅ Enterprise-Grade Monitoring
- ✅ Automated Backup & Recovery

**Willkommen in der Live-Umgebung!** 🌟