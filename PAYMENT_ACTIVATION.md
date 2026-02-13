# 💳 UberFoods Payment Activation Guide

## Schritt-für-Schritt Payment Services Konfiguration

### ⚠️ **WICHTIG: Vor dem Start**
- Du brauchst ein Bankkonto für Auszahlungen
- Business-Registrierung muss vollständig sein
- Domain muss SSL-verschlüsselt sein
- Teste alles zuerst im Sandbox/Test-Modus

---

## 1. 🏦 STRIPE PRODUCTION SETUP

### 1.1 Stripe Account Aktivieren

**Gehe zu: https://dashboard.stripe.com/**

**Schritt 1: Live Mode aktivieren**
```
1. Klicke oben rechts auf "Test mode"
2. Wähle "Live mode" aus
3. Bestätige die Änderung
```

**Schritt 2: Business Profil vervollständigen**
```
Gehe zu: Settings → Business details

Fülle aus:
- Business name: Dein Restaurant/Food Service Name
- Business type: Company/Individual
- Tax ID: Falls verfügbar
- Business address: Deine vollständige Adresse
- Support email: support@yourdomain.com
- Support phone: Deine Telefonnummer
- Business website: https://yourdomain.com
```

**Schritt 3: Bankkonto für Auszahlungen verknüpfen**
```
Gehe zu: Settings → Bank accounts

Füge hinzu:
- Bank Name
- IBAN/Account Number
- BIC/SWIFT Code
- Account Holder Name
```

### 1.2 API Keys erstellen

**Schritt 1: Restricted API Keys erstellen**
```
Gehe zu: Developers → API keys → Create restricted key

Name: "UberFoods Production API Key"

Berechtigungen aktivieren:
✅ core → payment_intents → write
✅ core → payment_methods → write
✅ core → customers → write
✅ webhook_endpoints → write
✅ core → setup_intents → write

Erstelle den Key und kopiere:
- Secret key: STRIPE_SECRET_KEY_PLACEHOLDER
- Publishable key: STRIPE_PUBLISHABLE_KEY_PLACEHOLDER
```

### 1.3 Webhook Endpoints konfigurieren

**Schritt 1: Webhook erstellen**
```
Gehe zu: Developers → Webhooks → Add endpoint

Endpoint URL: https://api.yourdomain.com/api/payments/webhooks/stripe

Events auswählen:
✅ payment_intent.succeeded
✅ payment_intent.payment_failed
✅ payment_method.attached
✅ customer.subscription.created
✅ checkout.session.completed

Erstelle den Webhook.
```

**Schritt 2: Webhook Secret kopieren**
```
Nach Erstellung: Klicke auf den Webhook
Kopiere "Signing secret": STRIPE_WEBHOOK_SECRET_PLACEHOLDER
```

### 1.4 Apple Pay & Google Pay aktivieren

**Apple Pay Setup:**
```
Gehe zu: Settings → Payment methods → Apple Pay
Klicke "Activate Apple Pay"
Domain verification: yourdomain.com, api.yourdomain.com
```

**Google Pay Setup:**
```
Gehe zu: Settings → Payment methods → Google Pay
Merchant ID konfigurieren (von Google erhalten)
```

---

## 2. 💰 PAYPAL PRODUCTION SETUP

### 2.1 PayPal Business Account

**Gehe zu: https://developer.paypal.com/**

**Schritt 1: Live Mode aktivieren**
```
1. Melde dich mit deinem PayPal Business Account an
2. Gehe zu: My Apps & Credentials
3. Wechsle von "Sandbox" zu "Live"
```

**Schritt 2: Live App erstellen**
```
Klicke "Create App"

App Details:
- App Name: "UberFoods Production"
- App Type: Merchant
- Wähle dein Business Account aus

Erstelle die App.
```

**Schritt 3: API Credentials notieren**
```
Nach Erstellung öffne die App:
- Client ID: AYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
- Secret: EOxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2.2 PayPal Webhooks einrichten

**Schritt 1: Webhook erstellen**
```
Gehe zu: My Apps & Credentials → Deine App → Webhooks

Klicke "Add Webhook"

