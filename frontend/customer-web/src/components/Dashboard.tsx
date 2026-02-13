import React, { useMemo, useCallback } from 'react';
import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics';
import { useGamificationStats as useGamification } from '../hooks/useGamification';
import { useRecentOrders } from '../hooks/useRecentOrders';
import { OptimizedImage } from './OptimizedImage';
import { Skeleton } from '../design-system/Skeleton';

interface DashboardProps {
  userId: string;
}

const StatCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: string;
}> = React.memo(({ title, value, change, icon }) => {
  const changeColor = useMemo(() => {
    if (!change) return 'neutral';
    return change > 0 ? 'positive' : 'negative';
  }, [change]);

  const changeText = useMemo(() => {
    if (!change) return null;
    const sign = change > 0 ? '+' : '';
    return `${sign}${change}%`;
  }, [change]);

  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <h3 className="stat-title">{title}</h3>
        <div className="stat-value">{value}</div>
        {changeText && (
          <div className={`stat-change ${changeColor}`}>
            {changeText} vs. letzte Woche
          </div>
        )}
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';

const RecentOrderCard: React.FC<{
  order: any;
  onClick: () => void;
}> = React.memo(({ order, onClick }) => {
  const statusColor = useMemo(() => {
    switch (order.status) {
      case 'DELIVERED': return 'success';
      case 'IN_TRANSIT': return 'warning';
      case 'PREPARING': return 'info';
      default: return 'neutral';
    }
  }, [order.status]);

  const formattedDate = useMemo(() =>
    new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(order.createdAt)),
    [order.createdAt]
  );

  const formattedTotal = useMemo(() =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(order.total),
    [order.total]
  );

  return (
    <div className="recent-order-card" onClick={onClick}>
      <div className="order-header">
        <span className="order-id">#{order.id.slice(-6)}</span>
        <span className={`order-status ${statusColor}`}>
          {order.status.replace('_', ' ')}
        </span>
      </div>

      <div className="order-restaurant">
        {order.restaurantName}
      </div>

      <div className="order-details">
        <span className="order-date">{formattedDate}</span>
        <span className="order-total">{formattedTotal}</span>
      </div>

      <div className="order-items-count">
        {order.items?.length || 0} Artikel
      </div>
    </div>
  );
});

RecentOrderCard.displayName = 'RecentOrderCard';

export const Dashboard: React.FC<DashboardProps> = React.memo(({ userId }) => {
  const { data: analytics, isLoading: analyticsLoading } = useDashboardAnalytics(userId);
  const { data: gamification } = useGamification();
  const { data: recentOrders, isLoading: ordersLoading } = useRecentOrders(userId);

  const stats = useMemo(() => {
    if (!analytics) return [];

    return [
      {
        title: 'Gesamt Bestellungen',
        value: analytics.totalOrders,
        change: analytics.ordersChange,
        icon: '🛒',
      },
      {
        title: 'Ausgaben diesen Monat',
        value: new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR'
        }).format(analytics.monthlySpending),
        change: analytics.spendingChange,
        icon: '💰',
      },
      {
        title: 'Lieblingsrestaurant',
        value: analytics.favoriteRestaurant || 'Noch keine',
        icon: '❤️',
      },
      {
        title: 'Ø Bestellwert',
        value: new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR'
        }).format(analytics.averageOrderValue),
        icon: '📊',
      },
    ];
  }, [analytics]);

  const handleOrderClick = useCallback((orderId: string) => {
    // Navigate to order details
    window.location.href = `/orders/${orderId}`;
  }, []);

  const handleStatClick = useCallback((statType: string) => {
    // Navigate to detailed view
    switch (statType) {
      case 'orders':
        window.location.href = '/orders';
        break;
      case 'favorites':
        window.location.href = '/favorites';
        break;
      case 'analytics':
        window.location.href = '/analytics';
        break;
    }
  }, []);

  if (analyticsLoading) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <Skeleton variant="text" width={200} height={32} />
          <Skeleton variant="text" width={150} height={24} />
        </div>

        <div className="stats-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="stat-card">
              <Skeleton variant="circular" width={48} height={48} />
              <div>
                <Skeleton variant="text" width={120} height={20} />
                <Skeleton variant="text" width={80} height={28} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Willkommen zurück!</h1>
        <p>Hier ist Ihr persönliches Dashboard</p>
      </div>

      {gamification && (
        <div className="gamification-banner">
          <div className="level-info">
            <span className="level">Level {gamification.level}</span>
            <div className="xp-bar">
              <div
                className="xp-fill"
                style={{ width: `${((gamification.xp || 0) / ((gamification.xpToNextLevel || 1500) + (gamification.xp || 0))) * 100}%` }}
              />
            </div>
            <span className="xp-text">
              {gamification.xp} / {(gamification.xpToNextLevel || 1500) + (gamification.xp || 0)} XP
            </span>
          </div>

          {/* Next milestone - simplified since properties don't exist */}
          <div className="next-milestone">
            <span>Level {((gamification.level || 1) + 1)} in {(gamification.xpToNextLevel || 1500)} XP</span>
          </div>
        </div>
      )}

      <div className="stats-grid">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            icon={stat.icon}
          />
        ))}
      </div>

      <div className="dashboard-content">
        <div className="recent-orders-section">
          <h2>Letzte Bestellungen</h2>

          {ordersLoading ? (
            <div className="orders-loading">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="order-card-skeleton">
                  <Skeleton variant="rectangular" width="100%" height={80} />
                </div>
              ))}
            </div>
          ) : recentOrders && recentOrders.length > 0 ? (
            <div className="recent-orders-grid">
              {recentOrders.slice(0, 3).map((order) => (
                <RecentOrderCard
                  key={order.id}
                  order={order}
                  onClick={() => handleOrderClick(order.id)}
                />
              ))}
            </div>
          ) : (
            <div className="no-orders">
              <p>Noch keine Bestellungen vorhanden</p>
              <button
                className="cta-button"
                onClick={() => window.location.href = '/restaurants'}
              >
                Jetzt bestellen
              </button>
            </div>
          )}

          {recentOrders && recentOrders.length > 3 && (
            <button
              className="view-all-button"
              onClick={() => window.location.href = '/orders'}
            >
              Alle Bestellungen anzeigen
            </button>
          )}
        </div>

        {analytics?.personalizedRecommendations && (
          <div className="recommendations-section">
            <h2>Empfehlungen für Sie</h2>
            <div className="recommendations-grid">
              {analytics.personalizedRecommendations.map((rec: any) => (
                <div key={rec.id} className="recommendation-card">
                  <OptimizedImage
                    src={rec.imageUrl}
                    alt={rec.name}
                    width={120}
                    height={80}
                  />
                  <div className="recommendation-info">
                    <h4>{rec.name}</h4>
                    <p>{rec.description}</p>
                    <span className="recommendation-reason">{rec.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';