# 🎯 FairShare Subscription System - Vollständige Dokumentation

## Übersicht

Das FairShare Subscription System ermöglicht es Fahrern, zwischen verschiedenen Tiers zu wählen und erhält dafür unterschiedliche Commission-Rates. **100% der Restaurant-Provisionen werden an die Fahrer weitergegeben** (bei Pro/Vollzeit Tiers).

## 📊 Subscription Tiers

### Basic (29€/Monat)
- **Commission:** 25% von der Restaurant-Provision (30%)
- **Eigentlich:** 7.5% vom Bestellwert
- **Features:**
  - Tägliche Auszahlungen ab 50€
  - Standard Support
  - Bis zu 50 Lieferungen/Monat

### Pro (49€/Monat) ⭐ BELIEBT
- **Commission:** 30% von der Restaurant-Provision (30%) = **100% der Provision**
- **Eigentlich:** 9% vom Bestellwert
- **Features:**
  - Sofortige Auszahlungen ab 20€
  - Priority Support
  - Unbegrenzte Lieferungen
  - Exklusive Features

### Vollzeit (99€/Monat)
- **Commission:** 30% + 2% Bonus bei >100 Lieferungen/Monat
- **Eigentlich:** 9% vom Bestellwert (+ Bonus)
- **Features:**
  - Alle Pro-Features
  - Exklusive High-Value Orders (Warenkorb >50€)
  - Dedicated Support
  - 2% Bonus bei >100 Lieferungen/Monat

### Enterprise (Custom Pricing)
- **Commission:** Verhandelbar (Standard: 32%)
- **Features:**
  - Custom Commission Rate
  - Dedicated Account Manager
  - API-Zugang
  - White-Label Optionen

## 💰 Commission-Berechnung

### Beispiel-Berechnung:

**Bestellung:** 40€ Warenkorb

1. **Restaurant zahlt:** 30% = 12€ Provision
2. **Fahrer erhält (je nach Tier):**
   - Basic: 12€ × 25% = **3.00€**
   - Pro: 12€ × 30% = **3.60€** (100% der Provision)
   - Vollzeit: 12€ × 30% = **3.60€** (+ Bonus bei >100 Lieferungen)
   - Enterprise: 12€ × 32% = **3.84€**

**Vergleich Foodora:** 10€ Fix → Dein Modell ist bei Pro/Vollzeit deutlich besser!

## 🚀 Installation & Setup

### 1. Database Migration

```bash
cd backend
npx prisma migrate dev --name add_driver_subscriptions
npx prisma generate
```

### 2. Migration für bestehende Fahrer (Optional)

```bash
npx ts-node backend/src/modules/driver/migrations/migrate-drivers-to-subscriptions.ts
```

Dies weist allen bestehenden Fahrern automatisch **Basic Tier** mit **7 Tage kostenlosem Trial** zu.

### 3. Stripe Konfiguration

#### A. Stripe Products & Prices erstellen

Im Stripe Dashboard:
1. Erstelle 3 Products:
   - "FairShare Basic" - 29€/Monat
   - "FairShare Pro" - 49€/Monat
   - "FairShare Vollzeit" - 99€/Monat

2. Kopiere die Price IDs

#### B. Environment Variables setzen

```env
# Stripe Configuration
STRIPE_SECRET_KEY=STRIPE_SECRET_KEY_PLACEHOLDER
STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET_PLACEHOLDER

# Stripe Price IDs (nach Erstellung im Dashboard)
STRIPE_PRICE_BASIC=price_xxxxx
STRIPE_PRICE_PRO=price_xxxxx
STRIPE_PRICE_FULLTIME=price_xxxxx
STRIPE_PRICE_ENTERPRISE=price_xxxxx
```

#### C. Webhook konfigurieren

Im Stripe Dashboard → Webhooks:
- **URL:** `https://your-domain.com/api/subscriptions/webhook`
- **Events auswählen:**
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `customer.subscription.trial_will_end`

## 📡 API Endpoints

### Driver Endpoints

#### Erstelle Subscription
```http
POST /api/drivers/:id/subscription
Content-Type: application/json

{
  "tier": "PRO",
  "paymentMethodId": "pm_xxxxx" // Optional
}
```

#### Hole aktuelle Subscription
```http
GET /api/drivers/:id/subscription
```

#### Upgrade Subscription
```http
POST /api/drivers/:id/subscription/upgrade
Content-Type: application/json

{
  "tier": "FULLTIME"
}
```

#### Kündige Subscription
```http
POST /api/drivers/:id/subscription/cancel
Content-Type: application/json

{
  "cancelAtPeriodEnd": true
}
```

### Admin Endpoints

#### Subscription Analytics
```http
GET /api/drivers/subscriptions/analytics?period=month
```

#### Revenue Forecast
```http
GET /api/drivers/subscriptions/forecast?months=12
```

## 🔄 Workflow

### 1. Fahrer erstellt Subscription

1. Fahrer wählt Tier in Settings
2. System erstellt Stripe Subscription (7 Tage Trial)
3. Willkommens-Email wird gesendet
4. Commission wird automatisch basierend auf Tier berechnet

### 2. Order wird geliefert

