import { useState, memo, useEffect } from 'react';
import { Order, AcceptanceScore } from '../types';
import { Chat } from './Chat';
import { Geofencing } from './Geofencing';
import { QRCodeScanner } from './QRCodeScanner';
import { PhotoUpload } from './PhotoUpload';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../hooks/useLocation';
import { useSmartAcceptance } from '../hooks/useSmartAcceptance';
import { useSubscription } from '../hooks/useSubscription';
import { PhoneIcon, MessageIcon, CameraIcon, QRIcon, LocationIcon, RestaurantIcon, UserIcon, CheckIcon, XIcon, NavigationIcon, AIIcon } from './Icons';
import { logger } from '../utils/logger';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { sanitizePhoneNumber, isValidPhoneNumber } from '../utils/phoneSanitizer';
import './OrderCard.css';

interface OrderCardProps {
  order: Order;
  onStatusUpdate: (orderId: string, status: string) => void;
  onAccept?: (orderId: string) => Promise<void>;
  onReject?: (orderId: string, reason?: string) => Promise<void>;
  showAISuggestions?: boolean;
}

export const OrderCard = memo(function OrderCard({
  order,
  onStatusUpdate,
  onAccept,
  onReject,
  showAISuggestions = true
}: OrderCardProps) {
  const { driver } = useAuth();
  const { location: currentLocation } = useLocation();
  const { subscription } = useSubscription();
  const { t, i18n } = useTranslation();
  const [showChat, setShowChat] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [aiScore, setAiScore] = useState<AcceptanceScore | null>(null);

  // Smart Acceptance Hook - nur für verfügbare Bestellungen
  const isAssignableOrder = order.status === 'ACCEPTED' && !order.driverId;
  const { analyzeOrder: analyzeWithAI, getScore } = useSmartAcceptance(
    driver,
    [order],
    { enabled: showAISuggestions && !!driver && isAssignableOrder },
    currentLocation || undefined
  );

  // Automatische KI-Analyse beim ersten Laden
  useEffect(() => {
    if (showAISuggestions && isAssignableOrder && driver && !aiScore) {
      analyzeWithAI(order).then(score => {
        if (score) setAiScore(score);
      }).catch(error => {
        logger.warn('KI-Analyse fehlgeschlagen', 'OrderCard', error);
      });
    }
  }, [showAISuggestions, isAssignableOrder, driver, aiScore, analyzeWithAI, order]);

  // Score aus Hook verwenden wenn verfügbar
  const currentScore = aiScore || getScore(order.id);

  const getStatusColor = (status: string) => {
    // UberEats Style Colors
    const colors: Record<string, string> = {
      PENDING: '#FF9500',      // Orange
      CONFIRMED: '#00A8E8',     // Cyan
      PREPARING: '#FF9500',     // Orange
      READY: '#06C167',         // UberEats Green
      ACCEPTED: '#007AFF',      // iOS Blue
      PICKED_UP: '#8E44AD',     // Purple
      IN_TRANSIT: '#007AFF',    // iOS Blue
      DELIVERED: '#06C167',     // UberEats Green
      CANCELLED: '#FF3B30',     // Red
    };
    return colors[status] || '#8E8E93';
  };

  const getStatusText = (status: string) => t(`order.status.${status}`, { defaultValue: status });

  return (
    <div
      className="order-card"
      data-testid={`driver-order-card-${order.id}`}
      data-order-id={order.id}
      data-status={order.status}
    >
      <div className="order-header">
        <div>
          <h3>{t('order.title', { id: order.id.slice(-8) })}</h3>
          <p className="order-date">
            {new Date(order.createdAt).toLocaleString(i18n.language || 'de-DE')}
          </p>
        </div>
        <div
          className="status-badge"
          style={{ backgroundColor: getStatusColor(order.status) }}
        >
          {getStatusText(order.status)}
        </div>
      </div>

      {/* KI-Empfehlung für verfügbare Bestellungen */}
      {showAISuggestions && currentScore && isAssignableOrder && (
        <div className={`ai-recommendation ${currentScore.recommendation}`}>
          <div className="ai-header">
            <AIIcon size={16} className="ai-icon" />
            <span className="ai-label">{t('order.ai.label')}</span>
            <span className="ai-score">{currentScore.overall}/100</span>
          </div>

          <div className="ai-details">
            <div className="ai-recommendation-text">
              {currentScore.recommendation === 'auto_accept' && t('order.ai.auto')}
              {currentScore.recommendation === 'accept' && t('order.ai.accept')}
              {currentScore.recommendation === 'wait' && t('order.ai.wait')}
              {currentScore.recommendation === 'decline' && t('order.ai.decline')}
            </div>

            <div className="ai-factors">
              <div className="ai-factor">
                <span className="factor-label">{t('order.ai.reason.earnings')}</span>
                <span className={`factor-value ${currentScore.factors.earnings > 70 ? 'good' : currentScore.factors.earnings > 40 ? 'medium' : 'poor'}`}>
                  {currentScore.estimatedEarnings.toFixed(2)}€
                </span>
              </div>
              <div className="ai-factor">
                <span className="factor-label">{t('order.ai.reason.time')}</span>
                <span className={`factor-value ${currentScore.factors.time > 70 ? 'good' : currentScore.factors.time > 40 ? 'medium' : 'poor'}`}>
                  {currentScore.estimatedTime}min
                </span>
              </div>
            </div>

            {currentScore.reasoning.length > 0 && (
              <div className="ai-reasoning">
                {currentScore.reasoning.slice(0, 2).map((reason, idx) => (
                  <div key={idx} className="ai-reason">{reason}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="order-section">
        <h4>
          <RestaurantIcon size={16} className="order-section-icon" />
          {t('order.section.restaurant')}
        </h4>
        <p><strong>{order.restaurant.name}</strong></p>
        <p className="order-address">{order.restaurant.address}</p>
      </div>

      <div className="order-section">
        <h4>
          <UserIcon size={16} className="order-section-icon" />
          {t('order.section.customer')}
        </h4>
        <p><strong>{order.customer.name}</strong></p>
        <p className="order-phone">
          <PhoneIcon size={14} className="order-phone-icon" />
          {order.customer.phone}
        </p>
        <div className="customer-contact-actions">
          <button
            className="call-customer-button"
            onClick={async () => {
              if (!driver?.id) return;
              const sanitizedPhone = sanitizePhoneNumber(order.customer.phone);
              if (!sanitizedPhone) {
                alert(t('order.actions.invalidPhone', { defaultValue: 'Ungültige Telefonnummer' }));
                return;
              }
              try {
                const response = await api.post(`/drivers/${driver.id}/orders/${order.id}/call`);
                if (response.data.success) {
                  window.location.href = `tel:${sanitizedPhone}`;
                }
              } catch (error: unknown) {
                logger.error('Fehler beim Anruf-API-Call', 'OrderCard', error);
                // Fallback: Direkter Anruf
                window.location.href = `tel:${sanitizedPhone}`;
              }
            }}
          >
            <PhoneIcon size={18} className="button-icon" />
            {t('order.actions.call')}
          </button>
          <button
            className="sms-customer-button"
            onClick={async () => {
              if (!driver?.id) return;
              const sanitizedPhone = sanitizePhoneNumber(order.customer.phone);
              if (!isValidPhoneNumber(sanitizedPhone)) {
                alert(t('order.actions.invalidPhone', { defaultValue: 'Ungültige Telefonnummer' }));
                return;
              }
              try {
                const message = prompt(t('order.reject.placeholder'));
                if (!message) return;
                
                // Backend-API verwenden für SMS-Tracking
                await api.post(`/drivers/${driver.id}/orders/${order.id}/sms`, {
                  message: message,
                });
                
                // Fallback: Direkte SMS (nach erfolgreichem Backend-Call)
                window.location.href = `sms:${sanitizedPhone}?body=${encodeURIComponent(message)}`;
              } catch (error: unknown) {
                logger.error('Fehler beim SMS-API-Call', 'OrderCard', error);
                // Fallback: Direkte SMS auch bei Fehler
                const message = prompt(t('order.reject.placeholder'));
                if (message) {
                  window.location.href = `sms:${sanitizedPhone}?body=${encodeURIComponent(message)}`;
                }
              }
            }}
          >
            <MessageIcon size={18} className="button-icon" />
            {t('order.actions.sms')}
          </button>
        </div>
      </div>

      <div className="order-section">
        <h4>
          <LocationIcon size={16} className="order-section-icon" />
          {t('order.section.delivery')}
        </h4>
        <p>{order.address}</p>
      </div>

      {order.notes && (
        <div className="order-section">
          <h4>
            <MessageIcon size={16} className="order-section-icon" />
            {t('order.notes', { defaultValue: 'Notizen' })}
          </h4>
          <p className="order-notes">{order.notes}</p>
        </div>
      )}

      <div className="order-items">
        <h4>{t('order.items', { defaultValue: 'Gerichte' })}:</h4>
        {order.items.map((item, idx) => (
          <div key={idx} className="order-item">
            <span>{item.dish.name} × {item.quantity}</span>
            <span>{item.price.toFixed(2)} €</span>
          </div>
        ))}
        <div className="order-total">
          <strong>{t('order.total', { defaultValue: 'Gesamt' })}: {order.totalAmount.toFixed(2)} €</strong>
        </div>
        {subscription && (
          <div className="order-commission-preview" style={{
            marginTop: '12px',
            padding: '12px',
            background: '#f0f9ff',
            border: '1px solid #3b82f6',
            borderRadius: '8px',
            fontSize: '0.875rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#1e40af', fontWeight: '600' }}>
                💰 {t('order.commission.youGet')}:
              </span>
              <strong style={{ color: '#1e40af', fontSize: '1.1rem' }}>
                €{((order.totalAmount * 0.30) * subscription.commissionRate).toFixed(2)}
              </strong>
            </div>
            <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#6b7280' }}>
              ({subscription.tier} {t('order.commission.tier')} - {(subscription.commissionRate * 100).toFixed(1)}% {t('order.commission.commission')})
              {subscription.tier !== 'PRO' && subscription.tier !== 'FULLTIME' && (
                <span style={{ marginLeft: '8px', color: '#3b82f6', fontWeight: '600' }}>
                  → {t('order.commission.withPro')}: €{((order.totalAmount * 0.30) * 0.30).toFixed(2)} (+€{(((order.totalAmount * 0.30) * 0.30) - ((order.totalAmount * 0.30) * subscription.commissionRate)).toFixed(2)})
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="order-actions">
        <button
          onClick={() => setShowChat(!showChat)}
          className="chat-button"
          title={t('order.chat.open', { defaultValue: 'Chat öffnen' })}
        >
          <MessageIcon size={18} className="button-icon" />
          {t('order.chat.label', { defaultValue: 'Chat' })}
        </button>
        
        {/* Bestellungs-Akzeptierung/Ablehnung */}
        {order.status === 'ACCEPTED' && !order.driverId && onAccept && onReject && (
          <div className="order-accept-reject">
            <button
              onClick={async () => {
                setProcessing(true);
                try {
                  await onAccept(order.id);
                } catch (error) {
                  logger.error('Fehler beim Akzeptieren', 'OrderCard', error);
                } finally {
                  setProcessing(false);
                }
              }}
              className="accept-button"
              data-testid={`driver-accept-order-${order.id}`}
              disabled={processing || !onAccept}
            >
              <CheckIcon size={20} className="button-icon" />
              {t('order.actions.accept')}
            </button>
            <button
              onClick={() => setShowRejectDialog(true)}
              className="reject-button"
              data-testid={`driver-reject-order-${order.id}`}
              disabled={processing}
            >
              <XIcon size={20} className="button-icon" />
              {t('order.actions.reject')}
            </button>
          </div>
        )}

        {/* Reject Dialog */}
        {showRejectDialog && onReject && (
          <div className="reject-dialog-overlay">
            <div className="reject-dialog">
              <h4>{t('order.reject.title', { defaultValue: 'Bestellung ablehnen' })}</h4>
              <p>{t('order.reject.confirm', { defaultValue: 'Möchten Sie diese Bestellung wirklich ablehnen?' })}</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('order.reject.placeholder')}
                className="reject-reason-input"
              />
              <div className="reject-dialog-actions">
                <button
                  onClick={async () => {
                    setProcessing(true);
                    try {
                      await onReject(order.id, rejectReason);
                      setShowRejectDialog(false);
                      setRejectReason('');
                    } catch (error) {
                      logger.error('Fehler beim Ablehnen', 'OrderCard', error);
                    } finally {
                      setProcessing(false);
                    }
                  }}
                  className="confirm-reject-button"
                  disabled={processing}
                >
                  {t('order.reject.confirmButton', { defaultValue: 'Bestätigen' })}
                </button>
                <button
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectReason('');
                  }}
                  className="cancel-button"
                  disabled={processing}
                >
                  {t('order.reject.cancel', { defaultValue: 'Abbrechen' })}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Update Buttons */}
        {order.status === 'ACCEPTED' && order.driverId && (
          <button 
            onClick={() => onStatusUpdate(order.id, 'PICKED_UP')}
            className="status-update-button"
            data-testid={`driver-picked-up-order-${order.id}`}
          >
            <CheckIcon size={18} className="button-icon" />
            {t('order.status.PICKED_UP')}
          </button>
        )}
        {order.status === 'PICKED_UP' && (
          <button 
            onClick={() => onStatusUpdate(order.id, 'IN_TRANSIT')}
            className="status-update-button"
            data-testid={`driver-in-transit-order-${order.id}`}
          >
            <NavigationIcon size={18} className="button-icon" />
            {t('order.status.IN_TRANSIT')}
          </button>
        )}
        {order.status === 'IN_TRANSIT' && (
          <div className="delivery-actions">
            <button 
              onClick={() => setShowQRScanner(true)}
              className="qr-scan-button"
            >
              <QRIcon size={18} className="button-icon" />
              {t('order.actions.qr')}
            </button>
            <button 
              onClick={() => setShowPhotoUpload(true)}
              className="photo-button"
            >
              <CameraIcon size={18} className="button-icon" />
              {t('order.photo.title')}
            </button>
            <button 
              onClick={() => onStatusUpdate(order.id, 'DELIVERED')}
              className="status-update-button"
              data-testid={`driver-delivered-order-${order.id}`}
            >
              <CheckIcon size={18} className="button-icon" />
              {t('order.status.DELIVERED')}
            </button>
          </div>
        )}
        {order.status === 'READY' && (
          <p className="waiting-message">
            {t('order.waiting', { defaultValue: 'Warten auf Abholung im Restaurant...' })}
          </p>
        )}
      </div>

      <Geofencing
        order={order}
        onCheckIn={(type, result) => {
          if (result.autoStatusUpdate) {
            // Auto-Update wurde durchgeführt - State wird über onStatusUpdate aktualisiert
            onStatusUpdate(order.id, result.newStatus || order.status);
          }
        }}
      />

      {showChat && (
        <div className="chat-overlay">
          <Chat order={order} onClose={() => setShowChat(false)} />
        </div>
      )}

      {showQRScanner && (
        <QRCodeScanner
          orderId={order.id}
          onScanSuccess={(decodedText) => {
            // Validiere QR-Code (sollte Order-ID enthalten)
            if (decodedText.includes(order.id) || decodedText === order.id) {
              onStatusUpdate(order.id, 'DELIVERED');
              setShowQRScanner(false);
            } else {
              alert(t('order.qr.mismatch'));
            }
          }}
          onScanFailure={(error) => {
            logger.error('QR-Scan Fehler', 'OrderCard', error);
          }}
          onClose={() => setShowQRScanner(false)}
        />
      )}

      {showPhotoUpload && (
        <div className="photo-upload-overlay">
          <PhotoUpload
            orderId={order.id}
            type="delivery"
            onUploadSuccess={(photoUrl) => {
              logger.info('Foto hochgeladen', 'OrderCard');
              setShowPhotoUpload(false);
            }}
            onUploadError={(error) => {
              logger.error('Foto-Upload Fehler', 'OrderCard', error);
            }}
            onClose={() => setShowPhotoUpload(false)}
          />
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison für bessere Performance
  return (
    prevProps.order.id === nextProps.order.id &&
    prevProps.order.status === nextProps.order.status &&
    prevProps.order.driverId === nextProps.order.driverId
  );
});

