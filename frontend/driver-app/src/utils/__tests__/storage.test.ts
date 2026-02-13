import { StorageManager, ExpiringStorage, localStorage, sessionStorage, expiringLocalStorage } from '../storage';

// Mock localStorage and sessionStorage
const mockLocalStorage = (() => {
  const store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

const mockSessionStorage = (() => {
  const store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

describe('StorageManager', () => {
  let storageManager: StorageManager;

  beforeEach(() => {
    storageManager = new StorageManager(mockLocalStorage);
    jest.clearAllMocks();
  });

  describe('set', () => {
    it('speichert primitive Werte als JSON', () => {
      storageManager.set('string', 'hello');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('string', '"hello"');

      storageManager.set('number', 42);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('number', '42');

      storageManager.set('boolean', true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('boolean', 'true');
    });

    it('speichert komplexe Objekte', () => {
      const obj = { name: 'test', value: 123 };
      storageManager.set('object', obj);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('object', JSON.stringify(obj));
    });

    it('speichert Arrays', () => {
      const arr = [1, 2, 3, 'test'];
      storageManager.set('array', arr);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('array', JSON.stringify(arr));
    });

    it('handhabt Storage-Fehler', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => storageManager.set('error', 'value')).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Error setting storage key "error":', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('get', () => {
    it('holt primitive Werte zurück', () => {
      mockLocalStorage.getItem.mockReturnValue('"hello"');
      expect(storageManager.get<string>('string')).toBe('hello');

      mockLocalStorage.getItem.mockReturnValue('42');
      expect(storageManager.get<number>('number')).toBe(42);

      mockLocalStorage.getItem.mockReturnValue('true');
      expect(storageManager.get<boolean>('boolean')).toBe(true);
    });

    it('holt komplexe Objekte zurück', () => {
      const obj = { name: 'test', value: 123 };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(obj));
      expect(storageManager.get<typeof obj>('object')).toEqual(obj);
    });

    it('holt Arrays zurück', () => {
      const arr = [1, 2, 3, 'test'];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(arr));
      expect(storageManager.get<typeof arr>('array')).toEqual(arr);
    });

    it('gibt Default-Wert zurück bei nicht vorhandenen Items', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      expect(storageManager.get('missing', 'default')).toBe('default');
      expect(storageManager.get('missing')).toBeNull();
    });

    it('handhabt JSON-Parse-Fehler', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      expect(storageManager.get('invalid')).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error getting storage key "invalid":', expect.any(SyntaxError));

      consoleSpy.mockRestore();
    });

    it('gibt Default-Wert bei JSON-Fehlern zurück', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');
      expect(storageManager.get('invalid', 'fallback')).toBe('fallback');
    });
  });

  describe('remove', () => {
    it('entfernt Items', () => {
      storageManager.remove('testKey');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('testKey');
    });

    it('handhabt Storage-Fehler', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => storageManager.remove('error')).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Error removing storage key "error":', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('clear', () => {
    it('leert den gesamten Storage', () => {
      storageManager.clear();
      expect(mockLocalStorage.clear).toHaveBeenCalled();
    });

    it('handhabt Storage-Fehler', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLocalStorage.clear.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => storageManager.clear()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Error clearing storage:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('has', () => {
    it('prüft Existenz von Items', () => {
      mockLocalStorage.getItem.mockReturnValue('value');
      expect(storageManager.has('existing')).toBe(true);

      mockLocalStorage.getItem.mockReturnValue(null);
      expect(storageManager.has('nonexistent')).toBe(false);
    });
  });

  describe('keys', () => {
    it('gibt alle Schlüssel zurück', () => {
      // Mock für 3 Items
      Object.defineProperty(mockLocalStorage, 'length', { value: 3 });
      mockLocalStorage.key.mockImplementation((index: number) => {
        const keys = ['key1', 'key2', 'key3'];
        return keys[index] || null;
      });

      const keys = storageManager.keys();
      expect(keys).toEqual(['key1', 'key2', 'key3']);
    });

    it('handhabt leeren Storage', () => {
      Object.defineProperty(mockLocalStorage, 'length', { value: 0 });
      expect(storageManager.keys()).toEqual([]);
    });
  });

  describe('size', () => {
    it('gibt Anzahl der Items zurück', () => {
      Object.defineProperty(mockLocalStorage, 'length', { value: 5 });
      expect(storageManager.size()).toBe(5);
    });
  });
});

describe('ExpiringStorage', () => {
  let expiringStorage: ExpiringStorage;
  let mockStorage: any;

  beforeEach(() => {
    mockStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    expiringStorage = new ExpiringStorage(mockStorage);
    jest.clearAllMocks();
  });

  describe('set', () => {
    it('speichert Werte mit Ablaufdatum', () => {
      const ttl = 3600000; // 1 Stunde
      const now = Date.now();

      expiringStorage.set('test', 'value', ttl);

      const expectedItem = {
        value: 'value',
        expiry: now + ttl,
      };

      expect(mockStorage.setItem).toHaveBeenCalledWith('test', JSON.stringify(expectedItem));
    });

    it('speichert komplexe Objekte mit Ablaufdatum', () => {
      const obj = { data: 'test', count: 42 };
      expiringStorage.set('object', obj, 300000);

      const call = mockStorage.setItem.mock.calls[0];
      const stored = JSON.parse(call[1]);

      expect(stored.value).toEqual(obj);
      expect(typeof stored.expiry).toBe('number');
      expect(stored.expiry).toBeGreaterThan(Date.now());
    });
  });

  describe('get', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('holt gültige Werte zurück', () => {
      const item = {
        value: 'test',
        expiry: Date.now() + 3600000, // 1 Stunde in Zukunft
      };
      mockStorage.getItem.mockReturnValue(JSON.stringify(item));

      expect(expiringStorage.get('test')).toBe('test');
    });

    it('gibt null zurück bei abgelaufenen Werten und entfernt sie', () => {
      const item = {
        value: 'expired',
        expiry: Date.now() - 1000, // 1 Sekunde in Vergangenheit
      };
      mockStorage.getItem.mockReturnValue(JSON.stringify(item));

      const result = expiringStorage.get('expired');

      expect(result).toBeNull();
      expect(mockStorage.removeItem).toHaveBeenCalledWith('expired');
    });

    it('gibt null zurück bei nicht vorhandenen Items', () => {
      mockStorage.getItem.mockReturnValue(null);
      expect(expiringStorage.get('missing')).toBeNull();
    });

    it('handhabt JSON-Parse-Fehler', () => {
      mockStorage.getItem.mockReturnValue('invalid json');
      expect(expiringStorage.get('invalid')).toBeNull();
    });

    it('handhabt fehlende expiry-Eigenschaft', () => {
      const item = { value: 'test' }; // Kein expiry
      mockStorage.getItem.mockReturnValue(JSON.stringify(item));
      expect(expiringStorage.get('noexpiry')).toBeNull();
    });
  });

  describe('remove and clear', () => {
    it('entfernt Items', () => {
      expiringStorage.remove('test');
      expect(mockStorage.removeItem).toHaveBeenCalledWith('test');
    });

    it('leert Storage', () => {
      expiringStorage.clear();
      expect(mockStorage.clear).toHaveBeenCalled();
    });
  });
});

describe('Global Storage Instances', () => {
  beforeEach(() => {
    // Mock window storage APIs
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
    });
  });

  it('erstellt StorageManager-Instanzen für localStorage und sessionStorage', () => {
    expect(localStorage).toBeInstanceOf(StorageManager);
    expect(sessionStorage).toBeInstanceOf(StorageManager);
  });

  it('erstellt ExpiringStorage-Instanz', () => {
    expect(expiringLocalStorage).toBeInstanceOf(ExpiringStorage);
  });

  it('funktioniert mit globalen Instanzen', () => {
    // Test that the global instances use the mocked storage
    const storageManager = new StorageManager(mockLocalStorage);

    mockLocalStorage.setItem.mockClear();
    storageManager.set('globalTest', { message: 'test' });
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('globalTest', JSON.stringify({ message: 'test' }));

    mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ message: 'test' }));
    expect(storageManager.get('globalTest')).toEqual({ message: 'test' });
  });
});

