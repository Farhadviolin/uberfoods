// Gemeinsamer Offline-Support für alle Apps
interface QueuedRequest {
  url: string;
  method: string;
  data?: any;
  headers?: any;
  timestamp: number;
  retryCount: number;
}

class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private isOnline = navigator.onLine;
  private maxRetries = 3;
  private maxAge = 24 * 60 * 60 * 1000; // 24 Stunden

  constructor() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Lade Queue beim Start
    this.loadQueue();
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem('offline_queue');
      if (stored) {
        this.queue = JSON.parse(stored);
        // Filtere alte Requests
        const now = Date.now();
        this.queue = this.queue.filter(req => now - req.timestamp < this.maxAge);
        this.saveQueue();
      }
    } catch (error) {
      console.warn('Fehler beim Laden der Offline-Queue:', error);
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem('offline_queue', JSON.stringify(this.queue));
    } catch (error) {
      console.warn('Fehler beim Speichern der Offline-Queue:', error);
    }
  }

  addRequest(url: string, method: string, data?: any, headers?: any) {
    if (this.isOnline) {
      return; // Nicht in Queue, wenn online
    }

    this.queue.push({
      url,
      method,
      data,
      headers,
      timestamp: Date.now(),
      retryCount: 0,
    });

    this.saveQueue();
  }

  async syncQueue() {
    if (!this.isOnline || this.queue.length === 0) {
      return;
    }

    const sanitize = (url: string): string | null => {
      if (!url || typeof url !== 'string') return null;
      if (url.length > 1024) return null; // defensiv begrenzen
      const trimmed = url.trim();
      // Nur relative API-Pfade erlauben
      if (!trimmed.startsWith('/api')) return null;
      // Strenge Pfad-Whitelist: Buchstaben/Zahlen/._- und Standard-Slash/Query
      if (!/^\/api[\\w\\-\\/\\.\\?=&%]*$/.test(trimmed)) return null;
      return trimmed;
    };

    const requests = [...this.queue];
    this.queue = [];

    for (const req of requests) {
      try {
        const safeUrl = sanitize(req.url);
        if (!safeUrl) {
          console.warn('Blocked unsafe queued URL', req.url);
          continue;
        }
        const finalUrl = safeUrl;
        const sanitizedRequest = { ...req, url: finalUrl };

        const response = await fetch(sanitizedRequest.url, {
          method: req.method,
          headers: {
            'Content-Type': 'application/json',
            ...sanitizedRequest.headers,
          },
          body: sanitizedRequest.data ? JSON.stringify(sanitizedRequest.data) : undefined,
        });

        if (!response.ok && req.retryCount < this.maxRetries) {
          req.retryCount++;
          this.queue.push(req);
        }
      } catch (error) {
        if (req.retryCount < this.maxRetries) {
          req.retryCount++;
          this.queue.push(req);
        }
      }
    }

    this.saveQueue();
  }

  getQueueSize() {
    return this.queue.length;
  }
}

export const offlineQueue = new OfflineQueue();

