# 🚀 UberFoods Production Setup Guide

## Schritt 1: ENV-Konfiguration

### Backend ENV Setup

```bash
# Kopiere Production Template
cp production.env backend/.env

# Bearbeite die Datei mit deinen echten Werten
nano backend/.env
```

**Pflichtfelder (müssen ausgefüllt werden):**

```bash
# Database
DATABASE_URL=postgresql://uberfoods_prod_user:DEIN_STARKES_DB_PASSWORT@postgres:5432/uberfoods_production

# JWT Keys (generiere neue!)
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Stripe Production Keys
STRIPE_SECRET_KEY=STRIPE_SECRET_KEY_PLACEHOLDER...
STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET_PLACEHOLDER...
STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY_PLACEHOLDER...

# CORS (deine Domain!)
ALLOWED_ORIGINS=https://deine-domain.at,https://admin.deine-domain.at
```

### Frontend ENV Setup

```bash
# Kopiere Production Template
cp frontend-production.env frontend/customer-web/.env

# Bearbeite die Datei
nano frontend/customer-web/.env
```

**Pflichtfelder:**

```bash
# Deine Domain
VITE_API_URL=https://api.deine-domain.at/api
VITE_WS_URL=wss://api.deine-domain.at

# Stripe Public Key (NICHT das Secret!)
VITE_STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY_PLACEHOLDER...

# Google Maps Production Key
VITE_GOOGLE_MAPS_API_KEY=AIzaSyDeinGoogleMapsKey
```

## Schritt 2: Sichere Secrets generieren

### JWT Keys
```bash
# Generiere 128-Character Keys
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

### Database Password
```bash
# Verwende starke Passwörter (min. 32 Zeichen)
openssl rand -base64 32
```

## Schritt 3: Services konfigurieren

### Stripe Production Setup
1. Gehe zu https://dashboard.stripe.com/
2. Erstelle Production API Keys
3. Konfiguriere Webhooks für deine Domain
4. Aktiviere gewünschte Payment Methods

### PayPal Production Setup
1. Gehe zu https://developer.paypal.com/
2. Wechsle zu Live-Modus
3. Erstelle Live App Credentials
4. Konfiguriere Webhooks

### Google Maps API
1. Gehe zu https://console.cloud.google.com/
2. Erstelle Production API Key
3. Restrict auf deine Domain
4. Aktiviere Maps JavaScript API

## Schritt 4: Domain & SSL

### Domain-Konfiguration
```bash
# ALLOWED_ORIGINS muss deine echten Domains enthalten:
ALLOWED_ORIGINS=https://meine-food-app.at,https://admin.meine-food-app.at,https://api.meine-food-app.at
```

### SSL-Zertifikat
- Verwende Let's Encrypt für kostenloses SSL
- Oder kommerzielle Zertifikate
- Stelle sicher, dass alle Subdomains SSL haben

## Schritt 5: Pre-Launch Tests

### Lokaler Test
```bash
# Production Setup lokal testen
docker-compose -f docker-compose.prod.yml up -d

# API Tests
curl https://localhost/api/health
curl https://localhost/api/docs
curl -X POST https://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@meine-domain.at","password":"test123"}'
```

### Production Readiness Checklist
- [ ] Alle ENV-Variablen ausgefüllt
- [ ] Stripe/PayPal Keys funktionieren
- [ ] CORS Origins korrekt
- [ ] Domain SSL-aktiv
- [ ] Database Verbindung OK
- [ ] Redis Cache funktional
- [ ] API Endpoints antworten
- [ ] Frontend baut erfolgreich

## Schritt 6: Deployment

```bash
# Production Deploy
docker-compose -f docker-compose.prod.yml up -d --build

# Logs überwachen
docker-compose -f docker-compose.prod.yml logs -f

# Health Check
curl https://deine-domain.at/api/health
```

## Sicherheitshinweise

### Secrets Management
- Niemals Secrets in Git committen
- Verwende Environment-Variablen
- Regelmäßig Keys rotieren
- Separate Keys für Staging/Production

### Monitoring
- Sentry für Error Tracking einrichten
- Performance Monitoring aktivieren
- Database Query Monitoring
- Security Audits regelmäßig

### Backup Strategy
- Database täglich sichern
- Automatische Backups konfigurieren
- Test Restore-Prozeduren

## Notfall-Wiederherstellung

Falls etwas schief geht:
```bash
# Sofortiges Rollback
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.yml up -d  # Fallback zu Development

# Logs analysieren
docker-compose logs --tail=100
```

## Support

Bei Problemen:
1. Logs prüfen: `docker-compose logs`
2. API Health: `curl /api/health`
3. Database: Verbindung testen
4. Frontend: Browser Console prüfen

---

## 🚀 Launch-Checkliste

- [ ] Domain & SSL konfiguriert
- [ ] ENV-Variablen gesetzt
- [ ] Stripe/PayPal aktiv
- [ ] Google Maps API aktiv
- [ ] Database Migration erfolgreich
- [ ] API Tests bestanden
- [ ] Frontend Build erfolgreich
- [ ] Monitoring eingerichtet
- [ ] Backup Strategy aktiv
- [ ] Notfall-Plan bereit

**Viel Erfolg mit deinem UberFoods Launch! 🎉**