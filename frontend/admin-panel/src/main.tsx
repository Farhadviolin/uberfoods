import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ReactQueryProvider } from './lib/react-query';
import { config } from './config';
import './index.css';
import { logger } from './utils/logger';

const safeProcessEnv = typeof process !== 'undefined' ? process.env : undefined;

// Sentry Error-Tracking Initialisierung (optional)
if (config.sentryDsn && config.sentryDsn.trim() !== '') {
  import('@sentry/react').then((Sentry) => {
    // Release-Version aus package.json oder env
    const release = safeProcessEnv?.VITE_APP_VERSION ||
                   safeProcessEnv?.npm_package_version ||
                   '1.0.0';

    Sentry.init({
      dsn: config.sentryDsn,
      environment: config.sentryEnvironment,
      release: `${config.appName}@${release}`,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      // Performance Monitoring
      tracesSampleRate: config.isProduction ? 0.1 : 1.0,
      // Session Replay
      replaysSessionSampleRate: config.isProduction ? 0.1 : 1.0,
      replaysOnErrorSampleRate: 1.0,
      // Error filtering
      beforeSend(event, hint) {
        // Filter known development errors
        if (!config.isProduction) {
          const error = hint.originalException;
          if (error && typeof error === 'object' && 'message' in error) {
            const errorMessage = String(error.message);
            // Filter out common development errors
            if (errorMessage.includes('Loading chunk') ||
                errorMessage.includes('Script error') ||
                errorMessage.includes('Non-Error promise rejection')) {
              return null;
            }
          }
        }
        return event;
      },
      // Request context
      beforeSendTransaction(event) {
        // Add request ID if available (from backend responses)
        return event;
      },
    });
    logger.info(`✅ Sentry Error-Tracking initialisiert (Release: ${release}, Environment: ${config.sentryEnvironment})`);
  }).catch((error) => {
    // Sentry nicht verfügbar - kein Problem
    logger.warn('⚠️ Sentry konnte nicht initialisiert werden:', error);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  import.meta.env.DEV ? (
    <ReactQueryProvider>
      <App />
    </ReactQueryProvider>
  ) : (
    <React.StrictMode>
      <ReactQueryProvider>
        <App />
      </ReactQueryProvider>
    </React.StrictMode>
  ),
);

// Service Worker Registration für Performance-Optimierung (nur wenn explizit freigeschaltet)
const enableServiceWorker = import.meta.env.VITE_ENABLE_SW === 'true';
if ('serviceWorker' in navigator && import.meta.env.PROD && enableServiceWorker) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        logger.info(`✅ Admin Panel Service Worker registriert: ${registration.scope}`);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                logger.info('🔄 Neue Version verfügbar. Seite neu laden für Updates.');
              }
            });
          }
        });
      })
      .catch((error) => {
        logger.warn('⚠️ Service Worker Registration fehlgeschlagen:', error);
      });
  });
}

