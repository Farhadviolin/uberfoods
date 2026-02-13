import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    // Bundle-Analyse deaktiviert (rollup-plugin-visualizer nicht installiert)
    // Um zu aktivieren: npm install -D rollup-plugin-visualizer
  ],
  server: {
    port: 3004,
    strictPort: false, // Erlaube automatischen Port-Wechsel wenn 3004 belegt
    host: true, // Erlaubt externe Verbindungen
    // ✅ WICHTIG: HMR komplett deaktiviert - verhindert Port-Jumping
    // HMR kann zu Reload-Loops führen, besonders bei WebSocket-Verbindungen
    // Bei Änderungen: Manuelles Reload erforderlich (F5)
    hmr: false,
    watch: {
      // Reduziere Watch-Optionen um weniger Reloads zu verursachen
      usePolling: false, // Deaktiviere Polling (kann zu vielen Reloads führen)
      interval: 1000, // Polling-Interval wenn aktiviert
      ignored: [
        '**/node_modules/**', 
        '**/.git/**', 
        '**/dist/**', 
        '**/build/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/__tests__/**',
      ], // Ignoriere große Verzeichnisse und Test-Dateien
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false, // Für Development
        ws: false, // Kein WebSocket für API
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true, // WebSocket Support
        secure: false, // Für Development
        // WICHTIG: WebSocket Proxy sollte nicht auf /socket.io/* matchen, sondern nur /socket.io
        rewrite: (path) => path, // Keine Rewrite für Socket.IO
      },
    },
  },
});

