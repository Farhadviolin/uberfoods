# 🚀 UberFoods - Komplettes Setup

## ⚡ Schnellstart (5 Minuten)

### Automatisches Setup
```bash
# Führe alles automatisch aus
./scripts/master-setup.sh
```

### Manuelles Setup
```bash
# 1. Backend
cd backend
cp ENV.example .env
npm install
npm run setup:check

# 2. Frontend
cd ../frontend/customer-web
cp ENV.example .env
npm install
npm run setup:validate-env
```

---

## 📋 Verfügbare Scripts

### Backend (`backend/`)
```bash
npm run setup:check              # Prüft Setup-Status
npm run setup:validate-env       # Validiert Environment-Variablen
npm run setup:generate-vapid    # Generiert VAPID Keys
npm run setup:check-services     # Prüft alle Services
```

### Frontend (`frontend/customer-web/`)
```bash
npm run setup:validate-env       # Validiert Environment-Variablen
```

### Root (`scripts/`)
```bash
./scripts/master-setup.sh        # Master Setup (alles auf einmal)
./scripts/test-all-services.sh    # Testet alle Services
```

---

## 📖 Dokumentation

- 🤖 [Automatisiertes Setup](AUTOMATED_SETUP.md) - Scripts & Tools
- 📖 [Production Setup Guide](PRODUCTION_SETUP.md) - Detaillierte Anleitung
- ⚡ [Quick Start](QUICK_START_PRODUCTION.md) - 5-Minuten Setup
- ✅ [100% Complete](100_PERCENT_COMPLETE.md) - Finale Checkliste
- 🎉 [Final Status](FINAL_STATUS.md) - Finaler Status

---

## ✅ Status

- **Code**: 100% implementiert ✅
- **Konfiguration**: Templates erstellt ✅
- **Scripts**: Automatisierung implementiert ✅
- **Dokumentation**: Vollständig ✅

**Nach Setup der externen Services: 100% funktionsfähig!** 🚀

