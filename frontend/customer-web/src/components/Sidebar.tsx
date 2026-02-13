import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Package, Star, Calendar, Gift, MapPin, User, Heart, Utensils, Users, MessageCircle, MessageSquare, Settings, CreditCard, Tag, FileText, HelpCircle, AlertTriangle, Briefcase } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFavoritesQuery } from '../hooks/useFavoritesQuery';
import { useOrders } from '../hooks/useOrders';
// import { useUIPreferences } from '../hooks/useUIPreferences';
import './Sidebar.css';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

interface SidebarProps {
  onCollapseChange?: (collapsed: boolean) => void;
}

export function Sidebar({ onCollapseChange }: SidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const { data: favorites } = useFavoritesQuery();
  const { data: orders } = useOrders();
  // const { preferences, isLoading: loadingPreferences, updatePreference } = useUIPreferences();
  const preferences = { sidebarCollapsed: false };
  const loadingPreferences = false;
  const updatePreference = () => {};
  const enableSocial = (import.meta.env.VITE_ENABLE_SOCIAL_FEATURES ?? 'false') === 'true';
  const enableGamification = (import.meta.env.VITE_ENABLE_GAMIFICATION ?? 'false') === 'true';
  const enableAnalytics = (import.meta.env.VITE_ENABLE_ANALYTICS ?? 'false') === 'true';
  const enableNotifications = (import.meta.env.VITE_ENABLE_NOTIFICATIONS ?? 'false') === 'true';
  const enableGeocoding = (import.meta.env.VITE_ENABLE_GEOCODING ?? 'false') === 'true';
  const enableVoice = (import.meta.env.VITE_ENABLE_VOICE_ASSISTANT ?? 'false') === 'true';
  
  const isCollapsed = preferences.sidebarCollapsed ?? false;

  const handleToggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    updatePreference('sidebarCollapsed', newCollapsed);
    onCollapseChange?.(newCollapsed);
  };

  // Öffentliche Links (immer sichtbar)
  const publicItems: SidebarItem[] = [
    {
      id: 'home',
      label: t('sidebar.home'),
      icon: <Home size={20} />,
      path: '/',
    },
    {
      id: 'apply',
      label: t('sidebar.partner'),
      icon: <Briefcase size={20} />,
      path: '/apply',
    },
  ];

  // Geschützte Links (nur für eingeloggte Nutzer)
  const protectedItems: (SidebarItem | null)[] = [
    {
      id: 'dashboard',
      label: t('sidebar.dashboard'),
      icon: <Package size={20} />,
      path: '/dashboard',
    },
    {
      id: 'orders',
      label: t('sidebar.orders'),
      icon: <Package size={20} />,
      path: '/orders',
      badge: orders?.filter(o => o.status === 'PENDING' || o.status === 'PREPARING').length,
    },
    {
      id: 'favorites',
      label: t('sidebar.favorites'),
      icon: <Star size={20} />,
      path: '/favorites',
      badge: favorites?.length,
    },
    {
      id: 'meal-planner',
      label: t('sidebar.mealPlanner'),
      icon: <Utensils size={20} />,
      path: '/meal-planner',
    },
    enableSocial ? {
      id: 'social',
      label: t('sidebar.socialFeed'),
      icon: <Users size={20} />,
      path: '/social',
    } : null,
    {
      id: 'group-orders',
      label: t('sidebar.groupOrders'),
      icon: <Users size={20} />,
      path: '/group-orders',
    },
    {
      id: 'scheduled',
      label: t('sidebar.scheduledOrders'),
      icon: <Calendar size={20} />,
      path: '/scheduled-orders',
    },
    enableGamification ? {
      id: 'loyalty',
      label: t('sidebar.loyalty'),
      icon: <Heart size={20} />,
      path: '/loyalty',
    } : null,
    enableGamification ? {
      id: 'gift-cards',
      label: t('sidebar.giftCards'),
      icon: <Gift size={20} />,
      path: '/gift-cards',
    } : null,
    {
      id: 'addresses',
      label: t('sidebar.addresses'),
      icon: <MapPin size={20} />,
      path: '/addresses',
    },
    {
      id: 'chat',
      label: t('sidebar.chat'),
      icon: <MessageCircle size={20} />,
      path: '/chat',
    },
    {
      id: 'reviews',
      label: t('sidebar.reviews'),
      icon: <MessageSquare size={20} />,
      path: '/reviews',
    },
    {
      id: 'profile',
      label: t('sidebar.profile'),
      icon: <User size={20} />,
      path: '/profile',
    },
    {
      id: 'settings',
      label: t('sidebar.settings'),
      icon: <Settings size={20} />,
      path: '/settings',
    },
    {
      id: 'payment-methods',
      label: t('sidebar.paymentMethods'),
      icon: <CreditCard size={20} />,
      path: '/payment-methods',
    },
    enableAnalytics ? {
      id: 'promotions',
      label: t('sidebar.promotions'),
      icon: <Tag size={20} />,
      path: '/promotions',
    } : null,
    {
      id: 'invoices',
      label: t('sidebar.invoices'),
      icon: <FileText size={20} />,
      path: '/invoices',
    },
    enableNotifications ? {
      id: 'support',
      label: t('sidebar.support'),
      icon: <HelpCircle size={20} />,
      path: '/support',
    } : null,
    enableGeocoding ? {
      id: 'allergies',
      label: t('sidebar.allergies'),
      icon: <AlertTriangle size={20} />,
      path: '/allergies',
    } : null,
    {
      id: 'referral',
      label: t('sidebar.referral'),
      icon: <Users size={20} />,
      path: '/referral',
    },
  ];

  // Alle Items immer anzeigen - unabhängig von Auth-Status
  const sidebarItems = [...publicItems, ...protectedItems.filter(Boolean) as SidebarItem[]];

  return (
    <aside className={`fb-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!isCollapsed && (
          <div className="sidebar-logo">
            <span className="logo-icon">🍕</span>
            <div className="logo-text">
              <h2>UberFoods</h2>
              <p>{t('sidebar.customerPortal')}</p>
            </div>
          </div>
        )}
        <button
          className="sidebar-toggle"
          onClick={handleToggleCollapse}
          aria-label={isCollapsed ? t('sidebar.expandSidebar') : t('sidebar.collapseSidebar')}
          disabled={loadingPreferences}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>
      <nav className="fb-sidebar-nav">
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`fb-sidebar-item ${isActive ? 'active' : ''}`}
              data-tooltip={isCollapsed ? item.label : undefined}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="fb-sidebar-icon">{item.icon}</span>
              <span className="fb-sidebar-label">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="fb-sidebar-badge">{item.badge}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {user ? (
        <div className="fb-sidebar-footer">
          <div className="fb-sidebar-user">
            <div className="fb-avatar-small">
              {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="fb-sidebar-user-info">
              <div className="fb-sidebar-user-name">{user.name || 'Unknown User'}</div>
              <div className="fb-sidebar-user-email">{user.email || ''}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="fb-sidebar-footer">
          <Link to="/login" className="fb-sidebar-item">
            <span className="fb-sidebar-icon"><User size={20} /></span>
            <span className="fb-sidebar-label">{t('sidebar.login')}</span>
          </Link>
        </div>
      )}
    </aside>
  );
}

