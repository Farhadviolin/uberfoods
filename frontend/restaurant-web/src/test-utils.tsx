import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";

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

// Mock auth state for tests
const mockAuthState = {
  user: {
    id: "restaurant1",
    email: "restaurant@test.com",
    name: "Test Restaurant",
    role: "owner",
    restaurantId: "restaurant1",
    mustChangePassword: false,
  },
  token: "mock-restaurant-jwt-token",
  restaurantId: "restaurant1",
  mustChangePassword: false,
};

// Test wrapper for restaurant web
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    <BrowserRouter>
      <AuthProvider initialAuthState={mockAuthState}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

// Custom render function that includes restaurant providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: TestWrapper, ...options });

// Mock implementations for restaurant hooks
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

// Mock data generators for restaurant data
export const createMockRestaurantOrder = (overrides = {}) => ({
  id: "order1",
  customerName: "John Doe",
  customerPhone: "+1234567890",
  status: "PENDING",
  total: 25.99,
  items: [
    {
      id: "1",
      name: "Pizza Margherita",
      quantity: 2,
      price: 12.99,
      customizations: ["Extra cheese"],
    },
    {
      id: "2",
      name: "Coke",
      quantity: 1,
      price: 2.99,
    },
  ],
  createdAt: "2024-01-01T12:00:00Z",
  estimatedDeliveryTime: "2024-01-01T12:30:00Z",
  deliveryAddress: "456 Customer Ave",
  specialInstructions: "No onions please",
  paymentMethod: "CREDIT_CARD",
  driverName: "Mike Johnson",
  driverPhone: "+1112223333",
  ...overrides,
});

export const createMockRestaurant = (overrides = {}) => ({
  id: "restaurant1",
  name: "Test Restaurant",
  email: "restaurant@test.com",
  phone: "+1234567890",
  address: "123 Restaurant St",
  status: "OPEN",
  rating: 4.5,
  totalOrders: 150,
  totalRevenue: 2850.0,
  isActive: true,
  cuisines: ["Italian", "Pizza"],
  operatingHours: {
    monday: "11:00-22:00",
    tuesday: "11:00-22:00",
    wednesday: "11:00-22:00",
    thursday: "11:00-22:00",
    friday: "11:00-23:00",
    saturday: "12:00-23:00",
    sunday: "12:00-21:00",
  },
  createdAt: "2024-01-01T00:00:00Z",
  ...overrides,
});

export const createMockMenuItem = (overrides = {}) => ({
  id: "dish1",
  name: "Pizza Margherita",
  description: "Classic pizza with tomato sauce and mozzarella",
  price: 12.99,
  category: "Pizza",
  imageUrl: "https://example.com/pizza.jpg",
  isAvailable: true,
  isVegetarian: true,
  allergens: ["dairy", "gluten"],
  preparationTime: 15,
  customizations: [
    {
      id: "extra-cheese",
      name: "Extra Cheese",
      price: 2.0,
      type: "addon",
    },
    {
      id: "size",
      name: "Size",
      options: [
        { id: "small", name: "Small", price: 0 },
        { id: "large", name: "Large", price: 3.0 },
      ],
      type: "select",
    },
  ],
  ...overrides,
});

export const createMockAnalytics = (overrides = {}) => ({
  totalOrders: 150,
  totalRevenue: 2850.0,
  averageOrderValue: 19.0,
  ordersByDay: [
    { date: "2024-01-01", orders: 12 },
    { date: "2024-01-02", orders: 15 },
  ],
  topDishes: [
    { name: "Pizza Margherita", orders: 45, revenue: 580.55 },
    { name: "Burger", orders: 32, revenue: 320.0 },
  ],
  customerSatisfaction: 4.2,
  averageDeliveryTime: 28,
  peakHours: [
    { hour: "18:00", orders: 8 },
    { hour: "19:00", orders: 12 },
  ],
  ...overrides,
});

// Mock router
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  pathname: "/restaurant",
  query: {},
  asPath: "/restaurant",
};

// Mock localStorage for restaurant sessions
export const mockLocalStorage = () => {
  const store: Record<string, string> = {
    "restaurant-token": "mock-restaurant-jwt-token",
    "restaurant-id": "restaurant1",
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
      Object.keys(store).forEach((key) => delete store[key]);
    },
  };
};

// Setup test environment for restaurant web
export const setupTestEnvironment = () => {
  // Mock IntersectionObserver
  (globalThis as any).IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock ResizeObserver
  (globalThis as any).ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock matchMedia
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
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

  // Mock localStorage with restaurant data
  Object.defineProperty(window, "localStorage", {
    value: mockLocalStorage(),
  });

  // Mock Notification API for order notifications
  Object.defineProperty(window, "Notification", {
    value: {
      requestPermission: jest.fn().mockResolvedValue("granted"),
      permission: "granted",
    },
    writable: true,
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
  await new Promise((resolve) => setTimeout(resolve, 0));
};

export const createMockEvent = (type: string, data: any = {}) => ({
  type,
  target: { value: data.value || "", checked: data.checked || false },
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
  ...data,
});

// Mock restaurant API calls
export const mockRestaurantApiCall = (endpoint: string, response: any) => {
  return jest.fn().mockResolvedValue(response);
};

// Mock WebSocket for real-time order updates
export const mockWebSocket = () => ({
  onopen: jest.fn(),
  onmessage: jest.fn(),
  onclose: jest.fn(),
  onerror: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1, // OPEN
});

// Mock notification system
export const mockNotification = () => ({
  showNotification: jest.fn(),
  requestPermission: jest.fn().mockResolvedValue("granted"),
});

// Export everything
export * from "@testing-library/react";
export { customRender as render };
export { TestWrapper };
export { createTestQueryClient };