Webhook Details:
- Webhook URL: https://api.yourdomain.com/api/payments/webhooks/paypal
- Events:
  ✅ PAYMENT.CAPTURE.COMPLETED
  ✅ PAYMENT.CAPTURE.DENIED
  ✅ PAYMENT.CAPTURE.PENDING
  ✅ CHECKOUT.ORDER.APPROVED
  ✅ CHECKOUT.ORDER.COMPLETED

Erstelle den Webhook.
```

**Schritt 2: Webhook ID kopieren**
```
Nach Erstellung: Kopiere die Webhook ID
```

### 2.3 PayPal Business Profil

**Schritt 1: Business Informationen vervollständigen**
```
Gehe zu: Account Settings → Business information

Fülle aus:
- Business Name: Dein Restaurant/Food Service Name
- Business Type: Restaurant/Food Service
- Customer Service Email: support@yourdomain.com
- Customer Service Phone: Deine Telefonnummer
- Business Website: https://yourdomain.com
```

**Schritt 2: Zusätzliche Features aktivieren**
```
Gehe zu: Account Settings → Payment preferences

Aktiviere:
- PayPal Payments Standard
- Express Checkout
- Reference Transactions (für wiederkehrende Zahlungen)
```

---

## 3. 🔑 API KEYS KONFIGURIEREN

### 3.1 production.env aktualisieren

**Ersetze alle Platzhalter mit deinen echten Keys:**

```bash
# Stripe Keys
STRIPE_SECRET_KEY=STRIPE_SECRET_KEY_PLACEHOLDER
STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET_PLACEHOLDER
STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY_PLACEHOLDER

# PayPal Keys
PAYPAL_CLIENT_ID=DEIN_ECHTER_PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET=DEIN_ECHTER_PAYPAL_CLIENT_SECRET
PAYPAL_WEBHOOK_ID=DEINE_WEBHOOK_ID
```

### 3.2 frontend-production.env aktualisieren

```bash
# Nur die PUBLISHABLE Key (NICHT das Secret!)
VITE_STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY_PLACEHOLDER
```

---

## 4. 🧪 PAYMENT TESTS DURCHFÜHREN

### 4.1 Stripe Test-Zahlung

**Teste Stripe Payment Intent:**
```bash
curl -X POST https://api.yourdomain.com/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer DEIN_JWT_TOKEN" \
  -d '{
    "amount": 2599,
    "currency": "eur",
    "description": "Test Order"
  }'
```

**Erwartete Antwort:**
```json
{
  "client_secret": "pi_xxxxxxxxxxxxxxxxxxxxxxxx",
  "payment_intent_id": "pi_xxxxxxxxxxxxxxxxxxxxxxxx"
}
```

### 4.2 PayPal Test-Zahlung

**Teste PayPal Order:**
```bash
curl -X POST https://api.yourdomain.com/api/payments/paypal/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer DEIN_JWT_TOKEN" \
  -d '{
    "amount": "25.99",
    "currency": "EUR",
    "description": "Test PayPal Order"
  }'
```

**Erwartete Antwort:**
```json
{
  "orderId": "XXXXXXXXXXXXXXXXX",
  "approveUrl": "https://www.paypal.com/checkoutnow?token=XXXXXXXXXXXXXXXXX"
}
```

### 4.3 Webhook Tests

**Teste Stripe Webhook:**
```bash
# Simuliere Webhook-Empfang
curl -X POST https://api.yourdomain.com/api/payments/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: test_signature" \
  -d '{
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_test_123",
        "amount": 2599,
        "currency": "eur"
      }
    }
  }'
```

---

## 5. 🔐 SECURITY CHECKS

### 5.1 API Keys Sicherheit

**✅ Was du tun musst:**
- [ ] API Keys niemals in Git committen
- [ ] Keys nur in Produktions-ENV-Dateien speichern
- [ ] Restricted Keys verwenden (nicht volle Berechtigung)
- [ ] Keys regelmäßig rotieren (alle 6-12 Monate)

**✅ Stripe Security:**
- [ ] Webhook Endpoint verwendet HTTPS
- [ ] Webhook Secret ist sicher gespeichert
- [ ] IP Whitelisting für Webhooks aktivieren

**✅ PayPal Security:**
- [ ] API Credentials nur in Production verwenden
- [ ] Webhook Signature Verification aktiv
- [ ] Sandbox für Tests, Live für Production

---

## 6. 📊 MONITORING EINRICHTEN

### 6.1 Stripe Dashboard Monitoring

**Aktiviere Benachrichtigungen:**
```
Gehe zu: Settings → Notifications

