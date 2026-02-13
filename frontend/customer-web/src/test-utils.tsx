import React, { ReactElement } from 'react';
import { render, renderHook, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './design-system/ThemeProvider';

// Create test query client with disabled retries
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

// Test wrapper with all providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <FavoritesProvider>
              {children}
            </FavoritesProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

// Test wrapper with cart provider
const TestWrapperWithCart = ({ children }: { children: React.ReactNode }) => {
  const CartProvider = React.lazy(() => import('./contexts/CartContext').then(module => ({ default: module.CartProvider })));
  return (
    <TestWrapper>
      <React.Suspense fallback={<div>Loading...</div>}>
        <CartProvider>
          {children}
        </CartProvider>
      </React.Suspense>
    </TestWrapper>
  );
};

// Custom render function that includes all providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: TestWrapper, ...options });

// Custom render function with cart provider
const customRenderWithCart = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: TestWrapperWithCart, ...options });

// Mock implementations for common hooks
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
  status: 'DELIVERED',
  total: 25.99,
  createdAt: '2024-01-01T12:00:00Z',
  estimatedDeliveryTime: '2024-01-01T12:30:00Z',
  items: [
    {
      id: '1',
      name: 'Pizza Margherita',
      quantity: 2,
      price: 12.99,
      customizations: ['Extra cheese'],
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
  addresses: [
    {
      id: 'addr1',
      street: '123 Test Street',
      city: 'Test City',
      postalCode: '12345',
      isDefault: true,
    },
  ],
  preferences: {
    notifications: true,
    language: 'en',
  },
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockCart = (overrides = {}) => ({
  items: [
    {
      id: '1',
      dishId: 'dish1',
      name: 'Test Dish',
      price: 12.99,
      quantity: 2,
      customizations: [],
    },
  ],
  total: 25.98,
  deliveryFee: 2.50,
  serviceFee: 1.25,
  taxes: 2.50,
  finalTotal: 32.23,
  ...overrides,
});

// Mock router
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
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

// Setup test environment
export const setupTestEnvironment = () => {
  // Mock IntersectionObserver
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock ResizeObserver
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock matchMedia
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

  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage(),
  });

  // Mock console methods to reduce noise in tests
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
  await new Promise(resolve => setTimeout(resolve, 0));
};

export const createMockEvent = (type: string, data = {}) => ({
  type,
  target: { value: data.value || '', checked: data.checked || false },
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
  ...data,
});

// Mock API calls
export const mockApiCall = (method: string, url: string, response: any) => {
  // This would be implemented based on your API mocking strategy
  return jest.fn().mockResolvedValue(response);
};

// Custom renderHook function with all providers
const customRenderHook = (hook: () => any, options?: any) => {
  return renderHook(hook, { wrapper: TestWrapper, ...options });
};

// Re-export testing library functions
export * from '@testing-library/react';

// Export our custom functions
export { customRender as render };
export { customRenderWithCart as renderWithCart };
export { customRenderHook as renderHook };

// Export providers for manual use
export { QueryClient, QueryClientProvider } from '@tanstack/react-query';
export { BrowserRouter } from 'react-router-dom';

// Export wrappers
export { TestWrapper };
export { TestWrapperWithCart };
export { createTestQueryClient };