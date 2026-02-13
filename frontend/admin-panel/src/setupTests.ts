import '@testing-library/jest-dom';

// Mock import.meta for Vite
(global as any).import = {
  meta: {
    env: {
      DEV: true,
      PROD: false,
      SSR: false,
      VITE_API_URL: 'http://localhost:3000/api',
      VITE_STORAGE_PREFIX: 'uberfoods_test',
      VITE_WS_URL: 'ws://localhost:3000',
      // Add other env vars as needed
    },
  },
};

// Also set import.meta directly for ES modules
(global as any).import.meta = {
  env: {
    DEV: true,
    PROD: false,
    SSR: false,
    VITE_API_URL: 'http://localhost:3000/api',
    VITE_STORAGE_PREFIX: 'uberfoods_test',
    VITE_WS_URL: 'ws://localhost:3000',
  },
};

// Mock TextEncoder and TextDecoder for react-router
// eslint-disable-next-line @typescript-eslint/no-var-requires
global.TextEncoder = require('util').TextEncoder;
// eslint-disable-next-line @typescript-eslint/no-var-requires
global.TextDecoder = require('util').TextDecoder;

// Mock window.matchMedia
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

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock crypto.randomUUID for UUID generation
Object.defineProperty(window, 'crypto', {
  value: {
    ...window.crypto,
    randomUUID: jest.fn(() => '12345678-1234-1234-1234-123456789abc'),
  },
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true,
});

// Mock tokenStorage globally
// jest.mock('./utils/tokenStorage', () => require('./utils/__mocks__/tokenStorage'));

// Mock URL.createObjectURL and revokeObjectURL for file handling
Object.defineProperty(window.URL, 'createObjectURL', {
  value: jest.fn(() => 'mock-object-url'),
  writable: true,
});
Object.defineProperty(window.URL, 'revokeObjectURL', {
  value: jest.fn(),
  writable: true,
});

// Mock HTMLCanvasElement.getContext für Chart.js
// Muss vor dem Import von Chart.js ausgeführt werden
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = jest.fn(function(contextType: string) {
  if (contextType === '2d') {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn((_x: number, _y: number, w: number, h: number) => ({
        data: new Array(w * h * 4).fill(0),
      })),
      putImageData: jest.fn(),
      createImageData: jest.fn(() => ({
        data: new Array(4).fill(0),
        width: 1,
        height: 1,
      })),
      setTransform: jest.fn(),
      resetTransform: jest.fn(), // Wichtig für Chart.js
      drawImage: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      measureText: jest.fn(() => ({ width: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0 })),
      transform: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
      createLinearGradient: jest.fn(() => ({
        addColorStop: jest.fn(),
      })),
      createRadialGradient: jest.fn(() => ({
        addColorStop: jest.fn(),
      })),
      createPattern: jest.fn(),
      bezierCurveTo: jest.fn(),
      quadraticCurveTo: jest.fn(),
      setLineDash: jest.fn(),
      getLineDash: jest.fn(() => []),
      canvas: this,
    } as any;
  }
  return originalGetContext.call(this, contextType as any);
});

// Cleanup for async operations and timers
afterEach(() => {
  // Clear all timers
  jest.clearAllTimers();
  jest.runOnlyPendingTimers();

  // Clear all mocks
  jest.clearAllMocks();

  // Force garbage collection if available (helps with open handles)
  if (global.gc) {
    global.gc();
  }
});

// Setup fake timers globally for tests that need them
jest.useFakeTimers();
