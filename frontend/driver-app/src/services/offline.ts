// Offline-Support Service
import { logger } from '../utils/logger';

interface PendingRequest {
  url: string;
  options: RequestInit;
  timestamp: number;
  retryCount?: number;
  maxRetries?: number;
  priority?: number;
}

interface ConflictEntry {
  url: string;
  method: string;
  status: number;
  timestamp: number;
}

export class OfflineService {
  private static instance: OfflineService;
  private pendingRequests: PendingRequest[] = [];
  private isSyncing = false;
  private syncProgress = 0;
  private syncTotal = 0;
  private syncCallbacks: Array<(progress: number, total: number) => void> = [];
  private readonly conflictsKey = 'pending_conflicts';
  
  // Konfiguration
  private readonly MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 Stunden
  private readonly MAX_RETRIES = 3;
  private readonly BATCH_SIZE = 10; // Parallele Requests pro Batch
  private readonly MAX_QUEUE_SIZE = 100; // Maximale Anzahl von Requests in Queue

  private constructor() {
    this.setupOfflineListener();
  }

  static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  /**
   * Setup Offline/Online Event Listeners
   */
  private setupOfflineListener() {
    window.addEventListener('online', () => {
      logger.info('Online - Synchronisiere ausstehende Requests...', 'OfflineService');
      this.syncPendingRequests();
    });

    window.addEventListener('offline', () => {
      logger.info('Offline - Requests werden in Queue gespeichert', 'OfflineService');
    });
  }

  /**
   * Speichert Request für spätere Synchronisation
   */
  queueRequest(url: string, options: RequestInit, priority = 0) {
    // Prüfe Queue-Limit
    if (this.pendingRequests.length >= this.MAX_QUEUE_SIZE) {
      logger.warn(`Queue-Limit erreicht (${this.MAX_QUEUE_SIZE}). Entferne ältesten Request.`, 'OfflineService');
      // Entferne ältesten Request (FIFO)
      const oldestIndex = this.pendingRequests.reduce((oldest, req, index) => {
        return req.timestamp < this.pendingRequests[oldest].timestamp ? index : oldest;
      }, 0);
      this.pendingRequests.splice(oldestIndex, 1);
    }

    // Prüfe ob Request bereits existiert (verhindert Duplikate)
    const existingIndex = this.pendingRequests.findIndex(
      (req) => req.url === url && JSON.stringify(req.options) === JSON.stringify(options)
    );
    
    if (existingIndex >= 0) {
      // Update Timestamp wenn bereits vorhanden
      this.pendingRequests[existingIndex].timestamp = Date.now();
      this.pendingRequests[existingIndex].priority = priority;
    } else {
      this.pendingRequests.push({
        url,
        options,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: this.MAX_RETRIES,
        priority,
      });
    }

    // Speichere in localStorage
    this.savePendingRequests();
  }

  /**
   * Filtert alte Requests (älter als MAX_AGE_MS)
   */
  private filterOldRequests(): void {
    const now = Date.now();
    const before = this.pendingRequests.length;
    this.pendingRequests = this.pendingRequests.filter(
      (req) => now - req.timestamp < this.MAX_AGE_MS
    );
    const after = this.pendingRequests.length;
    if (before !== after) {
      logger.info(`${before - after} alte Requests entfernt (älter als 24h)`, 'OfflineService');
      this.savePendingRequests();
    }
  }

  private sanitizeUrlForSync(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    try {
      const parsed = new URL(url, window.location.origin);
      const allowedProtocols = ['http:', 'https:'];
      if (!allowedProtocols.includes(parsed.protocol)) return null;
      if (parsed.origin !== window.location.origin) return null;
      return parsed.toString();
    } catch {
      return null;
    }
  }

