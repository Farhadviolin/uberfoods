import { useState, useEffect } from 'react';
import { MapPin, Users, TrendingUp, Clock, Zap } from 'lucide-react';
import { Card } from '../design-system/Card';
import { Skeleton } from '../design-system/Skeleton';
import { useTranslation } from 'react-i18next';
import {
  useLiveOrders,
  useTrendingOrders,
  useLiveOrdersWebSocket,
  type LiveOrder,
  type TrendingOrder,
} from '../hooks/useLiveSocialOrdering';
import './LiveSocialOrdering.css';

export function LiveSocialOrdering() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>([]);
  const [trendingOrders, setTrendingOrders] = useState<TrendingOrder[]>([]);

  // API Hooks
  const { data: initialLiveOrders = [], isLoading: liveOrdersLoading } = useLiveOrders();
  const { data: initialTrendingOrders = [], isLoading: trendingLoading } = useTrendingOrders();

  // WebSocket für Real-time Updates
  useLiveOrdersWebSocket(
    (newOrder) => {
      setLiveOrders(prev => [newOrder, ...prev.slice(0, 49)]);
    },
    (trending) => {
      setTrendingOrders(trending);
    }
  );

  // Initial data setzen
  useEffect(() => {
    if (initialLiveOrders && Array.isArray(initialLiveOrders) && initialLiveOrders.length > 0) {
      setLiveOrders(initialLiveOrders);
    }
    if (initialTrendingOrders && Array.isArray(initialTrendingOrders) && initialTrendingOrders.length > 0) {
      setTrendingOrders(initialTrendingOrders);
    }
  }, [initialLiveOrders, initialTrendingOrders]);

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const orderTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return t('liveSocial.justNow');
    if (diffInMinutes < 60) return t('liveSocial.minutesAgo', { minutes: diffInMinutes });
    const diffInHours = Math.floor(diffInMinutes / 60);
    return t('liveSocial.hoursAgo', { hours: diffInHours });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="trend-icon up" />;
      case 'down':
        return <TrendingUp className="trend-icon down" />;
      default:
        return null;
    }
  };

  return (
    <Card variant="elevated" className="live-social-ordering-card">
      <div className="live-header">
        <div className="live-title">
          <Zap className="live-icon" />
          <div>
            <h3>Live Social Ordering</h3>
            <p className="live-subtitle">{t('liveSocial.subtitle')}</p>
          </div>
        </div>
        <button
          className="live-toggle-btn"
          onClick={() => setIsVisible(!isVisible)}
          aria-label={isVisible ? t('liveSocial.hide') : t('liveSocial.show')}
        >
          {isVisible ? '−' : '+'}
        </button>
      </div>

      {isVisible && (
        <>
          <div className="trending-section">
            <h4>
              <TrendingUp className="section-icon" />
              {t('liveSocial.trendingNow')}
            </h4>
            <div className="trending-list">
              {trendingLoading ? (
                <div style={{ padding: '1rem' }}>
                  <Skeleton variant="rectangular" width="100%" height="60px" />
                </div>
              ) : trendingOrders.length === 0 ? (
                <div className="no-trending">
                  <p>{t('liveSocial.noTrending')}</p>
                </div>
              ) : (
                trendingOrders.map((item, index) => (
                <div key={`${item.restaurant}-${item.dish}`} className="trending-item">
                  <div className="trending-rank">#{index + 1}</div>
                  <div className="trending-info">
                    <div className="trending-header">
                      <span className="trending-dish">{item.dish}</span>
                      {item.trend ? getTrendIcon(item.trend) : null}
                    </div>
                    <div className="trending-details">
                      <span className="trending-restaurant">{item.restaurantName || (typeof item.restaurant === 'string' ? item.restaurant : item.restaurant?.name) || ''}</span>
                      <span className="trending-count">{item.count} {t('liveSocial.orders')}</span>
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>
          </div>

          <div className="live-orders-section">
            <h4>
              <Users className="section-icon" />
              {t('liveSocial.liveOrders')}
            </h4>
            <div className="live-orders-list">
              {liveOrdersLoading ? (
                <div style={{ padding: '1rem' }}>
                  <Skeleton variant="rectangular" width="100%" height="80px" />
                </div>
              ) : liveOrders.length > 0 ? (
                liveOrders.map((order) => (
                  <div key={order.id} className="live-order-item">
                    <div className="live-order-header">
                      <div className="live-order-user">
                        <div className="user-avatar-small">
                          {order.userName ? order.userName.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <div className="user-name-small">{order.userName || t('liveSocial.anonymous')}</div>
                          <div className="order-time-ago">{order.timestamp ? formatTimeAgo(order.timestamp) : ''}</div>
                        </div>
                      </div>
                      <MapPin className="location-icon" />
                    </div>
                    <div className="live-order-content">
                      <div className="order-dish">{order.dish}</div>
                      <div className="order-restaurant">{order.restaurant}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-live-orders">
                  <Clock className="no-orders-icon" />
                  <p>{t('liveSocial.noLiveOrders')}</p>
                </div>
              )}
            </div>
          </div>

          <div className="live-stats">
            <div className="live-stat">
              <Users className="stat-icon" />
              <div>
                <div className="stat-value">{liveOrders.length}</div>
                <div className="stat-label">{t('liveSocial.liveOrders')}</div>
              </div>
            </div>
            <div className="live-stat">
              <TrendingUp className="stat-icon" />
              <div>
                <div className="stat-value">{trendingOrders.length}</div>
                <div className="stat-label">{t('liveSocial.trendingItems')}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

