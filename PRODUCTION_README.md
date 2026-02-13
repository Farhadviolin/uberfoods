# 🚀 UberFoods Production Deployment Guide

## 📋 Übersicht

Dieser Guide führt dich durch die komplette Einrichtung und das Deployment von UberFoods in Production. Alle Mock-Daten wurden entfernt und echte APIs integriert.

## ✅ Was bereits erledigt wurde

### 🔴 Kritische Blocker (P0) - GELÖST
- ✅ **Restaurant-Web Demo-Werte entfernt** - Keine VITE_SKIP_AUTH mehr
- ✅ **Emergency Intelligence echt** - Health/Vehicle APIs verwenden echte Backend-Calls
- ✅ **Geocoding echt** - Google Places API statt simulierter Daten
- ✅ **Admin-Panel Charts echt** - Keine placeholderData mehr

### 🟡 P1 Verbesserungen - GELÖST
- ✅ **AI/ML echt** - Keine Fallbacks bei Fehlern
- ✅ **Testing bereinigt** - Fallback-Mechanismen entfernt

---

## 🛠️ Production Setup Schritte

### Schritt 1: Environment-Variablen konfigurieren

```bash
# Setup-Script ausführen (erstellt alle .env.production Dateien)
./setup-production.sh
```

#### Backend (.env.production):
```bash
# KRITISCH - MUSS konfiguriert werden:
DATABASE_URL=postgresql://user:password@host:5432/uberfoods_prod
JWT_SECRET=dein-super-geheimer-jwt-key-min-32-zeichen
STRIPE_SECRET_KEY=STRIPE_SECRET_KEY_PLACEHOLDER
GOOGLE_MAPS_API_KEY=AIzaSyDeineGoogleMapsAPIKey

# WICHTIG - Empfohlen:
TOMTOM_API_KEY=dein_tomtom_api_key
SENDGRID_API_KEY=SG.dein_sendgrid_api_key
VAPID_PRIVATE_KEY=dein_vapid_private_key
SENTRY_DSN=https://dein_sentry_dsn@sentry.io/project_id
```

#### Frontend (.env.production):
```bash
# KRITISCH:
VITE_API_URL=https://api.uberfoods.com/api
VITE_WS_URL=wss://api.uberfoods.com
VITE_GOOGLE_MAPS_API_KEY=AIzaSyDeineGoogleMapsAPIKey
VITE_STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY_PLACEHOLDER

# WICHTIG:
VITE_SENTRY_DSN=https://dein_sentry_dsn@sentry.io/project_id
```

### Schritt 2: Services einrichten