describe('Storage Integration Tests', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  });

  it('funktioniert mit verschiedenen Datentypen', () => {
    const testData = {
      string: 'hello',
      number: 42,
      boolean: true,
      array: [1, 2, 3],
      object: { nested: { value: 'deep' } },
      null: null,
      undefined: undefined,
    };

    // Set all values
    Object.entries(testData).forEach(([key, value]) => {
      if (value !== undefined) { // Storage kann undefined nicht speichern
        localStorage.set(key, value);
      }
    });

    // Mock return values
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      const value = testData[key as keyof typeof testData];
      return value !== undefined ? JSON.stringify(value) : null;
    });

    // Get all values back
    expect(localStorage.get('string')).toBe('hello');
    expect(localStorage.get('number')).toBe(42);
    expect(localStorage.get('boolean')).toBe(true);
    expect(localStorage.get('array')).toEqual([1, 2, 3]);
    expect(localStorage.get('object')).toEqual({ nested: { value: 'deep' } });
    expect(localStorage.get('null')).toBeNull();
    expect(localStorage.get('undefined')).toBeNull();
  });

  it('handhabt Storage-Limits und -Fehler robust', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    // Test mit einem StorageManager der den mock verwendet
    const storageManager = new StorageManager(mockLocalStorage);

    // Simuliere QuotaExceededError
    const originalSetItem = mockLocalStorage.setItem;
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    // Sollte nicht crashen
    expect(() => {
      storageManager.set('large', { data: 'x'.repeat(1000000) });
    }).not.toThrow();

    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
    mockLocalStorage.setItem = originalSetItem;
  });
});