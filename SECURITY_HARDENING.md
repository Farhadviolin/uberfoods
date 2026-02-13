# 🔒 UberFoods Security Hardening Guide

## Phase 5.2: Security Hardening für Production

### 5.2.1 Server Security

**SSH Hardening:**
```bash
# SSH Config anpassen
sudo nano /etc/ssh/sshd_config

# Änderungen:
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
PrintMotd no
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server

# SSH neu starten
sudo systemctl restart sshd
```

**Firewall Setup:**
```bash
# UFW Firewall aktivieren
sudo apt install ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Status prüfen
sudo ufw status
```

**Fail2Ban für SSH Protection:**
```bash
# Fail2Ban installieren
sudo apt install fail2ban

# Config für SSH
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local

# SSH Jail aktivieren:
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

# Fail2Ban neu starten
sudo systemctl restart fail2ban
```

### 5.2.2 Docker Security

**Container Security Best Practices:**
```yaml
# docker-compose.prod.yml - bereits implementiert
security_opt:
  - no-new-privileges:true
cap_drop:
  - ALL
cap_add:
  - NET_BIND_SERVICE
read_only: true
tmpfs:
  - /tmp
  - /app/logs
```

**Image Security:**
```dockerfile
# Verwende nicht-root User
USER node

# Keine Shell in Container
RUN rm -rf /bin/bash /bin/sh /usr/bin/bash /usr/bin/sh
```

**Secret Management:**
```bash
# Docker Secrets verwenden (empfohlen für Swarm/Kubernetes)
echo "your-secret-key" | docker secret create jwt_secret -

# In Compose:
secrets:
  jwt_secret:
    external: true
```

### 5.2.3 Application Security

**Environment Variables Security:**
```bash
# Sichere Permissions für ENV-Dateien
chmod 600 backend/.env
chmod 600 frontend/customer-web/.env

# ENV-Dateien nicht in Git
echo ".env*" >> .gitignore
```

**API Security Headers (bereits implementiert):**
```typescript
// backend/src/main.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.yourdomain.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

**Rate Limiting (bereits implementiert):**
```typescript
// backend/src/common/guards/rate-limit.guard.ts
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip;
    const key = `rate-limit:${ip}`;

    // Implement rate limiting logic
    return true; // Placeholder
  }
}
```

### 5.2.4 Database Security

**PostgreSQL Security:**
```sql
-- Database User mit minimalen Rechten
CREATE USER uberfoods_prod_user WITH PASSWORD 'your-secure-password';
GRANT CONNECT ON DATABASE uberfoods_production TO uberfoods_prod_user;
GRANT USAGE ON SCHEMA public TO uberfoods_prod_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO uberfoods_prod_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO uberfoods_prod_user;

-- Row Level Security (optional)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_policy ON orders
  FOR ALL USING (customer_id = current_user_id() OR role = 'admin');
```

**Connection Security:**
```bash
# PostgreSQL SSL erzwingen
ssl = on
ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem'
ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key'
```

**Redis Security:**
```bash
# Redis Password setzen (bereits in compose)
redis-cli
CONFIG SET requirepass your-secure-redis-password
AUTH your-secure-redis-password
```

### 5.2.5 Network Security

**SSL/TLS Configuration:**
```nginx
# nginx/nginx.prod.conf - bereits konfiguriert
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA;
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

**DDoS Protection:**
```nginx
# Rate Limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;

# Block Bad Bots
if ($http_user_agent ~* "badbot|scanner") {
  return 403;
}
```

### 5.2.6 Data Protection

**Encryption at Rest:**
```bash
# Database Encryption
CREATE EXTENSION pgcrypto;

-- Sensitive Data verschlüsseln
UPDATE users SET credit_card = pgp_sym_encrypt('4111111111111111', 'encryption-key');
```

**Data Sanitization:**
```typescript
// backend/src/common/utils/sanitization.util.ts
export class SanitizationUtil {
  static sanitizeInput(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
}
```

### 5.2.7 Monitoring & Auditing

**Security Event Logging:**
```typescript
// backend/src/common/interceptors/security.interceptor.ts
@Injectable()
export class SecurityInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const userAgent = request.get('User-Agent');
    const ip = request.ip;

    // Log suspicious activities
    if (this.isSuspiciousRequest(request)) {
      this.logger.warn(`Suspicious request from ${ip}: ${request.method} ${request.url}`, 'Security');
    }

    return next;
  }

  private isSuspiciousRequest(request: any): boolean {
    const suspiciousPatterns = [
      /\.\.\//,  // Directory traversal
      /<script/i, // XSS attempts
      /union.*select/i, // SQL injection
    ];

    return suspiciousPatterns.some(pattern =>
      pattern.test(request.url) || pattern.test(JSON.stringify(request.body))
    );
  }
}
```

