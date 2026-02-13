# 📊 UberFoods Monitoring & Alerting Setup

## Phase 5.1: Error Tracking & Monitoring

### 5.1.1 Sentry Setup für Error Tracking

**1. Sentry Account erstellen:**
```
https://sentry.io/signup/
```
- Kostenloser Plan: 5,000 Events/Monat
- Organisation erstellen: "UberFoods"

**2. Backend Error Tracking:**
- Neues Projekt: "UberFoods Backend" → Node.js
- DSN kopieren
- `production.env` aktualisieren:
```bash
SENTRY_DSN=https://your_backend_dsn@sentry.io/project_id
SENTRY_ENVIRONMENT=production
```

**3. Frontend Error Tracking:**
- Neues Projekt: "UberFoods Frontend" → React
- DSN kopieren
- `frontend-production.env` aktualisieren:
```bash
VITE_SENTRY_DSN=https://your_frontend_dsn@sentry.io/project_id
VITE_SENTRY_ENVIRONMENT=production
```

**4. Alert Rules konfigurieren:**
- Gehe zu: Alerts → Rules
- Erstelle Alert für "Error Rate > 5%"
- Erstelle Alert für "New Issue" (kritische Fehler)

### 5.1.2 Application Performance Monitoring (APM)

**Backend APM:**
```typescript
// backend/src/main.ts - APM hinzufügen
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0, // Production: 0.1 für Performance
  profilesSampleRate: 0.1,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Prisma({ client: prisma }),
  ],
});
```

**Frontend APM:**
```typescript
// frontend/customer-web/src/main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
});
```

### 5.1.3 System Monitoring

**Docker Health Checks:**
```yaml
# docker-compose.prod.yml - bereits implementiert
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

**Resource Monitoring:**
```bash
# Container Ressourcen überwachen
docker stats

# System Ressourcen
htop
df -h
free -h
```

**Custom Health Endpoints:**
```typescript
// backend/src/common/health/health.controller.ts
@Get()
@HealthCheck()
async check() {
  return this.health.check([
    () => this.http.pingCheck('api', 'https://api.yourdomain.com/api/health'),
    () => this.db.pingCheck('database'),
    () => this.redis.pingCheck('redis'),
  ]);
}
```

### 5.1.4 Log Aggregation

**Docker Logging:**
```bash
# Logs sammeln
docker-compose -f docker-compose.prod.yml logs -f --tail=100

# Fehler filtern
docker-compose logs 2>&1 | grep -i error

# Timestamp-basierte Logs
docker-compose logs --since "1h"
```

**Application Logging:**
```typescript
// backend/src/main.ts
const logger = new Logger();

app.useLogger(logger);

// Structured Logging
logger.log(`🚀 Application started on port ${port}`, 'Bootstrap');
logger.error('Database connection failed', error.stack, 'Database');
```

### 5.1.5 Alert Channels

**Email Alerts:**
- Sentry Alerts → Admin Email
- System Alerts → DevOps Email

**SMS Alerts (für kritische Issues):**
```bash
# Twilio für SMS Alerts
curl -X POST https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json \
  --data-urlencode "From=$TWILIO_PHONE_NUMBER" \
  --data-urlencode "To=+1234567890" \
  --data-urlencode "Body=🚨 CRITICAL: UberFoods API Down" \
  -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN
```

**Slack Integration:**
- Webhook für automatische Alerts
- Daily Health Reports
- Error Notifications

---

## 📈 Performance Monitoring

### 5.2.1 API Performance Metrics

**Response Time Monitoring:**
```typescript
// backend/src/common/interceptors/response-time.interceptor.ts
@Injectable()
export class ResponseTimeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        console.log(`${request.method} ${request.url} - ${duration}ms`);
      }),
    );
  }
}
```

**Database Query Monitoring:**
```typescript
// Prisma Middleware für Query Logging
prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const duration = Date.now() - start;

  if (duration > 100) {
    console.warn(`Slow query: ${params.model}.${params.action} took ${duration}ms`);
  }

  return result;
});
```

### 5.2.2 Frontend Performance

**Core Web Vitals:**
```typescript
// frontend/customer-web/src/utils/performance.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

**User Experience Monitoring:**
- Page Load Times
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)

### 5.2.3 Business Metrics

**Order Metrics:**
- Orders per Hour
- Average Order Value
- Order Completion Rate
- Payment Success Rate

**User Metrics:**
- Active Users
- Registration Rate
- Retention Rate
- Support Ticket Volume

---

## 🔒 Security Monitoring

### 5.3.1 Access Monitoring

**Failed Login Attempts:**
```typescript
// backend/src/modules/auth/auth.service.ts
async validateUser(email: string, password: string, userType: string) {
  const user = await this.prisma.customer.findUnique({ where: { email } });

  if (!user) {
    this.logger.warn(`Failed login attempt: ${email} (user not found)`, 'Auth');
    throw new UnauthorizedException('Invalid credentials');
  }

  // Rate limiting für Failed Logins
  if (user.failedLoginAttempts > 5) {
    throw new UnauthorizedException('Account locked - too many failed attempts');
  }

  return user;
}
```

**Suspicious Activity:**
- Multiple Failed Logins
- Unusual API Call Patterns
- High Error Rates from Single IP
- Unusual Geographic Access

### 5.3.2 Security Headers

**Nginx Security Headers (bereits konfiguriert):**
```
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Content-Security-Policy "default-src 'self'" always;
add_header Strict-Transport-Security "max-age=31536000" always;
```

### 5.3.3 SSL Certificate Monitoring

