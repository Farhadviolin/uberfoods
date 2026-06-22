import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../hooks/useOrders';
import api from '../utils/api';
import { getImageUrl, getDishPlaceholder } from '../utils/imageUtils';
import { logError } from '../utils/errorReporting';
import { OrderItem, AxiosErrorWithResponse } from '../types';
import './OrderHistory.css';

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  address: string;
  phone: string;
  createdAt: string;
  restaurant: {
    id: string;
    name: string;
  };
  driver: {
    id: string;
    name: string;
  } | null;
  items: Array<{
    dish: {
      id: string;
      name: string;
      imageUrl: string;
    };
    quantity: number;
    price: number;
  }>;
}

const statusColors: Record<string, string> = {
  PENDING: '#65676B',
  CONFIRMED: '#1877F2',
  PREPARING: '#F59E0B',
  READY: '#10B981',
  ACCEPTED: '#8B5CF6',
  PICKED_UP: '#6366F1',
  IN_TRANSIT: '#3B82F6',
  DELIVERED: '#10B981',
  CANCELLED: '#EF4444',
};

export function OrderHistory() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { data: ordersData = [], isLoading: loading } = useOrders();
  const [error, setError] = useState<string | null>(null);
  const [reordering, setReordering] = useState<string | null>(null);
  const navigate = useNavigate();

  const getStatusLabel = (status: string) => {
    return t(`orderHistory.status.${status.toLowerCase()}`) || status;
  };

  const handleReorder = async (order: Order) => {
    setReordering(order.id);
    try {
      // Verwende neuen Re-Order Endpoint
      const response = await api.post(`/orders/${order.id}/reorder`);
      const newOrder = response.data;

      // Navigiere zur neuen Bestellung
      navigate(`/orders/${newOrder.id}`);
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorWithResponse;
      const errorMessage = axiosError.response?.data?.message || t('orderHistory.reorderError');
      setError(errorMessage);
      logError(err, { component: 'OrderHistory', action: 'handleReorder', metadata: { orderId: order.id } });
      
      // Falls Fehler, versuche alte Methode (Fallback)
      if (axiosError.response?.status === 404 || axiosError.response?.status === 400) {
        try {
          // Hole Bestelldetails für Warenkorb
          const orderResponse = await api.get(`/orders/${order.id}`);
          const orderDetails = orderResponse.data;

          // Erstelle Warenkorb aus Bestellung
          const cartItems = orderDetails.items.map((item: OrderItem & { dish?: unknown; modifications?: unknown; specialInstructions?: string }) => ({
            dish: item.dish,
            quantity: item.quantity,
            modifications: item.modifications,
            specialInstructions: item.specialInstructions,
          }));

          // Speichere Warenkorb in localStorage
          localStorage.setItem(`cart_${order.restaurant.id}`, JSON.stringify(cartItems));

          // Navigiere zum Restaurant-Menü
          navigate(`/restaurant/${order.restaurant.id}`);
        } catch (fallbackErr) {
          logError(fallbackErr as Error, { component: 'OrderHistory', action: 'handleReorder', metadata: { step: 'fallback', orderId: order.id } });
        }
      }
    } finally {
      setReordering(null);
    }
  };

  if (!isAuthenticated && ordersData.length === 0 && !loading) {
    return (
      <div className="auth-required" style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
        <h2>{t('orderHistory.noOrders')}</h2>
        <p style={{ marginTop: '12px', color: '#65676B' }}>
          {error || t('orderHistory.noOrdersMessage')}
        </p>
        <Link to="/" style={{ display: 'inline-block', marginTop: '20px', padding: '12px 24px', background: 'var(--primary-500, #1877F2)', color: 'white', borderRadius: '8px', textDecoration: 'none' }}>
          {t('orderHistory.orderNow')}
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading">
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍕</div>
        <div>{t('orderHistory.loading')}</div>
      </div>
    );
  }

  return (
    <div>
      <h1>{t('orderHistory.title')}</h1>
      {error && <div className="error">{error}</div>}

      {ordersData.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <p>{t('orderHistory.emptyState')}</p>
          <Link to="/" className="browse-button">{t('orderHistory.browseRestaurants')}</Link>
        </div>
      ) : (
        <div className="orders-list">
          {(ordersData as Order[]).map((order: Order) => (
            <Link 
              key={order.id} 
              to={`/orders/${order.id}`}
              className="order-card"
            >
              <div className="order-header">
                <div>
                  <h3>{order.restaurant.name}</h3>
                  <p className="order-date">
                    {new Date(order.createdAt).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-US', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div 
                  className="status-badge"
                  style={{ backgroundColor: `${statusColors[order.status]}20`, color: statusColors[order.status] }}
                >
                  {getStatusLabel(order.status)}
                </div>
              </div>
              
              <div className="order-items">
                {order.items.slice(0, 3).map((item, idx: number) => (
                  <div key={idx} className="order-item-preview">
                    {item.dish.imageUrl && (
                      <img 
                        src={getImageUrl(item.dish.imageUrl)}
                        alt={item.dish.name}
                        className="item-image"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getDishPlaceholder();
                        }}
                      />
                    )}
                    <span>{item.dish.name} × {item.quantity}</span>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <p className="more-items">{t('orderHistory.moreItems', { count: order.items.length - 3 })}</p>
                )}
              </div>

              <div className="order-footer">
                <div className="order-total">
                  {order.totalAmount.toFixed(2)} €
                </div>
                {order.driver && (
                  <div className="driver-info">
                    🚗 {order.driver.name}
                  </div>
                )}
              </div>
              <div className="order-actions">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleReorder(order);
                  }}
                  className="reorder-btn"
                  disabled={reordering === order.id}
                >
                  {reordering === order.id ? t('orderHistory.reordering') : t('orderHistory.reorder')}
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

