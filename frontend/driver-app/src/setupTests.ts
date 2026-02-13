import '@testing-library/jest-dom';

// Provide a basic navigator.geolocation mock for hooks relying on it
if (!('geolocation' in navigator)) {
  (navigator as any).geolocation = {};
}

const mockGeolocation = {
  getCurrentPosition: jest.fn((success, error) => {
    success({
      coords: {
        latitude: 48.2082,
        longitude: 16.3738,
        accuracy: 10,
      },
      timestamp: Date.now(),
    } as GeolocationPosition);
  }),
  watchPosition: jest.fn((success, error) => {
    const id = Date.now();
    success({
      coords: {
        latitude: 48.2082,
        longitude: 16.3738,
        accuracy: 10,
      },
      timestamp: Date.now(),
    } as GeolocationPosition);
    return id;
  }),
  clearWatch: jest.fn(),
};

(navigator as any).geolocation = {
  ...((navigator as any).geolocation || {}),
  ...mockGeolocation,
};

// Mock IndexedDB for Jest environment
const mockIndexedDB = {
  open: jest.fn(() => {
    const request = {
      onerror: null,
      onsuccess: null,
      onupgradeneeded: null,
      error: null,
      result: {
        objectStoreNames: { contains: jest.fn(() => false) },
        createObjectStore: jest.fn(),
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => ({
            add: jest.fn(),
            get: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
            getAll: jest.fn(),
            clear: jest.fn(),
          })),
        })),
      },
    };
    // Simulate successful open
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({} as any);
      }
    }, 0);
    return request;
  }),
  deleteDatabase: jest.fn(),
};

(global as any).indexedDB = mockIndexedDB;
(global as any).IDBKeyRange = {
  only: jest.fn(),
  lowerBound: jest.fn(),
  upperBound: jest.fn(),
  bound: jest.fn(),
};

// Mock window.matchMedia for Jest
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver for Jest
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver for Jest
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock fetch for Jest
global.fetch = jest.fn();

// Mock crypto.randomUUID for Jest
if (!global.crypto) {
  global.crypto = {} as any;
}
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = jest.fn(() => '12345678-1234-1234-1234-123456789012');
}

// Mock scrollIntoView for JSDOM
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: jest.fn(),
});

// Mock getBoundingClientRect for DOM measurements
Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  writable: true,
  value: jest.fn(() => ({
    width: 100,
    height: 100,
    top: 0,
    left: 0,
    bottom: 100,
    right: 100,
  })),
});

// Mock offsetHeight/Width for DOM measurements
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  writable: true,
  value: 100,
});

Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
  writable: true,
  value: 100,
});

// Skip Date mocking for now - it causes issues with testing-library
// If deterministic date testing is needed, use jest.setSystemTime() in specific tests

// Mock performance.now for timers
global.performance = {
  ...global.performance,
  now: jest.fn(() => mockDate.getTime()),
};

// Use fake timers by default for deterministic behavior
jest.useFakeTimers();

// Mock navigator.serviceWorker for Jest
Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: {
    register: jest.fn(() => Promise.resolve({
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    ready: Promise.resolve({
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
  },
});

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: 'MapContainer',
  TileLayer: 'TileLayer',
  Marker: 'Marker',
  Popup: 'Popup',
  useMap: () => ({}),
  useMapEvent: () => ({}),
  useMapEvents: () => ({}),
}));

// Mock leaflet
jest.mock('leaflet', () => ({
  LatLng: jest.fn(),
  Icon: {
    Default: {
      prototype: {},
      mergeOptions: jest.fn(),
      _getIconUrl: jest.fn(),
    },
  },
}));

