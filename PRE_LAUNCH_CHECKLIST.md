# 🚀 UberFoods Pre-Launch Final Checklist

## Phase 4: Production Deployment Preparation

### 4.1 Domain & SSL Verification ✅

**DNS Check:**
```bash
# Deine Domain (ersetze yourdomain.com)
nslookup yourdomain.com
nslookup api.yourdomain.com
nslookup admin.yourdomain.com
```
- [ ] DNS A-Records zeigen auf deinen Server
- [ ] Alle Subdomains (api, admin) auflösbar

**SSL Certificate Check:**
```bash
# SSL Zertifikat prüfen
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com < /dev/null 2>/dev/null | openssl x509 -noout -dates

# HTTPS funktioniert
curl -I https://yourdomain.com
curl -I https://api.yourdomain.com
curl -I https://admin.yourdomain.com
```
- [ ] SSL Zertifikate gültig (nicht expired)
- [ ] HTTPS für alle Domains funktioniert
- [ ] HTTP zu HTTPS Redirect aktiv

### 4.2 Payment Services Activation ✅

**Stripe Production:**
- [ ] Live Mode aktiviert (grüner "Live mode" Button)
- [ ] Restricted API Keys erstellt (nicht Publishable keys!)
- [ ] Webhook Endpoint konfiguriert: `https://api.yourdomain.com/api/payments/webhooks/stripe`
- [ ] Webhook Events aktiviert (payment_intent.succeeded, etc.)
- [ ] Apple Pay domain verified
- [ ] Google Pay merchant ID gesetzt

**PayPal Production:**
- [ ] Live Mode aktiviert (nicht Sandbox)
- [ ] Live API Credentials erstellt
- [ ] Webhook konfiguriert: `https://api.yourdomain.com/api/payments/webhooks/paypal`
- [ ] PayPal Business Profil vervollständigt

**Google Maps Production:**
- [ ] Production API Key erstellt
- [ ] HTTP Referrer restrictions gesetzt
- [ ] Alle APIs aktiviert (Maps, Geocoding, Places)
- [ ] Billing aktiviert
- [ ] Usage quotas konfiguriert

### 4.3 Environment Configuration ✅

**Backend production.env:**
```bash
# Pflichtfelder (ersetzt mit echten Werten):
DATABASE_URL=postgresql://user:password@postgres:5432/uberfoods_production
JWT_SECRET=<64-char-secure-key>
JWT_REFRESH_SECRET=<64-char-secure-key>
STRIPE_SECRET_KEY=STRIPE_SECRET_KEY_PLACEHOLDER_...
STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET_PLACEHOLDER_...
PAYPAL_CLIENT_ID=<live-client-id>
PAYPAL_CLIENT_SECRET=<live-secret>
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com,https://admin.yourdomain.com
REDIS_PASSWORD=<secure-redis-password>
```
- [ ] Alle Platzhalter ersetzt
- [ ] Sichere, einzigartige Secrets generiert
- [ ] ALLOWED_ORIGINS mit echten Domains
- [ ] Keine Test-Keys in Production

**Frontend frontend-production.env:**
```bash
# Pflichtfelder:
VITE_API_URL=https://api.yourdomain.com/api
VITE_WS_URL=wss://api.yourdomain.com
VITE_STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY_PLACEHOLDER_...
VITE_GOOGLE_MAPS_API_KEY=<restricted-api-key>
```
- [ ] API_URL zeigt auf echte Domain
- [ ] Nur PUBLISHABLE Keys (keine Secrets!)
- [ ] Google Maps Key ist restricted

### 4.4 Database Production Setup ✅

**Database Credentials:**
```bash
# Sicherer Datenbank-User erstellen (nicht 'postgres')
POSTGRES_USER=uberfoods_prod_user
POSTGRES_PASSWORD=<strong-production-password>
POSTGRES_DB=uberfoods_production
```
- [ ] Sicherer DB-User (nicht 'postgres')
- [ ] Starkes Passwort (min. 32 Zeichen)
- [ ] Production Database Name

