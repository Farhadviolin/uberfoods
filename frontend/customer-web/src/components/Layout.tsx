import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { SkipLink } from './SkipLink';
import { CommandPalette } from './CommandPalette';
import { Sidebar } from './Sidebar';
import { NotificationCenter } from './NotificationCenter';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useTheme } from '../design-system/ThemeProvider';
import { Footer } from './Footer';
import { Menu, X } from 'lucide-react';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Command Palette Commands
  const commandPaletteCommands = useMemo(() => {
    const commands = [
      {
        id: 'restaurants',
        label: t('commandPalette.restaurants'),
        icon: '🍽️',
        shortcut: 'R',
        category: t('commandPalette.navigation'),
        action: () => {
          navigate('/');
          setIsCommandPaletteOpen(false);
        },
      },
      {
        id: 'dashboard',
        label: t('sidebar.dashboard'),
        icon: '📊',
        shortcut: 'D',
        category: t('commandPalette.navigation'),
        action: () => {
          navigate('/dashboard');
          setIsCommandPaletteOpen(false);
        },
      },
      {
        id: 'orders',
        label: t('commandPalette.myOrders'),
        icon: '📦',
        shortcut: 'O',
        category: t('commandPalette.navigation'),
        action: () => {
          navigate('/orders');
          setIsCommandPaletteOpen(false);
        },
      },
      {
        id: 'favorites',
        label: t('sidebar.favorites'),
        icon: '⭐',
        shortcut: 'F',
        category: t('commandPalette.navigation'),
        action: () => {
          navigate('/favorites');
          setIsCommandPaletteOpen(false);
        },
      },
      {
        id: 'meal-planner',
        label: t('sidebar.mealPlanner'),
        icon: '📅',
        shortcut: 'M',
        category: t('commandPalette.navigation'),
        action: () => {
          navigate('/meal-planner');
          setIsCommandPaletteOpen(false);
        },
      },
      {
        id: 'addresses',
        label: t('sidebar.addresses'),
        icon: '📍',
        shortcut: 'A',
        category: t('commandPalette.navigation'),
        action: () => {
          navigate('/addresses');
          setIsCommandPaletteOpen(false);
        },
      },
      {
        id: 'profile',
        label: t('sidebar.profile'),
        icon: '👤',
        shortcut: 'P',
        category: t('commandPalette.navigation'),
        action: () => {
          navigate('/profile');
          setIsCommandPaletteOpen(false);
        },
      },
      {
        id: 'settings',
        label: t('sidebar.settings'),
        icon: '⚙️',
        shortcut: 'S',
        category: t('commandPalette.settings'),
        action: () => {
          navigate('/settings');
          setIsCommandPaletteOpen(false);
        },
      },
      {
        id: 'payment-methods',
        label: t('sidebar.paymentMethods'),
        icon: '💳',
        shortcut: 'PM',
        category: t('commandPalette.settings'),
        action: () => {
          navigate('/payment-methods');
          setIsCommandPaletteOpen(false);
        },
      },
      {
        id: 'support',
        label: t('sidebar.support'),
        icon: '💬',
        shortcut: 'H',
        category: t('commandPalette.help'),
        action: () => {
          navigate('/support');
          setIsCommandPaletteOpen(false);
        },
      },
      {
        id: 'faq',
        label: t('faq.title'),
        icon: '❓',
        shortcut: '?',
        category: t('commandPalette.help'),
        action: () => {
          navigate('/faq');
          setIsCommandPaletteOpen(false);
        },
      },
      {
        id: 'promotions',
        label: t('sidebar.promotions'),
        icon: '🎁',
        shortcut: 'PR',
        category: t('commandPalette.navigation'),
        action: () => {
          navigate('/promotions');
          setIsCommandPaletteOpen(false);
        },
      },
      {
        id: 'toggle-theme',
        label: t('commandPalette.toggleTheme'),
        icon: '🌓',
        shortcut: 'T',
        category: t('commandPalette.settings'),
        action: () => {
          toggleTheme();
          setIsCommandPaletteOpen(false);
        },
      },
    ];

    return commands;
  }, [navigate, toggleTheme, t]);

  // Keyboard Shortcuts
  useKeyboardShortcuts({
    onDashboard: () => navigate('/dashboard'),
    onOrders: () => navigate('/orders'),
    onFavorites: () => navigate('/favorites'),
    onProfile: () => navigate('/profile'),
    onAddresses: () => navigate('/addresses'),
    onMealPlanner: () => navigate('/meal-planner'),
    onRestaurants: () => navigate('/'),
    onToggleTheme: toggleTheme,
    onCommandPalette: () => setIsCommandPaletteOpen(true),
  });

  return (
    <div className="fb-layout-container">
      <SkipLink />
      
      {/* Header */}
      <header className="fb-header" role="banner">
        <div className="fb-header-content">
          <div className="fb-header-left">
            <button
              className="fb-sidebar-toggle"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label={t('accessibility.openMenu')}
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <Link to="/" className="fb-logo">🍕 UberFoods</Link>
          </div>
          
          <nav className="header-nav">
            {user && <NotificationCenter />}
            <LanguageSwitcher />
            <ThemeToggle />
            {user && (
              <div className="user-menu">
                <span className="user-name">{user.name}</span>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Layout Grid - 2 Spalten wie Admin Panel */}
      <div className="fb-layout-grid">
        {/* Sidebar - Immer sichtbar, zeigt aber unterschiedliche Links basierend auf Auth */}
        <aside className={`fb-sidebar-wrapper ${isSidebarOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <Sidebar onCollapseChange={setIsSidebarCollapsed} />
        </aside>

        {/* Main Content Wrapper */}
        <div className={`fb-main-wrapper ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <main id="main-content" className="fb-main" role="main">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fb-sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Footer */}
      <Footer />

      {/* Command Palette */}
      <CommandPalette
        commands={commandPaletteCommands}
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
}

