import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { TabType } from '../types/tabs';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { LoadingSpinner } from './LoadingSpinner';
import { registerGlobalToastFunction, unregisterGlobalToastFunction } from '../utils/api';
import { AdminShell } from './AdminShell';
import { CommandPalette } from './CommandPalette';
import { OrderDetailsModal } from './OrderDetailsModal';
import { RestaurantDetailsModal } from './RestaurantDetailsModal';
import { PasswordModal } from './PasswordModal';
import { ConfirmationDialog } from './ConfirmationDialog';
import { Login } from './Login';
import { useActiveOrders } from '../hooks/useOrders';
import { ErrorBoundary } from './ErrorBoundary';

// Lazy-loaded components for better performance
const Dashboard = lazy(() => import('./Dashboard').then(m => ({ default: m.Dashboard })));
const OrdersManagement = lazy(() => import('./OrdersManagement').then(m => ({ default: m.OrdersManagement })));
const CustomersManagement = lazy(() => import('./CustomersManagement').then(m => ({ default: m.CustomersManagement })));
const DriversManagement = lazy(() => import('./SimpleDriversManagement').then(m => ({ default: m.DriversManagement })));
const RestaurantManagement = lazy(() => import('./RestaurantManagement').then(m => ({ default: m.RestaurantManagement })));
const DishesManagement = lazy(() => import('./DishesManagement').then(m => ({ default: m.DishesManagement })));
const MealPlannerManagement = lazy(() => import('./MealPlannerManagement').then(m => ({ default: m.MealPlannerManagement })));
const GroupOrderManagement = lazy(() => import('./GroupOrderManagement').then(m => ({ default: m.GroupOrderManagement })));
const SupplierManagement = lazy(() => import('./SupplierManagement').then(m => ({ default: m.SupplierManagement })));
const AdvancedDriverManagement = lazy(() => import('./AdvancedDriverManagement').then(m => ({ default: m.AdvancedDriverManagement })));
const SubscriptionManagement = lazy(() => import('./SubscriptionManagement').then(m => ({ default: m.SubscriptionManagement })));
const SubscriptionTierConfigManagement = lazy(() => import('./SubscriptionTierConfigManagement').then(m => ({ default: m.SubscriptionTierConfigManagement })));
const AdvancedAnalytics = lazy(() => import('./AdvancedAnalytics').then(m => ({ default: m.AdvancedAnalytics })));
const ComplianceManagement = lazy(() => import('./ComplianceManagement').then(m => ({ default: m.ComplianceManagement })));
const CustomerSupport = lazy(() => import('./CustomerSupport').then(m => ({ default: m.CustomerSupport })));
const PromotionsTab = lazy(() => import('./PromotionsTab').then(m => ({ default: m.PromotionsTab })));
const ReviewsTab = lazy(() => import('./ReviewsTab').then(m => ({ default: m.ReviewsTab })));
const UnifiedMonitoring = lazy(() => import('./UnifiedMonitoring').then(m => ({ default: m.UnifiedMonitoring })));
const AdminUsersTab = lazy(() => import('./AdminUsersTab').then(m => ({ default: m.AdminUsersTab })));
const SettingsTab = lazy(() => import('./SettingsTab').then(m => ({ default: m.SettingsTab })));
const LegalPagesTab = lazy(() => import('./LegalPagesTab').then(m => ({ default: m.LegalPagesTab })));
const IntegrationsManagement = lazy(() => import('./IntegrationsManagement').then(m => ({ default: m.IntegrationsManagement })));
const ReportingManagement = lazy(() => import('./ReportingManagement').then(m => ({ default: m.ReportingManagement })));

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  address: string;
  phone: string;
  notes: string;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  restaurant: {
    id: string;
    name: string;
  };
  driver: {
    id: string;
    name: string;
  } | null;
  items: Array<{
    dish: any;
    quantity: number;
    price: number;
  }>;
}

