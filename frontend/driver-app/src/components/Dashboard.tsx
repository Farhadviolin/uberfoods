import { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import api from '../utils/api';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import { Order } from '../types';
import { OrderCard } from './OrderCard';
import { DriverMap } from './DriverMap';
import { Navigation } from './Navigation';
import { SkeletonOrderCard } from './SkeletonLoader';

// Lazy Load große Komponenten für Code Splitting
const Documents = lazy(() => import('./Documents').then(m => ({ default: m.Documents })));
const EarningsDashboard = lazy(() => import('./EarningsDashboard').then(m => ({ default: m.EarningsDashboard })));
const RatingsView = lazy(() => import('./RatingsView').then(m => ({ default: m.RatingsView })));
const ShiftManagement = lazy(() => import('./ShiftManagement').then(m => ({ default: m.ShiftManagement })));
const NotificationsCenter = lazy(() => import('./NotificationsCenter').then(m => ({ default: m.NotificationsCenter })));
const Settings = lazy(() => import('./Settings').then(m => ({ default: m.Settings })));
const ExpensesTracker = lazy(() => import('./ExpensesTracker').then(m => ({ default: m.ExpensesTracker })));
const OrderHistory = lazy(() => import('./OrderHistory').then(m => ({ default: m.OrderHistory })));
const HelpSupport = lazy(() => import('./HelpSupport').then(m => ({ default: m.HelpSupport })));
const ReferralProgram = lazy(() => import('./ReferralProgram').then(m => ({ default: m.ReferralProgram })));
const EmergencyDashboard = lazy(() => import('./EmergencyDashboard').then(m => ({ default: m.EmergencyDashboard })));
const AdvancedPerformanceDashboard = lazy(() => import('./AdvancedPerformanceDashboard').then(m => ({ default: m.AdvancedPerformanceDashboard })));
const MetaGlassesPanel = lazy(() => import('./MetaGlassesPanel').then(m => ({ default: m.MetaGlassesPanel })));
const DriverGamificationDashboard = lazy(() => import('./DriverGamificationDashboard').then(m => ({ default: m.DriverGamificationDashboard })));
const SubscriptionDashboard = lazy(() => import('./SubscriptionDashboard').then(m => ({ default: m.SubscriptionDashboard })));
const SubscriptionQuickActions = lazy(() => import('./SubscriptionQuickActions').then(m => ({ default: m.SubscriptionQuickActions })));
import { useLocation } from '../hooks/useLocation';
import { useWebSocket } from '../hooks/useWebSocket';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useSmartAcceptance } from '../hooks/useSmartAcceptance';
import { useSubscription } from '../hooks/useSubscription';
import { OfflineIndicator } from './OfflineIndicator';
import { backgroundLocationService } from '../services/backgroundLocationService';
import { offlineStorage } from '../services/offlineStorage';
import { offlineService } from '../services/offline';
import { useRetry } from '../hooks/useRetry';
import { extractErrorMessage } from '../utils/errorHandler';
import { BottomNavigation } from './BottomNavigation';
import { ThemeToggle } from './ThemeToggle';
import { Sidebar } from './Sidebar';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { OnboardingBanner } from './OnboardingBanner';
import { DashboardStats } from './DashboardStats';
import { OrdersList } from './OrdersList';

// Loading Fallback Component
const LoadingFallback = () => (
  <div style={{ padding: '40px', textAlign: 'center' }}>
    <div className="loading-spinner" style={{ margin: '0 auto 20px' }}></div>
    <div>Lade Komponente...</div>
  </div>
);
import '../styles/app-layout.css';
import './Dashboard.css';

type DriverStatus = 'online' | 'offline' | 'on_break';
type ViewType = 'dashboard' | 'orders' | 'map' | 'navigation' | 'earnings' | 'ratings' | 'shift' | 'documents' | 'notifications' | 'settings' | 'expenses' | 'history' | 'help' | 'emergency_intelligence' | 'performance_analytics' | 'meta_glasses' | 'gamification' | 'referral' | 'subscription';

