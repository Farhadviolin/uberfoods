// Offline-Support Service für Admin-Panel
import { getSessionItem, setSessionItem, removeSessionItem } from '../utils/secureStorage';
import { logger } from '../utils/logger';
interface PendingRequest {
  path: string;
  options: RequestInit;
  timestamp: number;
  retryCount?: number;
  maxRetries?: number;
}

export class OfflineService {
  private static instance: OfflineService;
  private pendingRequests: PendingRequest[] = [];
  private isSyncing = false;
  private syncProgress = 0;
  private syncTotal = 0;
  private syncCallbacks: Array<(progress: number, total: number) => void> = [];

  // Erlaubte API-Pfade (Prefix-basiert) für Offline-Replay
  private readonly ALLOWED_PATH_PREFIXES = [
    '/restaurants',
    '/dishes',
    '/orders',
    '/customers',
    '/drivers',
    '/promotions',
    '/support',
    '/rbac',
    '/settings',
    '/legal-pages',
    '/admin',
    '/statistics',
  ];
  private readonly _SAFE_PATH_REGEX = /^\/(restaurants|dishes|orders|customers|drivers|promotions|support|rbac|settings|legal-pages|admin|statistics)(\/[A-Za-z0-9._~-]+)*$/;

  // Konfiguration
  private readonly MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 Stunden
  private readonly MAX_RETRIES = 3;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private readonly _BATCH_SIZE = 10; // Parallele Requests pro Batch
  private readonly MAX_QUEUE_SIZE = 100; // Maximale Anzahl von Requests in Queue

  private constructor() {
    this.setupOfflineListener();
    this.loadPendingRequests();
  }

  /**
   * Normalisiert und bereinigt Pfade für Offline-Requests (nur relative API-Pfade erlaubt)
   */
  private normalizePath(url: string): string {
    if (!url) return '/';
    if (url.startsWith('http')) {
      return '/';
    }
    const normalizedPath = url.startsWith('/') ? url : `/${url}`;
    // Strip Query/Fragment, nur Pfadbestandteile erlauben
    const pathOnly = normalizedPath.split(/[?#]/)[0];
    const safePath = pathOnly.replace(/[^a-zA-Z0-9/_.-]/g, '');
    return safePath.startsWith('/') ? safePath : `/${safePath || ''}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _isAllowedPath(path: string): boolean {
    return this.ALLOWED_PATH_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
  }

  /**
   * Baut einen strikt erlaubten und kodierten Pfad für Replay
   * - Prüft Prefix-Allowlist
   * - Encodiert alle Segmente hinter dem Prefix
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _buildSafeReplayPath(path: string): string | null {
    const matchedPrefix = this.ALLOWED_PATH_PREFIXES.find(prefix => path === prefix || path.startsWith(`${prefix}/`));
    if (!matchedPrefix) return null;

    const rest = path.slice(matchedPrefix.length);
    const safeRest = rest
      .split('/')
      .filter(Boolean)
      .map(seg => encodeURIComponent(seg))
      .join('/');

    const safePath = safeRest ? `${matchedPrefix}/${safeRest}` : matchedPrefix;
    return safePath.startsWith('/') ? safePath : `/${safePath}`;
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
      logger.info('✅ Online - Synchronisiere ausstehende Requests...');
      this.syncPendingRequests();
    });

    window.addEventListener('offline', () => {
      logger.warn('⚠️ Offline - Requests werden in Queue gespeichert');
    });
  }

  /**
   * Speichert Request für spätere Synchronisation
   */
  queueRequest(url: string, options: RequestInit) {
    // Prüfe Queue-Limit
    if (this.pendingRequests.length >= this.MAX_QUEUE_SIZE) {
      logger.warn(`⚠️ Queue-Limit erreicht (${this.MAX_QUEUE_SIZE}). Entferne ältesten Request.`);
      this.pendingRequests.shift(); // Entferne ältesten Request
    }

    // Prüfe ob Request bereits existiert (verhindert Duplikate)
    const safePath = this.normalizePath(url);
    const existingIndex = this.pendingRequests.findIndex(
      (req) => req.path === safePath && JSON.stringify(req.options) === JSON.stringify(options)
    );
    
    if (existingIndex >= 0) {
      // Update Timestamp wenn bereits vorhanden
      this.pendingRequests[existingIndex].timestamp = Date.now();
    } else {
      this.pendingRequests.push({
        path: safePath,
        options,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: this.MAX_RETRIES,
      });
    }

    // Speichere in Session Storage (kein localStorage, um Persistenz über Browser-Sessions zu vermeiden)
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
      logger.info(`🗑️ ${before - after} alte Requests entfernt (älter als 24h)`);
      this.savePendingRequests();
    }
  }

  /**
   * Synchronisierung deaktiviert: Queue bleibt bestehen, Nutzer muss Aktionen erneut ausführen.
   */
  async syncPendingRequests(): Promise<void> {
    return;
  }

  /**
   * Entfernt Request aus Queue
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _removeRequest(request: PendingRequest): void {
    const index = this.pendingRequests.indexOf(request);
    if (index >= 0) {
      this.pendingRequests.splice(index, 1);
      this.savePendingRequests();
    }
  }

  /**
   * Speichert Queue in Session Storage
   */
  private savePendingRequests(): void {
    try {
      setSessionItem('admin_offline_queue', JSON.stringify(this.pendingRequests));
    } catch (error) {
      logger.error('Fehler beim Speichern der Offline-Queue:', error);
    }
  }

  /**
   * Lädt Queue aus Session Storage
   */
  private loadPendingRequests(): void {
    try {
      const stored = getSessionItem('admin_offline_queue');
      if (stored) {
        const parsed: any[] = JSON.parse(stored);
        this.pendingRequests = parsed.map((item) => ({
          path: this.normalizePath(item.path || item.url || '/'),
          options: item.options,
          timestamp: item.timestamp,
          retryCount: item.retryCount,
          maxRetries: item.maxRetries,
        }));
        // Filtere alte Requests beim Laden
        this.filterOldRequests();
      } else {
        this.pendingRequests = [];
      }
    } catch (error) {
      logger.error('Fehler beim Laden der Offline-Queue:', error);
      this.pendingRequests = [];
    }
  }

  /**
   * Benachrichtigt Sync-Progress-Callbacks
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _notifySyncProgress(): void {
    this.syncCallbacks.forEach(callback => {
      callback(this.syncProgress, this.syncTotal);
    });
  }

  /**
   * Registriert Callback für Sync-Progress
   */
  onSyncProgress(callback: (progress: number, total: number) => void): () => void {
    this.syncCallbacks.push(callback);
    return () => {
      const index = this.syncCallbacks.indexOf(callback);
      if (index >= 0) {
        this.syncCallbacks.splice(index, 1);
      }
    };
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
   * Löscht alle ausstehenden Requests
   */
  clearQueue(): void {
    this.pendingRequests = [];
    removeSessionItem('admin_offline_queue');
    logger.info('🗑️ Offline-Queue geleert');
  }
}

export const offlineService = OfflineService.getInstance();

