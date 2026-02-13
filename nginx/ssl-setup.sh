#!/bin/bash

# UberFoods SSL Setup with Let's Encrypt
echo "🔒 UberFoods SSL Setup with Let's Encrypt"
echo "=========================================="

# Domain (ändere zu deiner Domain)
DOMAIN="yourdomain.com"
EMAIL="admin@yourdomain.com"

# Installiere certbot falls nicht vorhanden
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    apt-get update
    apt-get install -y certbot
fi

# Erstelle SSL Verzeichnis
mkdir -p /etc/nginx/ssl

# Stoppe nginx für Certbot Challenge
echo "⏹️  Stopping nginx for certificate challenge..."
docker-compose -f docker-compose.prod.yml exec nginx nginx -s stop

# Erstelle Zertifikate für alle Subdomains
echo "📜 Requesting SSL certificates for:"
echo "   - $DOMAIN"
echo "   - www.$DOMAIN"
echo "   - api.$DOMAIN"
echo "   - admin.$DOMAIN"

certbot certonly --standalone \
    -d $DOMAIN \
    -d www.$DOMAIN \
    -d api.$DOMAIN \
    -d admin.$DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --non-interactive

# Erstelle Symlinks für nginx
ln -sf /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/nginx/ssl/fullchain.pem
ln -sf /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/nginx/ssl/privkey.pem

# Starte nginx wieder
echo "▶️  Starting nginx..."
docker-compose -f docker-compose.prod.yml exec nginx nginx

# Setup auto-renewal cron job
echo "⏰ Setting up certificate auto-renewal..."
cat > /etc/cron.d/certbot-renew << EOF
0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f /path/to/docker-compose.prod.yml exec nginx nginx -s reload
EOF

chmod 644 /etc/cron.d/certbot-renew

echo "✅ SSL Setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Update ALLOWED_ORIGINS in production.env:"
echo "   ALLOWED_ORIGINS=https://$DOMAIN,https://www.$DOMAIN,https://api.$DOMAIN,https://admin.$DOMAIN"
echo ""
echo "2. Update VITE_API_URL in frontend-production.env:"
echo "   VITE_API_URL=https://api.$DOMAIN/api"
echo "   VITE_WS_URL=wss://api.$DOMAIN"
echo ""
echo "3. Test SSL:"
echo "   curl -I https://$DOMAIN"
echo "   curl -I https://api.$DOMAIN/api/health"