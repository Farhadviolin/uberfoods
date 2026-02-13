import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { splitVendorChunkPlugin } from 'vite';

export default defineConfig(({ mode }) => ({
  // Ensure SPA semantics (history fallback behavior expected)
  appType: 'spa',
  plugins: [
    react(),
    splitVendorChunkPlugin(),
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
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks (function form)
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // Router
            if (id.includes('react-router-dom')) {
              return 'router-vendor';
            }
            // Query
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            // UI Libraries
            if (id.includes('lucide-react') || id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            // Maps
            if (id.includes('@react-google-maps') || id.includes('leaflet')) {
              return 'maps-vendor';
            }
            // Payment
            if (id.includes('@stripe')) {
              return 'payment-vendor';
            }
            // Charts
            if (id.includes('chart.js') || id.includes('recharts')) {
              return 'charts-vendor';
            }
            // Forms
            if (id.includes('react-hook-form') || id.includes('zod')) {
              return 'forms-vendor';
            }
            // Date utilities
            if (id.includes('date-fns')) {
              return 'date-vendor';
            }
            // Animations
            if (id.includes('framer-motion')) {
              return 'animation-vendor';
            }
            // Utils
            if (id.includes('lodash') || id.includes('clsx')) {
              return 'utils-vendor';
            }
            // AI/ML
            if (id.includes('tensorflow')) {
              return 'ai-vendor';
            }
            // Default vendor chunk für den Rest
            return 'vendor';
          }
        },
      },
    },
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