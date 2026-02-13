# 💰 UberFoods PayPal Production Setup

## Schritt 3.2: PayPal Production Konfiguration

### 3.2.1 PayPal Business Account

**1. Gehe zu PayPal Developer:**
```
https://developer.paypal.com/
```

**2. Business Account Setup:**
- Melde dich mit deinem PayPal Business Account an
- Gehe zu: My Apps & Credentials
- Wechsle von "Sandbox" zu "Live"

**3. Erstelle Live App:**
- Klicke "Create App"
- App Name: "UberFoods Production"
- App Type: "Merchant"
- Wähle deine Business Account

**4. API Credentials notieren:**
```
Client ID:     AYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Secret:        EOxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3.2.2 PayPal Webhooks Setup

**1. Webhook Konfiguration:**
- Gehe zu: My Apps & Credentials → Deine App → Webhooks
- Klicke "Add Webhook"
- Webhook URL: `https://api.yourdomain.com/api/payments/webhooks/paypal`
- Events auswählen:
  - ✅ `PAYMENT.CAPTURE.COMPLETED`
  - ✅ `PAYMENT.CAPTURE.DENIED`
  - ✅ `PAYMENT.CAPTURE.PENDING`
  - ✅ `PAYMENT.CAPTURE.REFUNDED`
  - ✅ `CHECKOUT.ORDER.APPROVED`
  - ✅ `CHECKOUT.ORDER.COMPLETED`

**2. Webhook ID notieren:**
- Nach Erstellung: Webhook ID kopieren
- Wird zu `PAYPAL_WEBHOOK_ID`

### 3.2.3 PayPal Business Profil

**Vervollständige dein Profil:**
- Gehe zu: Account Settings → Business information
- Business Name: Dein Restaurant/Food Service Name
- Business Type: Restaurant/Food Service
- Support Email: `support@yourdomain.com`
- Customer Service Phone: Deine Telefonnummer

### 3.2.4 ENV-Konfiguration

**Aktualisiere `production.env`:**

```bash
# PAYPAL PRODUCTION KEYS
PAYPAL_CLIENT_ID=YOUR_ACTUAL_PAYPAL_CLIENT_ID_HERE
PAYPAL_CLIENT_SECRET=YOUR_ACTUAL_PAYPAL_CLIENT_SECRET_HERE
PAYPAL_WEBHOOK_ID=YOUR_ACTUAL_WEBHOOK_ID_HERE
```

### 3.2.5 PayPal Features aktivieren

**Zusätzliche Features:**
- Gehe zu: Account Settings → Payment preferences
- Aktiviere "PayPal Payments Standard"
- Aktiviere "Express Checkout"
- Aktiviere "Reference Transactions" (für Subscriptions)

### 3.2.6 Test-Zahlungen

**Teste PayPal Integration:**

```bash
# Test Order erstellen
curl -X POST https://api.yourdomain.com/api/payments/paypal/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": "25.99",
    "currency": "EUR",
    "description": "Test Order"
  }'

# Sollte PayPal Order URL zurückgeben
```

---

## 🔧 Troubleshooting PayPal

### Problem: API Credentials funktionieren nicht
```bash
# Test API Verbindung
curl -v https://api.paypal.com/v1/oauth2/token \
  -H "Accept: application/json" \
  -H "Accept-Language: en_US" \
  -u "YOUR_CLIENT_ID:YOUR_SECRET" \
  -d "grant_type=client_credentials"
```

### Problem: Webhook nicht empfangen
- PayPal Dashboard → Webhooks → Recent Events
- Überprüfe Webhook URL und Events
- Test-Webhook senden

### Problem: Zahlung fehlgeschlagen
- PayPal Dashboard → Activity → Failed payments
- API Response analysieren

---

## 📊 PayPal Production Checklist

- [ ] PayPal Business Account aktiv
- [ ] Live API Credentials erstellt
- [ ] Webhook Endpoint konfiguriert
- [ ] Alle Payment Events subscribed
- [ ] Business Profil ausgefüllt
- [ ] ENV-Variablen aktualisiert
- [ ] Test-Zahlung erfolgreich
- [ ] Webhook-Empfang getestet
- [ ] Express Checkout aktiviert

---

## 💰 PayPal Kosten

**PayPal Gebühren (Europa):**
- Domestic Payments: 2.9% + 0.35€
- International Payments: 3.9% + 0.35€
- Currency Conversion: 2.99-4.99%

**Hinweis:** PayPal kann günstiger sein als Stripe für internationale Zahlungen

---

## 🎯 Nächster Schritt

Nach PayPal Setup: **Google Maps Production Setup**