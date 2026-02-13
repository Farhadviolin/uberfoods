import { useState, useEffect } from 'react';

interface QueuedRequest {
  url: string;
  options: RequestInit;
  resolve?: (value: Response) => void;
  reject?: (reason?: any) => void;
}

export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<QueuedRequest[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      // Process queued requests
      const processQueue = async () => {
        for (const request of offlineQueue) {
          try {
            // Sanitize URL to prevent SSRF: allow only relative or same-origin
            const sanitizedUrl = (() => {
              if (request.url.startsWith('/')) return request.url;
              try {
                const parsed = new URL(request.url, window.location.origin);
                return parsed.origin === window.location.origin ? parsed.toString() : null;
              } catch {
                return null;
              }
            })();

            if (!sanitizedUrl) {
              console.warn('Blocked SSRF attempt:', request.url);
              if (request.reject) {
                request.reject(new Error('Invalid URL'));
              }
              continue;
            }

            const response = await fetch(sanitizedUrl, request.options);
            if (request.resolve) {
              request.resolve(response);
            }
          } catch (error) {
            if (request.reject) {
              request.reject(error);
            }
          }
        }
        setOfflineQueue([]);
      };

      processQueue();
    }
  }, [isOnline, offlineQueue]);

  const queueRequest = (url: string, options: RequestInit): Promise<Response> => {
    return new Promise((resolve, reject) => {
      const sanitize = (): string | null => {
        if (url.startsWith('/')) return url;
        try {
          const parsed = new URL(url, window.location.origin);
          return parsed.origin === window.location.origin ? parsed.toString() : null;
        } catch {
          return null;
        }
      };

      const safeUrl = sanitize();
      if (!safeUrl) {
        reject(new Error('Invalid URL'));
        return;
      }

      if (isOnline) {
        fetch(safeUrl, options).then(resolve).catch(reject);
      } else {
        setOfflineQueue((prev) => [...prev, { url: safeUrl, options, resolve, reject }]);
      }
    });
  };

  return { isOnline, isOffline: !isOnline, offlineQueue, queueRequest, queuedRequests: offlineQueue };
}