**Database Backup:**
```bash
# Backup vor Launch
docker exec uberfoods_postgres pg_dump -U uberfoods_prod_user uberfoods_production > backup_pre_launch.sql

# Automatische Backups einrichten
echo "0 2 * * * docker exec uberfoods_postgres pg_dump -U uberfoods_prod_user uberfoods_production > /backups/backup_\$(date +\%Y\%m\%d).sql" | crontab -
```
- [ ] Pre-Launch Backup erstellt
- [ ] Automatische Backup-Jobs konfiguriert

### 4.5 Security Final Check ✅

**Secrets Management:**
- [ ] Keine Secrets in Git-Repository
- [ ] ENV-Dateien nicht committed
- [ ] Sichere Passwort-Generierung verwendet
- [ ] API Keys haben korrekte Restrictions

**Access Control:**
- [ ] Admin Panel nur für berechtigte User
- [ ] API Rate Limiting aktiv
- [ ] CORS korrekt konfiguriert
- [ ] HTTPS überall erzwungen

**SSL/TLS Security:**
- [ ] SSL Labs Test: Grade A oder A+
- [ ] HSTS Header aktiv
- [ ] Sicherer Cipher Suites
- [ ] Certificate Transparency

### 4.6 Performance & Monitoring Setup ✅

**Error Tracking:**
```bash
# Sentry für Production einrichten
# Gehe zu https://sentry.io → Create Project → React & Node.js
# DSN in ENV-Dateien eintragen
```
- [ ] Sentry für Frontend und Backend konfiguriert
- [ ] Production Environment in Sentry angelegt

**Performance Monitoring:**
- [ ] Database Query Monitoring aktiv
- [ ] API Response Time Tracking
- [ ] Frontend Core Web Vitals
- [ ] Error Rates überwachen

**Health Checks:**
```bash
# Health Endpoints testen
curl https://api.yourdomain.com/api/health
curl https://yourdomain.com/api/health  # über Nginx
```
- [ ] Alle Health Endpoints antworten
- [ ] Nginx Proxy funktioniert korrekt

### 4.7 Final Testing ✅

**Production Environment Tests:**
```bash
# Domain Tests
./test-domain.sh

# API Tests
./test-production.sh

# Payment Tests
./test-payments.sh
```
- [ ] Alle Test-Scripts erfolgreich
- [ ] Keine 404 oder 500 Errors
- [ ] CORS funktioniert in Production

**User Journey Tests:**
- [ ] Frontend lädt über HTTPS
- [ ] Restaurant-Suche funktioniert
- [ ] Bestell-Prozess komplett testbar
- [ ] Admin Panel zugänglich

---

## 🚨 GO/NO-GO Decision

### ✅ GO Criteria (Alle müssen erfüllt sein):
- [ ] Domain & SSL vollständig funktionierend
- [ ] Alle Payment Services aktiv und getestet
- [ ] ENV-Variablen mit echten Werten konfiguriert
- [ ] Database Production-ready mit Backups
- [ ] Security Audit bestanden
- [ ] Alle Tests erfolgreich
- [ ] Monitoring & Error Tracking aktiv

### ❌ NO-GO Criteria (Sofort stoppen wenn):
- [ ] SSL Zertifikat fehlt oder ungültig
- [ ] Payment Services nicht konfiguriert
- [ ] Unsichere Secrets in Production
- [ ] Kritische Tests fehlschlagen
- [ ] Domain nicht auflösbar

---

## 📋 Pre-Launch Command Sequence

```bash
# 1. Final Domain Check
./test-domain.sh

# 2. ENV-Dateien vorbereiten
cp production.env backend/.env
cp frontend-production.env frontend/customer-web/.env

# 3. Production Build testen
docker-compose -f docker-compose.prod.yml build

# 4. Dry Run (ohne expose)
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml logs -f --tail=50

# 5. Final Tests
./test-production.sh
./test-payments.sh

# 6. GO/NO-GO Entscheidung treffen
```

---

## 🎯 Success Metrics

**Launch gilt als erfolgreich wenn:**
- ✅ System startet ohne Errors
- ✅ Alle Health Checks grün
- ✅ Frontend über HTTPS ladbar
- ✅ API über Domain erreichbar
- ✅ Payment Integration funktioniert
- ✅ Admin Panel zugänglich
- ✅ Keine kritischen Security Issues

---

**Pre-Launch Checklist abgeschlossen?** ✅ Dann bereit für **PRODUCTION DEPLOYMENT**!