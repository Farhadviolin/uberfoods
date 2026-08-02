import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'fs';
import { resolve } from 'path';

const restaurantApiProxyTarget =
  process.env.RESTAURANT_API_PROXY_TARGET || 'http://localhost:3000';

// Plugin to copy service worker to public directory
const serviceWorkerPlugin = () => {
  return {
    name: 'service-worker',
    buildStart() {
      // Copy service worker to public during build
      copyFileSync(
        resolve(__dirname, 'src/service-worker.ts'),
        resolve(__dirname, 'public/service-worker.js')
      );
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    serviceWorkerPlugin(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;
          if (id.includes('socket.io-client')) return 'kitchen';
          if (id.includes('@tanstack/react-query') || id.includes('react-hook-form')) return 'ui';
          if (id.includes('axios') || id.includes('date-fns')) return 'utils';
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
            return 'vendor';
          }
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging
    sourcemap: true,
    // Minify for better performance
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
  },
  server: {
    port: 3003,
    host: true,
    proxy: {
      '/api': {
        target: restaurantApiProxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      'axios',
      'react-router-dom',
      'socket.io-client',
    ],
  },
  // Enable CSS code splitting
  css: {
    devSourcemap: true,
  },
});
