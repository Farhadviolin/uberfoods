# 🍽️ UberFoods Restaurant Web App

**Restaurant-Management-Dashboard für die UberFoods Delivery Platform**

[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.0-purple)](https://vitejs.dev)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)](https://github.com)

---

## 🚀 Quick Start

### Localhost Setup (3 Schritte)

```bash
# 1. Backend starten (separates Terminal)
cd ../backend
npm run start:dev

# 2. Restaurant-Web Setup (einmalig)
cd frontend/restaurant-web
npm install

# 3. Restaurant-Web starten
npm run dev
```

**Öffne:** http://localhost:3003

---

## 📋 Inhaltsverzeichnis

- [Features](#-features)
- [Technologie-Stack](#-technologie-stack)
- [Installation](#-installation)
- [Konfiguration](#-konfiguration)
- [Development](#-development)
- [Testing](#-testing)
- [Production Build](#-production-build)
- [API Integration](#-api-integration)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

### 🍳 Küchen-Management

- **Live Kitchen Display** - Echtzeit-Bestellübersicht mit Timer
- **Order Management** - Bestellungen annehmen, ablehnen, status updates
- **Preparation Tracking** - Kochzeiten überwachen und optimieren
- **Staff Assignment** - Automatische oder manuelle Zuweisung von Bestellungen

### 📊 Analytics & Insights

- **Revenue Analytics** - Umsatzverfolgung und Trends
- **Popular Dishes** - Beliebteste Gerichte und Kategorien
- **Performance Metrics** - Zubereitungszeiten und Effizienz
- **Customer Ratings** - Bewertungen und Feedback-Analyse

### 💰 Finanz-Management

- **Einnahmen-Verfolgung** - Tägliche, wöchentliche und monatliche Umsätze
- **Ausgaben-Management** - Zutatenkosten und Betriebskosten tracken
- **Steuerberichte** - Automatische EA-Rechnung Generierung
- **Payout-Verfolgung** - Restaurant-Auszahlungen überwachen

### 👥 Team-Management

- **Staff Scheduling** - Schichtplanung und Arbeitszeiten
- **Performance Tracking** - Mitarbeiter-Performance messen
- **Access Control** - Rollenbasierte Berechtigungen
- **Communication** - Team-Chat und Benachrichtigungen

### 🔧 Betriebs-Management

- **Inventory Control** - Lagerbestände verwalten
- **Menu Management** - Speisekarte bearbeiten und optimieren
- **Operating Hours** - Öffnungszeiten verwalten
- **Delivery Zones** - Liefergebiete konfigurieren

---

## 🛠️ Technologie-Stack

### Frontend Framework
- **React 18** - Modernes UI-Framework mit Hooks
- **TypeScript** - Type-Sichere Entwicklung
- **Vite** - Schneller Build-Tool und Dev-Server

### State Management
- **React Query** - Server-State-Management
- **Context API** - Client-State-Management
- **Local Storage** - Persistente Daten

### UI/UX
- **Tailwind CSS** - Utility-First CSS Framework
- **Radix UI** - Accessible Component Library
- **Lucide Icons** - Konsistente Icon-Sammlung
- **Responsive Design** - Mobile-First Ansatz

### Development Tools
- **ESLint** - Code Quality
- **Prettier** - Code Formatting
- **Vitest** - Unit Testing
- **React Testing Library** - Component Testing

---

## 📦 Installation

### Voraussetzungen

- **Node.js** 18+
- **npm** oder **yarn**
- **Backend** muss laufen (siehe Backend-README)

### Schritt-für-Schritt Installation

1. **Repository klonen**
   ```bash
   git clone <repository-url>
   cd frontend/restaurant-web
   ```

2. **Dependencies installieren**
   ```bash
   npm install
   ```

3. **Environment konfigurieren**
   ```bash
   cp .env.example .env
   # Bearbeite .env mit deinen Werten
   ```

4. **Development-Server starten**
   ```bash
   npm run dev
   ```

---

## ⚙️ Konfiguration

### Environment Variables

Erstelle eine `.env` Datei:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api

# App Configuration
VITE_APP_TITLE=UberFoods Restaurant
VITE_APP_VERSION=1.0.0

# Authentication
VITE_AUTO_LOGIN=false
VITE_SKIP_AUTH=false

# Features
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_CHAT=true

# PWA
VITE_PWA_ENABLED=false
```

### Build-Konfiguration

```javascript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

---

## 🧪 Testing

### Unit Tests

```bash
# Alle Tests ausführen
npm test

# Tests mit Coverage
npm run test:coverage

# Tests im Watch-Modus
npm run test:watch
```

### E2E Tests

```bash
# E2E Tests (benötigt laufendes Backend)
npm run test:e2e
```

### Test-Struktur

```
src/
├── components/
│   ├── __tests__/          # Component Tests
│   └── ...
├── hooks/
│   ├── __tests__/          # Hook Tests
│   └── ...
├── utils/
│   ├── __tests__/          # Utility Tests
│   └── ...
└── services/
    ├── __tests__/          # Service Tests
    └── ...
```

---

## 🚀 Production Build

### Build erstellen

```bash
# Production Build
npm run build

# Build analysieren
npm run build:analyze
```

### Deployment

```bash
# Statische Dateien bereitstellen
npm run preview

# Oder mit eigenem Server
npm run start
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3003
CMD ["npm", "run", "start"]
```

---

## 🔌 API Integration

### Backend-Endpoints

Die App integriert mit folgenden Backend-Modulen:

- **Authentication** - Restaurant Login/Logout
- **Orders** - Bestell-Management
- **Menu** - Speisekarten-Verwaltung
- **Analytics** - Berichte und Statistiken
- **Financial** - Finanzdaten und Auszahlungen
- **Staff** - Mitarbeiter-Management
- **Inventory** - Lager-Verwaltung
- **Settings** - Restaurant-Einstellungen

### API Client

```typescript
// src/services/api.ts
import { createApiClient } from '../utils/apiClient';

export const api = createApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});
```

---

## 🔧 Troubleshooting

### Häufige Probleme

**1. Backend-Verbindung fehlt**
```
Error: connect ECONNREFUSED 127.0.0.1:3000
```
**Lösung:** Stelle sicher, dass das Backend läuft
```bash
cd ../backend
npm run start:dev
```

**2. Authentication-Fehler**
```
Error: 401 Unauthorized
```
**Lösung:** Überprüfe JWT-Token und API-Keys

**3. Build-Fehler**
```
Error: Cannot resolve dependency
```
**Lösung:** Dependencies neu installieren
```bash
rm -rf node_modules package-lock.json
npm install
```

**4. CORS-Fehler**
```
Access to XMLHttpRequest blocked by CORS policy
```
**Lösung:** Backend CORS-Konfiguration überprüfen

---

## 📱 Mobile Responsiveness

Die App ist vollständig responsive und funktioniert auf:

- **Desktop** - Vollständige Funktionalität
- **Tablet** - Optimierte Touch-Bedienung
- **Mobile** - Essentielle Features verfügbar

---

## 🔐 Sicherheit

### Authentication
- JWT-Token basierte Authentifizierung
- Automatic Token Refresh
- Secure Cookie Storage

### Authorization
- Rollenbasierte Berechtigungen
- API-Level Security
- Input Validation

### Data Protection
- HTTPS Only in Production
- Sensitive Data Encryption
- GDPR Compliance

---

## 📊 Performance

### Optimierungen

- **Code Splitting** - Lazy Loading von Routes
- **Image Optimization** - WebP Format, Lazy Loading
- **Caching** - React Query für API-Calls
- **Bundle Analysis** - Build-Größe überwachen

### Metriken

- **First Contentful Paint:** < 1.5s
- **Largest Contentful Paint:** < 2.5s
- **Bundle Size:** < 500KB (gzipped)

---

## 🤝 Contributing

1. Fork das Repository
2. Erstelle einen Feature-Branch
3. Commit deine Änderungen
4. Push zum Branch
5. Erstelle einen Pull Request

### Code Style

- **ESLint** und **Prettier** werden automatisch ausgeführt
- **TypeScript Strict Mode** aktiviert
- **Conventional Commits** für Commit-Messages

---

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert.

---

## 📞 Support

Bei Fragen oder Problemen:

- **Issues:** GitHub Issues
- **Documentation:** `/docs` Ordner
- **Wiki:** Projekt-Wiki

---

**🚀 Viel Erfolg mit der UberFoods Restaurant-Web-App!**

