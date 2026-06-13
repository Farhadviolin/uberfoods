import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { getImageUrl, getDishPlaceholder } from '../utils/imageUtils';
import { useWebSocket } from '../hooks/useWebSocket';
import { Chat } from './Chat';
import { LiveTracking } from './LiveTracking';
import { NotificationService } from '../services/notificationService';
import { logError } from '../utils/errorReporting';
import { handleKeyboardButton } from '../utils/accessibility';
import { AxiosErrorWithResponse } from '../types';
import './OrderTracking.css';

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  address: string;
  phone: string;
  notes?: string;
  createdAt: string;
  restaurant: {
    id: string;
    name: string;
    address: string;
  };
  driver: {
    id: string;
    name: string;
    phone: string;
  } | null;
  items: Array<{
    dish: {
      id: string;
      name: string;
      imageUrl: string;
      price: number;
    };
    quantity: number;
    price: number;
  }>;
}

// Status Steps werden dynamisch übersetzt
const getStatusSteps = (t: (key: string) => string) => [
  { key: 'CONFIRMED', label: t('order.status.confirmed'), icon: '✓' },
  { key: 'PREPARING', label: t('order.status.preparing'), icon: '👨‍🍳' },
  { key: 'READY', label: t('order.status.ready'), icon: '✅' },
  { key: 'ACCEPTED', label: t('order.status.out_for_delivery'), icon: '🚗' },
  { key: 'PICKED_UP', label: t('order.status.out_for_delivery'), icon: '📦' },
  { key: 'IN_TRANSIT', label: t('order.status.out_for_delivery'), icon: '🚚' },
  { key: 'DELIVERED', label: t('order.status.delivered'), icon: '🎉' },
];

const statusOrder: Record<string, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  PREPARING: 2,
  READY: 3,
  ACCEPTED: 4,
  PICKED_UP: 5,
  IN_TRANSIT: 6,
  DELIVERED: 7,
  CANCELLED: -1,
};

