/**
 * Shared Notification Service für alle Frontend-Anwendungen
 * Einheitliches Notification-Management mit verschiedenen Kanälen
 */

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'critical';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: Date;
  source: string;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  sound: boolean;
  vibration: boolean;
}

type NotificationHandler = (notification: Notification) => void;

class NotificationService {
  private notifications: Notification[] = [];
  private preferences: NotificationPreferences = {
    email: true,
    push: true,
    inApp: true,
    sound: true,
    vibration: true,
  };
  private handlers: Set<NotificationHandler> = new Set();
  private audioContext: AudioContext | null = null;

  constructor() {
    this.loadFromStorage();
    this.setupServiceWorker();
  }

  // Handler registrieren
  subscribe(handler: NotificationHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private notifyHandlers(notification: Notification) {
    this.handlers.forEach(handler => {
      try {
        handler(notification);
      } catch (error) {
        console.error('Error in notification handler:', error);
      }
    });
  }

  // Aus Storage laden
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.notifications = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
          expiresAt: n.expiresAt ? new Date(n.expiresAt) : undefined,
        }));
      }

      const prefs = localStorage.getItem('notificationPreferences');
      if (prefs) {
        this.preferences = { ...this.preferences, ...JSON.parse(prefs) };
      }
    } catch (error) {
      console.error('Error loading notifications from storage:', error);
    }
  }

  // In Storage speichern
  private saveToStorage() {
    try {
      localStorage.setItem('notifications', JSON.stringify(this.notifications));
      localStorage.setItem('notificationPreferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Error saving notifications to storage:', error);
    }
  }

  // Service Worker für Push-Notifications einrichten
  private async setupServiceWorker() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered for notifications');

        // Push-Manager prüfen
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          await this.requestPushPermission();
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Push-Permission anfordern
  async requestPushPermission(): Promise<boolean> {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting push permission:', error);
      return false;
    }
  }

  // Notification hinzufügen
  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Notification {
    const fullNotification: Notification = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
      ...notification,
    };

    this.notifications.unshift(fullNotification);
    this.saveToStorage();

    // In-App Notification
    if (this.preferences.inApp) {
      this.notifyHandlers(fullNotification);
    }

    // Browser Notification
    if (this.preferences.push && 'Notification' in window && Notification.permission === 'granted') {
      this.showBrowserNotification(fullNotification);
    }

    // Sound
    if (this.preferences.sound) {
      this.playNotificationSound();
    }

    // Vibration
    if (this.preferences.vibration && 'vibrate' in navigator) {
      navigator.vibrate(200);
    }

    return fullNotification;
  }

  // Notification als gelesen markieren
  markAsRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      notification.read = true;
      this.saveToStorage();
      this.notifyHandlers(notification);
    }
  }

  // Alle als gelesen markieren
  markAllAsRead(): void {
    this.notifications.forEach(n => {
      if (!n.read) {
        n.read = true;
      }
    });
    this.saveToStorage();
    this.notifications.forEach(n => this.notifyHandlers(n));
  }

  // Notification entfernen
  removeNotification(id: string): void {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      this.saveToStorage();
    }
  }

  // Alle Notifications abrufen
  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  // Ungelesene Notifications abrufen
  getUnreadNotifications(): Notification[] {
    return this.notifications.filter(n => !n.read);
  }

  // Notification-Count
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  // Alte Notifications bereinigen
  cleanup(): void {
    const now = new Date();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 Tage

    this.notifications = this.notifications.filter(notification => {
      // Bereinige abgelaufene Notifications
      if (notification.expiresAt && notification.expiresAt < now) {
        return false;
      }

      // Bereinige alte gelesene Notifications
      if (notification.read && (now.getTime() - notification.timestamp.getTime()) > maxAge) {
        return false;
      }

      return true;
    });

    this.saveToStorage();
  }

  // Browser Notification anzeigen
  private showBrowserNotification(notification: Notification): void {
    const options: NotificationOptions = {
      body: notification.message,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: notification.id,
      requireInteraction: notification.type === 'critical',
      silent: !this.preferences.sound,
    };

    if (notification.actionUrl) {
      options.actions = [{
        action: 'view',
        title: notification.actionLabel || 'Anzeigen',
      }];
    }

    const browserNotification = new Notification(notification.title, options);

    browserNotification.onclick = () => {
      if (notification.actionUrl) {
        window.focus();
        window.location.href = notification.actionUrl;
      }
      browserNotification.close();
    };
  }

  // Notification Sound abspielen
  private async playNotificationSound(): Promise<void> {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
    } catch (error) {
      // Fallback: Verwende Audio-Datei wenn Web Audio API nicht verfügbar
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Silent fail wenn Audio nicht abgespielt werden kann
        });
      } catch {
        // Silent fail
      }
    }
  }

  // Notification senden (von extern)
  async sendNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<void> {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification),
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      // Fallback: Lokale Notification erstellen
      this.addNotification(notification);
    }
  }

  // Preferences aktualisieren
  updatePreferences(preferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
    localStorage.setItem('notificationPreferences', JSON.stringify(this.preferences));
  }

  // Preferences abrufen
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }
}

// Singleton Instance
export const notificationService = new NotificationService();

export default notificationService;