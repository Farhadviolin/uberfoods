import { useState } from 'react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { usePermissions } from '../hooks/usePermissions';
import { useWebSocket } from '../hooks/useWebSocket';
import { ConfirmationDialog } from './ConfirmationDialog';
import { extractErrorMessage } from '../utils/errorHandler';
import './DriverNotificationSender.css';

interface DriverNotificationSenderProps {
  driverId?: string;
  driverName?: string;
  driverIds?: string[];
  onClose: () => void;
  onSent?: () => void;
}

export function DriverNotificationSender({ driverId, driverName, driverIds, onClose, onSent }: DriverNotificationSenderProps) {
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const { sendAdminBroadcast } = useWebSocket();
  const [notificationType, setNotificationType] = useState<'info' | 'warning' | 'urgent' | 'emergency'>('info');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [channels, setChannels] = useState<('push' | 'email' | 'sms')[]>(['push']);
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const canSend = hasPermission('driver:update') || hasPermission('notification:*');
  const isBulk = !driverId && driverIds && driverIds.length > 0;
  const targetCount = isBulk ? driverIds!.length : 1;

  if (!canSend) {
    return (
      <div className="driver-notification-no-permission">
        <p>Keine Berechtigung zum Senden von Notifications</p>
      </div>
    );
  }

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      showToast('Titel und Nachricht sind erforderlich', 'error');
      return;
    }

    setShowConfirm(true);
  };

  const confirmSend = async () => {
    try {
      setSending(true);
      setShowConfirm(false);

      const notificationData = {
        type: notificationType,
        title: title.trim(),
        message: message.trim(),
        channels,
        priority: notificationType === 'emergency' ? 'critical' : notificationType === 'urgent' ? 'high' : 'normal',
      };

      if (isBulk) {
        // Bulk notification via API
        const response = await api.post('/admin/drivers/bulk-notification', {
          driverIds: driverIds,
          ...notificationData,
        });

        // Also send via WebSocket for real-time delivery
        if (sendAdminBroadcast) {
          sendAdminBroadcast(
            {
              message: notificationData.message,
              priority: notificationData.priority,
            },
            driverIds,
          );
        }

        showToast(`Notification erfolgreich an ${response.data.sent || targetCount} Fahrer gesendet`, 'success');
      } else {
        // Single driver notification
        await api.post(`/admin/drivers/${driverId}/notification`, notificationData);

        // Also send via WebSocket
        if (sendAdminBroadcast && driverId) {
          sendAdminBroadcast(
            {
              message: notificationData.message,
              priority: notificationData.priority,
            },
            [driverId],
          );
        }

        showToast(`Notification erfolgreich an ${driverName} gesendet`, 'success');
      }

      // Reset form
      setTitle('');
      setMessage('');
      setNotificationType('info');
      setChannels(['push']);

      onSent?.();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err.response as any)?.data?.message || 'Fehler beim Senden der Notification'
        : 'Fehler beim Senden der Notification';
      showToast(message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="driver-notification-sender">
      <div className="notification-header">
        <h2>
          {isBulk ? `📢 Notification an ${targetCount} Fahrer` : `📢 Notification: ${driverName}`}
        </h2>
        <button className="close-button" onClick={onClose}>✕</button>
      </div>

      <div className="notification-form">
        <div className="form-group">
          <label>Typ *</label>
          <select
            value={notificationType}
            onChange={(e) => setNotificationType(e.target.value as any)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }}
          >
            <option value="info">ℹ️ Info</option>
            <option value="warning">⚠️ Warnung</option>
            <option value="urgent">🔴 Dringend</option>
            <option value="emergency">🚨 Notfall</option>
          </select>
        </div>

        <div className="form-group">
          <label>Titel *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Neue Schicht verfügbar"
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', width: '100%' }}
            maxLength={100}
          />
        </div>

        <div className="form-group">
          <label>Nachricht *</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ihre Nachricht an den Fahrer..."
            rows={5}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', width: '100%', resize: 'vertical' }}
            maxLength={500}
          />
          <div className="char-count">{message.length}/500</div>
        </div>

        <div className="form-group">
          <label>Kanäle</label>
          <div className="channels-checkboxes">
            <label>
              <input
                type="checkbox"
                checked={channels.includes('push')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setChannels([...channels, 'push']);
                  } else {
                    setChannels(channels.filter(c => c !== 'push'));
                  }
                }}
              />
              📱 Push Notification
            </label>
            <label>
              <input
                type="checkbox"
                checked={channels.includes('email')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setChannels([...channels, 'email']);
                  } else {
                    setChannels(channels.filter(c => c !== 'email'));
                  }
                }}
              />
              📧 E-Mail
            </label>
            <label>
              <input
                type="checkbox"
                checked={channels.includes('sms')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setChannels([...channels, 'sms']);
                  } else {
                    setChannels(channels.filter(c => c !== 'sms'));
                  }
                }}
              />
              💬 SMS
            </label>
          </div>
          {channels.length === 0 && (
            <div className="warning-text">⚠️ Mindestens ein Kanal muss ausgewählt sein</div>
          )}
        </div>

        <div className="notification-preview">
          <h3>Vorschau:</h3>
          <div className={`preview-card ${notificationType}`}>
            <div className="preview-header">
              <span className="preview-icon">
                {notificationType === 'emergency' ? '🚨' : notificationType === 'urgent' ? '🔴' : notificationType === 'warning' ? '⚠️' : 'ℹ️'}
              </span>
              <span className="preview-title">{title || 'Titel'}</span>
            </div>
            <div className="preview-message">{message || 'Nachricht'}</div>
            <div className="preview-channels">
              {channels.map(ch => (
                <span key={ch} className="channel-badge">
                  {ch === 'push' ? '📱' : ch === 'email' ? '📧' : '💬'} {ch.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            className="cancel-button"
            onClick={onClose}
            disabled={sending}
          >
            Abbrechen
          </button>
          <button
            className="send-button"
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim() || channels.length === 0}
            style={{
              background: notificationType === 'emergency' ? '#dc3545' : notificationType === 'urgent' ? '#ff6b6b' : '#1877f2',
            }}
          >
            {sending ? 'Wird gesendet...' : `📤 Senden${isBulk ? ` (${targetCount})` : ''}`}
          </button>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Notification senden?"
        message={
          <div>
            <p>Möchten Sie diese Notification wirklich {isBulk ? `an ${targetCount} Fahrer` : `an ${driverName}`} senden?</p>
            {notificationType === 'emergency' && (
              <p style={{ color: '#dc3545', fontWeight: 600, marginTop: '10px' }}>
                ⚠️ Dies ist eine Notfall-Notification und wird sofort an alle Kanäle gesendet!
              </p>
            )}
          </div>
        }
        variant={notificationType === 'emergency' ? 'danger' : 'info'}
        onConfirm={confirmSend}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