export function OrderTracking() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const { user } = useAuth();

  const fetchOrder = useCallback(async (orderId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/orders/${orderId}`);
      setOrder(response.data);
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorWithResponse;
      if (axiosError.response?.status === 404) {
        setError('Bestellung nicht gefunden');
      } else {
        setError('Fehler beim Laden der Bestellung');
      }
      logError(err, { component: 'OrderTracking', action: 'fetchOrder', metadata: { orderId } });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchOrder(id);
    }
  }, [id, fetchOrder]);

  // WebSocket für Real-time Updates
  useWebSocket(
    user?.id || null,
    (updatedOrder) => {
      if (updatedOrder.id === id) {
        setOrder(updatedOrder as unknown as Order);
        // Push-Notification bei Status-Änderung
        NotificationService.showOrderUpdate(
          updatedOrder.id,
          updatedOrder.status,
          `Status geändert: ${updatedOrder.status}`
        );
      }
    }
  );
  // Note: useWebSocket Hook wird hier nur für Side-Effects verwendet, kein Return-Wert nötig

  // Push-Notifications aktivieren beim Laden
  useEffect(() => {
    NotificationService.requestPermission();
  }, []);

  const [guestEmail, setGuestEmail] = useState<string>('');
  const [showGuestEmailInput, setShowGuestEmailInput] = useState(false);

  const fetchOrderDetails = useCallback(async (orderId: string) => {
    try {
      setLoading(true);
      // Wenn eingeloggt, normale Anfrage
      if (user) {
        const response = await api.get(`/orders/${orderId}`);
        setOrder(response.data);
        setError(null);
      } else {
        // Wenn nicht eingeloggt, prüfe ob E-Mail in LocalStorage gespeichert ist
        const savedGuestEmail = localStorage.getItem(`guest_order_${orderId}`);
        if (savedGuestEmail) {
          const response = await api.get(`/orders/${orderId}?email=${encodeURIComponent(savedGuestEmail)}`);
          setOrder(response.data);
          setError(null);
          setGuestEmail(savedGuestEmail);
        } else {
          // Zeige E-Mail-Eingabe für Guest-Orders
          setShowGuestEmailInput(true);
          setError(null);
        }
      }
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorWithResponse;
      // Bei 401/403 Fehlern (nicht eingeloggt oder falsche E-Mail)
      if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        if (!user) {
          setShowGuestEmailInput(true);
          setError('Bitte geben Sie die E-Mail-Adresse an, die Sie bei der Bestellung verwendet haben');
        } else {
          setError('Sie sind nicht berechtigt, diese Bestellung einzusehen');
        }
      } else {
        setError(axiosError.response?.data?.message || 'Fehler beim Laden der Bestellung');
        logError(err, { component: 'OrderTracking', action: 'fetchOrder', metadata: { orderId } });
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleGuestEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestEmail || !id) return;

    try {
      setLoading(true);
      const response = await api.get(`/orders/${id}?email=${encodeURIComponent(guestEmail)}`);
      setOrder(response.data);
      setError(null);
      setShowGuestEmailInput(false);
      // Speichere E-Mail für zukünftige Besuche
      localStorage.setItem(`guest_order_${id}`, guestEmail);
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorWithResponse;
      setError(axiosError.response?.data?.message || 'Fehler beim Laden der Bestellung. Bitte überprüfen Sie Ihre E-Mail-Adresse.');
      logError(err, { component: 'OrderTracking', action: 'handleGuestEmailSubmit', metadata: { orderId: id } });
    } finally {
      setLoading(false);
    }
  };

  const canCancel = order && (order.status === 'PENDING' || order.status === 'CONFIRMED');

  const handleCancel = async () => {
    if (!order || !cancelReason.trim()) return;

    setCancelling(true);
    try {
      await api.post(`/orders/${order.id}/cancel`, {
        reason: cancelReason,
      });
      // Bestellung neu laden
      await fetchOrderDetails(order.id);
      setShowCancelModal(false);
      setCancelReason('');
    } catch (err: unknown) {
      const axiosError = err as AxiosErrorWithResponse;
      setError(axiosError.response?.data?.message || 'Fehler beim Stornieren der Bestellung');
      logError(err, { component: 'OrderTracking', action: 'handleCancel', metadata: { orderId: order?.id } });
    } finally {
      setCancelling(false);
    }
  };

  const statusSteps = getStatusSteps(t);

  if (loading) {
    return (
      <div className="loading">
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍕</div>
        <div>{t('common.loading')}</div>
      </div>
    );
  }

  if (showGuestEmailInput && !order) {
    return (
      <div>
        <Link to="/orders" className="fb-back-button">← {t('common.back')} {t('order.title')}</Link>
        <div style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto' }}>
          <h2>Bestellung verfolgen</h2>
          <p style={{ marginBottom: '20px', color: '#65676B' }}>
            Bitte geben Sie die E-Mail-Adresse ein, die Sie bei der Bestellung verwendet haben:
          </p>
          {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}
          <form onSubmit={handleGuestEmailSubmit}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>E-Mail-Adresse *</label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                required
                placeholder="ihre@email.de"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color, #E4E6EB)', fontSize: '16px' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !guestEmail}
              style={{ width: '100%', padding: '12px', background: 'var(--primary-500, #1877F2)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: loading || !guestEmail ? 'not-allowed' : 'pointer' }}
            >
              {loading ? t('common.loading') : t('orderTracking.showOrder')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <Link to="/orders" className="fb-back-button">← {t('common.back')} {t('order.title')}</Link>
        <div className="error">{error || t('order.noOrders')}</div>
      </div>
    );
  }

  const currentStep = statusOrder[order.status] || 0;
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div data-testid="order-tracking-page">
      <Link to="/orders" className="fb-back-button">← {t('common.back')} {t('order.title')}</Link>

      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{t('order.cancel')}</h3>
            <p>{t('order.cancelReason', { defaultValue: 'Bitte geben Sie einen Grund für die Stornierung an:' })}</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={t('order.cancelPlaceholder', { defaultValue: 'z.B. Falsche Bestellung, Änderung der Pläne...' })}
              rows={4}
              className="cancel-reason-input"
            />
            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                className="cancel-btn"
                disabled={cancelling}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCancel}
                className="confirm-cancel-btn"
                disabled={cancelling || !cancelReason.trim()}
              >
                {cancelling ? t('order.cancelling', { defaultValue: 'Wird storniert...' }) : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="order-tracking">
        <div className="order-header-card">
          <h2>{t('order.orderNumber', { id: order.id.slice(0, 8) })}</h2>
          <div className="order-restaurant">
            <strong>{order.restaurant.name}</strong>
            <p>📍 {order.restaurant.address}</p>
          </div>
        </div>

        {!isCancelled && (
          <div className="status-timeline">
            {statusSteps.map((step, index) => {
              const stepOrder = statusOrder[step.key];
              const isActive = currentStep >= stepOrder;
              const isCurrent = currentStep === stepOrder;

              return (
                <div key={step.key} className={`timeline-step ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}>
                  <div className="step-icon">{step.icon}</div>
                  <div className="step-label">{step.label}</div>
                  {index < statusSteps.length - 1 && (
                    <div className={`step-line ${isActive ? 'active' : ''}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isCancelled && (
          <div className="cancelled-badge">
            ❌ {t('order.status.cancelled')}
          </div>
        )}

        <div className="order-actions-section" role="group" aria-label={t('order.title')}>
          {canCancel && !isCancelled && (
            <button
              onClick={() => setShowCancelModal(true)}
              onKeyDown={(e) => handleKeyboardButton(e, () => setShowCancelModal(true))}
              className="cancel-order-btn"
              aria-label={t('order.cancel')}
            >
              {t('order.cancel')}
            </button>
          )}
          {!isCancelled && (
            <>
              <button
                onClick={() => setShowChat(!showChat)}
                onKeyDown={(e) => handleKeyboardButton(e, () => setShowChat(!showChat))}
                className="chat-toggle-btn"
                aria-label={showChat ? t('accessibility.closeChat') : t('accessibility.openChat')}
                aria-expanded={showChat}
              >
                {showChat ? `✕ ${t('accessibility.closeChat')}` : `💬 ${t('accessibility.openChat')}`}
              </button>
              {order.driver && (
                <button
                  onClick={() => setShowTracking(!showTracking)}
                  onKeyDown={(e) => handleKeyboardButton(e, () => setShowTracking(!showTracking))}
                  className="tracking-toggle-btn"
                  aria-label={showTracking ? t('accessibility.closeTracking') : t('accessibility.openTracking')}
                  aria-expanded={showTracking}
                >
                  {showTracking ? `✕ ${t('accessibility.closeTracking')}` : `📍 ${t('accessibility.openTracking')}`}
                </button>
              )}
            </>
          )}
        </div>

        {order.driver && (
          <div className="driver-card">
            <h3>{t('order.driver')}</h3>
            <div className="driver-info">
              <div className="driver-name">🚗 {order.driver.name}</div>
              <a href={`tel:${order.driver.phone}`} className="driver-phone" aria-label={t('order.contactDriver')}>
                📞 {order.driver.phone}
              </a>
            </div>
          </div>
        )}

        <div className="order-details-card">
          <h3>{t('order.items')}</h3>
          <div className="order-items-list">
            {order.items.map((item, idx) => (
              <div key={idx} className="order-item">
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
                <div className="item-info">
                  <strong>{item.dish.name}</strong>
                  <span>{item.quantity} × {item.price.toFixed(2)} €</span>
                </div>
                <div className="item-total">
                  {(item.quantity * item.price).toFixed(2)} €
                </div>
              </div>
            ))}
          </div>
          <div className="order-summary">
            <div className="summary-row">
              <span>{t('cart.subtotal')}</span>
              <span>{order.totalAmount.toFixed(2)} €</span>
            </div>
            <div className="summary-row total">
              <span>{t('cart.total')}</span>
              <span>{order.totalAmount.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        <div className="delivery-info-card">
          <h3>{t('order.deliveryAddress')}</h3>
          <p><strong>{t('restaurant.address')}:</strong> {order.address}</p>
          <p><strong>{t('auth.phone')}:</strong> {order.phone}</p>
          {order.notes && (
            <p><strong>{t('order.notes', { defaultValue: 'Hinweise' })}:</strong> {order.notes}</p>
          )}
          <p className="order-time">
            {t('order.orderedAt')}: {new Date(order.createdAt).toLocaleString(i18n.language === 'de' ? 'de-DE' : 'en-US')}
          </p>
        </div>

        {showChat && (
          <div className="chat-section">
            <Chat />
          </div>
        )}

        {showTracking && order.driver && (
          <div className="tracking-section">
            <LiveTracking />
          </div>
        )}
      </div>
    </div>
  );
}

