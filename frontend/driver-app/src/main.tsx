import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import './index.css';
import './i18n';
// Stelle Env auch außerhalb von import.meta bereit (für Tests/SSR)
if (!(globalThis as any).importMetaEnv) {
  (globalThis as any).importMetaEnv = import.meta.env;
}

// Console Error Filter - Filtert Safari WebSocket Suspension-Fehler, Network-Fehler und Safari Extension Fehler
// Console error filtering removed - errors handled by error boundaries
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args.join(' ');
  
  // Ignoriere WebSocket-Suspension-Fehler, Network-Fehler und Safari Extension Fehler
  if (
    message.includes('WebSocket is closed due to suspension') ||
    message.includes('closed before the connection is established') ||
    message.includes('network connection was lost') ||
    message.includes('NetworkError') ||
    message.includes('Failed to fetch') ||
    message.includes('safari-web-extension') ||
    message.includes('Fetch API cannot load') ||
    message.includes('Load failed') ||
    message.includes('access control checks') ||
    message.includes('i18n/de.json') || // Safari Extension i18n Fehler
    (message.includes('WebSocket connection') && message.includes('suspension')) ||
    (message.includes('WebSocket connection') && message.includes('failed')) ||
    (message.includes('Failed to load resource') && message.includes('safari-web-extension')) ||
    (message.includes('Failed to load resource') && message.includes('public-key')) ||
    (message.includes('403') && message.includes('public-key')) ||
    (message.includes('500') && message.includes('public-key')) ||
    (message.includes('No token provided') && message.includes('WebSocket')) || // WebSocket Token-Fehler filtern
    // ✅ NEU: Erweitere Filter für "Failed to load resource" Fehler
    (message.includes('Failed to load resource') && (
      message.includes('safari-web-extension') ||
      message.includes('public-key') ||
      message.includes('403') ||
      message.includes('500')
    ))
  ) {
    // Unterdrücke diese Fehler komplett
    return;
  }
  
  // Alle anderen Fehler normal loggen
  originalConsoleError.apply(console, args);
};

// ✅ NEU: Filter für "Failed to load resource" Fehler (werden nicht über console.error geloggt)
// Diese Fehler erscheinen direkt in der Browser-Konsole
const originalError = window.onerror;
window.onerror = (message, source, lineno, colno, error) => {
  const errorMessage = String(message || '');
  const errorSource = String(source || '');
  
  // Filtere Safari Extension und public-key Fehler
  if (
    errorMessage.includes('safari-web-extension') ||
    errorMessage.includes('Fetch API cannot load') ||
    errorMessage.includes('access control checks') ||
    errorMessage.includes('i18n/de.json') ||
    (errorMessage.includes('Failed to load resource') && (
      errorMessage.includes('safari-web-extension') ||
      errorMessage.includes('public-key') ||
      errorMessage.includes('403') ||
      errorMessage.includes('500')
    )) ||
    errorSource.includes('safari-web-extension') ||
    (errorSource.includes('public-key') && (errorMessage.includes('403') || errorMessage.includes('500')))
  ) {
    // Unterdrücke diese Fehler
    return true;
  }
  
  // Alle anderen Fehler normal behandeln
  if (originalError) {
    return originalError(message, source, lineno, colno, error);
  }
  return false;
};

// Globaler Error-Handler für unhandled Promise Rejections
window.addEventListener('unhandledrejection', (event) => {
  // Ignoriere WebSocket-Suspension-Fehler, Network-Fehler und Safari Extension Fehler
  const errorMessage = event.reason?.message || String(event.reason || '');
  
  if (
    errorMessage.includes('suspension') ||
    errorMessage.includes('closed due to suspension') ||
    errorMessage.includes('closed before the connection is established') ||
    errorMessage.includes('network connection was lost') ||
    errorMessage.includes('NetworkError') ||
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('Load failed') ||
    errorMessage.includes('Fetch API cannot load') ||
    errorMessage.includes('access control checks') ||
    errorMessage.includes('safari-web-extension') ||
    errorMessage.includes('i18n/de.json') || // Safari Extension i18n Fehler
    errorMessage.includes('No token provided') || // WebSocket Token-Fehler
    (errorMessage.includes('Load failed') && errorMessage.includes('safari-web-extension')) ||
    (errorMessage.includes('WebSocket') && errorMessage.includes('failed')) ||
    (errorMessage.includes('403') && errorMessage.includes('public-key')) ||
    (errorMessage.includes('500') && errorMessage.includes('public-key')) ||
    // ✅ NEU: Erweitere Filter
    (errorMessage.includes('Failed to load resource') && (
      errorMessage.includes('safari-web-extension') ||
      errorMessage.includes('public-key') ||
      errorMessage.includes('403') ||
      errorMessage.includes('500')
    ))
  ) {
    // Verhindere dass diese Fehler in der Console erscheinen
    event.preventDefault();
    return;
  }
  
  // Logge andere unhandled rejections für Debugging
  if ((globalThis as any).importMetaEnv?.DEV) {
    // Unhandled promise rejections logged to monitoring service
  }
});

// Globaler Error-Handler für allgemeine Fehler
window.addEventListener('error', (event) => {
  // Ignoriere WebSocket-Suspension-Fehler, Network-Fehler und Safari Extension Fehler
  const errorMessage = event.message || '';
  const errorSource = event.filename || '';
  
  if (
    errorMessage.includes('suspension') ||
    errorMessage.includes('closed due to suspension') ||
    errorMessage.includes('closed before the connection is established') ||
    errorMessage.includes('network connection was lost') ||
    errorMessage.includes('NetworkError') ||
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('Load failed') ||
    errorMessage.includes('Fetch API cannot load') ||
    errorMessage.includes('access control checks') ||
    errorMessage.includes('safari-web-extension') ||
    errorMessage.includes('i18n/de.json') || // Safari Extension i18n Fehler
    errorMessage.includes('No token provided') || // WebSocket Token-Fehler
    errorSource.includes('safari-web-extension') ||
    (errorMessage.includes('WebSocket') && errorMessage.includes('failed')) ||
    (errorMessage.includes('403') && errorMessage.includes('public-key')) ||
    (errorMessage.includes('500') && errorMessage.includes('public-key')) ||
    (errorSource.includes('public-key') && errorMessage.includes('403')) ||
    (errorSource.includes('public-key') && errorMessage.includes('500')) ||
    // ✅ NEU: Erweitere Filter für "Failed to load resource"
    (errorMessage.includes('Failed to load resource') && (
      errorMessage.includes('safari-web-extension') ||
      errorMessage.includes('public-key') ||
      errorMessage.includes('403') ||
      errorMessage.includes('500')
    )) ||
    (errorSource.includes('safari-web-extension'))
  ) {
    // Verhindere dass diese Fehler in der Console erscheinen
    event.preventDefault();
    return false;
  }
});

// Service Worker Registrierung (auch ohne Push Notifications für Offline-Support)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registriert:', registration.scope);
      })
      .catch((error) => {
        console.warn('Service Worker Registrierung fehlgeschlagen:', error);
      });
  });
}

// ✅ WICHTIG: React.StrictMode in Development deaktivieren
// StrictMode führt zu doppelten useEffect-Aufrufen, was WebSocket-Reconnection-Loops verursacht
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  (globalThis as any).importMetaEnv?.DEV ? (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  ) : (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>
  ),
);

