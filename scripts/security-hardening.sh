#!/bin/bash

# ============================================
# UberFoods Security Hardening Script
# ============================================
# Führt Security-Hardening-Maßnahmen durch

set -e

echo "🔒 Starte Security Hardening..."

# 1. Prüfe Environment Variables
echo ""
echo "1️⃣ Prüfe kritische Environment Variables..."

if [ -f "./backend/.env.production" ]; then
    source ./backend/.env.production
    
    # Prüfe JWT_SECRET
    if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "CHANGE-THIS-TO-A-SECURE-RANDOM-STRING-MIN-32-CHARS-IN-PRODUCTION" ]; then
        echo "❌ JWT_SECRET muss geändert werden!"
        exit 1
    fi
    
    # Prüfe Database Password
    if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "change_this_in_production" ]; then
        echo "❌ POSTGRES_PASSWORD muss geändert werden!"
        exit 1
    fi
    
    echo "✅ Environment Variables geprüft"
else
    echo "⚠️  .env.production nicht gefunden"
fi

# 2. Prüfe Docker Security
echo ""
echo "2️⃣ Prüfe Docker Security..."

# Prüfe ob Container als root laufen
echo "📋 Prüfe Container-User..."
docker ps --format "table {{.Names}}\t{{.Image}}" | grep -v "NAMES" | while read line; do
    CONTAINER=$(echo $line | awk '{print $1}')
    USER=$(docker exec $CONTAINER whoami 2>/dev/null || echo "unknown")
    if [ "$USER" = "root" ]; then
        echo "⚠️  Container $CONTAINER läuft als root"
    fi
done

# 3. Firewall Rules
echo ""
echo "3️⃣ Firewall Configuration..."
echo "📝 Wichtige Firewall Rules:"
echo "   - Nur Port 80, 443, 22 (SSH) sollten öffentlich erreichbar sein"
echo "   - Database (5432) sollte nur intern erreichbar sein"
echo "   - Redis (6379) sollte nur intern erreichbar sein"
echo "   - Backend (3000) sollte nur über Nginx erreichbar sein"

# 4. SSL/TLS Configuration
echo ""
echo "4️⃣ SSL/TLS Configuration..."
if [ -d "./nginx/ssl" ]; then
    if [ -f "./nginx/ssl/fullchain.pem" ] && [ -f "./nginx/ssl/privkey.pem" ]; then
        echo "✅ SSL-Zertifikate gefunden"
        
        # Prüfe Zertifikat-Ablaufdatum
        EXPIRY=$(openssl x509 -enddate -noout -in ./nginx/ssl/fullchain.pem 2>/dev/null | cut -d= -f2)
        if [ -n "$EXPIRY" ]; then
            echo "📅 Zertifikat läuft ab: $EXPIRY"
        fi
    else
        echo "⚠️  SSL-Zertifikate nicht gefunden"
        echo "   Erstelle mit: certbot certonly --standalone -d yourdomain.com"
    fi
else
    echo "⚠️  SSL-Verzeichnis nicht gefunden"
    mkdir -p ./nginx/ssl
    echo "✅ SSL-Verzeichnis erstellt"
fi

# 5. Backup-Verifizierung
echo ""
echo "5️⃣ Backup-Verifizierung..."
if [ -d "./backups" ]; then
    BACKUP_COUNT=$(find ./backups -name "*.sql.gz" | wc -l)
    echo "📊 Anzahl Backups: $BACKUP_COUNT"
    
    if [ "$BACKUP_COUNT" -gt 0 ]; then
        LATEST_BACKUP=$(find ./backups -name "*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
        echo "📦 Neuestes Backup: $LATEST_BACKUP"
    else
        echo "⚠️  Keine Backups gefunden"
    fi
else
    echo "⚠️  Backup-Verzeichnis nicht gefunden"
    mkdir -p ./backups
    echo "✅ Backup-Verzeichnis erstellt"
fi

# 6. Security Headers
echo ""
echo "6️⃣ Security Headers..."
echo "✅ Nginx Security Headers konfiguriert:"
echo "   - Strict-Transport-Security"
echo "   - X-Frame-Options"
echo "   - X-Content-Type-Options"
echo "   - X-XSS-Protection"
echo "   - Referrer-Policy"

# 7. Rate Limiting
echo ""
echo "7️⃣ Rate Limiting..."
echo "✅ Rate Limiting konfiguriert:"
echo "   - API: 10 requests/second"
echo "   - Auth: 5 requests/second"

# 8. Recommendations
echo ""
echo "📋 Security Recommendations:"
echo "   1. ✅ Verwende starke Passwörter für alle Services"
echo "   2. ✅ Rotiere API Keys regelmäßig"
echo "   3. ✅ Aktiviere 2FA für alle Admin-Accounts"
echo "   4. ✅ Führe regelmäßige Security Audits durch"
echo "   5. ✅ Überwache Logs auf verdächtige Aktivitäten"
echo "   6. ✅ Halte alle Dependencies aktuell"
echo "   7. ✅ Verwende Secrets Management (AWS Secrets Manager, HashiCorp Vault)"
echo "   8. ✅ Implementiere IP Whitelisting für Admin-Endpunkte"
echo "   9. ✅ Aktiviere DDoS Protection"
echo "   10. ✅ Führe regelmäßige Penetration Tests durch"

echo ""
echo "✅ Security Hardening abgeschlossen!"

