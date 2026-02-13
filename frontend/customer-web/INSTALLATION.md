# 🚀 Installation & Setup Guide

## Schnellstart

### 1. Dependencies installieren

```bash
cd frontend/customer-web
npm install
```

### 2. Umgebungsvariablen konfigurieren

Erstellen Sie eine `.env` Datei im `frontend/customer-web/` Verzeichnis:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
VITE_APP_NAME=UberFoods

# Google Maps API Key
# Erhalten Sie einen API Key von: https://console.cloud.google.com/google/maps-apis
# Aktivieren Sie: Maps JavaScript API, Directions API, Geocoding API
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Stripe Publishable Key
# Erhalten Sie einen Key von: https://dashboard.stripe.com/apikeys
VITE_STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY_PLACEHOLDER

# VAPID Public Key für Web Push Notifications
# Generieren Sie Keys mit: npm install -g web-push && web-push generate-vapid-keys
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key_here
```

### 3. App starten

```bash
npm run dev
```

Die App läuft dann auf `http://localhost:3001`

---

## 📋 API Keys Setup

### Google Maps API Key

1. Gehen Sie zu [Google Cloud Console](https://console.cloud.google.com/)
2. Erstellen Sie ein neues Projekt oder wählen Sie ein bestehendes
3. Aktivieren Sie folgende APIs:
   - Maps JavaScript API
   - Directions API
   - Geocoding API
4. Erstellen Sie einen API Key unter "Credentials"
5. Fügen Sie den Key in `.env` ein

**Wichtig:** Für Production sollten Sie Domain-Restrictions setzen!

### Stripe API Key

1. Gehen Sie zu [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigieren Sie zu "Developers" > "API keys"
3. Kopieren Sie den "Publishable key" (beginnt mit `STRIPE_PUBLISHABLE_KEY_PLACEHOLDER_` oder `STRIPE_PUBLISHABLE_KEY_PLACEHOLDER_`)
4. Fügen Sie den Key in `.env` ein

**Wichtig:** 
- `STRIPE_PUBLISHABLE_KEY_PLACEHOLDER_` für Development/Testing
- `STRIPE_PUBLISHABLE_KEY_PLACEHOLDER_` für Production

### VAPID Keys für Push Notifications

1. Installieren Sie `web-push` global:
```bash
npm install -g web-push
```

2. Generieren Sie VAPID Keys:
```bash
web-push generate-vapid-keys
```

3. Kopieren Sie den "Public Key" in `.env`
4. Den "Private Key" benötigen Sie im Backend für das Senden von Push-Notifications

---

## 🔧 Backend Setup

### Payment Gateway Endpoints

Ihr Backend muss folgende Endpoints implementieren:

```typescript
// Payment Intent erstellen
POST /payments/create-intent
Body: { orderId: string, amount: number }
Response: { clientSecret: string }

// Zahlung bestätigen
POST /orders/:id/payment/confirm
Body: { paymentIntentId: string }

// Zahlungsmethode speichern
POST /payments/save-method
Body: { paymentIntentId: string }

// Gespeicherte Methoden laden
GET /customers/me/payment-methods
Response: PaymentMethod[]
```

### Push Notification Endpoints

```typescript
// Push Subscription registrieren
POST /notifications/subscribe
Body: PushSubscription (JSON)

// Push Subscription entfernen
POST /notifications/unsubscribe
Body: PushSubscription (JSON)
```

### Reviews Endpoints

```typescript
// Reviews laden
GET /reviews/restaurant/:id
Response: Review[]

// Review erstellen
POST /reviews
Body: FormData { restaurantId, rating, comment, images[] }
Response: Review
```

---

## ✅ Verifizierung

Nach der Installation können Sie prüfen:

1. **Google Maps:** Öffnen Sie eine Restaurant-Details-Seite - Karte sollte angezeigt werden
2. **Stripe:** Versuchen Sie eine Bestellung aufzugeben - Stripe Elements sollte erscheinen
3. **Push Notifications:** Klicken Sie auf das Glockensymbol im Header - Notification Center öffnet sich
4. **Reviews:** Öffnen Sie ein Restaurant - Reviews-Sektion sollte funktionieren

---

## 🐛 Troubleshooting

### Google Maps zeigt Fehler
- Prüfen Sie ob API Key korrekt ist
- Prüfen Sie ob Maps JavaScript API aktiviert ist
- Prüfen Sie Browser-Konsole für Fehler

### Stripe Payment funktioniert nicht
- Prüfen Sie ob Publishable Key korrekt ist
- Prüfen Sie ob Backend-Endpoints implementiert sind
- Prüfen Sie Browser-Konsole für Fehler

### Push Notifications funktionieren nicht
- Prüfen Sie ob VAPID Key korrekt ist
- Prüfen Sie ob Service Worker registriert ist
- Prüfen Sie Browser-Berechtigungen

---

## 📚 Weitere Informationen

Siehe `CRITICAL_FEATURES_IMPLEMENTED.md` für detaillierte Dokumentation aller Features.

