# 🎯 Komplettes Setup-Guide - Schritt für Schritt

## 🚀 Option 1: Automatisches Setup (Empfohlen)

### Ein Befehl - Alles fertig!
```bash
./scripts/master-setup.sh
```

**Was passiert:**
1. ✅ Erstellt .env Dateien aus ENV.example
2. ✅ Installiert alle Dependencies
3. ✅ Generiert Prisma Client
4. ✅ Validiert Environment-Variablen
5. ✅ Generiert VAPID Keys (optional)
6. ✅ Prüft Upload-Verzeichnisse

**Dauer:** ~5-10 Minuten

---

## 📋 Option 2: Manuelles Setup

### Schritt 1: Backend Setup
```bash
cd backend

# 1. Environment-Variablen
cp ENV.example .env
nano .env  # Bearbeite und setze alle Werte

# 2. Dependencies installieren
npm install

# 3. Prisma Setup
npx prisma generate
npx prisma migrate deploy

# 4. Validierung
npm run setup:check
npm run setup:validate-env

# 5. VAPID Keys (optional)
npm run setup:generate-vapid
```

### Schritt 2: Frontend Setup
```bash
cd frontend/customer-web

# 1. Environment-Variablen
cp ENV.example .env
nano .env  # Bearbeite und setze alle Werte

# 2. Dependencies installieren
npm install

# 3. Validierung
npm run setup:validate-env
```

### Schritt 3: Externe Services
Folge der Anleitung in `PRODUCTION_SETUP.md`:
- Stripe Account erstellen
- Google Maps API Key generieren
- Email Service einrichten
- Cloud Storage konfigurieren
- Error Tracking einrichten

---

## ✅ Validierung

### Backend prüfen
```bash
cd backend

# Setup-Status
npm run setup:check

# Environment-Variablen
npm run setup:validate-env

# Services (wenn Backend läuft)
npm run setup:check-services
```

### Frontend prüfen
```bash
cd frontend/customer-web

# Environment-Variablen
npm run setup:validate-env
```

### Alle Services testen
```bash
# Starte Backend
cd backend
npm run start:dev

# In neuem Terminal
./scripts/test-all-services.sh
```

---

## 🧪 Test-Endpoints

Nach dem Start des Backends:

```bash
# Health Check
curl http://localhost:3000/api/health

# Config Check
curl http://localhost:3000/api/test/config

# Maps Test
curl http://localhost:3000/api/test/maps

# Storage Test (benötigt Auth)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/test/storage

# Email Test (benötigt Auth)
curl -X POST http://localhost:3000/api/test/email \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com"}'
```

---

## 📊 Checkliste

### Backend
- [ ] `.env` Datei erstellt
- [ ] `DATABASE_URL` gesetzt
- [ ] `JWT_SECRET` gesetzt (min. 32 Zeichen)
- [ ] `STRIPE_SECRET_KEY` gesetzt
- [ ] `GOOGLE_MAPS_API_KEY` gesetzt
- [ ] Email Service konfiguriert
- [ ] S3 Storage konfiguriert (optional)
- [ ] Sentry DSN gesetzt (optional)
- [ ] VAPID Keys generiert (optional)
- [ ] Dependencies installiert
- [ ] Prisma Client generiert
- [ ] Validierung erfolgreich

### Frontend
- [ ] `.env` Datei erstellt
- [ ] `VITE_API_URL` gesetzt
- [ ] `VITE_WS_URL` gesetzt
- [ ] `VITE_GOOGLE_MAPS_API_KEY` gesetzt
- [ ] `VITE_SENTRY_DSN` gesetzt (optional)
- [ ] Dependencies installiert
- [ ] Validierung erfolgreich

### Services
- [ ] Stripe Webhook konfiguriert
- [ ] Google Maps API Restrictions gesetzt
- [ ] S3 Bucket CORS konfiguriert
- [ ] Sentry Projects erstellt

---

## 🎉 Fertig!

Nach Abschluss aller Schritte:
- ✅ Code ist 100% implementiert
- ✅ Konfiguration ist vollständig
- ✅ Services sind getestet
- ✅ System ist production-ready!

**Viel Erfolg!** 🚀

