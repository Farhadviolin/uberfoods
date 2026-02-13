import './BottomNavigation.css';
import { OrdersIcon, MapIcon, NavigationIcon, StatsIcon, MoreIcon } from './Icons';

interface BottomNavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
  activeOrdersCount: number;
}

export function BottomNavigation({ currentView, onViewChange, activeOrdersCount }: BottomNavigationProps) {
  const navItems = [
    { 
      id: 'orders', 
      label: 'Bestellungen', 
      icon: OrdersIcon, 
      badge: activeOrdersCount > 0 ? activeOrdersCount : null 
    },
    { id: 'map', label: 'Karte', icon: MapIcon },
    { id: 'navigation', label: 'Navigation', icon: NavigationIcon },
    { id: 'performance_analytics', label: 'Performance', icon: StatsIcon },
    { id: 'more', label: 'Mehr', icon: MoreIcon },
  ];

  return (
    <nav className="bottom-navigation">
      {navItems.map((item) => {
        const IconComponent = item.icon;
        return (
          <button
            key={item.id}
            className={`bottom-nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
            aria-label={item.label}
          >
            <span className="bottom-nav-icon">
              <IconComponent size={24} />
            </span>
            <span className="bottom-nav-label">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className="bottom-nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

