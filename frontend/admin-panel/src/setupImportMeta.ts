// Mock import.meta für Jest Tests
// Diese Datei wird vor allen anderen ausgeführt

// Sicherstellen, dass globalThis verfügbar ist
if (typeof globalThis === 'undefined') {
  (global as any).globalThis = global;
}

// Mock für Vite's import.meta
const mockImportMeta = {
      env: {
        DEV: true,
        PROD: false,
    SSR: false,
        VITE_API_URL: 'http://localhost:3000',
        MODE: 'development',
    // Add any other env vars your code uses
  },
};

// Set on globalThis
Object.defineProperty(globalThis, 'import', {
  value: { meta: mockImportMeta },
  writable: true,
  configurable: true,
});

// Also set on global for Node.js compatibility
Object.defineProperty(global, 'import', {
  value: { meta: mockImportMeta },
  writable: true,
  configurable: true,
});

