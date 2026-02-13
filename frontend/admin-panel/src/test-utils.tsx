import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';

// Create test query client with disabled retries
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Test wrapper with admin-specific providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

// Custom render function that includes admin providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: TestWrapper, ...options });

// Mock implementations for admin hooks
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

// Mock data generators for admin data
export const createMockAdminUser = (overrides = {}) => ({
  id: 'admin1',
  name: 'Admin User',
  email: 'admin@uberfoods.com',
  role: 'ADMIN',
  permissions: ['read', 'write', 'delete'],
  isActive: true,
  lastLogin: '2024-01-01T10:00:00Z',
  createdAt: '2023-12-01T00:00:00Z',
  ...overrides,
});

export const createMockRestaurant = (overrides = {}) => ({
  id: 'restaurant1',
  name: 'Test Restaurant',
  email: 'restaurant@test.com',
  phone: '+1234567890',
  address: '123 Restaurant St',
  status: 'OPEN',
  rating: 4.5,
  totalOrders: 150,
  totalRevenue: 2850.00,
  isActive: true,
  cuisines: ['Italian', 'Pizza'],
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockOrder = (overrides = {}) => ({
  id: 'order1',
  customerName: 'John Doe',
  customerPhone: '+1234567890',
  restaurantName: 'Test Restaurant',
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
    },
  ],
  deliveryAddress: '456 Customer Ave',
  ...overrides,
});

export const createMockCustomer = (overrides = {}) => ({
  id: 'customer1',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  totalOrders: 15,
  totalSpent: 245.80,
  lastOrderDate: '2024-01-01T12:00:00Z',
  status: 'ACTIVE',
  registrationDate: '2023-12-01T00:00:00Z',
  ...overrides,
});

export const createMockAnalytics = (overrides = {}) => ({
  totalOrders: 1250,
  totalRevenue: 25680.50,
  activeCustomers: 890,
  activeRestaurants: 45,
  pendingOrders: 23,
  completedOrders: 1187,
  averageOrderValue: 20.54,
  topPerformingRestaurant: 'Pizza Palace',
  revenueByDay: [
    { date: '2024-01-01', revenue: 1250.00 },
    { date: '2024-01-02', revenue: 1380.50 },
  ],
  topRestaurants: [
    { name: 'Pizza Palace', orders: 245, revenue: 5420.50 },
    { name: 'Burger Joint', orders: 189, revenue: 3780.25 },
  ],
  alerts: [
    {
      id: 'alert1',
      type: 'WARNING',
      message: 'High number of pending orders',
      timestamp: '2024-01-01T11:30:00Z',
    },
  ],
  ...overrides,
});

// Mock router
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  pathname: '/admin',
  query: {},
  asPath: '/admin',
};

// Mock localStorage for admin sessions
export const mockLocalStorage = () => {
  const store: Record<string, string> = {
    'admin-token': 'mock-admin-jwt-token',
    'admin-role': 'ADMIN',
  };

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

// Setup test environment for admin panel
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

  // Mock localStorage with admin data
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage(),
  });

  // Mock console methods to reduce noise
  const originalConsole = { ...console };
  // eslint-disable-next-line no-console
  console.warn = jest.fn();
  // eslint-disable-next-line no-console
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

export const createMockEvent = (type: string, data: Record<string, any> = {}) => ({
  type,
  target: { value: data.value || '', checked: data.checked || false },
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
  ...data,
});

// Mock admin API calls
export const mockAdminApiCall = (_endpoint: string, response: any) => {
  return jest.fn().mockResolvedValue(response);
};

// Mock table/data grid interactions
export const mockTableInteraction = () => ({
  onSort: jest.fn(),
  onFilter: jest.fn(),
  onPageChange: jest.fn(),
  onPageSizeChange: jest.fn(),
});

// Override the default render function globally
export * from '@testing-library/react';
export { customRender as render };
export { TestWrapper };
export { createTestQueryClient };

// Re-export custom render as default for easier importing
export default customRender;

// Note: render is now overridden globally in setupTestRender.tsx