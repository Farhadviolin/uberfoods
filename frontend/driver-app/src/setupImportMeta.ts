// Mock import.meta für Jest Tests
// Diese Datei wird vor allen Tests ausgeführt

// Mock import.meta for Jest
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        DEV: true,
        PROD: false,
        VITE_API_URL: 'http://localhost:3000',
        MODE: 'development',
      },
    },
  },
  writable: false,
});