#### Google Maps API
1. Gehe zu [Google Cloud Console](https://console.cloud.google.com)
2. Erstelle/öffne ein Projekt
3. Aktiviere APIs:
   - Maps JavaScript API
   - Directions API
   - Geocoding API
   - Places API
4. Erstelle API Key mit IP-Restrictions

#### Stripe Payments
1. Gehe zu [Stripe Dashboard](https://dashboard.stripe.com)
2. Erstelle Account
3. Hole API Keys (Live Keys für Production)
4. Konfiguriere Webhooks für Payment-Updates

#### Email Service (SendGrid)
1. Gehe zu [SendGrid](https://sendgrid.com)
2. Erstelle Account
3. Erstelle API Key
4. Verifiziere Domain für besseren Deliverability

#### Push Notifications (VAPID)
```bash
# VAPID Keys generieren
npm install -g web-push
web-push generate-vapid-keys
```

### Schritt 3: Deployment ausführen

```bash
# Vollständiges Production Deployment
./deploy-production.sh
```

Dieser Befehl:
- ✅ Überprüft alle Konfigurationen
- ✅ Führt Datenbank-Migration aus
- ✅ Baut alle Anwendungen
- ✅ Startet Docker-Container
- ✅ Überprüft Service-Health

---

## 🌐 Service URLs (nach Deployment)

| Service | URL | Port | Beschreibung |
|---------|-----|------|--------------|
| **Backend API** | http://localhost:3000 | 3000 | REST API & WebSocket |
| **Admin Panel** | http://localhost:8081 | 8081 | Verwaltungsoberfläche |
| **Customer Web** | http://localhost:8082 | 8082 | Kunden-Web-App |
| **Driver App** | http://localhost:8083 | 8083 | Fahrer-Web-App |
| **Restaurant Web** | http://localhost:8084 | 8084 | Restaurant-Web-App |
| **Prometheus** | http://localhost:9090 | 9090 | Monitoring |
| **Grafana** | http://localhost:3001 | 3001 | Dashboards (admin/admin) |

---

## 🔒 Security & SSL

### SSL-Zertifikat (Let's Encrypt)
```bash
# Für jede Domain/Subdomain
sudo certbot --nginx -d api.uberfoods.com
sudo certbot --nginx -d admin.uberfoods.com
sudo certbot --nginx -d app.uberfoods.com
sudo certbot --nginx -d driver.uberfoods.com
sudo certbot --nginx -d restaurant.uberfoods.com
```

### Nginx Reverse Proxy (empfohlen)
```nginx
# /etc/nginx/sites-available/uberfoods
server {
    listen 80;
    server_name api.uberfoods.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.uberfoods.com;

    ssl_certificate /etc/letsencrypt/live/api.uberfoods.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.uberfoods.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 📊 Monitoring & Logging

### Prometheus + Grafana
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

### Error Tracking (Sentry)
```javascript
// Bereits in allen Apps konfiguriert
// Füge deinen DSN zu den .env.production Dateien hinzu
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

### Logs anzeigen
```bash
# Alle Logs
docker-compose -f docker-compose.production.yml logs -f

# Spezifischer Service
docker-compose -f docker-compose.production.yml logs -f backend

# Logs mit Zeilenlimit
docker-compose -f docker-compose.production.yml logs --tail=100 backend
```

---

## 🔄 Updates & Maintenance

### Anwendung updaten
```bash
# Neue Version deployen
git pull
./setup-production.sh
./deploy-production.sh
```

### Datenbank-Backup
```bash
# Automatisches Backup (täglich)
docker exec uberfoods-postgres-prod pg_dump -U uberfoods uberfoods_prod > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Services neu starten
```bash
# Einzelnen Service
docker-compose -f docker-compose.production.yml restart backend

# Alle Services
docker-compose -f docker-compose.production.yml restart
```

---

## 🚨 Troubleshooting

### Service startet nicht
```bash
# Logs prüfen
docker-compose -f docker-compose.production.yml logs [service-name]

# Container Status
docker-compose -f docker-compose.production.yml ps

# Spezifischen Container neu bauen
docker-compose -f docker-compose.production.yml up -d --build [service-name]
```

### API-Fehler
```bash
# Backend Logs prüfen
docker-compose -f docker-compose.production.yml logs backend

# Health Check
curl http://localhost:3000/health
```

### Datenbank-Verbindung fehlt
```bash
# Datenbank Container prüfen
docker-compose -f docker-compose.production.yml exec postgres psql -U uberfoods -d uberfoods_prod

# Migration erneut ausführen
cd backend && npx prisma db push
```

---

## 📞 Support & Hilfe

Bei Problemen:
1. Logs prüfen: `docker-compose -f docker-compose.production.yml logs`
2. Health-Checks: `curl http://localhost:3000/health`
3. Environment-Variablen prüfen
4. Dokumentation lesen: `/backend/README.md`

---

## 🎯 Finale Checklist

- [ ] Environment-Variablen konfiguriert
- [ ] API-Keys von Services erhalten
- [ ] Domain/DNS eingerichtet
- [ ] SSL-Zertifikate installiert
- [ ] Datenbank-Migration ausgeführt
- [ ] Services gestartet und getestet
- [ ] Monitoring eingerichtet
- [ ] Backup-Strategie implementiert
- [ ] Admin-User erstellt

**UberFoods ist bereit für den Produktiveinsatz! 🚀**
