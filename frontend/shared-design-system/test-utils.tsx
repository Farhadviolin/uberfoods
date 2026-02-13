import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create test query client with disabled retries and error boundaries
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Test wrapper with QueryClient
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: TestWrapper, ...options });

// Mock implementations for common hooks and services
export const mockApiResponse = <T,>(data: T) => ({
  data,
  isLoading: false,
  error: null,
  refetch: jest.fn(),
});

export const mockApiError = (error: Error) => ({
  data: null,
  isLoading: false,
  error,
  refetch: jest.fn(),
});

export const mockApiLoading = () => ({
  data: null,
  isLoading: true,
  error: null,
  refetch: jest.fn(),
});

// Mock data generators
export const createMockRestaurant = (overrides = {}) => ({
  id: '1',
  name: 'Test Restaurant',
  description: 'A great place to eat',
  rating: 4.5,
  cuisines: ['Italian', 'Pizza'],
  deliveryFee: 2.5,
  minOrderAmount: 15,
  estimatedDeliveryTime: 30,
  isOpen: true,
  imageUrl: 'https://example.com/restaurant.jpg',
  address: '123 Test Street',
  phone: '+1234567890',
  ...overrides,
});

export const createMockOrder = (overrides = {}) => ({
  id: 'order1',
  status: 'PENDING',
  total: 25.99,
  createdAt: '2024-01-01T12:00:00Z',
  estimatedDeliveryTime: '2024-01-01T12:30:00Z',
  items: [
    {
      id: '1',
      name: 'Pizza Margherita',
      quantity: 2,
      price: 12.99,
      customizations: [],
    },
  ],
  restaurantName: 'Test Restaurant',
  deliveryAddress: '456 Customer Ave',
  customerName: 'John Doe',
  ...overrides,
});

export const createMockUser = (overrides = {}) => ({
  id: 'user1',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  addresses: [],
  preferences: {},
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Mock router for Next.js/React Router tests
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  prefetch: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
};

// Mock localStorage
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(key => delete store[key]);
    },
  };
};

// Mock IntersectionObserver
export const mockIntersectionObserver = () => {
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
};

// Mock ResizeObserver
export const mockResizeObserver = () => {
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
};

// Mock matchMedia
export const mockMatchMedia = (matches = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

// Setup all mocks at once
export const setupTestEnvironment = () => {
  mockIntersectionObserver();
  mockResizeObserver();
  mockMatchMedia();

  // Mock window methods
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage(),
  });

  // Mock console methods to reduce noise
  const originalConsole = { ...console };
  console.warn = jest.fn();
  console.error = jest.fn();

  return {
    restoreConsole: () => {
      Object.assign(console, originalConsole);
    },
  };
};

// Test helpers
export const waitForLoadingToFinish = async () => {
  // Wait for any loading states to resolve
  await new Promise(resolve => setTimeout(resolve, 0));
};

export const createMockEvent = (type: string, data = {}) => ({
  type,
  target: { value: data.value || '' },
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
  ...data,
});

// Export everything
export * from '@testing-library/react';
export { customRender as render };
export { TestWrapper };
export { createTestQueryClient };