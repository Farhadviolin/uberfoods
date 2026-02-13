import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DriverService } from '../services/driverService';
import { useTranslation } from 'react-i18next';
import './NotificationsCenter.css';

interface Notification {
  id: string;
  type: 'order' | 'payment' | 'rating' | 'system' | 'message';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
  readAt?: string;
}

export function NotificationsCenter() {
  const { driver } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'order' | 'payment' | 'rating' | 'system'>('all');
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (driver) {
      fetchNotifications();
      fetchUnreadCount();
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000); // Alle 30 Sekunden aktualisieren
      return () => clearInterval(interval);
    }
  }, [driver, filter]);

  const fetchNotifications = async () => {
    if (!driver) return;
    try {
      setLoading(true);
      const result = await DriverService.getNotifications(driver.id, 50);
      let filtered = result.data.notifications || result.data || [];
      
      if (filter !== 'all') {
        if (filter === 'unread') {
          filtered = filtered.filter((n: Notification) => !n.read);
        } else {
          filtered = filtered.filter((n: Notification) => n.type === filter);
        }
      }
      
      setNotifications(filtered);
    } catch (error: unknown) {
      console.error('Fehler beim Laden der Benachrichtigungen:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!driver) return;
    try {
      const result = await DriverService.getUnreadNotificationsCount(driver.id);
      setUnreadCount(result.data);
    } catch (error: unknown) {
      console.error('Fehler beim Laden der unread count:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!driver) return;
    try {
      await DriverService.markNotificationAsRead(driver.id, notificationId);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error: unknown) {
      console.error('Fehler beim Markieren als gelesen:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!driver) return;
    try {
      await DriverService.markAllNotificationsAsRead(driver.id);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error: unknown) {
      console.error('Fehler beim Markieren aller als gelesen:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!driver) return;
    try {
      await DriverService.deleteNotification(driver.id, notificationId);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error: unknown) {
      console.error('Fehler beim Löschen:', error);
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'order':
        return '📦';
      case 'payment':
        return '💰';
      case 'rating':
        return '⭐';
      case 'system':
        return '⚙️';
      case 'message':
        return '💬';
      default:
        return '🔔';
    }
  };

  if (!driver) return null;

  return (
    <div className="notifications-center">
      <div className="notifications-header">
        <h2>{t('notifications.title')}</h2>
        {unreadCount > 0 && (
          <div className="unread-badge">{unreadCount}</div>
        )}
      </div>

      <div className="notifications-filters">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          {t('notifications.filter.all')}
        </button>
        <button
          className={filter === 'unread' ? 'active' : ''}
          onClick={() => setFilter('unread')}
        >
          {t('notifications.filter.unread', { count: unreadCount })}
        </button>
        <button
          className={filter === 'order' ? 'active' : ''}
          onClick={() => setFilter('order')}
        >
          {t('notifications.filter.order')}
        </button>
        <button
          className={filter === 'payment' ? 'active' : ''}
          onClick={() => setFilter('payment')}
        >
          {t('notifications.filter.payment')}
        </button>
        <button
          className={filter === 'rating' ? 'active' : ''}
          onClick={() => setFilter('rating')}
        >
          {t('notifications.filter.rating')}
        </button>
      </div>

      {unreadCount > 0 && (
        <button className="mark-all-read" onClick={markAllAsRead}>
          {t('notifications.markAll')}
        </button>
      )}

      {loading ? (
        <div className="loading">{t('notifications.loading')}</div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">{t('notifications.empty')}</div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${notification.read ? 'read' : 'unread'}`}
              onClick={() => !notification.read && markAsRead(notification.id)}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="notification-content">
                <div className="notification-header">
                  <div className="notification-title">{notification.title}</div>
                  {!notification.read && <div className="unread-dot" />}
                </div>
                <div className="notification-message">{notification.message}</div>
                <div className="notification-date">
                  {new Date(notification.createdAt).toLocaleString(i18n.language || 'de-DE')}
                </div>
              </div>
              <button
                className="delete-button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