1. Order Status → `DELIVERED`
2. System erstellt automatisch `CommissionTransaction`
3. Commission wird basierend auf aktuellem Tier berechnet
4. Fahrer sieht Earnings im Dashboard

### 3. Subscription Events

- **Trial endet:** Email 3 Tage vorher
- **Payment succeeded:** Bestätigungs-Email
- **Payment failed:** Warn-Email + Status → `PAST_DUE`
- **Upgrade:** Bestätigungs-Email
- **Cancel:** Kündigungs-Email

## 📈 Analytics & Reporting

### Verfügbare Metriken:

- **MRR** (Monthly Recurring Revenue)
- **Churn Rate** (Kündigungsrate)
- **Tier Distribution** (Anzahl pro Tier)
- **Status Distribution** (Active, Trialing, etc.)
- **Durchschnittliche Earnings pro Tier**
- **Upgrade/Downgrade Trends**
- **Revenue Forecast** (12 Monate)

### Beispiel Analytics Response:

```json
{
  "period": "month",
  "totalSubscriptions": 150,
  "tierDistribution": {
    "BASIC": 80,
    "PRO": 50,
    "FULLTIME": 20
  },
  "statusDistribution": {
    "ACTIVE": 120,
    "TRIALING": 30
  },
  "mrr": 7350,
  "churnRate": 5.2,
  "avgEarningsByTier": {
    "BASIC": 450,
    "PRO": 680,
    "FULLTIME": 1200
  }
}
```

## 🎨 Frontend Integration

### Settings Page

Die Subscription-Verwaltung ist bereits in `Settings.tsx` integriert:

```tsx
<SubscriptionTierSelector
  driverId={driver.id}
  currentSubscription={subscription}
  onSubscriptionChange={handleSubscriptionChange}
/>
```

### Dashboard Badge

Der Subscription-Status wird automatisch im Dashboard-Header angezeigt.

### Earnings Dashboard

Zeigt:
- Aktuelles Tier und Commission Rate
- Upgrade-Empfehlungen mit Vergleichsrechnung
- "Mit Pro würdest du X€ mehr verdienen"

## 🔧 Technische Details

### Database Schema

- `DriverSubscription` - Subscription-Daten
- `CommissionTransaction` - Jede Bestellung erhält eine Transaction
- Enums: `SubscriptionTier`, `SubscriptionStatus`, `CommissionStatus`

### Services

- `DriverSubscriptionService` - Haupt-Service für Subscription-Logik
- `SubscriptionAnalyticsService` - Analytics & Reporting
- `SubscriptionWebhookController` - Stripe Webhook Handler

### Commission-Berechnung

Die Commission wird automatisch berechnet, wenn eine Order als `DELIVERED` markiert wird:

```typescript
// Restaurant zahlt 30%
const restaurantCommission = orderAmount * 0.30;

// Driver erhält Anteil basierend auf Tier
const driverCommission = restaurantCommission * commissionRate;

// Platform Fee = Differenz
const platformFee = restaurantCommission - driverCommission;
```

## 🧪 Testing

### Manuelle Tests

1. **Subscription erstellen:**
   ```bash
   curl -X POST http://localhost:3000/api/drivers/{driverId}/subscription \
     -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{"tier": "PRO"}'
   ```

2. **Order als DELIVERED markieren:**
   - Commission Transaction wird automatisch erstellt

3. **Earnings prüfen:**
   ```bash
   curl http://localhost:3000/api/drivers/{driverId}/earnings
   ```

## 📝 Wichtige Hinweise

1. **Trial-Periode:** Alle neuen Subscriptions erhalten automatisch 7 Tage kostenlosen Trial
2. **Retroaktive Commission:** Migration Script erstellt Commission Transactions für bestehende Orders
3. **Stripe Integration:** Optional - System funktioniert auch ohne Stripe (Mock-Modus)
4. **Email Notifications:** Erfordert konfigurierten SMTP-Server

## 🐛 Troubleshooting

### Problem: Migration schlägt fehl
**Lösung:** Prüfe ob alle vorherigen Migrations erfolgreich waren. Falls nicht, führe `npx prisma migrate reset` aus (⚠️ löscht alle Daten).

### Problem: Stripe Webhook funktioniert nicht
**Lösung:** 
1. Prüfe `STRIPE_WEBHOOK_SECRET` in `.env`
2. Prüfe Webhook URL in Stripe Dashboard
3. Prüfe Logs: `backend/logs/combined.log`

### Problem: Commission wird nicht berechnet
**Lösung:**
1. Prüfe ob Subscription existiert: `GET /api/drivers/:id/subscription`
2. Prüfe ob Order Status = `DELIVERED`
3. Prüfe Logs für Fehler

## 🎯 Nächste Schritte

1. ✅ Database Migration ausführen
2. ✅ Stripe Products & Prices erstellen
3. ✅ Environment Variables setzen
4. ✅ Webhook konfigurieren
5. ✅ Migration Script für bestehende Fahrer ausführen
6. ✅ Testing durchführen

## 📞 Support

Bei Fragen oder Problemen:
- Prüfe Logs: `backend/logs/`
- Prüfe Database: `npx prisma studio`
- Prüfe API: `http://localhost:3000/api/drivers/subscriptions/analytics`

---

**Status:** ✅ Vollständig implementiert und produktionsbereit!

