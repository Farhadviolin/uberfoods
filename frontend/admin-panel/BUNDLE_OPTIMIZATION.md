# 📊 Bundle-Optimierung & Analyse - Admin Panel

**Erstellt:** 2025-01-27  
**Status:** 📋 Anleitung & Best Practices

---

## 🎯 Übersicht

Anleitung zur Bundle-Analyse und weiteren Optimierungen.

---

## 📦 Bundle-Analyse durchführen

### 1. Vite Bundle Analyzer Setup

```bash
# Install
npm install --save-dev rollup-plugin-visualizer

# In vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    // ... andere plugins
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html',
    }),
  ],
});
```

### 2. Build mit Analyse

```bash
npm run build
# Öffnet automatisch stats.html im Browser
```

### 3. Analyse-Ergebnisse interpretieren

**Wichtige Metriken:**
- **Bundle Size** - Gesamtgröße
- **Chunk Size** - Größe einzelner Chunks
- **Gzip Size** - Komprimierte Größe
- **Brotli Size** - Noch besser komprimiert

---

## 🔧 Optimierungs-Strategien

### 1. Tree-Shaking

**Problem:** Unbenutzter Code wird mitgebundelt

**Lösung:**
```typescript
// ✅ Gut: Named Imports
import { format, parseISO } from 'date-fns';

// ❌ Schlecht: Default Import (importiert alles)
import dateFns from 'date-fns';
```

### 2. Dynamic Imports

**Problem:** Große Libraries werden sofort geladen

**Lösung:**
```typescript
// ✅ Gut: Dynamic Import
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// ❌ Schlecht: Static Import
import HeavyComponent from './HeavyComponent';
```

### 3. Code-Splitting

**Problem:** Alles in einem Bundle

**Lösung:**
```typescript
// ✅ Gut: Lazy Loading
const Dashboard = lazy(() => import('./Dashboard'));

// ❌ Schlecht: Alle Komponenten sofort laden
import Dashboard from './Dashboard';
```

---

## 📊 Aktuelle Bundle-Struktur

### Main Bundle (~400 KB)

- React + React-DOM
- React Router (falls verwendet)
- Axios
- Shared Utilities

### Feature Chunks

- **Dashboard:** ~150 KB
- **Management:** ~200-300 KB pro Chunk
- **Advanced Features:** ~300-500 KB pro Chunk
- **Accounting:** ~400-600 KB pro Chunk

---

## 🎯 Optimierungs-Ziele

### Bundle Size

- **Initial Bundle:** < 500 KB (gzipped)
- **Total Bundle:** < 2 MB (gzipped)
- **Chunk Size:** < 300 KB (gzipped)

### Load Performance

- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3s
- **Largest Contentful Paint:** < 2.5s

---

## 🔍 Identifizierte Optimierungen

### 1. Duplicate Dependencies

**Problem:** Gleiche Library mehrfach gebundelt

**Lösung:**
```json
// package.json
{
  "resolutions": {
    "lodash": "^4.17.21"
  }
}
```

### 2. Large Dependencies

**Problem:** Schwere Libraries (z.B. Chart.js, Leaflet)

**Lösung:**
- Lazy Loading
- Alternative leichtere Libraries
- Custom Implementierungen

### 3. Unused Code

**Problem:** Importierter aber ungenutzter Code

**Lösung:**
- Tree-Shaking aktivieren
- Named Imports verwenden
- Unused Code entfernen

---

## 📋 Checkliste

### Bundle-Analyse

- [ ] Bundle-Analyzer installiert
- [ ] Build mit Analyse durchgeführt
- [ ] Große Chunks identifiziert
- [ ] Duplicate Dependencies gefunden
- [ ] Unused Code identifiziert

### Optimierungen

- [ ] Tree-Shaking aktiviert
- [ ] Dynamic Imports implementiert
- [ ] Code-Splitting optimiert
- [ ] Large Dependencies optimiert
- [ ] Unused Code entfernt

---

## 🚀 Weitere Optimierungen

### 1. Preloading

```typescript
// Preload kritische Chunks
<link rel="preload" href="/chunks/dashboard.js" as="script" />
```

### 2. Service Worker Caching

```typescript
// Cache Chunks für Offline-Nutzung
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/chunks/')) {
    event.respondWith(
      caches.match(event.request)
    );
  }
});
```

### 3. HTTP/2 Server Push

```nginx
# Nginx Config
location /chunks/dashboard.js {
  http2_push /chunks/dashboard.js;
}
```

---

## 📚 Tools & Ressourcen

### Bundle-Analyzer

- [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer)
- [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- [source-map-explorer](https://github.com/danvk/source-map-explorer)

### Performance-Tools

- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WebPageTest](https://www.webpagetest.org/)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)

---

**Status:** 📋 Anleitung bereit  
**Nächste Schritte:** Bundle-Analyse durchführen, Optimierungen umsetzen

