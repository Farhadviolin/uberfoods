# 💳 UberFoods Stripe Production Setup

## Schritt 3.1: Stripe Production Konfiguration

### 3.1.1 Stripe Account Setup

**1. Gehe zu Stripe Dashboard:**
```
https://dashboard.stripe.com/
```

**2. Aktiviere Production-Modus:**
- Klicke oben rechts auf "Test mode" → "Live mode"
- Bestätige den Wechsel zu Live

**3. Erstelle API Keys:**
- Gehe zu: Developers → API keys
- Erstelle neue **Restricted keys** (sicherer als Publishable keys)
- Aktiviere diese Permissions:
  - ✅ `core` → `payment_intents` → `write`
  - ✅ `core` → `payment_methods` → `write`
  - ✅ `core` → `customers` → `write`
  - ✅ `webhook_endpoints` → `write`
  - ✅ `core` → `setup_intents` → `write`

**4. Wichtige Keys notieren:**
```
Publishable key: STRIPE_PUBLISHABLE_KEY_PLACEHOLDER
Secret key:       STRIPE_SECRET_KEY_PLACEHOLDER
Webhook secret:   STRIPE_WEBHOOK_SECRET_PLACEHOLDER
```

### 3.1.2 Webhook Konfiguration

**1. Webhook Endpoints einrichten:**
- Gehe zu: Developers → Webhooks
- Klicke "Add endpoint"
- Endpoint URL: `https://api.yourdomain.com/api/payments/webhooks/stripe`
- Events auswählen:
  - ✅ `payment_intent.succeeded`
  - ✅ `payment_intent.payment_failed`
  - ✅ `payment_method.attached`
  - ✅ `customer.subscription.created`
  - ✅ `invoice.payment_succeeded`

**2. Webhook Secret kopieren:**
- Nach Erstellung: "Signing secret" kopieren
- Dieser wird zum `STRIPE_WEBHOOK_SECRET`

### 3.1.3 Apple Pay & Google Pay Setup

**Apple Pay:**
- Gehe zu: Settings → Payment methods → Apple Pay
- Aktiviere Apple Pay
- Domain verification: `yourdomain.com`, `api.yourdomain.com`

**Google Pay:**
- Gehe zu: Settings → Payment methods → Google Pay
- Aktiviere Google Pay
- Merchant ID konfigurieren

### 3.1.4 Business Details

**Vervollständige dein Stripe Profil:**
- Gehe zu: Settings → Business details
- Support email: `support@yourdomain.com`
- Support phone: Deine Telefonnummer
- Business address: Deine Adresse
- Tax ID: Falls erforderlich

### 3.1.5 ENV-Konfiguration

**Aktualisiere `production.env`:**

```bash
# STRIPE PRODUCTION KEYS
STRIPE_SECRET_KEY=STRIPE_SECRET_KEY_PLACEHOLDER
STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET_PLACEHOLDER
STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY_PLACEHOLDER

# PAYMENT METHOD SETTINGS
APPLE_MERCHANT_ID=merchant.yourdomain
GOOGLE_PAY_MERCHANT_ID=YOUR_GOOGLE_PAY_MERCHANT_ID
```

### 3.1.6 Test-Zahlungen

**Teste deine Stripe Integration:**

```bash
# Test Payment Intent erstellen
curl -X POST https://api.yourdomain.com/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"amount": 2599, "currency": "eur"}'

# Sollte erfolgreich ein Payment Intent erstellen
```

---

## 🔧 Troubleshooting Stripe

### Problem: Webhook nicht empfangen
```bash
# Webhook Logs prüfen
curl https://api.yourdomain.com/api/payments/webhooks/stripe \
  -X POST \
  -d '{"test": "webhook"}'
```

### Problem: Payment fehlgeschlagen
- Stripe Dashboard → Payments → Failed payments
- Logs analysieren für genauen Fehler

### Problem: Apple Pay nicht verfügbar
- Domain verification bei Apple prüfen
- Stripe Dashboard → Apple Pay settings

---

## 📊 Stripe Production Checklist

- [ ] Stripe Account im Live-Modus
- [ ] Production API Keys erstellt
- [ ] Webhook Endpoint konfiguriert
- [ ] Alle Events subscribed
- [ ] Apple Pay domain verified
- [ ] Google Pay merchant ID gesetzt
- [ ] Business details ausgefüllt
- [ ] ENV-Variablen aktualisiert
- [ ] Test-Zahlung erfolgreich
- [ ] Webhook-Empfang getestet

---

## 💰 Stripe Kosten

**Stripe Gebühren:**
- European Cards: 1.4% + 25¢ per transaction
- International Cards: 2.9% + 25¢ per transaction
- Currency Conversion: 1% (falls zutreffend)

**UberFoods kann diese an Kunden weitergeben oder selbst tragen**

---

## 🎯 Nächster Schritt

Nach Stripe Setup: **PayPal Production Setup**