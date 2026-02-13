import React, { useMemo, useCallback } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useWebSocket } from '../hooks/useWebSocket';
import { OptimizedImage } from './OptimizedImage';
import { Skeleton } from '../design-system/Skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '../design-system/Card';
import { Badge } from '../design-system/Badge';
import { Button } from '../design-system/Button';
import { TrendingUp, TrendingDown, Minus, Package, Euro, Users, Car } from 'lucide-react';
import { logger } from '../utils/logger';
import './Dashboard.css';

interface DashboardProps {
  className?: string;
}

const StatCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<{ size?: number; className?: string }> | string;
  trend?: 'up' | 'down' | 'neutral';
}> = React.memo(({ title, value, change, icon: Icon, trend = 'neutral' }) => {
  const trendIcon = useMemo(() => {
    switch (trend) {
      case 'up': return TrendingUp;
      case 'down': return TrendingDown;
      default: return Minus;
    }
  }, [trend]);

  const trendColor = useMemo(() => {
    switch (trend) {
      case 'up': return 'success';
      case 'down': return 'error';
      default: return 'default';
    }
  }, [trend]);

  const changeText = useMemo(() => {
    if (change === undefined) return null;
    const sign = change > 0 ? '+' : change < 0 ? '' : '';
    return `${sign}${change}%`;
  }, [change]);

  const TrendIcon = trendIcon;

  return (
    <Card variant="elevated" className="p-6 hover:scale-105 transition-transform">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-neutral-900">{value}</p>
          {changeText && (
            <div className="flex items-center gap-1 mt-2">
              <TrendIcon size={14} className={`text-${trendColor}-600`} />
              <span className={`text-sm font-medium text-${trendColor}-600`}>
                {changeText} vs. letzte Woche
              </span>
            </div>
          )}
        </div>
        <div className="p-3 bg-primary-100 rounded-lg">
          {typeof Icon === 'string' ? (
            <span className="text-2xl">{Icon}</span>
          ) : (
            <Icon size={24} className="text-primary-600" />
          )}
        </div>
      </div>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

const RecentActivity: React.FC<{
  activities: any[];
}> = React.memo(({ activities }) => {
  const formatTimestamp = useCallback((timestamp: string) => {
    return new Intl.DateTimeFormat('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    }).format(new Date(timestamp));
  }, []);

  return (
    <div className="recent-activity">
      <h3>Letzte Aktivitäten</h3>
      <div className="activity-list">
        {activities.slice(0, 5).map((activity, index) => (
          <div key={index} className="activity-item">
            <div className="activity-icon">
              <span>
                {activity.type === 'order' && '🛒'}
                {activity.type === 'user' && '👤'}
                {activity.type === 'restaurant' && '🏪'}
                {activity.type === 'payment' && '💳'}
              </span>
            </div>
            <div className="activity-content">
              <div className="activity-message">{activity.message}</div>
              <div className="activity-timestamp">
                {formatTimestamp(activity.timestamp)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

RecentActivity.displayName = 'RecentActivity';

export const Dashboard: React.FC<DashboardProps> = React.memo(({ className }) => {
  const {
    stats,
    revenueData,
    topRestaurants,
    driverPerformance,
    topPromotions,
    promotionPerformance,
    customerGrowth,
    orderStatusDistribution,
    trends,
    isLoading,
    error,
    refetch
  } = useDashboardData();
  const { isConnected } = useWebSocket();

  const statCards = useMemo(() => {
    if (!stats) return [];

    return [
      {
        title: 'Gesamt Bestellungen',
        value: stats.orders?.total || 0,
        change: trends?.ordersTrend,
        icon: '🛒',
        trend: (trends?.ordersTrend > 0 ? 'up' : trends?.ordersTrend < 0 ? 'down' : 'neutral') as 'up' | 'down' | 'neutral',
      },
      {
        title: 'Gesamtumsatz',
        value: new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR'
        }).format(stats.revenue?.total || 0),
        change: trends?.revenueTrend,
        icon: '💰',
        trend: (trends?.revenueTrend > 0 ? 'up' : trends?.revenueTrend < 0 ? 'down' : 'neutral') as 'up' | 'down' | 'neutral',
      },
      {
        title: 'Aktive Fahrer',
        value: stats.drivers?.active || 0,
        icon: '🚗',
        trend: 'neutral' as 'up' | 'down' | 'neutral',
      },
    ];
  }, [stats, trends]);

  const alerts = useMemo(() => {
    // Dashboard alerts are not implemented yet, return empty array
    return [];
  }, []);

  const recentActivities = useMemo(() => {
    // Recent activities are not implemented in the current dashboard hook
    // This would need to be implemented as a separate endpoint/feature
    return [];
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleAlertAcknowledge = useCallback((alertId: string) => {
    // Implement alert acknowledgment
    logger.info('Alert acknowledged', { alertId });
  }, []);

  if (isLoading) {
    return (
      <div className={`dashboard ${className || ''}`}>
        <div className="dashboard-header">
          <Skeleton variant="text" width={300} height={40} />
          <div className="dashboard-controls">
            <Skeleton variant="rectangular" width={100} height={36} />
          </div>
        </div>

        <div className="stats-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="stat-card">
              <Skeleton variant="circular" width={48} height={48} />
              <div>
                <Skeleton variant="text" width={120} height={20} />
                <Skeleton variant="text" width={80} height={32} />
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-content">
          <div className="dashboard-main">
            <Skeleton variant="rectangular" width="100%" height={300} />
          </div>
          <div className="dashboard-sidebar">
            <Skeleton variant="rectangular" width="100%" height={200} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`dashboard ${className || ''}`}>
        <div className="error-state">
          <h2>Fehler beim Laden des Dashboards</h2>
          <p>{error.message}</p>
          <div className="error-actions">
            <button onClick={handleRefresh} className="retry-button">
              Erneut versuchen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard ${className || ''}`} data-testid="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Willkommen im Admin-Panel</p>
        </div>

        <div className="dashboard-controls">
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {isConnected ? 'Live-Updates aktiv' : 'Offline'}
          </div>

          <select data-testid="dashboard-period" className="period-select">
            <option value="7d">7 Tage</option>
            <option value="30d">30 Tage</option>
            <option value="90d">90 Tage</option>
          </select>

          <button onClick={handleRefresh} className="refresh-button">
            🔄 Aktualisieren
          </button>
        </div>
      </div>

      <div className="stats-grid" data-testid="dashboard-stats">
        {statCards.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            icon={stat.icon}
            trend={stat.trend}
          />
        ))}
      </div>

      {alerts.length > 0 && (
        <div className="alerts-section">
          <h2>Aktive Warnungen</h2>
          <div className="alerts-list">
            {alerts.map((alert, index) => (
              <div key={alert.id || index} className={`alert alert-${alert.type.toLowerCase()}`}>
                <div className="alert-content">
                  <h4>{alert.title}</h4>
                  <p>{alert.message}</p>
                  <small>{new Date(alert.timestamp).toLocaleString('de-DE')}</small>
                </div>
                {!alert.acknowledged && (
                  <button
                    onClick={() => handleAlertAcknowledge(alert.id)}
                    className="alert-acknowledge"
                  >
                    ✓ Bestätigen
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-content" data-testid="dashboard-content">
        <div className="dashboard-main" data-testid="dashboard-charts">
          <div className="dashboard-section">
            <h2>Top Restaurants</h2>
            {topRestaurants ? (
              <div className="top-restaurants-grid">
                {topRestaurants.map((restaurant: any, index: number) => (
                  <div key={restaurant.id || `restaurant-${index}`} className="restaurant-card">
                    <div className="restaurant-info">
                      <h4>{restaurant.name}</h4>
                      <div className="restaurant-stats">
                        <span>{restaurant.orders || 0} Bestellungen</span>
                        <span className="stat-separator">·</span>
                        <span>
                          {new Intl.NumberFormat('de-AT', {
                            style: 'currency',
                            currency: 'EUR'
                          }).format(restaurant.revenue || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Skeleton variant="rectangular" width="100%" height={200} />
            )}
          </div>

          <div className="dashboard-section">
            <h2>Fahrer-Performance</h2>
            {driverPerformance ? (
              <div className="driver-performance-grid">
                {driverPerformance.slice(0, 3).map((driver: any, index: number) => (
                  <div key={driver.id || `driver-${index}`} className="driver-card">
                    <div className="driver-avatar">
                      <OptimizedImage
                        src={driver.avatarUrl || '/default-avatar.png'}
                        alt={driver.name}
                        width={40}
                        height={40}
                      />
                    </div>
                    <div className="driver-info">
                      <h4>{driver.name}</h4>
                      <div className="driver-stats">
                        <span>{driver.completedOrders || 0} Bestellungen</span>
                        <span className="stat-separator">·</span>
                        <span>
                          {new Intl.NumberFormat('de-AT', {
                            style: 'currency',
                            currency: 'EUR'
                          }).format(driver.totalRevenue || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Skeleton variant="rectangular" width="100%" height={150} />
            )}
          </div>
        </div>

        <div className="dashboard-sidebar">
          <RecentActivity activities={recentActivities} />

          <div className="quick-actions">
            <h3>Schnellzugriff</h3>
            <div className="quick-actions-grid">
              <button
                onClick={() => window.location.href = '/admin/restaurants'}
                className="quick-action-card"
              >
                <span className="action-icon">🏪</span>
                <span className="action-label">Restaurants</span>
              </button>
              <button
                onClick={() => window.location.href = '/admin/orders'}
                className="quick-action-card"
              >
                <span className="action-icon">📋</span>
                <span className="action-label">Bestellungen</span>
              </button>
              <button
                onClick={() => window.location.href = '/admin/users'}
                className="quick-action-card"
              >
                <span className="action-icon">👥</span>
                <span className="action-label">Benutzer</span>
              </button>
              <button
                onClick={() => window.location.href = '/admin/analytics'}
                className="quick-action-card"
              >
                <span className="action-icon">📊</span>
                <span className="action-label">Analytics</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';
