import { ReactNode, useState, useCallback } from 'react';
import { TabType } from '../types/tabs';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import './AdminShell.css';

interface AdminShellProps {
  children: ReactNode;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  activeOrdersCount?: number;
  sidebarCollapsed?: boolean;
  onToggleCollapse?: () => void;
  user?: {
    name?: string;
  } | null;
  onLogout?: () => void;
  onToggleTheme?: () => void;
  isDark?: boolean;
  pageTitle?: string;
  pageDescription?: string;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
}

export function AdminShell({
  children,
  activeTab,
  onTabChange,
  activeOrdersCount = 0,
  user,
  onLogout,
  onToggleTheme,
  isDark = false,
  pageTitle = 'Admin Panel',
  pageDescription,
  breadcrumbs
}: AdminShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const handleMobileMenuToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleTabChange = useCallback((tab: TabType) => {
    if (onTabChange) {
      onTabChange(tab);
    }
    // Close mobile sidebar when tab changes
    setSidebarOpen(false);
  }, [onTabChange]);

  return (
    <div className="admin-shell">
      {/* Mobile Menu Toggle */}
      <button
        className="mobile-menu-toggle"
        onClick={handleMobileMenuToggle}
        aria-label="Menü öffnen/schließen"
        data-testid="mobile-menu-toggle"
      >
        ☰
      </button>

      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        activeOrdersCount={activeOrdersCount}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleSidebarToggle}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Layout Area */}
      <div className={`admin-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} data-testid="admin-shell">
        {/* Topbar */}
        <Topbar
          pageTitle={pageTitle}
          pageDescription={pageDescription}
          breadcrumbs={breadcrumbs}
          user={user}
          onLogout={onLogout}
          onToggleTheme={onToggleTheme}
          isDark={isDark}
          onMobileMenuToggle={handleMobileMenuToggle}
        />

        {/* Main Content */}
        <main className="admin-content">
          <div className="admin-content-wrapper">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
