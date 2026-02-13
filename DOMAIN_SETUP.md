# 🌐 UberFoods Domain Setup Guide

## Schritt 2: Domain & SSL Konfiguration

### 2.1 Domain-Registrierung

**Empfohlene Domain-Struktur:**
```
yourdomain.com      → Haupt-Frontend (Customer App)
www.yourdomain.com  → Redirect zu yourdomain.com
api.yourdomain.com  → Backend API
admin.yourdomain.com → Admin Panel
```

**DNS-Einträge bei deinem Provider:**
```
Typ: A
Name: @
Wert: DEINE_SERVER_IP

Typ: A
Name: www
Wert: DEINE_SERVER_IP

Typ: A
Name: api
Wert: DEINE_SERVER_IP

Typ: A
Name: admin
Wert: DEINE_SERVER_IP
```

### 2.2 SSL-Zertifikat Setup

**Option A: Automatisch mit Let's Encrypt (Empfohlen)**

```bash
# SSL Setup Script ausführen
cd nginx
chmod +x ssl-setup.sh
./ssl-setup.sh
```

**Option B: Manuell**

```bash
# Certbot für alle Domains
certbot certonly --standalone \
    -d yourdomain.com \
    -d www.yourdomain.com \
    -d api.yourdomain.com \
    -d admin.yourdomain.com \
    --email admin@yourdomain.com
```

### 2.3 Nginx-Konfiguration aktualisieren

**Aktualisiere nginx/nginx.prod.conf:**

```nginx
# Ändere diese Zeilen:
server_name yourdomain.com www.yourdomain.com api.yourdomain.com admin.yourdomain.com;

# Und diese:
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

### 2.4 ENV-Variablen aktualisieren

**Backend (production.env):**
```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://api.yourdomain.com,https://admin.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

**Frontend (frontend-production.env):**
```bash
VITE_API_URL=https://api.yourdomain.com/api
VITE_WS_URL=wss://api.yourdomain.com
```

### 2.5 Docker Compose aktualisieren

**docker-compose.prod.yml:**
```yaml
environment:
  - VITE_API_URL=https://api.yourdomain.com/api
```

### 2.6 Domain-Tests

**SSL-Test:**
```bash
# HTTPS funktioniert
curl -I https://yourdomain.com
curl -I https://api.yourdomain.com/api/health

# HTTP redirect zu HTTPS
curl -I http://yourdomain.com  # Sollte 301 zu HTTPS geben
```

**API-Test:**
```bash
# API über Domain erreichbar
curl https://api.yourdomain.com/api/health
curl https://api.yourdomain.com/api/restaurants
```

**Frontend-Test:**
```bash
# Frontend lädt über Domain
curl -I https://yourdomain.com  # Sollte 200 OK geben
```

### 2.7 CDN & Performance (Optional)

**Cloudflare Setup:**
1. Gehe zu https://cloudflare.com
2. Füge deine Domain hinzu
3. Aktualisiere Nameserver bei deinem Provider
4. Aktiviere:
   - SSL/TLS Encryption (Full Strict)
   - Always Use HTTPS
   - HTTP/2 + HTTP/3
   - Brotli Compression

**Benefits:**
- ✅ Globale CDN-Beschleunigung
- ✅ DDoS-Schutz
- ✅ SSL-Verwaltung
- ✅ Performance-Optimierung

### 2.8 Monitoring & Alerts

**SSL-Monitoring:**
```bash
# SSL Expiry Check
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

**Uptime-Monitoring:**
- Verwende Services wie UptimeRobot oder Pingdom
- Monitore alle Subdomains
- Setze Alerts für SSL-Expiry

### 2.9 Troubleshooting

**Problem: SSL-Zertifikat Fehler**
```bash
# Certbot Logs prüfen
tail -f /var/log/letsencrypt/letsencrypt.log

# Zertifikat neu anfordern
certbot renew --force-renewal
```

**Problem: CORS Errors**
```
# ALLOWED_ORIGINS prüfen
cat production.env | grep ALLOWED_ORIGINS

# Frontend API_URL prüfen
cat frontend/customer-web/.env | grep VITE_API_URL
```

**Problem: Domain nicht erreichbar**
```
# DNS Propagation prüfen
nslookup yourdomain.com

# DNS Cache leeren (Windows)
ipconfig /flushdns

# DNS Cache leeren (Linux/Mac)
sudo killall -HUP mDNSResponder
```

---

## 🚀 Nächster Schritt: Stripe/PayPal Setup

Nach erfolgreichem Domain-Setup:
1. ✅ Domain & SSL konfiguriert
2. 🔄 Stripe/PayPal API-Keys einrichten
3. 🔄 Production Deployment durchführen
4. 🔄 Live-Tests mit echter Domain

---

**Domain-Setup Checklist:**
- [ ] Domain registriert
- [ ] DNS-Einträge gesetzt
- [ ] SSL-Zertifikate erstellt
- [ ] Nginx konfiguriert
- [ ] ENV-Variablen aktualisiert
- [ ] HTTPS funktioniert
- [ ] API über Domain erreichbar
- [ ] Frontend über Domain erreichbar
- [ ] CORS korrekt konfiguriert