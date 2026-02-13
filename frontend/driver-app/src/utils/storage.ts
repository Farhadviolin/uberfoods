/**
 * Storage Utilities
 * Enhanced localStorage and sessionStorage management
 */

export class StorageManager {
  private storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  set<T>(key: string, value: T): void {
    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting storage key "${key}":`, error);
    }
  }

  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = this.storage.getItem(key);
      if (item === null) {
        return defaultValue ?? null;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error getting storage key "${key}":`, error);
      return defaultValue ?? null;
    }
  }

  remove(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch (error) {
      console.error(`Error removing storage key "${key}":`, error);
    }
  }

  clear(): void {
    try {
      this.storage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  has(key: string): boolean {
    return this.storage.getItem(key) !== null;
  }

  keys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key) {
        keys.push(key);
      }
    }
    return keys;
  }

  size(): number {
    return this.storage.length;
  }
}

export const localStorage = new StorageManager(window.localStorage);
export const sessionStorage = new StorageManager(window.sessionStorage);

/**
 * Storage with expiration
 */
export class ExpiringStorage {
  private storage: Storage;

  constructor(storage: Storage = window.localStorage) {
    this.storage = storage;
  }

  set<T>(key: string, value: T, ttl: number): void {
    const item = {
      value,
      expiry: Date.now() + ttl,
    };
    this.storage.setItem(key, JSON.stringify(item));
  }

  get<T>(key: string): T | null {
    const itemStr = this.storage.getItem(key);
    if (!itemStr) {
      return null;
    }

    try {
      const item = JSON.parse(itemStr);
      if (!item.expiry || Date.now() > item.expiry) {
        this.storage.removeItem(key);
        return null;
      }
      return item.value as T;
    } catch {
      return null;
    }
  }

  remove(key: string): void {
    this.storage.removeItem(key);
  }

  clear(): void {
    this.storage.clear();
  }
}

export const expiringLocalStorage = new ExpiringStorage();