**Certificate Expiry Alerts:**
```bash
# Cron Job für SSL Monitoring
0 9 * * * /usr/bin/openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -checkend 86400 || echo "SSL Certificate expires within 24 hours"
```

---

## 💾 Backup & Recovery

### 5.4.1 Automated Database Backups

**Daily Backup Script:**
```bash
#!/bin/bash
# backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
CONTAINER="uberfoods_postgres"

# Database Backup erstellen
docker exec $CONTAINER pg_dump -U uberfoods_prod_user uberfoods_production > $BACKUP_DIR/backup_$DATE.sql

# Alte Backups löschen (behalte 7 Tage)
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

# Backup Verification
if [ -f "$BACKUP_DIR/backup_$DATE.sql" ]; then
  echo "✅ Database backup created: backup_$DATE.sql"
else
  echo "❌ Database backup failed"
  exit 1
fi
```

**Cron Job Setup:**
```bash
# Tägliche Backups um 2:00 Uhr
0 2 * * * /path/to/backup-database.sh

# Wöchentliche Full Backups sonntags um 3:00 Uhr
0 3 * * 0 /path/to/backup-database.sh full
```

### 5.4.2 File Upload Backups

**Static Files Backup:**
```bash
#!/bin/bash
# backup-uploads.sh

DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/uploads"

# Uploads Verzeichnis sichern
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /app/uploads/

# Alte Upload Backups löschen (behalte 30 Tage)
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +30 -delete
```

### 5.4.3 Recovery Procedures

**Database Recovery:**
```bash
# System stoppen
docker-compose -f docker-compose.prod.yml down

# Database Container starten
docker-compose -f docker-compose.prod.yml up -d postgres

# Backup wiederherstellen
docker exec -i uberfoods_postgres psql -U uberfoods_prod_user uberfoods_production < /backups/backup_20241220_020000.sql

# System neu starten
docker-compose -f docker-compose.prod.yml up -d
```

**Full System Recovery:**
```bash
# Emergency Restore Script
#!/bin/bash

echo "🚨 Starting Emergency Restore..."

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Restore database
docker-compose -f docker-compose.prod.yml up -d postgres
sleep 30
docker exec -i uberfoods_postgres psql -U uberfoods_prod_user uberfoods_production < /backups/latest_backup.sql

# Restore uploads
tar -xzf /backups/uploads_latest.tar.gz -C /

# Start all services
docker-compose -f docker-compose.prod.yml up -d

echo "✅ Emergency restore completed"
```

---

## 📊 Dashboard & Reporting

### 5.5.1 Real-time Dashboard

**System Health Dashboard:**
- Container Status (Green/Yellow/Red)
- API Response Times
- Error Rates
- Database Connections
- Memory/CPU Usage

**Business Dashboard:**
- Orders per Hour
- Revenue Tracking
- User Registrations
- Popular Restaurants

### 5.5.2 Automated Reports

**Daily Health Report:**
```bash
#!/bin/bash
# daily-report.sh

REPORT_DATE=$(date +%Y-%m-%d)
REPORT_FILE="/reports/daily_$REPORT_DATE.md"

# System Metrics sammeln
UPTIME=$(uptime)
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}')
MEMORY_USAGE=$(free -h | grep Mem | awk '{print $3 "/" $2}')

# API Health Check
API_HEALTH=$(curl -s -w "%{http_code}" -o /dev/null https://api.yourdomain.com/api/health)

# Database Stats
ORDER_COUNT=$(docker exec uberfoods_postgres psql -U uberfoods_prod_user -d uberfoods_production -t -c "SELECT COUNT(*) FROM orders;" 2>/dev/null || echo "N/A")

# Report erstellen
cat > $REPORT_FILE << EOF
# UberFoods Daily Report - $REPORT_DATE

## System Health
- **Uptime:** $UPTIME
- **Disk Usage:** $DISK_USAGE
- **Memory:** $MEMORY_USAGE
- **API Health:** $API_HEALTH

## Business Metrics
- **Total Orders:** $ORDER_COUNT
- **Active Users:** TBD
- **Revenue:** TBD

## Alerts
- None

## Recommendations
- None
EOF

# Report per Email versenden
mail -s "UberFoods Daily Report - $REPORT_DATE" admin@yourdomain.com < $REPORT_FILE
```

---

## 🎯 Monitoring Checklist

### Pre-Launch Setup:
- [ ] Sentry Projects erstellt (Backend + Frontend)
- [ ] DSN Keys in ENV-Dateien konfiguriert
- [ ] Alert Rules für kritische Fehler eingerichtet
- [ ] Health Check Endpoints implementiert
- [ ] Log Aggregation konfiguriert

### Post-Launch Monitoring:
- [ ] System Resources überwachen (CPU, Memory, Disk)
- [ ] API Response Times tracken
- [ ] Error Rates monitoren
- [ ] Database Performance prüfen
- [ ] User Experience messen (Core Web Vitals)

### Backup & Recovery:
- [ ] Automated Database Backups laufen
- [ ] Backup Verification implementiert
- [ ] Recovery Procedures getestet
- [ ] Emergency Restore Script bereit

### Alerting:
- [ ] Email Alerts für kritische Fehler
- [ ] SMS Alerts für System Down
- [ ] Slack Integration für Team Notifications
- [ ] Escalation Procedures definiert

---

**Monitoring ist das Fundament für einen stabilen Production-Betrieb!** 📊

Stelle sicher, dass alle Monitoring-Systeme vor dem Launch aktiv sind und Alerts korrekt funktionieren.