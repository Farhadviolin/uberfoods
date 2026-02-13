// Offline Storage Service using IndexedDB for persistent data storage
interface OfflineData {
  orders: any[];
  driverProfile: any;
  earnings: any[];
  documents: any[];
  settings: any;
  lastSync: number;
}

export class OfflineStorageService {
  private static instance: OfflineStorageService;
  private dbName = 'driver_app_offline';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  private constructor() {
    this.initDB();
  }

  static getInstance(): OfflineStorageService {
    if (!OfflineStorageService.instance) {
      OfflineStorageService.instance = new OfflineStorageService();
    }
    return OfflineStorageService.instance;
  }

  /**
   * Initialize IndexedDB
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('orders')) {
          const ordersStore = db.createObjectStore('orders', { keyPath: 'id' });
          ordersStore.createIndex('status', 'status', { unique: false });
          ordersStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('driverProfile')) {
          db.createObjectStore('driverProfile', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('earnings')) {
          const earningsStore = db.createObjectStore('earnings', { keyPath: 'id' });
          earningsStore.createIndex('date', 'date', { unique: false });
        }

        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('locationHistory')) {
          const locationStore = db.createObjectStore('locationHistory', { keyPath: 'timestamp' });
          locationStore.createIndex('timestamp', 'timestamp', { unique: true });
        }
      };
    });
  }

  /**
   * Wait for DB to be ready
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    await this.initDB();
    if (!this.db) throw new Error('Failed to initialize IndexedDB');
    return this.db;
  }

  /**
   * Save orders offline
   */
  async saveOrders(orders: any[]): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['orders'], 'readwrite');
    const store = transaction.objectStore('orders');

    for (const order of orders) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(order);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Get orders from offline storage
   */
  async getOrders(): Promise<any[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['orders'], 'readonly');
      const store = transaction.objectStore('orders');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get order by ID
   */
  async getOrder(id: string): Promise<any | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['orders'], 'readonly');
      const store = transaction.objectStore('orders');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save driver profile offline
   */
  async saveDriverProfile(profile: any): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['driverProfile'], 'readwrite');
      const store = transaction.objectStore('driverProfile');
      const request = store.put(profile);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get driver profile from offline storage
   */
  async getDriverProfile(): Promise<any | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['driverProfile'], 'readonly');
      const store = transaction.objectStore('driverProfile');
      const request = store.getAll();

      request.onsuccess = () => {
        const profiles = request.result || [];
        resolve(profiles.length > 0 ? profiles[0] : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save location history for offline sync
   */
  async saveLocationHistory(location: { lat: number; lng: number; timestamp: number; accuracy?: number }): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['locationHistory'], 'readwrite');
      const store = transaction.objectStore('locationHistory');
      const request = store.put({
        ...location,
        timestamp: location.timestamp || Date.now(),
        synced: false,
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get unsynced location history
   */
  async getUnsyncedLocations(): Promise<any[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['locationHistory'], 'readonly');
      const store = transaction.objectStore('locationHistory');
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onsuccess = () => {
        const locations = (request.result || []).filter((loc: any) => !loc.synced);
        resolve(locations);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Mark locations as synced
   */
  async markLocationsSynced(timestamps: number[]): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['locationHistory'], 'readwrite');
    const store = transaction.objectStore('locationHistory');

    for (const timestamp of timestamps) {
      await new Promise<void>((resolve, reject) => {
        const getRequest = store.get(timestamp);
        getRequest.onsuccess = () => {
          const location = getRequest.result;
          if (location) {
            location.synced = true;
            const putRequest = store.put(location);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
          } else {
            resolve();
          }
        };
        getRequest.onerror = () => reject(getRequest.error);
      });
    }
  }

  /**
   * Clear old location history (older than 7 days)
   */
  async clearOldLocationHistory(): Promise<number> {
    const db = await this.ensureDB();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['locationHistory'], 'readwrite');
      const store = transaction.objectStore('locationHistory');
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onsuccess = () => {
        const locations = request.result || [];
        let deleted = 0;

        locations.forEach((location: any) => {
          if (location.timestamp < sevenDaysAgo && location.synced) {
            store.delete(location.timestamp);
            deleted++;
          }
        });

        resolve(deleted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save earnings offline
   */
  async saveEarnings(earnings: any[]): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['earnings'], 'readwrite');
    const store = transaction.objectStore('earnings');

    for (const earning of earnings) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(earning);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Get earnings from offline storage
   */
  async getEarnings(): Promise<any[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['earnings'], 'readonly');
      const store = transaction.objectStore('earnings');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save settings offline
   */
  async saveSetting(key: string, value: any): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      const request = store.put({ key, value, updatedAt: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get setting from offline storage
   */
  async getSetting(key: string): Promise<any | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        return resolve(result ? result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all offline data
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();
    const stores = ['orders', 'driverProfile', 'earnings', 'documents', 'settings', 'locationHistory'];
    
    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    orders: number;
    earnings: number;
    locations: number;
    unsyncedLocations: number;
    size: number;
  }> {
    const db = await this.ensureDB();
    const [orders, earnings, locations, unsyncedLocations] = await Promise.all([
      this.getOrders().then(arr => arr.length),
      this.getEarnings().then(arr => arr.length),
      new Promise<number>((resolve, reject) => {
        const transaction = db.transaction(['locationHistory'], 'readonly');
        const store = transaction.objectStore('locationHistory');
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
      this.getUnsyncedLocations().then(arr => arr.length),
    ]);

    return {
      orders,
      earnings,
      locations,
      unsyncedLocations,
      size: 0, // Size calculation would require additional API
    };
  }
}

export const offlineStorage = OfflineStorageService.getInstance();