export function Dashboard() {
  const { driver } = useAuth();
  const { t, i18n } = useTranslation();
  // ✅ WICHTIG: Stabilisiere driverId mit useMemo - verhindert unnötige Re-Renders
  const driverId = useMemo(() => driver?.id || null, [driver?.id]);
  const { location: currentLocation } = useLocation();
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [driverStatus, setDriverStatus] = useState<DriverStatus>('online');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [mobileView, setMobileView] = useState('orders');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Subscription Hook - verwaltet Subscription automatisch
  const { subscription, isTrialEndingSoon, trialDaysRemaining } = useSubscription();

  // Retry Hook für robuste API-Calls
  const retry = useRetry('dashboard');

  // Smart Acceptance für KI-gestützte Entscheidungen
  const {
    isAnalyzing: aiAnalyzing,
    stats: aiStats
  } = useSmartAcceptance(driver, orders, {
    enabled: true,
    autoAcceptThreshold: 85,
    updateInterval: 5
  }, currentLocation || undefined);

  const fetchOrders = useCallback(async () => {
    if (!driver?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/orders/driver/${driver.id}`);
      const fetchedOrders = Array.isArray(response.data) ? response.data : [];
      setOrders(fetchedOrders);
      
      // Save to offline storage
      if (fetchedOrders.length > 0) {
        await offlineStorage.saveOrders(fetchedOrders);
      }
    } catch (err: unknown) {
      // Verbessertes Error Handling
      if (err.isOffline) {
        setError('Offline-Modus: Bestellungen werden geladen, sobald die Verbindung wiederhergestellt ist.');
        // Versuche aus Offline Storage zu laden
        try {
          const offlineOrders = await offlineStorage.getOrders();
          if (offlineOrders.length > 0) {
            setOrders(offlineOrders);
          } else {
            // Fallback zu localStorage
            const cachedOrders = localStorage.getItem('cached_orders');
            if (cachedOrders) {
              setOrders(JSON.parse(cachedOrders));
            }
          }
        } catch (e) {
          logger.error('Fehler beim Laden aus Offline Storage', 'Dashboard', e);
          // Fallback zu localStorage
          const cachedOrders = localStorage.getItem('cached_orders');
          if (cachedOrders) {
            try {
              setOrders(JSON.parse(cachedOrders));
            } catch (parseError) {
              logger.error('Fehler beim Laden aus Cache', 'Dashboard', parseError);
            }
          }
        }
      } else if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          setError(null); // Keine Bestellungen ist kein Fehler
          setOrders([]);
        } else if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          setError('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.');
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else if (axiosError.response?.status === 500) {
          setError('Serverfehler. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.');
          // Try to load from offline storage
          try {
            const offlineOrders = await offlineStorage.getOrders();
            if (offlineOrders.length > 0) {
              setOrders(offlineOrders);
            }
          } catch (e) {
            logger.error('Fehler beim Laden aus Offline Storage', 'Dashboard', e);
          }
        }
      } else if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'ERR_NETWORK') {
        setError('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.');
        // Try to load from offline storage
        try {
          const offlineOrders = await offlineStorage.getOrders();
          if (offlineOrders.length > 0) {
            setOrders(offlineOrders);
          }
        } catch (e) {
          logger.error('Fehler beim Laden aus Offline Storage', 'Dashboard', e);
        }
      } else {
        let errorMessage = 'Fehler beim Laden der Bestellungen. Bitte versuchen Sie es später erneut.';
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as { response?: { data?: { message?: string } } };
          errorMessage = axiosError.response?.data?.message || errorMessage;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        setError(errorMessage);
      }
      logger.error('Fehler beim Laden der Bestellungen', 'Dashboard', err);
      if (orders.length === 0) {
        setOrders([]);
      }
    } finally {
      setLoading(false);
    }
  }, [driver?.id]); // Nur driver.id als Dependency, nicht das ganze driver-Objekt

  useEffect(() => {
    if (driver?.id) {
      fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.id]); // fetchOrders ist stabilisiert durch useCallback mit driver?.id

  // Entferne UberEats Theme - verwende nur Facebook Design System

  // Separater useEffect für Offline Storage - läuft unabhängig
  useEffect(() => {
    if (orders.length > 0) {
      // Save to offline storage
      offlineStorage.saveOrders(orders).catch((err) => {
        logger.error('Fehler beim Speichern in Offline Storage', 'Dashboard', err);
      });
      // Also save to localStorage as fallback
      localStorage.setItem('cached_orders', JSON.stringify(orders));
    }
  }, [orders]); // Nur wenn orders sich ändern

  // Background Location Tracking Setup
  useEffect(() => {
    if (!driver?.id) return;

    // Start background location tracking
    backgroundLocationService.startTracking({
      interval: 30000, // 30 seconds
      enableHighAccuracy: true,
      minDistance: 10, // 10 meters
      backgroundMode: true, // Enable background tracking
    });

    // Register location update callback
    const unsubscribe = backgroundLocationService.onLocationUpdate(async (location) => {
      // Save location to offline storage
      await offlineStorage.saveLocationHistory(location);
      
      // Update driver location via API (if online)
      if (navigator.onLine && driver?.id) {
        try {
          await api.put(`/drivers/${driver.id}/location`, {
            lat: location.lat,
            lng: location.lng,
          });
        } catch (error) {
          // If offline, location is already saved to offline storage
          logger.warn('Failed to update location, saved to offline storage', 'Dashboard', error);
        }
      }
    });

    return () => {
      backgroundLocationService.stopTracking();
      unsubscribe();
    };
  }, [driver?.id]);

  // Sync offline data when coming back online
  useEffect(() => {
    const handleOnline = async () => {
      if (driver?.id) {
        // Sync offline data
        const syncResult = await offlineService.syncOfflineData();
        if (syncResult.orders > 0 || syncResult.locations > 0) {
          logger.info(`Synced ${syncResult.orders} orders and ${syncResult.locations} locations`, 'Dashboard');
        }
        
        // Sync location history
        const unsyncedLocations = await offlineStorage.getUnsyncedLocations();
        if (unsyncedLocations.length > 0 && driver.id) {
          for (const location of unsyncedLocations) {
            try {
              await api.put(`/drivers/${driver.id}/location`, {
                lat: location.lat,
                lng: location.lng,
                timestamp: location.timestamp,
              });
            } catch (error) {
              logger.error('Failed to sync location', 'Dashboard', error);
            }
          }
          // Mark as synced
          const timestamps = unsyncedLocations.map(loc => loc.timestamp);
          await offlineStorage.markLocationsSynced(timestamps);
        }
        
        // Refresh orders
        fetchOrders();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [driver?.id, fetchOrders]);

  const acceptOrder = useCallback(async (orderId: string) => {
    if (!driver?.id) return;
    
    try {
      setError(null);
      
      // Optimistisches Update
      setOrders((prev) => {
        const updated = prev.map((o) => 
          o.id === orderId ? { ...o, status: 'CONFIRMED', driverId: driver.id } : o
        );
        return updated;
      });
      
      // Verwende Retry-Service für robuste API-Calls
      const result = await retry.execute(
        () => api.post(`/orders/${orderId}/accept`, { driverId: driver.id }),
        {
          maxAttempts: 3,
          initialDelay: 1000,
          retryableStatuses: [408, 429, 500, 502, 503, 504],
          retryableErrors: ['ERR_NETWORK'],
          shouldRetry: (err: any) => {
            // Nicht retryen bei 409 (Conflict) oder 400 (Bad Request)
            return err.response?.status !== 409 && err.response?.status !== 400;
          },
        }
      );

      if (result.success) {
        setSuccess('Bestellung erfolgreich angenommen!');
        setTimeout(() => setSuccess(null), 3000);
        setTimeout(() => fetchOrders(), 1000);
      } else {
        throw result.error;
      }
    } catch (err: unknown) {
      if (err.isOffline || err.code === 'ERR_NETWORK') {
        setError('Offline: Bestellung wird später akzeptiert.');
        offlineService.queueRequest(`/orders/${orderId}/accept`, {
          method: 'POST',
          body: JSON.stringify({ driverId: driver.id }),
          headers: { 'Content-Type': 'application/json' },
        }, 10);
      } else if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number } };
        if (axiosError.response?.status === 409) {
          setError('Diese Bestellung wurde bereits von einem anderen Fahrer angenommen.');
          fetchOrders(); // Aktualisiere Liste
        } else {
          const errorMsg = extractErrorMessage(err);
          setError(errorMsg);
        }
      } else {
        const errorMsg = extractErrorMessage(err);
        setError(errorMsg);
      }
      logger.error('Fehler beim Akzeptieren', 'Dashboard', err);
    }
  }, [driver?.id, fetchOrders, retry]);

  const rejectOrder = useCallback(async (orderId: string, reason?: string) => {
    if (!driver?.id) return;
    
    try {
      setError(null);
      
      // Optimistisches Update - entferne Bestellung aus Liste
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      
      // Verwende Retry-Service für robuste API-Calls
      const result = await retry.execute(
        () => api.post(`/orders/${orderId}/reject`, { 
          driverId: driver.id,
          reason: reason || 'Kein Grund angegeben'
        }),
        {
          maxAttempts: 2, // Weniger Retries für Reject (weniger kritisch)
          initialDelay: 1000,
          retryableStatuses: [408, 429, 500, 502, 503, 504],
          retryableErrors: ['ERR_NETWORK'],
        }
      );

      if (result.success) {
        setSuccess('Bestellung abgelehnt.');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw result.error;
      }
    } catch (err: unknown) {
      if (err.isOffline || err.code === 'ERR_NETWORK') {
        setError('Offline: Ablehnung wird später synchronisiert.');
        offlineService.queueRequest(`/orders/${orderId}/reject`, {
          method: 'POST',
          body: JSON.stringify({ 
            driverId: driver.id,
            reason: reason || 'Kein Grund angegeben'
          }),
          headers: { 'Content-Type': 'application/json' },
        }, 8);
      } else {
        const errorMsg = extractErrorMessage(err);
        setError(errorMsg);
      }
      logger.error('Fehler beim Ablehnen', 'Dashboard', err);
    }
  }, [driver?.id, retry]);

  // Service Worker Message Handler für Push Notification Actions
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        const { type, action, orderId } = event.data;
        
        if (type === 'NOTIFICATION_ACTION') {
          switch (action) {
            case 'accept':
              if (orderId) {
                acceptOrder(orderId);
              }
              break;
            case 'reject':
              if (orderId) {
                rejectOrder(orderId);
              }
              break;
            case 'navigate':
              setActiveView('navigation');
              break;
            case 'reply':
              // Chat wird in OrderCard gehandhabt
              break;
          }
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, [acceptOrder, rejectOrder]);

  // WebSocket Callbacks mit useCallback stabilisieren
  const handleOrderUpdate = useCallback((order: Order) => {
    setOrders((prev) => {
      const existing = prev.findIndex((o) => o.id === order.id);
      if (existing >= 0) {
        // Nur updaten wenn sich etwas geändert hat
        const current = prev[existing];
        if (JSON.stringify(current) === JSON.stringify(order)) {
          return prev; // Keine Änderung, kein Re-Render
        }
        const updated = [...prev];
        updated[existing] = order;
        return updated;
      }
      return [...prev, order];
    });
  }, []);

  const handleOrderCreated = useCallback((order: Order) => {
    // ✅ Capture driverId einmalig um Re-Renders zu vermeiden
    const currentDriverId = driver?.id;
    if (order.driverId === currentDriverId) {
      setOrders((prev) => {
        // Prüfe ob Bestellung bereits existiert
        if (prev.some((o) => o.id === order.id)) {
          return prev; // Bereits vorhanden, kein Re-Render
        }
        return [...prev, order];
      });
    }
  }, [driver?.id]);

  // WebSocket für Real-time Updates
  const { connectionError: wsError } = useWebSocket(
    driverId, // ✅ Verwende stabilisierten driverId
    {
      onOrderUpdate: handleOrderUpdate,
      onOrderCreated: handleOrderCreated,
    }
  );

  const updateStatus = useCallback(async (orderId: string, status: string) => {
    try {
      setError(null);
      await api.patch(`/orders/${orderId}/status`, { status });
      setSuccess('Status erfolgreich aktualisiert!');
      // Optimistisches Update
      setOrders((prev) => 
        prev.map((o) => o.id === orderId ? { ...o, status: status as any } : o)
      );
      setTimeout(() => setSuccess(null), 3000);
      // Lade nach kurzer Verzögerung aktualisierte Daten
      setTimeout(() => fetchOrders(), 1000);
    } catch (err: unknown) {
      if (err.isOffline) {
        setError('Offline: Status wird gespeichert und später synchronisiert.');
      } else {
        let errorMessage = 'Fehler beim Aktualisieren des Status. Bitte versuchen Sie es erneut.';
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as { response?: { data?: { message?: string } } };
          errorMessage = axiosError.response?.data?.message || errorMessage;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        setError(errorMessage);
      }
      logger.error('Fehler beim Aktualisieren des Status', 'Dashboard', err);
    }
  }, [fetchOrders]);

  const toggleDriverStatus = useCallback(async () => {
    if (!driver?.id || updatingStatus) return;
    
    setUpdatingStatus(true);
    try {
      let newStatus: DriverStatus;
      if (driverStatus === 'online') {
        newStatus = 'on_break';
      } else if (driverStatus === 'on_break') {
        newStatus = 'offline';
      } else {
        newStatus = 'online';
      }
      
      await api.put(`/drivers/${driver.id}/status`, { status: newStatus });
      setDriverStatus(newStatus);
      setSuccess(`Status geändert zu: ${newStatus === 'online' ? 'Online' : newStatus === 'on_break' ? 'Pause' : 'Offline'}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError('Fehler beim Ändern des Status');
      // Dashboard error handled by error boundary
    } finally {
      setUpdatingStatus(false);
    }
  }, [driver?.id, driverStatus, updatingStatus]);

  // Memoized berechnete Werte für bessere Performance
  const activeOrders = useMemo(() => 
    orders.filter(order => order.status !== 'DELIVERED' && order.status !== 'CANCELLED'),
    [orders]
  );

  const completedOrders = useMemo(() => 
    orders.filter(order => order.status === 'DELIVERED'),
    [orders]
  );

  const todayEarnings = useMemo(() => {
    const today = new Date();
    return orders
      .filter(o => {
        const orderDate = new Date(o.createdAt);
        return o.status === 'DELIVERED' &&
          orderDate.getDate() === today.getDate() &&
          orderDate.getMonth() === today.getMonth() &&
          orderDate.getFullYear() === today.getFullYear();
      })
      .reduce((sum, o) => sum + o.totalAmount, 0);
  }, [orders]);

  const renderView = () => {
    switch (activeView) {
      case 'map':
        return <DriverMap orders={activeOrders} driverLocation={currentLocation || undefined} />;
      case 'navigation':
        return activeOrders.length > 0 ? <Navigation orders={activeOrders} driverLocation={currentLocation || undefined} /> : null;
      case 'earnings':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <EarningsDashboard />
          </Suspense>
        );
      case 'ratings':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <RatingsView />
          </Suspense>
        );
      case 'shift':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ShiftManagement />
          </Suspense>
        );
      case 'documents':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <Documents />
          </Suspense>
        );
      case 'notifications':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <NotificationsCenter />
          </Suspense>
        );
      case 'settings':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <Settings />
          </Suspense>
        );
      case 'expenses':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ExpensesTracker />
          </Suspense>
        );
      case 'history':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <OrderHistory />
          </Suspense>
        );
      case 'help':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <HelpSupport />
          </Suspense>
        );
      case 'emergency_intelligence':
        return driver ? (
          <Suspense fallback={<LoadingFallback />}>
            <EmergencyDashboard driver={driver} />
          </Suspense>
        ) : null;
      case 'performance_analytics':
        return driver ? (
          <Suspense fallback={<LoadingFallback />}>
            <AdvancedPerformanceDashboard driver={driver} />
          </Suspense>
        ) : null;
      case 'meta_glasses':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <MetaGlassesPanel />
          </Suspense>
        );
      case 'gamification':
        return driver ? (
          <Suspense fallback={<LoadingFallback />}>
            <DriverGamificationDashboard driver={driver} />
          </Suspense>
        ) : null;
      case 'referral':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ReferralProgram />
          </Suspense>
        );
      case 'subscription':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <SubscriptionDashboard />
          </Suspense>
        );
      default:
        return null;
    }
  };

  const locale = i18n.language || 'de-DE';

  return (
    <div className="app-layout">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        activeOrdersCount={activeOrders.length}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <button
        className="mobile-menu-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Menü öffnen"
        aria-expanded={sidebarOpen}
      >
        ☰
      </button>
      <main className="app-main" aria-busy={loading}>
        <OfflineIndicator />

        <header className="app-header">
          {wsError && (
            <div className="error" style={{ 
              margin: '0 0 10px 0', 
              padding: '12px', 
              background: '#fff3cd', 
              border: '1px solid #ffc107',
              borderRadius: '6px',
              color: '#856404'
            }}>
              ⚠️ {wsError}
            </div>
          )}
          <div className="header-content">
            <h1>{t('dashboard.title')}</h1>
            <p>{t('dashboard.welcome', { name: driver?.name || '' })}</p>
            {subscription && (
              <div 
                className="subscription-badge" 
                onClick={() => setActiveView('subscription')}
                style={{
                  marginTop: '8px',
                  padding: '4px 12px',
                  background: subscription.tier === 'PRO' ? '#3b82f6' : 
                             subscription.tier === 'FULLTIME' ? '#10b981' : '#6b7280',
                  color: 'white',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  display: 'inline-block',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {subscription.tier} {subscription.status === 'TRIALING' && '(Trial)'}
                {isTrialEndingSoon && trialDaysRemaining !== null && (
                  <span style={{ marginLeft: '8px', opacity: 0.9 }}>
                    {t('dashboard.subscription.trialEnding', { days: trialDaysRemaining })}
                  </span>
                )}
                {subscription.trialEndsAt && !isTrialEndingSoon && new Date(subscription.trialEndsAt) > new Date() && (
                  <span style={{ marginLeft: '8px', opacity: 0.9 }}>
                    {t('dashboard.subscription.trialDate', { date: new Date(subscription.trialEndsAt).toLocaleDateString(i18n.language || 'de-DE') })}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="header-actions">
            <LanguageSwitcher />
            <ThemeToggle />
            <button
              onClick={toggleDriverStatus}
              className={`status-indicator ${driverStatus === 'online' ? 'connected' : 'disconnected'}`}
              disabled={updatingStatus}
              title={
                driverStatus === 'online' 
                  ? t('dashboard.status.on_break') 
                  : driverStatus === 'on_break' 
                  ? t('dashboard.status.offline') 
                  : t('dashboard.status.online')
              }
            >
              <span className="status-dot"></span>
              {driverStatus === 'online' && t('dashboard.status.online')}
              {driverStatus === 'on_break' && t('dashboard.status.on_break')}
              {driverStatus === 'offline' && t('dashboard.status.offline')}
            </button>
            {isSupported && (
              <button
                onClick={() => isSubscribed ? unsubscribe() : subscribe()}
                className="secondary"
                title={isSubscribed ? 'Push-Benachrichtigungen deaktivieren' : 'Push-Benachrichtigungen aktivieren'}
              >
                {isSubscribed ? '🔔' : '🔕'}
              </button>
            )}
          </div>
        </header>

        <div className="app-content">
          <OnboardingBanner />
          {error && <div className="error" role="alert" aria-live="assertive">{error}</div>}
          {success && <div className="success" role="status" aria-live="polite">{success}</div>}

          {activeView === 'dashboard' && (
            <>
              <DashboardStats
                t={t}
                activeOrders={activeOrders.length}
                completedOrders={completedOrders.length}
                todayEarnings={todayEarnings}
                aiStats={aiStats}
                aiAnalyzing={aiAnalyzing}
              />

              <h2>{t('dashboard.orders.active')}</h2>
              
              <OrdersList
                orders={activeOrders}
                loading={loading}
                onStatusUpdate={updateStatus}
                onAccept={acceptOrder}
                onReject={rejectOrder}
                emptyMessage={t('dashboard.orders.none')}
              />

              {completedOrders.length > 0 && (
                <>
                  <h2>{t('dashboard.orders.completed')}</h2>
                  <div className="orders-container">
                    {completedOrders.slice(0, 5).map(order => (
                      <div key={order.id} className="order-card completed">
                        <div className="order-header">
                          <div>
                            <h3>Bestellung #{order.id.slice(-8)}</h3>
                            <p className="order-date">
                              {new Date(order.createdAt).toLocaleString(locale)}
                            </p>
                          </div>
                          <div className="status-badge" style={{ backgroundColor: '#28a745' }}>
                            {t('order.delivered')}
                          </div>
                        </div>
                        <p><strong>Restaurant:</strong> {order.restaurant.name}</p>
                        <p><strong>Kunde:</strong> {order.customer.name}</p>
                        <p><strong>Gesamt:</strong> {order.totalAmount.toFixed(2)} €</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {activeView === 'orders' && (
            <>
              <h2>{t('dashboard.orders.active')}</h2>
              <OrdersList
                orders={activeOrders}
                loading={loading}
                onStatusUpdate={updateStatus}
                onAccept={acceptOrder}
                onReject={rejectOrder}
                emptyMessage={t('dashboard.orders.none')}
              />
            </>
          )}

          {activeView !== 'dashboard' && activeView !== 'orders' && (
            <div className="tab-content-wrapper">
              {renderView()}
            </div>
          )}
        </div>

        {/* Mobile Bottom Navigation */}
        <BottomNavigation
          currentView={mobileView}
          onViewChange={(view) => {
            setMobileView(view);
            if (view === 'map') setActiveView('map');
            else if (view === 'navigation') setActiveView('navigation');
            else if (view === 'performance_analytics') setActiveView('performance_analytics');
            else setActiveView('dashboard');
          }}
          activeOrdersCount={activeOrders.length}
        />
      </main>
      
      {/* Subscription Quick Actions */}
      <SubscriptionQuickActions />
    </div>
  );
}

