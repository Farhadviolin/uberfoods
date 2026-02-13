# 🚀 Production Deployment Guide

## Voraussetzungen

- Docker & Docker Compose installiert
- Domain/Subdomain für Frontend-Apps
- SSL-Zertifikat (Let's Encrypt empfohlen)
- PostgreSQL Datenbank (oder Docker)
- Environment-Variablen konfiguriert

## 1. Environment-Variablen Setup

### Backend (.env)

```bash
cd backend
cp .env.example .env
```

**WICHTIG:** Bearbeite `.env` und setze folgende Werte:

```env
# KRITISCH - Muss gesetzt werden!
JWT_SECRET=<generiere-ein-starkes-secret-min-32-zeichen>

# Production Origins (komma-separiert)
ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com

# NIEMALS in Production!
ALLOW_DEV_AUTH=false
NODE_ENV=production

# Datenbank
DATABASE_URL=postgresql://user:password@host:5432/UberFood_food?schema=public

# SMTP (für E-Mails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@UberFoods.com

# Stripe (für Zahlungen)
STRIPE_SECRET_KEY=STRIPE_SECRET_KEY_PLACEHOLDER
STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY_PLACEHOLDER
STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET_PLACEHOLDER

# AWS S3 (für File Storage)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=eu-central-1
AWS_S3_BUCKET=UberFood-food-uploads
```

### Frontend Apps

Für jede Frontend-App:

```bash
cd frontend/admin-panel
cp .env.example .env
```

Bearbeite `.env`:

```env
VITE_API_URL=https://api.example.com
VITE_WS_URL=wss://api.example.com
VITE_APP_NAME=UberFoods Admin
VITE_NODE_ENV=production
```

## 2. Docker Build & Deploy

### Backend

```bash
cd backend

# Build Image
docker build -t UberFood-food-backend:latest .

# Oder mit Docker Compose
docker-compose -f docker-compose.prod.yml up -d --build
```

### Frontend Apps

```bash
# Admin Panel
cd frontend/admin-panel
docker build -t UberFood-food-admin:latest .
docker run -d -p 3002:80 UberFood-food-admin:latest

# Customer Web
cd frontend/customer-web
docker build -t UberFood-food-customer:latest .
docker run -d -p 3001:80 UberFood-food-customer:latest

# Driver App
cd frontend/driver-app
docker build -t UberFood-food-driver:latest .
docker run -d -p 3004:80 UberFood-food-driver:latest

# Restaurant Web
cd frontend/restaurant-web
docker build -t UberFood-food-restaurant:latest .
docker run -d -p 3003:80 UberFood-food-restaurant:latest
```

## 3. Datenbank Migration

```bash
cd backend

# Prisma Client generieren
npm run prisma:generate

# Migrationen ausführen
npm run prisma:migrate deploy

# Seed-Daten (optional)
npm run prisma:seed
```

## 4. Nginx Reverse Proxy (Optional)

Für Production mit mehreren Apps empfohlen:

```nginx
# /etc/nginx/sites-available/UberFood-food

# Backend API
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Admin Panel
server {
    listen 80;
    server_name admin.example.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Customer Web
server {
    listen 80;
    server_name app.example.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 5. SSL mit Let's Encrypt

```bash
# Certbot installieren
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# SSL-Zertifikat generieren
sudo certbot --nginx -d api.example.com -d admin.example.com -d app.example.com
```

## 6. Monitoring & Logs

### Logs anzeigen

```bash
# Backend Logs
docker logs -f UberFood-food-backend-prod

# Oder direkt
tail -f backend/logs/combined.log
tail -f backend/logs/error.log
```

### Health Checks

```bash
# Backend Health
curl http://localhost:3000/api/health

# Frontend Health
curl http://localhost:3001/health
```

## 7. Backup-Strategie

### Datenbank Backup

```bash
# Automatisches Backup (Cron Job)
0 2 * * * docker exec UberFood-food-db-prod pg_dump -U postgres UberFood_food > /backups/UberFood_food_$(date +\%Y\%m\%d).sql
```

### File Uploads Backup

```bash
# Uploads zu S3 synchronisieren (falls noch nicht migriert)
aws s3 sync backend/uploads s3://UberFood-food-uploads/backups/
```

## 8. Security Checklist

- [ ] `JWT_SECRET` ist stark und einzigartig
- [ ] `ALLOW_DEV_AUTH=false` in Production
- [ ] `NODE_ENV=production` gesetzt
- [ ] CORS Origins korrekt konfiguriert
- [ ] SSL/TLS aktiviert
- [ ] Firewall konfiguriert (nur notwendige Ports offen)
- [ ] Datenbank-Passwörter stark
- [ ] API Keys sicher gespeichert (nicht im Code)
- [ ] Rate Limiting aktiviert
- [ ] Security Headers aktiviert (Helmet)
- [ ] Logs werden nicht öffentlich zugänglich gemacht

## 9. Performance-Optimierung

### Backend

- [ ] Redis für Caching (optional)
- [ ] Database Connection Pooling optimiert
- [ ] File Uploads zu Cloud Storage migriert (S3)
- [ ] CDN für statische Assets

### Frontend

- [ ] Production Build optimiert
- [ ] Code Splitting aktiviert
- [ ] Lazy Loading für Routes
- [ ] Images optimiert

## 10. Troubleshooting

### Backend startet nicht

```bash
# Prüfe Logs
docker logs UberFood-food-backend-prod

# Prüfe Environment-Variablen
docker exec UberFood-food-backend-prod env | grep JWT_SECRET
```

### Datenbank-Verbindungsfehler

```bash
# Prüfe Datenbank-Status
docker exec UberFood-food-db-prod pg_isready -U postgres

# Prüfe Connection String
echo $DATABASE_URL
```

### CORS-Fehler

- Prüfe `ALLOWED_ORIGINS` in `.env`
- Prüfe Frontend `VITE_API_URL` Konfiguration

## Support

Bei Problemen:
1. Prüfe Logs: `backend/logs/error.log`
2. Prüfe Health Endpoint: `/api/health`
3. Prüfe Environment-Variablen
4. Prüfe Docker Container Status: `docker ps`

