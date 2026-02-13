// Mock import.meta für Jest Tests
// Diese Datei wird vor allen Tests ausgeführt

// Erstelle Mock-Objekt für import.meta.env
const mockImportMeta = {
  env: {
    DEV: true,
    PROD: false,
    VITE_API_BASE_URL: 'http://localhost:3000/api',
    VITE_WS_URL: 'http://localhost:3000',
    VITE_APP_NAME: 'UberFoods',
    VITE_SENTRY_DSN: '',
    VITE_LOGROCKET_APP_ID: '',
    MODE: 'development',
  },
};

// Mock für Vite's import.meta.env
// Verwende Object.defineProperty für globalThis
Object.defineProperty(globalThis, 'import', {
  value: { meta: mockImportMeta },
  writable: true,
  configurable: true,
});

// Auch für global (Node.js)
if (typeof (global as any).import === 'undefined') {
  (global as any).import = { meta: mockImportMeta };
}

// Mock für window (falls vorhanden)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'import', {
    value: { meta: mockImportMeta },
    writable: true,
    configurable: true,
  });
}

