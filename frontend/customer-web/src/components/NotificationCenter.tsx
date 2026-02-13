import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Bell, BellOff, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NotificationService } from '../services/notificationService';
import { config } from '../config';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { AxiosErrorWithResponse } from '../types';
import { useToast } from '../contexts/ToastContext';
import './NotificationCenter.css';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'message' | 'promotion' | 'system';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

interface StoredNotification extends Omit<Notification, 'timestamp'> {
  timestamp: string;
}

interface BackendNotification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'message' | 'promotion' | 'system';
  createdAt: string;
  read: boolean;
  actionUrl?: string;
}

export function NotificationCenter() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;
  const userId = user?.id;

  const [isOpen, setIsOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Backend-Integration: Lade Notifications vom Backend
  const { data: backendNotifications = [] } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!isAuthenticated || !userId) {
        return [];
      }
      try {
        const response = await api.get<BackendNotification[]>('/notifications', {
          params: { userId },
        });
        return response.data.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          timestamp: new Date(n.createdAt),
          read: n.read,
          actionUrl: n.actionUrl,
        })) as Notification[];
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        // Bei 401/403: leeres Array zurückgeben
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return [];
        }
        // Fallback zu localStorage bei anderen Fehlern
        const stored = localStorage.getItem('notifications');
        if (stored) {
          try {
            const parsed = (JSON.parse(stored) as StoredNotification[]).map((notification) => ({
              ...notification,
              timestamp: new Date(notification.timestamp),
            }));
            return parsed;
          } catch {
            return [];
          }
        }
        return [];
      }
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 Sekunden
    refetchInterval: 60 * 1000, // Alle 60 Sekunden aktualisieren
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) return;
      await api.post(`/notifications/${id}/mark-read`, null, {
        params: { userId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosErrorWithResponse;
      if (axiosError.response?.status !== 401 && axiosError.response?.status !== 403) {
        showToast('Fehler beim Markieren als gelesen', 'error');
      }
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      await api.post('/notifications/mark-all-read', null, {
        params: { userId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      showToast('Alle Benachrichtigungen als gelesen markiert', 'success');
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosErrorWithResponse;
      if (axiosError.response?.status !== 401 && axiosError.response?.status !== 403) {
        showToast('Fehler beim Markieren aller als gelesen', 'error');
      }
    },
  });

  useEffect(() => {
    checkPermission();
    checkPushSubscription();
  }, []);

  const checkPermission = async () => {
    if ('Notification' in window) {
      const perm = Notification.permission;
      setPermission(perm);
    }
  };

  const checkPushSubscription = async () => {
    const subscription = await NotificationService.getSubscription();
    setPushEnabled(subscription !== null);
  };

  const requestPermission = async () => {
    const perm = await NotificationService.requestPermission();
    setPermission(perm);

    if (perm === 'granted' && config.vapidPublicKey) {
      const success = await NotificationService.initializePushNotifications();
      setPushEnabled(success);
    }
  };

  const togglePush = async () => {
    if (pushEnabled) {
      await NotificationService.unsubscribeFromPush();
      setPushEnabled(false);
    } else {
      if (permission !== 'granted') {
        await requestPermission();
      } else {
        const success = await NotificationService.initializePushNotifications();
        setPushEnabled(success);
      }
    }
  };

  const markAsRead = (id: string) => {
    if (isAuthenticated && userId) {
      markAsReadMutation.mutate(id);
    }
  };

  const markAllAsRead = () => {
    if (isAuthenticated && userId) {
      markAllAsReadMutation.mutate();
    }
  };

  const deleteNotification = (id: string) => {
    // Frontend-only: Entferne aus lokaler Liste
    // Backend hat keinen DELETE-Endpoint, daher nur lokal
    queryClient.setQueryData<Notification[]>(['notifications', userId], (old) => {
      return old?.filter((n) => n.id !== id) || [];
    });
  };

  const clearAll = () => {
    // Frontend-only: Leere lokale Liste
    queryClient.setQueryData<Notification[]>(['notifications', userId], []);
  };

  const notifications = backendNotifications || [];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <button
        className="notification-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('notifications.title')}
      >
        <Bell size={20} />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <>
          <div className="notification-overlay" onClick={() => setIsOpen(false)} />
          <div className="notification-center">
            <div className="notification-header">
              <h3>{t('notifications.title')}</h3>
              <div className="notification-actions">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="mark-all-read-btn">
                    {t('notifications.markAllRead')}
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={clearAll} className="clear-all-btn">
                    {t('notifications.clearAll')}
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="close-btn" aria-label={t('notifications.close')}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="notification-settings">
              <div className="push-toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={pushEnabled}
                    onChange={togglePush}
                    disabled={permission === 'denied'}
                  />
                  <span>{t('notifications.pushNotifications')}</span>
                </label>
                {permission === 'default' && (
                  <button onClick={requestPermission} className="request-permission-btn">
                    {t('notifications.requestPermission')}
                  </button>
                )}
                {permission === 'denied' && (
                  <span className="permission-denied">{t('notifications.permissionDenied')}</span>
                )}
              </div>
            </div>

            <div className="notification-list">
              {notifications.length === 0 ? (
                <div className="notification-empty">
                  <BellOff size={48} />
                  <p>{t('notifications.noNotifications')}</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                    onClick={() => {
                      markAsRead(notification.id);
                      if (notification.actionUrl) {
                        window.location.href = notification.actionUrl;
                      }
                    }}
                  >
                    <div className="notification-icon">
                      {notification.type === 'order' && <CheckCircle size={20} />}
                      {notification.type === 'message' && <AlertCircle size={20} />}
                      {notification.type === 'promotion' && <Bell size={20} />}
                      {notification.type === 'system' && <Clock size={20} />}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">
                        {notification.timestamp.toLocaleString(i18n.language === 'de' ? 'de-DE' : 'en-US', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <button
                      className="notification-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      aria-label={t('notifications.delete')}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