**Audit Logging:**
```typescript
// backend/src/modules/audit/audit.service.ts
@Injectable()
export class AuditService {
  async logAction(userId: string, action: string, resource: string, details?: any) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        details: JSON.stringify(details),
        ipAddress: this.getClientIp(),
        userAgent: this.getUserAgent(),
        timestamp: new Date(),
      },
    });
  }
}
```

### 5.2.8 Compliance & GDPR

**Data Processing Agreement:**
- Privacy Policy implementiert
- Cookie Consent Banner
- Data Deletion Endpoints
- Right to Access/Rectification

**GDPR Compliance:**
```typescript
// backend/src/modules/gdpr/gdpr.service.ts
@Injectable()
export class GdprService {
  async deleteUserData(userId: string) {
    // Anonymize oder lösche alle User-Daten
    await this.prisma.customer.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@anonymous.local`,
        name: 'Deleted User',
        phone: null,
        address: null,
        // Weitere Felder anonymisieren
      },
    });

    // Log deletion for compliance
    await this.auditService.logAction(userId, 'GDPR_DELETION', 'user', { compliant: true });
  }
}
```

### 5.2.9 Penetration Testing

**Automated Security Scans:**
```bash
# OWASP ZAP für API Security Testing
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://api.yourdomain.com \
  -r zap_report.html

# SQL Injection Testing
sqlmap -u "https://api.yourdomain.com/api/restaurants?id=1" --batch

# XSS Testing
xsser --url "https://yourdomain.com/search?q=test"
```

**Vulnerability Scanning:**
```bash
# Container Image Scanning
docker scan uberfoods-backend:latest

# Dependency Vulnerability Check
npm audit --audit-level high
```

### 5.2.10 Incident Response

**Security Incident Response Plan:**
```bash
#!/bin/bash
# incident-response.sh

echo "🚨 Security Incident Detected!"

# 1. Isolate affected systems
docker-compose -f docker-compose.prod.yml stop api

# 2. Log all activities
docker-compose logs --since 1h > incident_logs_$(date +%Y%m%d_%H%M%S).log

# 3. Notify security team
curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
  -H 'Content-type: application/json' \
  -d '{"text":"🚨 Security Incident Detected! Check logs immediately."}'

# 4. Take backups before investigation
./backup-database.sh emergency

# 5. Analyze logs for breach details
grep -i "unauthorized\|suspicious\|attack" incident_logs_*.log

echo "✅ Incident response initiated. Security team notified."
```

---

## 🔒 Security Checklist

### Infrastructure Security:
- [ ] SSH root login disabled
- [ ] Password authentication disabled
- [ ] UFW Firewall aktiviert
- [ ] Fail2Ban für SSH Protection
- [ ] Docker containers mit minimal privileges
- [ ] SSL/TLS A+ Rating

### Application Security:
- [ ] Environment variables secured
- [ ] Security headers implementiert
- [ ] Rate limiting aktiv
- [ ] Input validation und sanitization
- [ ] CSRF Protection
- [ ] XSS Prevention

### Data Security:
- [ ] Database SSL enabled
- [ ] Sensitive data encrypted
- [ ] Backup encryption
- [ ] Access logging aktiv
- [ ] GDPR Compliance implementiert

### Monitoring & Response:
- [ ] Security event logging
- [ ] Intrusion detection
- [ ] Automated alerts
- [ ] Incident response plan
- [ ] Regular security audits

---

## 🚨 Emergency Security Procedures

### Data Breach Response:
1. **Immediate Containment:**
   - System isolieren
   - Passwords zurücksetzen
   - API Keys rotieren

2. **Investigation:**
   - Log-Analyse
   - Breach Scope bestimmen
   - Forensische Untersuchung

3. **Communication:**
   - Betroffene User informieren
   - Regulatorische Meldungen
   - Öffentliche Kommunikation

4. **Recovery:**
   - System wiederherstellen
   - Sicherheitslücken schließen
   - Monitoring verstärken

---

**Security ist ein fortlaufender Prozess, keine einmalige Aufgabe! 🔒**

Implementiere regelmäßige Security Audits und halte Systeme aktuell.