import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { splitVendorChunkPlugin } from 'vite';
import { copyFileSync } from 'fs';
import { resolve } from 'path';

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
    splitVendorChunkPlugin(),
    serviceWorkerPlugin(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@tanstack/react-query', 'react-hook-form'],
          utils: ['axios', 'date-fns'],
          kitchen: ['socket.io-client'], // Kitchen display specific
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
        target: 'http://localhost:3000',
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
