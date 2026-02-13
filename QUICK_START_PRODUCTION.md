# 🚀 Production Quick Start Guide - UberFoods

**Datum:** 2025-01-27  
**Status:** ✅ **Production-Ready**

---

## 📋 Voraussetzungen

- Docker & Docker Compose installiert
- Domain-Name konfiguriert
- SSL-Zertifikat (Let's Encrypt empfohlen)
- API Keys für externe Services (Stripe, Google Maps, etc.)

---

## ⚡ Schnellstart (5 Minuten)

### 1. Environment Variables konfigurieren

```bash
# Kopiere Production Environment Template
cp backend/.env.production.example backend/.env.production

# Bearbeite .env.production und fülle alle Werte aus
nano backend/.env.production
```

**Kritische Variablen:**
- `JWT_SECRET` - MUSS geändert werden! (min. 32 Zeichen)
- `DATABASE_URL` - Production Database URL
- `POSTGRES_PASSWORD` - Starkes Passwort
- `STRIPE_SECRET_KEY` - Production Stripe Key
- `GOOGLE_MAPS_API_KEY` - Production API Key

### 2. SSL-Zertifikat erstellen

```bash
# Let's Encrypt mit Certbot
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Kopiere Zertifikate
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
```

### 3. Nginx Configuration anpassen

```bash
# Bearbeite nginx/nginx.production.conf
# Ersetze 'yourdomain.com' mit deiner Domain
sed -i 's/yourdomain.com/your-actual-domain.com/g' nginx/nginx.production.conf
```

### 4. Production Deployment

```bash
# Führe Production Deployment aus
./scripts/deploy-production.sh production
```

### 5. Health Check

```bash
# Prüfe ob alles läuft
curl http://localhost:3000/api/health
```

---

## 📊 Deployment-Schritte im Detail

### Schritt 1: Environment Setup

```bash
# 1. Environment Variables
cp backend/.env.production.example backend/.env.production
nano backend/.env.production

# 2. Prüfe kritische Variablen
./scripts/security-hardening.sh
```

### Schritt 2: Database Setup

```bash
# 1. Starte Database
docker-compose -f docker-compose.production.yml up -d postgres

# 2. Warte auf Database
sleep 10

# 3. Führe Migrationen aus
./scripts/database-migrate.sh production

# 4. Erstelle initiales Backup
./scripts/database-backup.sh production
```

### Schritt 3: Application Deployment

```bash
# 1. Baue Docker Images
docker-compose -f docker-compose.production.yml build

# 2. Starte Services
docker-compose -f docker-compose.production.yml up -d

# 3. Prüfe Logs
docker-compose -f docker-compose.production.yml logs -f backend
```

### Schritt 4: Monitoring Setup

```bash
# 1. Setup Monitoring
./scripts/setup-monitoring.sh

# 2. Konfiguriere Sentry DSN in .env.production
# 3. Starte Prometheus & Grafana (optional)
docker-compose -f docker-compose.production.yml up -d prometheus grafana
```

---

## 🔧 Konfiguration

### Environment Variables

**Kritisch (MUSS konfiguriert werden):**
- `JWT_SECRET` - JWT Signing Key
- `DATABASE_URL` - PostgreSQL Connection String
- `POSTGRES_PASSWORD` - Database Password
- `STRIPE_SECRET_KEY` - Stripe Production Key
- `GOOGLE_MAPS_API_KEY` - Google Maps API Key

**Wichtig (Empfohlen):**
- `SENTRY_DSN` - Error Tracking
- `SMTP_*` - Email Configuration
- `AWS_*` - S3 Storage (falls verwendet)
- `REDIS_PASSWORD` - Redis Password

### Docker Services

**Ports:**
- `80` - HTTP (Nginx)
- `443` - HTTPS (Nginx)
- `3000` - Backend API
- `5432` - PostgreSQL
- `6379` - Redis
- `9090` - Prometheus (optional)
- `3001` - Grafana (optional)

---

## ✅ Post-Deployment Checklist

### Sofort nach Deployment

- [ ] Health Check erfolgreich: `curl http://localhost:3000/api/health`
- [ ] API-Endpunkte erreichbar: `curl http://localhost:3000/api/restaurants`
- [ ] Database-Verbindung funktioniert
- [ ] Redis-Verbindung funktioniert
- [ ] SSL-Zertifikat gültig
- [ ] Nginx läuft und leitet weiter

### Innerhalb von 24 Stunden

- [ ] Monitoring konfiguriert (Sentry, Prometheus)
- [ ] Backup-Strategie getestet
- [ ] Logs überprüft
- [ ] Performance-Metriken überprüft
- [ ] Security Audit durchgeführt

### Innerhalb von 1 Woche

- [ ] Load Testing durchgeführt
- [ ] Backup-Wiederherstellung getestet
- [ ] Disaster Recovery Plan dokumentiert
- [ ] Team-Schulung durchgeführt
- [ ] Dokumentation aktualisiert

---

## 🔍 Troubleshooting

### Backend startet nicht

```bash
# Prüfe Logs
docker-compose -f docker-compose.production.yml logs backend

# Prüfe Environment Variables
docker-compose -f docker-compose.production.yml config

# Prüfe Database-Verbindung
docker exec uberfoods-backend-prod npm run prisma:studio
```

### Database-Verbindungsfehler

```bash
# Prüfe Database-Status
docker-compose -f docker-compose.production.yml ps postgres

# Prüfe Database-Logs
docker-compose -f docker-compose.production.yml logs postgres

# Teste Database-Verbindung
docker exec uberfoods-postgres-prod psql -U postgres -d uberfoods_prod -c "SELECT 1;"
```

### SSL-Zertifikat-Probleme

```bash
# Prüfe Zertifikat
openssl x509 -in nginx/ssl/fullchain.pem -text -noout

# Erneuere Zertifikat
certbot renew

# Prüfe Nginx-Configuration
docker exec uberfoods-nginx-prod nginx -t
```

---

## 📊 Monitoring & Observability

### Health Endpoints

- **Backend Health:** `http://localhost:3000/api/health`
- **Metrics:** `http://localhost:3000/api/metrics` (wenn konfiguriert)

### Logs

```bash
# Backend Logs
docker-compose -f docker-compose.production.yml logs -f backend

# Database Logs
docker-compose -f docker-compose.production.yml logs -f postgres

# Nginx Logs
docker-compose -f docker-compose.production.yml logs -f nginx
```

### Metrics

- **Prometheus:** `http://localhost:9090`
- **Grafana:** `http://localhost:3001` (admin/admin)

---

## 🔒 Security Best Practices

1. **Environment Variables:**
   - Niemals `.env.production` committen
   - Verwende Secrets Management (AWS Secrets Manager, HashiCorp Vault)
   - Rotiere API Keys regelmäßig

2. **SSL/TLS:**
   - Verwende Let's Encrypt für kostenlose Zertifikate
   - Erneuere Zertifikate automatisch (Certbot)
   - Aktiviere HSTS

3. **Firewall:**
   - Nur Port 80, 443, 22 öffentlich
   - Database & Redis nur intern
   - IP Whitelisting für Admin-Endpunkte

4. **Backups:**
   - Tägliche automatische Backups
   - Teste Backup-Wiederherstellung regelmäßig
   - Speichere Backups extern

---

## 📞 Support

Bei Problemen:

1. Prüfe Logs: `docker-compose -f docker-compose.production.yml logs`
2. Prüfe Health: `curl http://localhost:3000/api/health`
3. Prüfe Dokumentation: `INFRASTRUCTURE_SETUP_COMPLETE.md`
4. Führe Security Audit durch: `./scripts/security-hardening.sh`

---

**Letzte Aktualisierung:** 2025-01-27  
**Status:** ✅ **Production-Ready**
