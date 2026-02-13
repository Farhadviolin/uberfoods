import { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import { isAxiosErrorResponse } from '../utils/errorHandler';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function usePushNotifications() {
  const { driver } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  // Prüfe ob Push-Notifications unterstützt werden
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      fetchPublicKey();
      checkExistingSubscription();
    }
  }, []);

  // Hole öffentlichen VAPID Key vom Backend
  const fetchPublicKey = async () => {
    try {
      const response = await api.get('/drivers/push/public-key');
      setPublicKey(response.data.publicKey);
    } catch (error: unknown) {
      // 403/404/500 ist OK - Push Notifications sind optional
      if (isAxiosErrorResponse(error) && 
          (error.response?.status === 403 || 
           error.response?.status === 404 || 
           error.response?.status === 500)) {
        logger.warn('Push Notifications nicht verfügbar (optional)', 'usePushNotifications');
        setPublicKey(null);
        setIsSupported(false);
        return;
      }
      // Andere Fehler loggen, aber nicht kritisch behandeln
      logger.warn('⚠️ Push-Notifications nicht verfügbar:', 'usePushNotifications', error);
      setPublicKey(null);
      setIsSupported(false);
    }
  };

  // Prüfe ob bereits eine Subscription existiert
  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        setSubscription({
          endpoint: existingSubscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(existingSubscription.getKey('p256dh')!),
            auth: arrayBufferToBase64(existingSubscription.getKey('auth')!),
          },
        });
        setIsSubscribed(true);
      }
    } catch (error) {
      // Push notification subscription check error handled by UI
    }
  };

  // Konvertiere ArrayBuffer zu Base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Konvertiere Base64 zu Uint8Array
  const base64ToUint8Array = (base64: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const base = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Abonniere Push-Notifications
  const subscribe = useCallback(async () => {
    if (!isSupported || !publicKey || !driver) {
      // Push notifications not available - graceful degradation
      return false;
    }

    try {
      // In Development: Service Worker deaktivieren um Reload-Loops zu vermeiden
      if ((globalThis as any).importMetaEnv?.DEV || process.env?.DEV) {
        logger.warn('Service Worker in Development deaktiviert', 'usePushNotifications');
        setIsSupported(false);
        return;
      }
      
      // Registriere Service Worker nur in Production
      const registration = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none', // Verhindere automatische Updates die Reloads verursachen
      });
      await navigator.serviceWorker.ready;

      // Erstelle Push-Subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(publicKey),
      });

      const pushSubscription: PushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!),
        },
      };

      // Sende Subscription an Backend
      await api.post(`/drivers/${driver.id}/push-subscription`, pushSubscription);

      setSubscription(pushSubscription);
      setIsSubscribed(true);
      
      // Push notifications successfully subscribed
      return true;
    } catch (error: unknown) {
      // Push notification subscription error handled by UI
      
      if (error instanceof Error && error.name === 'NotAllowedError') {
        alert('Push-Notifications wurden blockiert. Bitte erlauben Sie Benachrichtigungen in den Browser-Einstellungen.');
      }
      
      return false;
    }
  }, [isSupported, publicKey, driver]);

  // Kündige Push-Notifications
  const unsubscribe = useCallback(async () => {
    if (!subscription) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
      }

      if (driver) {
        try {
          await api.delete(`/drivers/${driver.id}/push-subscription`);
        } catch (error) {
          console.error('Fehler beim Entfernen der Subscription im Backend:', error);
        }
      }

      setSubscription(null);
      setIsSubscribed(false);
      
      // Push notifications successfully unsubscribed
      return true;
    } catch (error) {
      // Push notification unsubscription error handled by UI
      return false;
    }
  }, [subscription, driver]);

  return {
    isSupported,
    isSubscribed,
    publicKey,
    subscribe,
    unsubscribe,
  };
}