Aktiviere:
- Failed payment notifications
- Chargeback notifications
- Account security alerts
- Payout notifications
```

### 6.2 PayPal Monitoring

**Webhook Monitoring:**
```
Gehe zu: Developer → Webhooks → Recent Events
Überwache erfolgreiche Webhook-Zustellungen
```

### 6.3 Application Monitoring

**Payment Fehler Tracking:**
```typescript
// backend/src/modules/payment/payment.service.ts
try {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'eur',
    // ...
  });

  // Success logging
  this.logger.log(`Payment created: ${paymentIntent.id}`, 'Payment');

} catch (error) {
  // Error tracking
  this.logger.error(`Payment failed: ${error.message}`, error.stack, 'Payment');

  // Sentry alert
  Sentry.captureException(error, {
    tags: { payment_provider: 'stripe' }
  });
}
```

---

## 7. 🚨 TROUBLESHOOTING

### Problem: Stripe Webhook nicht empfangen
```
✅ Lösung:
1. Webhook URL prüfen: https://api.yourdomain.com/api/payments/webhooks/stripe
2. SSL-Zertifikat prüfen: curl -I https://api.yourdomain.com
3. Webhook Secret prüfen in ENV-Datei
4. Stripe Dashboard → Webhooks → Resend failed events
```

### Problem: PayPal API Fehler
```
✅ Lösung:
1. API Credentials prüfen (Live vs Sandbox)
2. Webhook URL prüfen: https://api.yourdomain.com/api/payments/webhooks/paypal
3. PayPal Dashboard → API Calls → View logs
```

### Problem: CORS Errors bei Payments
```
✅ Lösung:
1. ALLOWED_ORIGINS prüfen: https://yourdomain.com,https://api.yourdomain.com
2. Frontend API_URL prüfen: VITE_API_URL=https://api.yourdomain.com/api
3. Browser Console auf CORS-Fehler prüfen
```

---

## 8. 💰 KOSTEN & GEBÜHREN

### Stripe Gebühren (Europa):
- **Domestic Cards:** 1.4% + 25¢ per Transaction
- **International Cards:** 2.9% + 25¢ per Transaction
- **Currency Conversion:** 1% (falls zutreffend)

### PayPal Gebühren (Europa):
- **Domestic Payments:** 2.9% + 0.35€
- **International Payments:** 3.9% + 0.35€
- **Currency Conversion:** 2.99-4.99%

### Beispiel für 25€ Bestellung:
- **Stripe:** ~0.60€ (inkl. Fixed Fee)
- **PayPal:** ~0.96€ (inkl. Fixed Fee)
- **Net Profit:** ~23.44€ (Stripe) / ~23.09€ (PayPal)

---

## 9. ✅ FINAL CHECKLIST

### Stripe Production:
- [ ] Live Mode aktiviert
- [ ] Restricted API Keys erstellt
- [ ] Webhook Endpoint konfiguriert
- [ ] Bankkonto verknüpft
- [ ] Apple Pay domain verified
- [ ] Business Profil vollständig

### PayPal Production:
- [ ] Live Mode aktiviert
- [ ] API Credentials erstellt
- [ ] Webhook konfiguriert
- [ ] Business Profil vervollständigt
- [ ] Express Checkout aktiviert

### Configuration:
- [ ] production.env aktualisiert
- [ ] frontend-production.env aktualisiert
- [ ] API Keys getestet
- [ ] Webhooks funktionieren

### Security:
- [ ] Keys sicher gespeichert
- [ ] HTTPS überall aktiv
- [ ] Monitoring eingerichtet

---

## 🎯 NÄCHSTER SCHRITT

Nach erfolgreichem Payment Setup:
1. ✅ `./test-payments.sh` ausführen
2. ✅ `./launch-production.sh` starten
3. 🚀 **GO-LIVE mit vollständiger Payment Integration!**

---

**Payment Services sind das Herzstück deines Business!**
Stelle sicher, dass alles korrekt konfiguriert ist, bevor du live gehst.

**Bei Fragen: Stripe/PayPal Support kontaktiere oder Dokumentation konsultieren.**