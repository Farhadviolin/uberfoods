# Webhook Testing Guide

## Payment Webhooks

### Test Mode

Für lokale Tests und CI können Webhook-Verifikationen übersprungen werden:

```bash
export PAYMENT_WEBHOOK_TEST_MODE=true
export PAYPAL_WEBHOOK_TEST_MODE=true
export NODE_ENV=test
```

### Stripe Webhook Testing

1. **Lokaler Test mit Stripe CLI:**
```bash
stripe listen --forward-to localhost:3000/api/payment/webhooks/stripe
```

2. **Test-Event senden:**
```bash
stripe trigger payment_intent.succeeded
```

3. **Webhook-Secret setzen:**
```bash
export STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET_PLACEHOLDER...
```

### PayPal Webhook Testing

1. **Sandbox-Webhook konfigurieren:**
   - PayPal Developer Dashboard → Webhooks
   - URL: `https://your-domain.com/api/payment/webhooks/paypal`
   - Events: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`

2. **Test-Modus aktivieren:**
```bash
export PAYPAL_WEBHOOK_TEST_MODE=true
```

### Apple Pay / Google Pay

Diese werden typischerweise über Stripe gehandhabt. Für direkte Integration:
- Apple: Merchant ID in `APPLE_MERCHANT_ID` setzen
- Google: Merchant ID in `GOOGLE_PAY_MERCHANT_ID` setzen

## Production

In Production (`NODE_ENV=production`) werden Test-Bypasses automatisch deaktiviert. Webhook-Signaturen müssen gültig sein.
