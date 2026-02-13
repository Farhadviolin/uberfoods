import { useState, memo, useCallback, useMemo } from 'react';
import { TabType } from '../types/tabs';
import './Sidebar.css';

interface MenuGroup {
  id: string;
  label: string;
  icon: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  activeOrdersCount: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const menuGroups: MenuGroup[] = [
  {
    id: 'overview',
    label: 'Übersicht',
    icon: '📊',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    ],
  },
  {
    id: 'operations',
    label: 'Betrieb',
    icon: '🍕',
    items: [
      { id: 'customers', label: 'Kunden', icon: '👥' },
      { id: 'restaurants', label: 'Restaurants', icon: '🍽️' },
      { id: 'dishes', label: 'Gerichte', icon: '🍕' },
      { id: 'orders', label: 'Bestellungen', icon: '📦', badge: 0 },
      { id: 'orders-advanced', label: 'Erweiterte Bestellungen', icon: '🚀' },
      { id: 'meal-planner', label: 'Meal Planner', icon: '🥗' },
      { id: 'group-orders', label: 'Group Orders', icon: '👥' },
      { id: 'suppliers', label: 'Lieferanten', icon: '🚚' },
    ],
  },
  {
    id: 'people',
    label: 'Personen',
    icon: '👥',
    items: [
      { id: 'drivers', label: 'Fahrer', icon: '🚗' },
      { id: 'drivers-advanced', label: 'Erweiterte Fahrer', icon: '🚗' },
      { id: 'subscriptions', label: 'Subscriptions', icon: '💳' },
      { id: 'subscription-tier-config', label: 'Tier Konfiguration', icon: '⚙️' },
      { id: 'advanced-analytics', label: 'Erweiterte Analytics', icon: '🚀' },
      { id: 'compliance', label: 'Compliance & DSGVO', icon: '🔒' },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    icon: '🎧',
    items: [
      { id: 'support', label: 'Support', icon: '🎧' },
      { id: 'promotions', label: 'Aktionen', icon: '🎁' },
      { id: 'reviews', label: 'Bewertungen', icon: '⭐' },
    ],
  },
  {
    id: 'advanced',
    label: 'Erweitert',
    icon: '⚙️',
    items: [
      { id: 'monitoring', label: 'Monitoring', icon: '📊' },
      { id: 'integrations', label: 'Integrationen', icon: '🔌' },
      { id: 'reporting', label: 'Reporting', icon: '📄' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    icon: '⚙️',
    items: [
      { id: 'audit', label: 'Audit Logs', icon: '📋' },
      { id: 'admin-users', label: 'Admin Benutzer', icon: '👤' },
      { id: 'settings', label: 'Einstellungen', icon: '⚙️' },
      { id: 'legal-pages', label: 'Legale Seiten', icon: '📄' },
    ],
  },
];

function SidebarInner({
  activeTab,
  onTabChange,
  activeOrdersCount,
  isCollapsed = false,
  onToggleCollapse,
  isOpen,
  onClose
}: SidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['overview', 'operations'])
  );

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(groupId)) {
        newExpanded.delete(groupId);
      } else {
        newExpanded.add(groupId);
      }
      return newExpanded;
    });
  }, []);

  const updateOrdersBadge = useCallback((items: MenuItem[]) => {
    return items.map(item => 
      item.id === 'orders' 
        ? { ...item, badge: activeOrdersCount }
        : item
    );
  }, [activeOrdersCount]);

  const handleItemClick = useCallback((itemId: string) => {
    onTabChange(itemId as TabType);
    if (onClose) onClose();
  }, [onTabChange, onClose]);

  const menuGroupsWithBadges = useMemo(() => {
    return menuGroups.map(group => ({
      ...group,
      items: updateOrdersBadge(group.items)
    }));
  }, [updateOrdersBadge]);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && onClose && (
        <div 
          className="sidebar-overlay"
          onClick={onClose}
          aria-label="Sidebar schließen"
        />
      )}
      <aside
        className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isOpen ? 'open' : ''}`}
        data-testid="sidebar"
        data-open={isOpen ? '1' : '0'}
        data-collapsed={isCollapsed ? '1' : '0'}
      >
      <div className="sidebar-header">
        {!isCollapsed && (
          <div className="sidebar-logo">
            <span className="logo-icon">🍕</span>
            <div className="logo-text">
              <h2>UberFoods</h2>
              <p>Admin Panel</p>
            </div>
          </div>
        )}
        <button
          className="sidebar-toggle"
          onClick={onToggleCollapse || (() => {})}
          aria-label={isCollapsed ? 'Sidebar erweitern' : 'Sidebar einklappen'}
          data-testid="sidebar-toggle"
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      <nav className="sidebar-nav" role="navigation" aria-label="Hauptnavigation">
        {menuGroupsWithBadges.map((group) => {
          const isExpanded = expandedGroups.has(group.id);
          const hasActiveItem = group.items.some(item => item.id === activeTab);

          return (
            <div key={group.id} className="menu-group">
              <button
                className={`menu-group-header ${isExpanded ? 'expanded' : ''} ${hasActiveItem ? 'has-active' : ''}`}
                onClick={() => toggleGroup(group.id)}
                disabled={isCollapsed}
                aria-expanded={isExpanded}
                aria-controls={`menu-group-${group.id}`}
                aria-label={`${group.label} ${isExpanded ? 'einklappen' : 'ausklappen'}`}
                tabIndex={isCollapsed ? -1 : 0}
              >
                <span className="group-icon" aria-hidden="true">{group.icon}</span>
                {!isCollapsed && (
                  <>
                    <span className="group-label">{group.label}</span>
                    <span className="group-arrow" aria-hidden="true">{isExpanded ? '▼' : '▶'}</span>
                  </>
                )}
              </button>

              {(!isCollapsed && isExpanded) && (
                <div className="menu-items" id={`menu-group-${group.id}`} role="menu">
                  {group.items.map((item) => (
                    <div key={item.id} className="menu-item-wrapper">
                      <button
                        className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
                        onClick={() => handleItemClick(item.id)}
                        aria-label={item.label}
                        aria-current={activeTab === item.id ? 'page' : undefined}
                        role="menuitem"
                        tabIndex={0}
                        data-testid={`sidebar-link-${item.id}`}
                      >
                        <span className="item-icon" aria-hidden="true">{item.icon}</span>
                        <span className="item-label">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="item-badge" aria-label={`${item.badge} neue Einträge`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Collapsed state - show items as icons with tooltips */}
              {isCollapsed && (
                <div className="menu-items-collapsed" role="menu">
                  {group.items.map((item) => (
                    <div key={item.id} className="menu-item-collapsed-wrapper">
                      <button
                        className={`menu-item-collapsed ${activeTab === item.id ? 'active' : ''}`}
                        onClick={() => handleItemClick(item.id)}
                        aria-label={item.label}
                        aria-current={activeTab === item.id ? 'page' : undefined}
                        role="menuitem"
                        tabIndex={0}
                        title={item.label}
                      >
                        <span className="item-icon-collapsed" aria-hidden="true">{item.icon}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="item-badge-collapsed" aria-label={`${item.badge} neue Einträge`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                      {/* Tooltip */}
                      <div className="item-tooltip">
                        {item.label}
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="tooltip-badge"> ({item.badge})</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {!isCollapsed && (
          <div className="sidebar-version">
            <span>Version 2.0</span>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}

export const Sidebar = memo(SidebarInner);

