import { memo } from 'react';
import './Topbar.css';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface TopbarProps {
  pageTitle: string;
  pageDescription?: string;
  breadcrumbs?: Breadcrumb[];
  user?: {
    name?: string;
  } | null;
  onLogout?: () => void;
  onToggleTheme?: () => void;
  isDark?: boolean;
  onMobileMenuToggle?: () => void;
}

export const Topbar = memo(function Topbar({
  pageTitle,
  pageDescription,
  breadcrumbs,
  user,
  onLogout,
  onToggleTheme,
  isDark = false,
  onMobileMenuToggle
}: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-content">
        {/* Left side - Title and breadcrumbs */}
        <div className="topbar-left">
          {/* Mobile menu button */}
          <button
            className="mobile-menu-button"
            onClick={onMobileMenuToggle}
            aria-label="Hauptmenü öffnen"
          >
            ☰
          </button>

          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="breadcrumbs" aria-label="Breadcrumb Navigation">
              <ol className="breadcrumb-list">
                {breadcrumbs.map((crumb, index) => (
                  <li key={index} className="breadcrumb-item">
                    {index > 0 && <span className="breadcrumb-separator">/</span>}
                    {crumb.href ? (
                      <a href={crumb.href} className="breadcrumb-link">
                        {crumb.label}
                      </a>
                    ) : (
                      <span className="breadcrumb-current">{crumb.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {/* Page Title */}
          <div className="page-header">
            <h1 className="typography-h1 page-title">{pageTitle}</h1>
            {pageDescription && (
              <p className="typography-caption page-description">{pageDescription}</p>
            )}
          </div>
        </div>

        {/* Right side - User actions */}
        <div className="topbar-right">
          {/* User info */}
          {user?.name && (
            <div className="user-info">
              <span className="user-name">Angemeldet als: {user.name}</span>
            </div>
          )}

          {/* Theme toggle */}
          <button
            className="theme-toggle"
            onClick={onToggleTheme}
            title={isDark ? 'Zu hellem Modus wechseln' : 'Zu dunklem Modus wechseln'}
            aria-label={isDark ? 'Hell' : 'Dunkel'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>

          {/* Logout */}
          <button
            className="logout-button"
            onClick={onLogout}
            aria-label="Abmelden"
          >
            Abmelden
          </button>
        </div>
      </div>
    </header>
  );
});
