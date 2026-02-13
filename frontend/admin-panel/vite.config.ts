import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { splitVendorChunkPlugin } from 'vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    splitVendorChunkPlugin(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 3002,
    strictPort: true,
    proxy: {
      '/api': {
        target: mode === 'e2e' ? 'http://127.0.0.1:3102' : 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react') && (id.includes('react-dom') || id.endsWith('react/index.js'))) {
              return 'react-vendor';
            }
            // Router
            if (id.includes('react-router-dom')) {
              return 'router-vendor';
            }
            // React Query
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            // Charts
            if (id.includes('chart.js') || id.includes('recharts') || id.includes('d3')) {
              return 'charts-vendor';
            }
            // Tables
            if (id.includes('react-window')) {
              return 'tables-vendor';
            }
            // Forms
            if (id.includes('react-hook-form')) {
              return 'forms-vendor';
            }
            // Export libraries - separate PDF and Excel for better caching
            if (id.includes('jspdf') || id.includes('jspdf-autotable')) {
              return 'pdf-vendor';
            }
            if (id.includes('exceljs')) {
              return 'excel-vendor';
            }
            // Date
            if (id.includes('date-fns')) {
              return 'date-vendor';
            }
            // Animation
            if (id.includes('framer-motion')) {
              return 'animation-vendor';
            }
            // Utils
            if (id.includes('lodash') || id.includes('clsx')) {
              return 'utils-vendor';
            }
            // Maps
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'maps-vendor';
            }
            // WebSocket and real-time
            if (id.includes('socket.io-client')) {
              return 'websocket-vendor';
            }
            // Security and crypto
            if (id.includes('crypto-js') || id.includes('bcryptjs')) {
              return 'security-vendor';
            }
            // Default vendor
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1500,
    // Enable sourcemaps for production (required for Sentry error tracking)
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
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
}))