import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  // Ensure SPA semantics (history fallback behavior expected)
  appType: 'spa',
  define: {
    'globalThis.__UBERFOODS_BUILD_IS_PRODUCTION__': JSON.stringify(mode === 'production'),
    'globalThis.__UBERFOODS_BUILD_API_BASE_URL__': JSON.stringify(process.env.VITE_API_BASE_URL || ''),
  },
  plugins: [
    react(),
    customerApiCsp(process.env.VITE_API_BASE_URL),
    ...(mode === 'e2e' ? [spaFallbackE2E()] : []),
  ],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_E2E_MOCK === 'true'
          ? 'http://127.0.0.1:3001'  // Mock server port
          : (process.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000/api').replace(/\/api\/?$/, ''),  // Real backend
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.VITE_E2E_MOCK === 'true'
          ? 'http://127.0.0.1:3001'  // Mock server port (would need WebSocket mock if needed)
          : (process.env.VITE_WS_URL || process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, '') || 'http://127.0.0.1:3000').replace(/\/socket\.io\/?$/, '').replace(/^ws:\/\//, 'http://'),  // Real backend
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // Reduce bundle size
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
    ],
  },
}));

function customerApiCsp(apiBaseUrl?: string): Plugin {
  return {
    name: 'customer-api-csp',
    transformIndexHtml(html) {
      let apiOrigin = '';
      if (apiBaseUrl?.trim()) {
        try {
          apiOrigin = new URL(apiBaseUrl.trim()).origin;
        } catch {
          apiOrigin = '';
        }
      }

      return html.replace('__UBERFOODS_API_CSP_ORIGIN__', apiOrigin);
    },
  };
}

function spaFallbackE2E(): Plugin {
  return {
    name: 'spa-fallback-e2e',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const method = (req.method || 'GET').toUpperCase();
        if (method !== 'GET') return next();

        const rawUrl = req.url || '/';
        const url = rawUrl.split('?')[0];

        // Never touch API routes or Vite internal / asset routes
        if (
          url === '/' ||
          url.startsWith('/api') ||
          url.startsWith('/@') ||
          url.startsWith('/__') ||
          url.startsWith('/src') ||
          url.startsWith('/node_modules') ||
          url === '/favicon.ico'
        ) {
          return next();
        }

        // Only rewrite HTML navigations (BrowserRouter deep links)
        const accept = String(req.headers.accept || '');
        if (!accept.includes('text/html')) return next();

        // If it looks like a file request, do not rewrite
        if (url.includes('.')) return next();

        req.url = '/';
        return next();
      });
    },
  };
}
