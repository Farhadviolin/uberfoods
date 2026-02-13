import { useState } from 'react';
import { VoiceCommandPanel } from './VoiceCommandPanel';
import { useTranslation } from 'react-i18next';
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

type ViewType = 'dashboard' | 'orders' | 'map' | 'navigation' | 'earnings' | 'ratings' | 'shift' | 'documents' | 'notifications' | 'settings' | 'expenses' | 'history' | 'help' | 'emergency_intelligence' | 'performance_analytics' | 'meta_glasses' | 'gamification' | 'referral' | 'subscription';

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  activeOrdersCount: number;
  isOpen?: boolean;
  onClose?: () => void;
}

const menuGroups: MenuGroup[] = [
  {
    id: 'main',
    label: 'sidebar.group.main',
    icon: '📊',
    items: [
      { id: 'dashboard', label: 'sidebar.dashboard', icon: '📊' },
      { id: 'orders', label: 'sidebar.orders', icon: '📦', badge: 0 },
      { id: 'map', label: 'sidebar.map', icon: '🗺️' },
      { id: 'navigation', label: 'sidebar.navigation', icon: '🧭' },
      { id: 'performance_analytics', label: 'sidebar.performance_analytics', icon: '🚀' },
    ],
  },
  {
    id: 'financial',
    label: 'sidebar.group.financial',
    icon: '💰',
    items: [
      { id: 'earnings', label: 'sidebar.earnings', icon: '💰' },
      { id: 'subscription', label: 'sidebar.subscription', icon: '💳' },
      { id: 'expenses', label: 'sidebar.expenses', icon: '💸' },
      { id: 'history', label: 'sidebar.history', icon: '📋' },
    ],
  },
  {
    id: 'profile',
    label: 'sidebar.group.profile',
    icon: '👤',
    items: [
      { id: 'ratings', label: 'sidebar.ratings', icon: '⭐' },
      { id: 'gamification', label: 'sidebar.gamification', icon: '🎮' },
      { id: 'referral', label: 'sidebar.referral', icon: '🎁' },
    ],
  },
  {
    id: 'work',
    label: 'sidebar.group.work',
    icon: '💼',
    items: [
      { id: 'shift', label: 'sidebar.shift', icon: '⏰' },
      { id: 'documents', label: 'sidebar.documents', icon: '📄' },
    ],
  },
  {
    id: 'system',
    label: 'sidebar.group.system',
    icon: '⚙️',
    items: [
      { id: 'notifications', label: 'sidebar.notifications', icon: '🔔' },
      { id: 'settings', label: 'sidebar.settings', icon: '⚙️' },
      { id: 'help', label: 'sidebar.help', icon: '❓' },
      { id: 'emergency_intelligence', label: 'sidebar.emergency_intelligence', icon: '🛡️' },
      { id: 'meta_glasses', label: 'sidebar.meta_glasses', icon: '👓' },
    ],
  },
];

export function Sidebar({ activeView, onViewChange, activeOrdersCount, isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['main', 'financial', 'profile'])
  );
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const updateOrdersBadge = (items: MenuItem[]) => {
    return items.map(item => 
      item.id === 'orders' 
        ? { ...item, badge: activeOrdersCount }
        : item
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && onClose && (
        <div 
          className="sidebar-overlay"
          onClick={onClose}
          aria-label={t('sidebar.close', { defaultValue: 'Sidebar schließen' })}
        />
      )}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          {!isCollapsed && (
            <div className="sidebar-logo">
              <span className="logo-icon">🚗</span>
              <div className="logo-text">
                <h2>UberFoods</h2>
                <p>{t('app.title')}</p>
              </div>
            </div>
          )}
          <button
            className="sidebar-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={
              isCollapsed
                ? t('sidebar.expand', { defaultValue: 'Sidebar erweitern' })
                : t('sidebar.collapse', { defaultValue: 'Sidebar einklappen' })
            }
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuGroups.map((group) => {
            const itemsWithBadges = updateOrdersBadge(group.items);
            const isExpanded = expandedGroups.has(group.id);
            const hasActiveItem = itemsWithBadges.some(item => item.id === activeView);

            return (
              <div key={group.id} className="menu-group">
                <button
                  className={`menu-group-header ${isExpanded ? 'expanded' : ''} ${hasActiveItem ? 'has-active' : ''}`}
                  onClick={() => toggleGroup(group.id)}
                  disabled={isCollapsed}
                >
                  <span className="group-icon">{group.icon}</span>
                  {!isCollapsed && (
                    <>
                      <span className="group-label">{t(group.label)}</span>
                      <span className="group-arrow">{isExpanded ? '▼' : '▶'}</span>
                    </>
                  )}
                </button>

                {(!isCollapsed && isExpanded) && (
                  <div className="menu-items">
                    {itemsWithBadges.map((item) => (
                      <button
                        key={item.id}
                        className={`menu-item ${activeView === item.id ? 'active' : ''}`}
                        onClick={() => {
                          onViewChange(item.id as ViewType);
                          if (onClose) onClose();
                        }}
                      >
                        <span className="item-icon">{item.icon}</span>
                        <span className="item-label">{t(item.label)}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="item-badge">{item.badge}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Voice Command Panel nach Profil-Gruppe */}
          <VoiceCommandPanel isCollapsed={isCollapsed} />
        </nav>

        <div className="sidebar-footer">
          {!isCollapsed && (
            <div className="sidebar-version">
              <span>{t('sidebar.version', { defaultValue: 'Version 2.0' })}</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

