# 🎛️ UberFoods Admin Panel

**Enterprise-Grade Admin Dashboard für die UberFoods Delivery Platform**

[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)](https://github.com)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.0-purple)](https://vitejs.dev)

---

## 🚀 Quick Start

### Localhost Setup (3 Schritte)

```bash
# 1. Backend starten (separates Terminal)
cd backend
npm run start:dev

# 2. Admin Panel Setup (einmalig)
cd frontend/admin-panel
./setup-localhost.sh

# 3. Admin Panel starten
npm run dev
```

**Öffne:** http://localhost:3002

**Auto-Login:** Aktiviert (mit `VITE_SKIP_AUTH=true` in `.env`)

---

## 📋 Inhaltsverzeichnis

- [Features](#-features)
- [Installation](#-installation)
- [Konfiguration](#-konfiguration)
- [Development](#-development)
- [Testing](#-testing)
- [Production Build](#-production-build)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

### 🎯 Core Management

- **Dashboard** - Real-time Übersicht mit Metriken und Charts
- **Order Management** - Vollständige Bestellverwaltung mit Filterung
- **Driver Management** - Fahrer-Verwaltung mit Live-Tracking
- **Customer Management** - Kunden-Verwaltung mit Analytics
- **Restaurant Management** - Restaurant-CRUD mit Details

### 🆕 Neue Features (2025-12-09)

- **Wearables Management** - Wearable-Geräte-Verwaltung (Fitbit, Garmin, Apple Watch)
- **Vehicle Diagnostics** - Fahrzeug-Diagnostik mit OBD-II-Integration
- **Social Management** - Social Feed Management für Kunden-Posts
- **Table Management** - Tisch- und Reservierungsverwaltung
- **Kitchen Display Admin** - Küchen-Display Administration
- **Meal Planner** - Meal-Plan-Verwaltung mit Einkaufslisten
- **Group Orders** - Gruppen-Bestellungen Verwaltung
- **Statistics Center** - Zentrales Statistik-Dashboard
- **Supplier Management** - Lieferanten-Verwaltung

### 📊 Advanced Features

- **Financial Management** - Payouts, Invoices, Tax Reports
- **Analytics & Reporting** - Umfassende Datenanalyse
- **Marketing Management** - Campaigns, Promotions, Loyalty
- **Inventory Management** - Lagerverwaltung
- **RBAC Management** - Role-Based Access Control
- **Audit Logs** - Vollständige Aktivitäts-Protokolle

### 🔧 Enterprise Features

- **Multi-Tenancy** - Multi-Organisation Support
- **Automation** - Workflow-Automatisierung
- **Integrations Hub** - Third-Party Integrations
- **AI/ML Management** - Machine Learning Modelle
- **Monitoring Dashboard** - System Health & Performance
- **Emergency Dashboard** - Notfall-Management

### 🇦🇹 Austrian Compliance

- **GoBD Archiving** - Gesetzeskonforme Archivierung
- **Austrian Tax Module** - Steuer-Berechnungen
- **Austrian Payroll** - Lohnabrechnung
- **Cash Register Security** - Kassen-Sicherheit

---

## 📦 Installation

### Voraussetzungen

- Node.js 18+
- npm oder yarn
- Backend läuft auf `http://localhost:3000`

### Setup

```bash
# 1. Dependencies installieren
npm install

# 2. Environment-Variablen konfigurieren
cp .env.example .env
# Bearbeite .env nach Bedarf

# 3. Development Server starten
npm run dev
```

---

## ⚙️ Konfiguration

### Environment-Variablen (.env)

```env
# Development Auto-Login (optional)
VITE_SKIP_AUTH=true

# API URL (wird über Vite Proxy verwendet)
VITE_API_URL=http://localhost:3000

# WebSocket URL (optional)
VITE_WS_URL=http://localhost:3000

# App Name
VITE_APP_NAME=UberFoods Admin

# Andere Apps (für Deep-Links)
VITE_CUSTOMER_WEB_URL=http://localhost:3001
VITE_DRIVER_APP_URL=http://localhost:3004
VITE_RESTAURANT_WEB_URL=http://localhost:3003
```

**Wichtig:**
- `.env` Datei ist in `.gitignore` (wird nicht committed)
- Verwende `.env.example` als Template
- `VITE_SKIP_AUTH=true` funktioniert NUR in Development

### Vite Proxy

Das Admin Panel verwendet Vite Proxy für API-Calls:

```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  }
}
```

**Vorteile:**
- ✅ Keine CORS-Probleme
- ✅ Automatische Weiterleitung
- ✅ Keine manuelle API-URL-Konfiguration nötig

---

## 🔐 Authentifizierung

### Standard-Login

- **Email:** `admin@uberfoods.com`
- **Passwort:** `admin123`

### Development Auto-Login

Mit `VITE_SKIP_AUTH=true` in `.env`:

- Automatischer Login ohne Passwort
- Funktioniert NUR in Development
- Wird in Production automatisch blockiert

**Auto-Login deaktivieren:**
```bash
# In .env:
VITE_SKIP_AUTH=false
```

**Siehe auch:** [README_AUTH.md](./README_AUTH.md)

---

## 🛠️ Development

### Scripts

```bash
# Development Server
npm run dev

# Build für Production
npm run build

# Preview Production Build
npm run preview

# Type Checking
npm run type-check

# Linting
npm run lint

# Formatting
npm run format
```

### Projekt-Struktur

```
src/
├── components/      # React Components
├── hooks/           # Custom Hooks
├── contexts/        # React Contexts
├── utils/           # Utility Functions
├── config.ts        # App Configuration
└── App.tsx          # Main App Component
```

### Code-Splitting

Das Admin Panel verwendet Lazy Loading für optimale Performance:

- Core Components (Dashboard, Sidebar) - Sofort geladen
- Management Components - Lazy Loaded
- Heavy Components (Charts, Maps) - Lazy Loaded

---

## 🧪 Testing

### Unit Tests

```bash
# Alle Tests
npm test

# Mit Coverage
npm run test:coverage

# Watch Mode
npm run test:watch
```

### E2E Tests (Playwright)

```bash
# Alle E2E Tests
npm run test:e2e

# Mit UI
npm run test:e2e:ui

# Headed Mode
npm run test:e2e:headed
```

### API Tests

```bash
# Backend muss laufen
npm run test:api
```

**Siehe auch:** [TESTING.md](./TESTING.md)

---

## 🏗️ Production Build

```bash
# Build erstellen
npm run build

# Preview lokal testen
npm run preview
```

**Build-Output:** `dist/` Verzeichnis

**Deployment:**
- Statische Dateien können auf jeden Web-Server deployed werden
- Nginx-Konfiguration in `nginx.conf` vorhanden
- Dockerfile für Container-Deployment vorhanden

---

## 🌐 URLs

| Service | URL | Beschreibung |
|---------|-----|--------------|
| **Admin Panel** | http://localhost:3002 | Frontend |
| **Backend API** | http://localhost:3000/api | REST API |
| **Swagger Docs** | http://localhost:3000/api/docs | API Dokumentation |

---

## 🔧 Troubleshooting

### CORS-Fehler

**Problem:** `Access to XMLHttpRequest blocked by CORS policy`

**Lösung:**
1. Prüfe Backend `.env` enthält `ALLOWED_ORIGINS=http://localhost:3002`
2. Starte Backend neu nach `.env` Änderungen
3. Prüfe Vite Proxy in `vite.config.ts`

### API-Calls schlagen fehl

**Problem:** `Network Error` oder `404 Not Found`

**Lösung:**
1. Prüfe Backend läuft: `curl http://localhost:3000/api/health`
2. Prüfe Vite Proxy Konfiguration
3. Prüfe Browser-Konsole für detaillierte Fehler

### Auto-Login funktioniert nicht

**Problem:** Login-Seite wird angezeigt trotz `VITE_SKIP_AUTH=true`

**Lösung:**
1. Prüfe `.env` Datei existiert und enthält `VITE_SKIP_AUTH=true`
2. Starte Dev-Server neu: `npm run dev`
3. Lösche Browser-Cache und localStorage

### Port 3002 bereits belegt

**Problem:** `Error: Port 3002 is already in use`

**Lösung:**
```bash
# Prozess beenden
lsof -ti:3002 | xargs kill -9

# Oder anderen Port verwenden (in vite.config.ts)
```

**Siehe auch:** [LOCALHOST_SETUP.md](./LOCALHOST_SETUP.md)

---

## 📚 Dokumentation

### Core Dokumentation
- [LOCALHOST_SETUP.md](./LOCALHOST_SETUP.md) - Detaillierte Localhost-Anleitung
- [QUICK_START.md](./QUICK_START.md) - Schnellstart-Guide
- [README_AUTH.md](./README_AUTH.md) - Authentifizierung
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Vollständige API-Dokumentation
- [API_ENDPOINT_ANALYSE.md](./API_ENDPOINT_ANALYSE.md) - API-Endpunkte
- [TESTING.md](./TESTING.md) - Testing-Dokumentation

### Neue Komponenten (2025-12-09)
- [docs/NEW_COMPONENTS_DOCUMENTATION.md](./docs/NEW_COMPONENTS_DOCUMENTATION.md) - Component-Dokumentation
- [docs/USAGE_EXAMPLES.md](./docs/USAGE_EXAMPLES.md) - Praktische Beispiele
- [TEST_IMPLEMENTATION_REPORT.md](./TEST_IMPLEMENTATION_REPORT.md) - Test-Dokumentation
- [SECURITY_COMPLIANCE_REPORT.md](./SECURITY_COMPLIANCE_REPORT.md) - Security-Report

---

## 🏗️ Architektur

### Tech Stack

- **React 18** - UI Framework
- **TypeScript** - Type Safety
- **Vite 5** - Build Tool & Dev Server
- **React Query** - Data Fetching & Caching
- **Axios** - HTTP Client
- **Chart.js** - Data Visualization
- **React Router** - Navigation
- **Socket.IO Client** - WebSocket (aktuell deaktiviert)

### Design System

- Custom Design Tokens
- Dark Mode Support
- Responsive Design
- Accessibility (WCAG 2.1)

---

## 📊 Status

**Production-Ready:** ✅ Ja

- ✅ Alle Mock-Daten entfernt
- ✅ 100% Backend-Integration
- ✅ Echte Datenbank-Queries
- ✅ Error Handling implementiert
- ✅ TypeScript Strict Mode
- ✅ Testing Setup vorhanden

---

## 🤝 Contributing

1. Fork das Repository
2. Erstelle Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit Changes (`git commit -m 'Add AmazingFeature'`)
4. Push zu Branch (`git push origin feature/AmazingFeature`)
5. Öffne Pull Request

---

## 📝 License

MIT License - Siehe [LICENSE](../LICENSE) für Details

---

## 🆘 Support

Bei Problemen:
1. Prüfe [Troubleshooting](#-troubleshooting)
2. Prüfe [LOCALHOST_SETUP.md](./LOCALHOST_SETUP.md)
3. Prüfe Browser-Konsole (F12)
4. Prüfe Backend-Logs

---

**Erstellt:** 2025-01-27  
**Version:** 1.0.0  
**Status:** ✅ Production-Ready

