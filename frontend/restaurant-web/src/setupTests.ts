import "@testing-library/jest-dom";

// jsdom globals setup for testing
Object.defineProperty(window, 'TransformStream', {
  writable: true,
  value: class TransformStream {
    constructor() {
      return {};
    }
  },
});

Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: () => '00000000-0000-0000-0000-000000000000',
    getRandomValues: (arr: Uint8Array) => arr.fill(0),
  },
});

Object.defineProperty(window, 'fetch', {
  writable: true,
  value: jest.fn(),
});

Object.defineProperty(window, 'Request', {
  writable: true,
  value: class Request {
    constructor(url: string, options?: any) {
      return { url, ...options };
    }
  },
});

Object.defineProperty(window, 'Response', {
  writable: true,
  value: class Response {
    constructor(body?: any, options?: any) {
      return { body, ...options };
    }
  },
});
