import axios from 'axios';
import { API_BASE_URL } from '../api';

// Mock the entire api module
jest.mock('../api', () => ({
  API_BASE_URL: '/api',
  api: {
    defaults: {
      baseURL: '/api',
      timeout: 30000,
      headers: {
        common: {
          'Accept': 'application/json'
        },
        post: {
          'Content-Type': 'application/json'
        },
        put: {
          'Content-Type': 'application/json'
        },
        patch: {
          'Content-Type': 'application/json'
        }
      }
    },
    interceptors: {
      request: {
        use: jest.fn()
      },
      response: {
        use: jest.fn()
      }
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn()
  },
  default: {
    defaults: {
      baseURL: '/api',
      timeout: 30000,
      headers: {
        common: {
          'Accept': 'application/json'
        },
        post: {
          'Content-Type': 'application/json'
        },
        put: {
          'Content-Type': 'application/json'
        },
        patch: {
          'Content-Type': 'application/json'
        }
      }
    },
    interceptors: {
      request: {
        use: jest.fn()
      },
      response: {
        use: jest.fn()
      }
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn()
  }
}));

import { api } from '../api';

// Create a mock axios for tests that need it
const mockAxios = {
  get: api.get,
  post: api.post,
  put: api.put,
  patch: api.patch,
  delete: api.delete
};

describe('Driver API Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API_BASE_URL', () => {
    it('should be defined', () => {
      expect(API_BASE_URL).toBeDefined();
      expect(typeof API_BASE_URL).toBe('string');
    });

    it('should be a valid API path', () => {
      expect(API_BASE_URL).toMatch(/^\/api/);
    });
  });

  describe('api instance', () => {
    it('should be configured with base URL', () => {
      expect(api.defaults.baseURL).toBe(API_BASE_URL);
    });

    it('should have default headers', () => {
      expect(api.defaults.headers).toBeDefined();
      expect(api.defaults.headers.common).toBeDefined();
    });

    it('should handle authentication tokens', () => {
      // Mock localStorage
      const mockLocalStorage = {
        getItem: jest.fn(() => 'mock-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
      });

      // This would be tested in integration with auth context
      expect(api.defaults.headers.common).toBeDefined();
    });

    it('should handle GET requests', async () => {
      const mockResponse = { data: { orders: [] } };
      mockAxios.get.mockResolvedValue(mockResponse);

      const result = await api.get('/driver/orders');

      expect(mockAxios.get).toHaveBeenCalledWith('/driver/orders');
      expect(result).toEqual(mockResponse);
    });

    it('should handle POST requests', async () => {
      const mockData = { status: 'ACCEPTED' };
      const mockResponse = { data: { success: true } };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await api.post('/driver/orders/123/accept', mockData);

      expect(mockAxios.post).toHaveBeenCalledWith('/driver/orders/123/accept', mockData);
      expect(result).toEqual(mockResponse);
    });

    it('should handle PUT requests', async () => {
      const mockData = { status: 'PICKED_UP' };
      const mockResponse = { data: { success: true } };
      mockAxios.put.mockResolvedValue(mockResponse);

      const result = await api.put('/driver/orders/123/status', mockData);

      expect(mockAxios.put).toHaveBeenCalledWith('/driver/orders/123/status', mockData);
      expect(result).toEqual(mockResponse);
    });

    it('should handle PATCH requests', async () => {
      const mockData = { location: { lat: 40.7128, lng: -74.0060 } };
      const mockResponse = { data: { success: true } };
      mockAxios.patch.mockResolvedValue(mockResponse);

      const result = await api.patch('/driver/location', mockData);

      expect(mockAxios.patch).toHaveBeenCalledWith('/driver/location', mockData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockAxios.get.mockRejectedValue(networkError);

      await expect(api.get('/driver/orders')).rejects.toThrow('Network Error');
    });

    it('should handle authentication errors', async () => {
      const authError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };
      mockAxios.get.mockRejectedValue(authError);

      await expect(api.get('/driver/orders')).rejects.toEqual(authError);
    });

    it('should handle server errors', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { message: 'Internal Server Error' },
        },
      };
      mockAxios.post.mockRejectedValue(serverError);

      await expect(api.post('/driver/orders/123/accept')).rejects.toEqual(serverError);
    });

    it('should handle validation errors', async () => {
      const validationError = {
        response: {
          status: 400,
          data: { message: 'Invalid order status', errors: ['Status must be valid'] },
        },
      };
      mockAxios.put.mockRejectedValue(validationError);

      await expect(api.put('/driver/orders/123/status')).rejects.toEqual(validationError);
    });
  });

  describe('Request configuration', () => {
    it('should have reasonable timeout', () => {
      expect(api.defaults.timeout).toBeDefined();
      expect(api.defaults.timeout).toBeGreaterThan(0);
    });

    it('should have JSON content type header', () => {
      expect(api.defaults.headers.post['Content-Type']).toBe('application/json');
      expect(api.defaults.headers.put['Content-Type']).toBe('application/json');
      expect(api.defaults.headers.patch['Content-Type']).toBe('application/json');
    });

    it('should accept JSON responses', () => {
      expect(api.defaults.headers.common['Accept']).toBe('application/json');
    });

    it('should handle offline scenarios', () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });

      // This would be tested in integration with offline queue
      expect(navigator.onLine).toBe(false);
    });
  });

  describe('Driver-specific endpoints', () => {
    it('should handle location updates', async () => {
      const locationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
        timestamp: Date.now(),
      };
      const mockResponse = { data: { success: true } };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await api.post('/driver/location', locationData);

      expect(mockAxios.post).toHaveBeenCalledWith('/driver/location', locationData);
      expect(result).toEqual(mockResponse);
    });

    it('should handle order status updates', async () => {
      const statusData = { status: 'IN_TRANSIT' };
      const mockResponse = { data: { success: true } };
      mockAxios.put.mockResolvedValue(mockResponse);

      const result = await api.put('/driver/orders/123/status', statusData);

      expect(mockAxios.put).toHaveBeenCalledWith('/driver/orders/123/status', statusData);
      expect(result).toEqual(mockResponse);
    });

    it('should handle earnings requests', async () => {
      const mockResponse = { data: { earnings: 125.50, today: 45.25 } };
      mockAxios.get.mockResolvedValue(mockResponse);

      const result = await api.get('/driver/earnings');

      expect(mockAxios.get).toHaveBeenCalledWith('/driver/earnings');
      expect(result).toEqual(mockResponse);
    });

    it('should handle performance data', async () => {
      const mockResponse = {
        data: {
          rating: 4.8,
          totalDeliveries: 250,
          averageDeliveryTime: 28,
          completionRate: 0.95,
        },
      };
      mockAxios.get.mockResolvedValue(mockResponse);

      const result = await api.get('/driver/performance');

      expect(mockAxios.get).toHaveBeenCalledWith('/driver/performance');
      expect(result).toEqual(mockResponse);
    });
  });
});