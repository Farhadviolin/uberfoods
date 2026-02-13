import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { AppStateProvider } from './services/stateManager';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerGlobalToastFunction, unregisterGlobalToastFunction } from './utils/api';
import { performanceMonitor } from './services/performanceMonitor';
import { getEnvBool } from './utils/env';
import './App.css';

// Lazy Load Route Components für Code Splitting
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const Login = lazy(() => import('./components/Login').then(m => ({ default: m.Login })));
const ChangePassword = lazy(() => import('./components/ChangePassword/ChangePassword').then(m => ({ default: m.ChangePassword })));
const LegalPage = lazy(() => import('./components/LegalPage').then(m => ({ default: m.LegalPage })));
const SubscriptionDashboard = lazy(() => import('./components/SubscriptionDashboard').then(m => ({ default: m.SubscriptionDashboard })));
const HelpSupport = lazy(() => import('./components/HelpSupport').then(m => ({ default: m.HelpSupport })));
const EmergencyDashboard = lazy(() => import('./components/EmergencyDashboard').then(m => ({ default: m.EmergencyDashboard })));
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));

// Component to register global toast function
function GlobalToastRegistrar({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();

  useEffect(() => {
    registerGlobalToastFunction(showToast);
    return () => {
      unregisterGlobalToastFunction();
    };
  }, [showToast]);

  return <>{children}</>;
}

// Loading Fallback für Routes
const RouteLoadingFallback = () => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <div>Lade...</div>
  </div>
);

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const skipAuth = getEnvBool('VITE_SKIP_AUTH');

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div>Lade...</div>
      </div>
    );
  }

  // Im Development-Modus: Überspringe Authentifizierung
  if (skipAuth) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { isAuthenticated, loading, mustChangePassword } = useAuth();
  const skipAuth = getEnvBool('VITE_SKIP_AUTH');

  // Initialisiere Performance Monitoring
  useEffect(() => {
    performanceMonitor.getNavigationTiming();
    performanceMonitor.getResourceTimings();
    
    return () => {
      // Cleanup bei Unmount
      performanceMonitor.destroy();
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div>Lade...</div>
      </div>
    );
  }

  // Zeige Passwort-Änderung, wenn erforderlich
  if (isAuthenticated && mustChangePassword && !skipAuth) {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <ChangePassword />
      </Suspense>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route 
            path="/login" 
            element={
              skipAuth || isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Login />
                </Suspense>
              )
            } 
          />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Dashboard />
                </Suspense>
              </ProtectedRoute>
            } 
          />
          <Route
            path="/subscription"
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <SubscriptionDashboard />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/support"
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <HelpSupport />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/emergency"
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <EmergencyDashboard />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Settings />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/legal/:slug"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <LegalPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppStateProvider>
        <AuthProvider>
          <ToastProvider>
            <GlobalToastRegistrar>
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </GlobalToastRegistrar>
          </ToastProvider>
        </AuthProvider>
      </AppStateProvider>
    </ErrorBoundary>
  );
}

export default App;
