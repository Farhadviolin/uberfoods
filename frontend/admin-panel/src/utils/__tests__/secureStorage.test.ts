/**
 * Integrationstests für secureStorage.
 * Wir mocken sessionStorage pro Test neu und laden das Modul isoliert,
 * damit die Initialisierung den jeweiligen Mock nutzt.
 */

// Mock sessionStorage globally before importing the module
let storage: Record<string, string> = {};

const mockSessionStorage = {
  getItem: jest.fn((key: string) => {
    if (key === '__secure_storage_test__') return null;
    return storage[key] ?? null;
  }),
  setItem: jest.fn((key: string, value: string) => {
    storage[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete storage[key];
  }),
  clear: jest.fn(() => {
    storage = {};
  }),
  get length() {
    return Object.keys(storage).length;
  },
  key: jest.fn((index: number) => Object.keys(storage)[index] ?? null),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
});

// Now import the module
import * as secureStorage from '../secureStorage';

describe('secureStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storage = {}; // Reset storage
  });

  it('speichert, liest und entfernt Werte über sessionStorage', () => {
    const { setSessionItem, getSessionItem, removeSessionItem } = secureStorage;

    setSessionItem('testKey', 'testValue');
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith('testKey', 'testValue');
    expect(getSessionItem('testKey')).toBe('testValue');

    removeSessionItem('testKey');
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('testKey');
    expect(getSessionItem('testKey')).toBeNull();
  });

  it('handhabt null/undefined als Lösch-Operation', () => {
    const { setSessionItem } = secureStorage;

    setSessionItem('nullKey', null);
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('nullKey');

    setSessionItem('undefKey', undefined);
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('undefKey');
  });

  it('speichert und liest unterschiedliche Werte', () => {

    const { setSessionItem, getSessionItem } = secureStorage;

    setSessionItem('numberKey', '123');
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith('numberKey', '123');
    expect(getSessionItem('numberKey')).toBe('123');

    setSessionItem('boolKey', 'true');
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith('boolKey', 'true');
    expect(getSessionItem('boolKey')).toBe('true');
  });

  it('clearSessionItems entfernt mehrere Keys', () => {
    const { setSessionItem, clearSessionItems, getSessionItem } = secureStorage;

    setSessionItem('k1', 'v1');
    setSessionItem('k2', 'v2');
    setSessionItem('k3', 'v3');

    clearSessionItems(['k1', 'k2', 'k3']);

    expect(getSessionItem('k1')).toBeNull();
    expect(getSessionItem('k2')).toBeNull();
    expect(getSessionItem('k3')).toBeNull();
  });

  it('fällt bei fehlender sessionStorage-Unterstützung auf In-Memory zurück', () => {
    // Temporarily disable sessionStorage
    Object.defineProperty(window, 'sessionStorage', { value: undefined, writable: true });

    // Re-import module to trigger fallback logic
    jest.resetModules();
    const secureStorageModule = require('../secureStorage');
    const { setSessionItem, getSessionItem, removeSessionItem } = secureStorageModule;

    setSessionItem('memKey', 'memValue');
    expect(getSessionItem('memKey')).toBe('memValue');

    removeSessionItem('memKey');
    expect(getSessionItem('memKey')).toBeNull();

    // Restore sessionStorage
    Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage, writable: true });
  });
});
