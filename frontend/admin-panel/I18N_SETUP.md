# 🌍 Internationalisierung (i18n) - Setup Guide

**Erstellt:** 2025-01-27  
**Status:** 📋 Setup-Anleitung

---

## 📦 Installation

```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

---

## 🏗️ Struktur

```
src/
├── i18n/
│   ├── config.ts          # i18next Konfiguration
│   ├── locales/
│   │   ├── de/
│   │   │   └── translation.json
│   │   ├── en/
│   │   │   └── translation.json
│   │   └── fr/
│   │       └── translation.json
│   └── index.ts           # i18n Export
```

---

## ⚙️ Konfiguration

### `src/i18n/config.ts`

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import de from './locales/de/translation.json';
import en from './locales/en/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      en: { translation: en },
    },
    fallbackLng: 'de',
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
```

### `src/i18n/locales/de/translation.json`

```json
{
  "common": {
    "save": "Speichern",
    "cancel": "Abbrechen",
    "delete": "Löschen",
    "edit": "Bearbeiten",
    "create": "Erstellen",
    "search": "Suchen",
    "filter": "Filtern",
    "loading": "Wird geladen...",
    "error": "Fehler",
    "success": "Erfolgreich"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "restaurants": "Restaurants",
    "orders": "Bestellungen",
    "customers": "Kunden",
    "drivers": "Fahrer"
  },
  "dashboard": {
    "title": "Dashboard",
    "totalOrders": "Gesamt Bestellungen",
    "totalRevenue": "Gesamtumsatz",
    "activeOrders": "Aktive Bestellungen"
  }
}
```

### `src/i18n/locales/en/translation.json`

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "search": "Search",
    "filter": "Filter",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "restaurants": "Restaurants",
    "orders": "Orders",
    "customers": "Customers",
    "drivers": "Drivers"
  },
  "dashboard": {
    "title": "Dashboard",
    "totalOrders": "Total Orders",
    "totalRevenue": "Total Revenue",
    "activeOrders": "Active Orders"
  }
}
```

---

## 🔌 Integration

### `src/main.tsx`

```typescript
import './i18n/config';
// ... rest of imports
```

### Verwendung in Komponenten

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t, i18n } = useTranslation();

  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <button onClick={() => i18n.changeLanguage('en')}>
        English
      </button>
      <button onClick={() => i18n.changeLanguage('de')}>
        Deutsch
      </button>
    </div>
  );
}
```

---

## 🎯 Migration Strategy

### Schritt 1: Setup
1. Dependencies installieren
2. i18n-Konfiguration erstellen
3. Basis-Übersetzungen (de, en) erstellen

### Schritt 2: Komponenten migrieren
1. Sidebar (Navigation)
2. Dashboard
3. Forms (Login, Create/Edit)
4. Error Messages

### Schritt 3: Vollständige Migration
- Alle Hardcoded-Strings durch `t()` ersetzen
- Date-Formatierung mit i18n
- Number-Formatierung mit i18n

---

## 📝 Best Practices

1. **Namespace:** Verwende Namespaces für große Features
2. **Keys:** Verwende hierarchische Keys (`dashboard.title`)
3. **Pluralization:** Nutze i18next Pluralization
4. **Interpolation:** Nutze Variablen für dynamische Werte
5. **Date/Time:** Nutze `date-fns` mit i18n Locale

---

## 🚀 Nächste Schritte

1. ✅ Setup-Anleitung erstellt
2. ⏳ Dependencies installieren
3. ⏳ Basis-Konfiguration implementieren
4. ⏳ Erste Komponenten migrieren
5. ⏳ Vollständige Migration

---

**Status:** 📋 Setup-Anleitung bereit  
**Aufwand:** ~6-8 Stunden für vollständige Migration