  /**
   * Synchronisiert ausstehende Requests mit Batch-Processing
   */
  async syncPendingRequests(): Promise<void> {
    if (!navigator.onLine || this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    
    // Filtere alte Requests
    this.filterOldRequests();

    if (this.pendingRequests.length === 0) {
      this.isSyncing = false;
      this.notifyProgress(0, 0);
      return;
    }

    const requests = [...this.pendingRequests].sort((a, b) => {
      const prioA = a.priority ?? 0;
      const prioB = b.priority ?? 0;
      if (prioA === prioB) {
        return a.timestamp - b.timestamp;
      }
      return prioB - prioA;
    });
    this.pendingRequests = [];
    this.syncTotal = requests.length;
    this.syncProgress = 0;
    
    this.notifyProgress(0, this.syncTotal);

    // Batch-Processing: Verarbeite Requests in Batches
    for (let i = 0; i < requests.length; i += this.BATCH_SIZE) {
      const batch = requests.slice(i, i + this.BATCH_SIZE);
      
      // Verarbeite Batch parallel
      const results = await Promise.allSettled(
        batch.map(async (request) => {
          try {
            // Rekonstruiere vollständige URL falls nötig
            let fullUrl = request.url;
            if (!fullUrl.startsWith('http')) {
              // Wenn relative URL, füge baseURL hinzu
              if (fullUrl.startsWith('/api')) {
                fullUrl = `${window.location.origin}${fullUrl}`;
              } else {
                fullUrl = `${window.location.origin}/api${fullUrl.startsWith('/') ? '' : '/'}${fullUrl}`;
              }
            }

            const safeUrl = this.sanitizeUrlForSync(fullUrl);
            if (!safeUrl) {
              throw new Error('Unsafe URL blocked');
            }
            
            // Rekonstruiere Headers
            const headers: HeadersInit = {
              'Content-Type': 'application/json',
            };
            
            // Füge Authorization Header hinzu falls vorhanden
            const token = localStorage.getItem('driver_token');
            if (token) {
              headers['Authorization'] = `Bearer ${token}`;
            }
            
            // Füge andere Headers hinzu (falls vorhanden)
            if (request.options.headers) {
              const originalHeaders = request.options.headers as Record<string, string>;
              Object.keys(originalHeaders).forEach((key) => {
                if (key.toLowerCase() !== 'content-type') {
                  headers[key] = originalHeaders[key];
                }
              });
            }
            
            const response = await fetch(safeUrl, {
              method: request.options.method || 'GET',
              headers,
              body: request.options.body,
            });

            if (!response.ok) {
              if (response.status === 409 || response.status === 412) {
                this.logConflict(request, response.status);
                throw new Error(`Conflict ${response.status}`);
              }
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            this.syncProgress++;
            this.notifyProgress(this.syncProgress, this.syncTotal);
            logger.info(`Request synchronisiert: ${request.url}`, 'OfflineService');
            return { success: true, request };
          } catch (error) {
            logger.error('Fehler bei Synchronisation', 'OfflineService', { url: request.url, error });
            return { success: false, request, error };
          }
        })
      );

      // Verarbeite Ergebnisse
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { success, request, error } = result.value;
          if (!success && request) {
            const isConflict = typeof error?.message === 'string' && error.message.includes('Conflict');
            if (isConflict) {
              continue;
            }
            // Erhöhe Retry-Count
            const retryCount = (request.retryCount || 0) + 1;
            const maxRetries = request.maxRetries || this.MAX_RETRIES;

            if (retryCount < maxRetries) {
              // Füge wieder zur Queue hinzu für Retry
              this.pendingRequests.push({
                ...request,
                retryCount,
                timestamp: Date.now(), // Update Timestamp für Retry
              });
            } else {
              logger.warn(`Request nach ${maxRetries} Versuchen verworfen: ${request.url}`, 'OfflineService');
            }
          }
        }
      }

      // Kurze Pause zwischen Batches um Server nicht zu überlasten
      if (i + this.BATCH_SIZE < requests.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    this.savePendingRequests();
    this.isSyncing = false;
    this.notifyProgress(this.syncTotal, this.syncTotal);
  }

  private logConflict(request: PendingRequest, status: number) {
    try {
      const existing = this.getConflicts();
      const entry: ConflictEntry = {
        url: request.url,
        method: (request.options.method || 'GET').toString(),
        status,
        timestamp: Date.now(),
      };
      existing.push(entry);
      localStorage.setItem(this.conflictsKey, JSON.stringify(existing.slice(-50)));
    } catch (error) {
      logger.warn('Konflikt konnte nicht protokolliert werden', 'OfflineService', error);
    }
  }

  /**
   * Speichert ausstehende Requests in localStorage
   */
  private savePendingRequests() {
    try {
      localStorage.setItem('pending_requests', JSON.stringify(this.pendingRequests));
    } catch (error) {
      logger.error('Fehler beim Speichern der Requests', 'OfflineService', error);
    }
  }

  /**
   * Lädt ausstehende Requests aus localStorage
   */
  loadPendingRequests() {
    try {
      const stored = localStorage.getItem('pending_requests');
      if (stored) {
        this.pendingRequests = JSON.parse(stored);
      }
    } catch (error) {
      logger.error('Fehler beim Laden der Requests', 'OfflineService', error);
    }
  }

  /**
   * Löscht ausstehende Requests
   */
  clearPendingRequests() {
    this.pendingRequests = [];
    localStorage.removeItem('pending_requests');
  }

  /**
   * Prüft ob App offline ist
   */
  isOffline(): boolean {
    return !navigator.onLine;
  }

  /**
   * Gibt Anzahl ausstehender Requests zurück
   */
  getPendingCount(): number {
    return this.pendingRequests.length;
  }

  /**
   * Gibt Sync-Status zurück
   */
  getSyncStatus(): { isSyncing: boolean; progress: number; total: number } {
    return {
      isSyncing: this.isSyncing,
      progress: this.syncProgress,
      total: this.syncTotal,
    };
  }

  /**
   * Registriert Callback für Sync-Progress
   */
  onSyncProgress(callback: (progress: number, total: number) => void): () => void {
    this.syncCallbacks.push(callback);
    return () => {
      this.syncCallbacks = this.syncCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Benachrichtigt alle Progress-Callbacks
   */
  private notifyProgress(progress: number, total: number): void {
    this.syncCallbacks.forEach((callback) => callback(progress, total));
  }

  /**
   * Löscht alte Requests (älter als MAX_AGE_MS)
   */
  clearOldRequests(): number {
    const before = this.pendingRequests.length;
    this.filterOldRequests();
    const after = this.pendingRequests.length;
    const removed = before - after;
    this.savePendingRequests();
    return removed;
  }

  /**
   * Löscht alle ausstehenden Requests
   */
  clearAllRequests(): void {
    this.pendingRequests = [];
    this.savePendingRequests();
  }

  /**
   * Gibt Statistiken zurück
   */
  getStats(): {
    total: number;
    old: number;
    recent: number;
    withRetries: number;
  } {
    const now = Date.now();
    const old = this.pendingRequests.filter(
      (req) => now - req.timestamp >= this.MAX_AGE_MS
    ).length;
    const withRetries = this.pendingRequests.filter(
      (req) => (req.retryCount || 0) > 0
    ).length;

    return {
      total: this.pendingRequests.length,
      old,
      recent: this.pendingRequests.length - old,
      withRetries,
    };
  }

  /**
   * Sync offline data with server (orders, profile, earnings, etc.)
   */
  async syncOfflineData(): Promise<{
    orders: number;
    profile: boolean;
    earnings: number;
    locations: number;
  }> {
    if (!navigator.onLine) {
      return { orders: 0, profile: false, earnings: 0, locations: 0 };
    }

    try {
      // Import offlineStorage dynamically to avoid circular dependencies
      const { offlineStorage } = await import('./offlineStorage');
      
      const [orders, profile, earnings, unsyncedLocations] = await Promise.all([
        offlineStorage.getOrders(),
        offlineStorage.getDriverProfile(),
        offlineStorage.getEarnings(),
        offlineStorage.getUnsyncedLocations(),
      ]);

      // Sync orders
      let syncedOrders = 0;
      if (orders.length > 0) {
        // Sync orders that were modified offline
        for (const order of orders) {
          if (order.offlineModified) {
            try {
              // Update order on server
              const token = localStorage.getItem('driver_token');
              await fetch(`${window.location.origin}/api/orders/${order.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(order),
              });
              syncedOrders++;
            } catch (error) {
              logger.error('Failed to sync order', 'OfflineService', { orderId: order.id, error });
            }
          }
        }
      }

      // Sync profile
      let profileSynced = false;
      if (profile && profile.offlineModified) {
        try {
          const token = localStorage.getItem('driver_token');
          await fetch(`${window.location.origin}/api/drivers/${profile.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(profile),
          });
          profileSynced = true;
        } catch (error) {
          logger.error('Failed to sync profile', 'OfflineService', error);
        }
      }

      // Sync earnings
      let syncedEarnings = 0;
      // Earnings are usually read-only, so we just verify they're up to date

      // Sync location history
      let syncedLocations = 0;
      if (unsyncedLocations.length > 0) {
        const token = localStorage.getItem('driver_token');
        const driverId = profile?.id;
        
        if (driverId) {
          const timestamps: number[] = [];
          for (const location of unsyncedLocations) {
            try {
              await fetch(`${window.location.origin}/api/drivers/${driverId}/location`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  lat: location.lat,
                  lng: location.lng,
                  timestamp: location.timestamp,
                }),
              });
              timestamps.push(location.timestamp);
              syncedLocations++;
            } catch (error) {
              logger.error('Failed to sync location', 'OfflineService', error);
            }
          }
          
          // Mark locations as synced
          if (timestamps.length > 0) {
            await offlineStorage.markLocationsSynced(timestamps);
          }
        }
      }

      return {
        orders: syncedOrders,
        profile: profileSynced,
        earnings: syncedEarnings,
        locations: syncedLocations,
      };
    } catch (error) {
      logger.error('Failed to sync offline data', 'OfflineService', error);
      return { orders: 0, profile: false, earnings: 0, locations: 0 };
    }
  }

  /**
   * Konflikt-Handling (z.B. 409/412 bei Sync)
   */
  getConflicts(): ConflictEntry[] {
    try {
      const stored = localStorage.getItem(this.conflictsKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  clearConflicts(): void {
    localStorage.removeItem(this.conflictsKey);
  }
}

// Export Singleton Instance
export const offlineService = OfflineService.getInstance();

