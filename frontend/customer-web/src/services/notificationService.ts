// Push Notification Service für Browser-Benachrichtigungen mit Web Push API (VAPID)

import { config } from '../config';
import { logWarning, logError } from '../utils/errorReporting';

export class NotificationService {
  private static permission: NotificationPermission = 'default';
  private static isSupported = 'Notification' in window;
  private static pushSubscription: PushSubscription | null = null;
  private static serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  static async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      logWarning('Browser unterstützt keine Benachrichtigungen', { component: 'NotificationService', action: 'requestPermission' });
      return 'denied';
    }

    if (this.permission === 'default') {
      this.permission = await Notification.requestPermission();
    }

    return this.permission;
  }

  static async showNotification(
    title: string,
    options?: NotificationOptions
  ): Promise<void> {
    if (!this.isSupported) {
      logWarning('Browser unterstützt keine Benachrichtigungen', { component: 'NotificationService', action: 'showNotification' });
      return;
    }

    const permission = await this.requestPermission();

    if (permission !== 'granted') {
      logWarning('Benachrichtigungsberechtigung nicht erteilt', { component: 'NotificationService', action: 'showNotification' });
      return;
    }

    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: options?.tag || 'UberFood-food',
      requireInteraction: false,
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      if (options?.data?.url) {
        window.location.href = options.data.url;
      }
    };

    // Automatisch nach 5 Sekunden schließen
    setTimeout(() => {
      notification.close();
    }, 5000);
  }

  static showOrderUpdate(orderId: string, status: string, message: string) {
    const statusMessages: Record<string, string> = {
      CONFIRMED: 'Ihre Bestellung wurde bestätigt! 🎉',
      PREPARING: 'Ihre Bestellung wird zubereitet 👨‍🍳',
      READY: 'Ihre Bestellung ist bereit! ✅',
      ACCEPTED: 'Ein Fahrer wurde zugewiesen 🚗',
      PICKED_UP: 'Ihre Bestellung wurde abgeholt 📦',
      IN_TRANSIT: 'Ihre Bestellung ist unterwegs 🚚',
      DELIVERED: 'Ihre Bestellung wurde geliefert! 🎉',
      CANCELLED: 'Ihre Bestellung wurde storniert ❌',
    };

    this.showNotification(statusMessages[status] || message, {
      body: `Bestellung #${orderId.slice(0, 8)}`,
      tag: `order-${orderId}`,
      data: {
        url: `/orders/${orderId}`,
        orderId,
        status,
      },
    });
  }

  static showNewMessage(senderName: string, message: string, orderId: string) {
    this.showNotification(`Neue Nachricht von ${senderName}`, {
      body: message,
      tag: `chat-${orderId}`,
      icon: '/favicon.ico',
      data: {
        url: `/orders/${orderId}`,
        orderId,
      },
    });
  }

  static showPromotion(title: string, message: string, url?: string) {
    this.showNotification(title, {
      body: message,
      tag: 'promotion',
      data: {
        url: url || '/',
      },
    });
  }

  // Web Push API (VAPID) Support
  static async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      logWarning('Service Worker wird nicht unterstützt', { component: 'NotificationService', action: 'registerServiceWorker' });
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      this.serviceWorkerRegistration = registration;
      return registration;
    } catch (error) {
      logError(error as Error, { component: 'NotificationService', action: 'registerServiceWorker' });
      return null;
    }
  }

  static async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.serviceWorkerRegistration) {
      await this.registerServiceWorker();
    }

    if (!this.serviceWorkerRegistration) {
      return null;
    }

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(config.vapidPublicKey),
      });

      this.pushSubscription = subscription;

      // Send subscription to backend
      try {
        await fetch(`${config.apiUrl}/notifications/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(subscription),
        });
      } catch (error) {
        logError(error as Error, { component: 'NotificationService', action: 'subscribeToPush', metadata: { step: 'send-subscription' } });
      }

      return subscription;
    } catch (error) {
      logError(error as Error, { component: 'NotificationService', action: 'subscribeToPush' });
      return null;
    }
  }

  static async unsubscribeFromPush(): Promise<boolean> {
    if (!this.pushSubscription) {
      return false;
    }

    try {
      const successful = await this.pushSubscription.unsubscribe();
      if (successful) {
        this.pushSubscription = null;
        // Notify backend
        try {
          await fetch(`${config.apiUrl}/notifications/unsubscribe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(this.pushSubscription),
          });
        } catch (error) {
          logError(error as Error, { component: 'NotificationService', action: 'unsubscribeFromPush', metadata: { step: 'notify-backend' } });
        }
      }
      return successful;
    } catch (error) {
      logError(error as Error, { component: 'NotificationService', action: 'unsubscribeFromPush' });
      return false;
    }
  }

  static async initializePushNotifications(): Promise<boolean> {
    if (!this.isSupported) {
      return false;
    }

    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      return false;
    }

    // Register service worker and subscribe to push
    await this.registerServiceWorker();
    const subscription = await this.subscribeToPush();

    // Listen for push events
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        // Strict origin validation - block if origin doesn't match
        const allowedOrigin = window.location.origin;
        let messageOrigin = null;
        
        // Safely extract origin
        if (event.origin) {
          messageOrigin = event.origin;
        } else if (event.source) {
          try {
            if ('url' in event.source && event.source.url) {
              messageOrigin = new URL(event.source.url as string).origin;
            } else if (event.source instanceof Window) {
              messageOrigin = event.source.location.origin;
            }
          } catch (e) {
            console.warn('Failed to extract origin from message source');
          }
        }
        
        // Block if origin doesn't match exactly
        if (!messageOrigin || messageOrigin !== allowedOrigin) {
          console.warn('Blocked message from unexpected origin', messageOrigin);
          return;
        }
        
        // Validate message data structure
        if (event.data && typeof event.data === 'object' && event.data.type === 'PUSH_NOTIFICATION') {
          this.showNotification(event.data.title, event.data.options);
        }
      });
    }

    return subscription !== null;
  }

  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  static async getSubscription(): Promise<PushSubscription | null> {
    if (!this.serviceWorkerRegistration) {
      await this.registerServiceWorker();
    }

    if (!this.serviceWorkerRegistration) {
      return null;
    }

    try {
      return await this.serviceWorkerRegistration.pushManager.getSubscription();
    } catch (error) {
      logError(error as Error, { component: 'NotificationService', action: 'getSubscription' });
      return null;
    }
  }
}