interface Restaurant {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  imageUrl: string;
  isActive: boolean;
  dishes: any[];
  status?: string;
  cuisines?: string[];
  rating?: number;
}

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  location: { lat: number; lng: number } | null;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  orders: Order[];
}

export function AdminApp() {
  const authContext = useAuth();
  const isAuthenticated = Boolean(authContext?.isAuthenticated ?? false);
  const { loading: authLoading, user, logout } = authContext;
  const { showToast } = useToast();
  const { toggleTheme, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Active orders count for sidebar badge
  const { data: activeOrders = [] } = useActiveOrders();
  const activeOrdersCount = activeOrders.length;

  // Registriere globale Toast-Funktion für automatische API-Error-Toasts
  useEffect(() => {
    registerGlobalToastFunction(showToast);
    return () => {
      unregisterGlobalToastFunction();
    };
  }, [showToast]);

  // State for various modals and forms
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [passwordModal, setPasswordModal] = useState<{
    isOpen: boolean;
    restaurantName: string;
    email: string;
    password: string;
  }>({
    isOpen: false,
    restaurantName: '',
    email: '',
    password: '',
  });

  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Keyboard shortcuts
  const commandPaletteCommands = useMemo(() => [
    {
      id: 'dashboard',
      label: 'Zum Dashboard',
      icon: '📊',
      shortcut: 'D',
      category: 'Navigation',
      action: () => setActiveTab('dashboard'),
    },
    {
      id: 'restaurants',
      label: 'Restaurants verwalten',
      icon: '🍽️',
      shortcut: 'R',
      category: 'Navigation',
      action: () => setActiveTab('restaurants'),
    },
    {
      id: 'dishes',
      label: 'Gerichte verwalten',
      icon: '🍕',
      shortcut: 'G',
      category: 'Navigation',
      action: () => setActiveTab('dishes'),
    },
    {
      id: 'orders',
      label: 'Bestellungen anzeigen',
      icon: '📦',
      shortcut: 'O',
      category: 'Navigation',
      action: () => setActiveTab('orders'),
    },
    {
      id: 'drivers',
      label: 'Fahrer verwalten',
      icon: '🚗',
      shortcut: 'F',
      category: 'Navigation',
      action: () => setActiveTab('drivers'),
    },
    {
      id: 'support',
      label: 'Support öffnen',
      icon: '🎧',
      shortcut: 'S',
      category: 'Navigation',
      action: () => setActiveTab('support'),
    },
    {
      id: 'monitoring',
      label: 'Monitoring öffnen',
      icon: '📊',
      shortcut: 'M',
      category: 'Navigation',
      action: () => setActiveTab('monitoring'),
    },
    {
      id: 'toggle-sidebar',
      label: 'Sidebar ein-/ausklappen',
      icon: sidebarCollapsed ? '→' : '←',
      shortcut: 'B',
      category: 'Navigation',
      action: () => handleSidebarToggle(),
    },
    {
      id: 'toggle-theme',
      label: 'Theme wechseln',
      icon: isDark ? '☀️' : '🌙',
      shortcut: 'T',
      category: 'Aktionen',
      action: () => toggleTheme(),
    },
    {
      id: 'logout',
      label: 'Abmelden',
      icon: '🚪',
      shortcut: 'L',
      category: 'Aktionen',
      action: () => logout(),
    },
  ], [isDark, toggleTheme, logout, sidebarCollapsed, handleSidebarToggle]);

  // Auth check - show login if not authenticated
  if (authLoading) {
    return <LoadingSpinner text="Lädt..." />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Suspense fallback={<LoadingSpinner text="Dashboard wird geladen..." />}>
            <Dashboard />
          </Suspense>
        );

      case 'customers':
        return (
          <Suspense fallback={<LoadingSpinner text="Kunden werden geladen..." />}>
            <CustomersManagement />
          </Suspense>
        );

      case 'restaurants':
        return (
          <Suspense fallback={<LoadingSpinner text="Restaurants werden geladen..." />}>
            <RestaurantManagement />
          </Suspense>
        );

      case 'dishes':
        return (
          <Suspense fallback={<LoadingSpinner text="Gerichte werden geladen..." />}>
            <DishesManagement />
          </Suspense>
        );

      case 'orders':
        return (
          <Suspense fallback={<LoadingSpinner text="Bestellungen werden geladen..." />}>
            <OrdersManagement />
          </Suspense>
        );

      case 'orders-advanced':
        return (
          <Suspense fallback={<LoadingSpinner text="Erweiterte Bestellungen werden geladen..." />}>
            <OrdersManagement />
          </Suspense>
        );

      case 'meal-planner':
        return (
          <Suspense fallback={<LoadingSpinner text="Meal Planner wird geladen..." />}>
            <MealPlannerManagement />
          </Suspense>
        );

      case 'group-orders':
        return (
          <Suspense fallback={<LoadingSpinner text="Group Orders werden geladen..." />}>
            <GroupOrderManagement />
          </Suspense>
        );

      case 'suppliers':
        return (
          <Suspense fallback={<LoadingSpinner text="Lieferanten werden geladen..." />}>
            <SupplierManagement />
          </Suspense>
        );


      case 'drivers':
        return (
          <Suspense fallback={<LoadingSpinner text="Fahrer werden geladen..." />}>
            <DriversManagement />
          </Suspense>
        );

      case 'drivers-advanced':
        return (
          <Suspense fallback={<LoadingSpinner text="Erweiterte Fahrer werden geladen..." />}>
            <AdvancedDriverManagement />
          </Suspense>
        );

      case 'subscriptions':
        return (
          <Suspense fallback={<LoadingSpinner text="Subscriptions werden geladen..." />}>
            <SubscriptionManagement />
          </Suspense>
        );

      case 'subscription-tier-config':
        return (
          <Suspense fallback={<LoadingSpinner text="Tier Konfiguration wird geladen..." />}>
            <SubscriptionTierConfigManagement />
          </Suspense>
        );

      case 'advanced-analytics':
        return (
          <Suspense fallback={<LoadingSpinner text="Erweiterte Analytics werden geladen..." />}>
            <AdvancedAnalytics />
          </Suspense>
        );

      case 'compliance':
        return (
          <Suspense fallback={<LoadingSpinner text="Compliance Management wird geladen..." />}>
            <ComplianceManagement />
          </Suspense>
        );

      case 'support':
        return (
          <Suspense fallback={<LoadingSpinner text="Support wird geladen..." />}>
            <CustomerSupport />
          </Suspense>
        );

      case 'promotions':
        return (
          <Suspense fallback={<LoadingSpinner text="Aktionen werden geladen..." />}>
            <PromotionsTab />
          </Suspense>
        );

      case 'reviews':
        return (
          <Suspense fallback={<LoadingSpinner text="Bewertungen werden geladen..." />}>
            <ReviewsTab />
          </Suspense>
        );

      case 'monitoring':
        return (
          <Suspense fallback={<LoadingSpinner text="Monitoring wird geladen..." />}>
            <UnifiedMonitoring />
          </Suspense>
        );

      case 'integrations':
        return (
          <Suspense fallback={<LoadingSpinner text="Integrationen werden geladen..." />}>
            <IntegrationsManagement />
          </Suspense>
        );

      case 'reporting':
        return (
          <Suspense fallback={<LoadingSpinner text="Reporting wird geladen..." />}>
            <ReportingManagement />
          </Suspense>
        );

      case 'audit':
        return (
          <div>
            <h2>Audit Logs verwalten</h2>
            <p>Audit-Logs werden hier implementiert...</p>
          </div>
        );

      case 'admin-users':
        return (
          <Suspense fallback={<LoadingSpinner text="Admin Benutzer werden geladen..." />}>
            <AdminUsersTab />
          </Suspense>
        );

      case 'settings':
        return (
          <Suspense fallback={<LoadingSpinner text="Einstellungen werden geladen..." />}>
            <SettingsTab />
          </Suspense>
        );

      case 'legal-pages':
        return (
          <Suspense fallback={<LoadingSpinner text="Legale Seiten werden geladen..." />}>
            <LegalPagesTab />
          </Suspense>
        );

      default:
        return (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h2>Tab nicht gefunden</h2>
            <p>Der ausgewählte Tab &quot;{activeTab}&quot; ist noch nicht implementiert.</p>
          </div>
        );
    }
  };

  // Get page title and description based on active tab
  const getPageInfo = (tab: TabType) => {
    const pageInfo: {
      title: string;
      description: string;
      breadcrumbs: Array<{ label: string; href?: string }>;
    } = {
      title: 'Admin Panel',
      description: 'Vollständige Verwaltung der Plattform',
      breadcrumbs: [{ label: 'Dashboard' }]
    };

    switch (tab) {
      case 'dashboard':
        pageInfo.title = 'Dashboard';
        pageInfo.description = 'Übersicht über alle wichtigen Kennzahlen';
        pageInfo.breadcrumbs = [{ label: 'Dashboard' }];
        break;
      case 'drivers':
        pageInfo.title = 'Fahrer verwalten';
        pageInfo.description = 'Verwaltung aller Fahrer und deren Status';
        pageInfo.breadcrumbs = [
          { label: 'Dashboard', href: '#' },
          { label: 'Fahrer' }
        ];
        break;
      case 'customers':
        pageInfo.title = 'Kunden verwalten';
        pageInfo.description = 'Verwaltung aller Kunden und deren Bestellhistorie';
        pageInfo.breadcrumbs = [
          { label: 'Dashboard', href: '#' },
          { label: 'Kunden' }
        ];
        break;
      case 'orders':
        pageInfo.title = 'Bestellungen';
        pageInfo.description = 'Alle eingehenden Bestellungen verwalten';
        pageInfo.breadcrumbs = [
          { label: 'Dashboard', href: '#' },
          { label: 'Bestellungen' }
        ];
        break;
      case 'restaurants':
        pageInfo.title = 'Restaurants verwalten';
        pageInfo.description = 'Verwalten Sie alle Restaurants in Ihrem System';
        pageInfo.breadcrumbs = [
          { label: 'Dashboard', href: '#' },
          { label: 'Restaurants' }
        ];
        break;
      // Add more cases as needed
      default:
        break;
    }

    return pageInfo;
  };

  const pageInfo = getPageInfo(activeTab);

  return (
    <div className="app-layout">
      <CommandPalette commands={commandPaletteCommands} />

      <AdminShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeOrdersCount={activeOrdersCount}
        sidebarCollapsed={sidebarCollapsed}
        onToggleCollapse={handleSidebarToggle}
        user={user}
        onLogout={logout}
        onToggleTheme={toggleTheme}
        isDark={isDark}
        pageTitle={pageInfo.title}
        pageDescription={pageInfo.description}
        breadcrumbs={pageInfo.breadcrumbs}
      >
        <div className="tab-content-wrapper">
          {renderTabContent()}
        </div>
      </AdminShell>

      {/* Modals */}
      <OrderDetailsModal
        isOpen={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        onStatusChange={async (orderId, status) => {
          showToast('Status-Update wird implementiert...', 'info');
        }}
        onAssignDriver={async (orderId, driverId) => {
          showToast('Fahrer-Zuweisung wird implementiert...', 'info');
        }}
        availableDrivers={[]}
      />

      <RestaurantDetailsModal
        isOpen={selectedRestaurantId !== null}
        onClose={() => setSelectedRestaurantId(null)}
        restaurantId={selectedRestaurantId}
      />

      <PasswordModal
        isOpen={passwordModal.isOpen}
        onClose={() => setPasswordModal({ ...passwordModal, isOpen: false })}
        restaurantName={passwordModal.restaurantName}
        email={passwordModal.email}
        password={passwordModal.password}
      />

      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        onClose={() => setConfirmationDialog({ ...confirmationDialog, isOpen: false })}
        onConfirm={confirmationDialog.onConfirm}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        variant={confirmationDialog.variant || 'info'}
      />
    </div>
  );
}
