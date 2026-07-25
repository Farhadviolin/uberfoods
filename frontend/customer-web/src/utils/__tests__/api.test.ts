import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { api } from '../api';

jest.mock('axios', () => {
  const instance = Object.assign(jest.fn(), {
    defaults: {
      baseURL: '/api',
      timeout: 30000,
      headers: {
        common: { Accept: 'application/json' },
        post: { 'Content-Type': 'application/json' },
        put: { 'Content-Type': 'application/json' },
        patch: { 'Content-Type': 'application/json' },
      },
    },
    interceptors: {
      request: {
        use: jest.fn(),
        eject: jest.fn(),
      },
      response: {
        use: jest.fn(),
        eject: jest.fn(),
      },
    },
    request: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  });

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => instance),
    },
  };
});

const mockAxios = jest.mocked(axios);
const mockApi = jest.mocked(api);
const mockRequestUse = jest.mocked(api.interceptors.request.use);
const mockResponseUse = jest.mocked(api.interceptors.response.use);

const getRequestFulfilled = () => {
  const handler = mockRequestUse.mock.calls[0]?.[0];
  if (!handler) {
    throw new Error('Request interceptor was not registered');
  }
  return handler;
};

const getResponseFulfilled = () => {
  const handler = mockResponseUse.mock.calls[0]?.[0];
  if (!handler) {
    throw new Error('Response interceptor was not registered');
  }
  return handler;
};

const getResponseRejected = () => {
  const handler = mockResponseUse.mock.calls[0]?.[1];
  if (!handler) {
    throw new Error('Response rejection interceptor was not registered');
  }
  return handler;
};

describe('API Utils', () => {
  beforeEach(() => {
    mockApi.request.mockReset();
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    mockApi.put.mockReset();
    mockApi.patch.mockReset();
    mockApi.delete.mockReset();
    localStorage.clear();
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  describe('axios instance configuration', () => {
    it('should create the API instance with the Vite proxy base URL', () => {
      expect(mockAxios.create).toHaveBeenCalledTimes(1);
      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: '/api',
        timeout: 30000,
      });
    });

    it('should expose the configured base URL and timeout', () => {
      expect(api.defaults.baseURL).toBe('/api');
      expect(api.defaults.timeout).toBe(30000);
    });
  });

  describe('interceptor registration', () => {
    it('should register request success and error interceptors', () => {
      expect(mockRequestUse).toHaveBeenCalledTimes(1);
      expect(mockRequestUse).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should register response success and error interceptors', () => {
      expect(mockResponseUse).toHaveBeenCalledTimes(1);
      expect(mockResponseUse).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe('api instance', () => {
    it('should be configured with base URL', () => {
      expect(api.defaults.baseURL).toBe('/api');
    });

    it('should have default headers', () => {
      expect(api.defaults.headers).toBeDefined();
      expect(api.defaults.headers.common).toBeDefined();
    });

    it('should handle GET requests', async () => {
      const mockResponse = { data: { test: 'data' } };
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await api.get('/test');

      expect(mockApi.get).toHaveBeenCalledWith('/test');
      expect(result).toEqual(mockResponse);
    });

    it('should handle POST requests', async () => {
      const mockData = { name: 'test' };
      const mockResponse = { data: { id: 1, ...mockData } };
      mockApi.post.mockResolvedValue(mockResponse);

      const result = await api.post('/test', mockData);

      expect(mockApi.post).toHaveBeenCalledWith('/test', mockData);
      expect(result).toEqual(mockResponse);
    });

    it('should handle PUT requests', async () => {
      const mockData = { name: 'updated' };
      const mockResponse = { data: { id: 1, ...mockData } };
      mockApi.put.mockResolvedValue(mockResponse);

      const result = await api.put('/test/1', mockData);

      expect(mockApi.put).toHaveBeenCalledWith('/test/1', mockData);
      expect(result).toEqual(mockResponse);
    });

    it('should handle DELETE requests', async () => {
      const mockResponse = { data: { success: true } };
      mockApi.delete.mockResolvedValue(mockResponse);

      const result = await api.delete('/test/1');

      expect(mockApi.delete).toHaveBeenCalledWith('/test/1');
      expect(result).toEqual(mockResponse);
    });

    it('should include custom config', async () => {
      const mockResponse = { data: { test: 'data' } };
      const config = { headers: { 'X-Custom': 'value' } };
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await api.get('/test', config);

      expect(mockApi.get).toHaveBeenCalledWith('/test', config);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Interceptor behavior', () => {
    it('should pass successful request configuration through unchanged', () => {
      const config = {
        headers: {},
        method: 'get',
        url: '/test',
      } as InternalAxiosRequestConfig;

      expect(getRequestFulfilled()(config)).toBe(config);
      expect(config.headers.Authorization).toBeUndefined();
    });

    it('should add the customer token without logging it', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const consoleDebug = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
      const config = {
        headers: {},
        method: 'get',
        url: '/test',
      } as InternalAxiosRequestConfig;

      try {
        localStorage.setItem('customer_token', 'test-customer-token');

        expect(getRequestFulfilled()(config)).toBe(config);

        expect(config.headers.Authorization).toBe('Bearer test-customer-token');
        expect(consoleError).not.toHaveBeenCalled();
        expect(consoleWarn).not.toHaveBeenCalled();
        expect(consoleDebug).not.toHaveBeenCalled();
      } finally {
        consoleError.mockRestore();
        consoleWarn.mockRestore();
        consoleDebug.mockRestore();
      }
    });

    it('should pass successful responses through unchanged', () => {
      const response = {
        data: { test: 'data' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} } as InternalAxiosRequestConfig,
      } as AxiosResponse;

      expect(getResponseFulfilled()(response)).toBe(response);
    });

    it('should convert network failures into an offline error', async () => {
      const networkError = {
        message: 'Network Error',
      } as AxiosError;

      await expect(getResponseRejected()(networkError)).rejects.toMatchObject({
        message: 'Offline - Bitte prüfen Sie Ihre Internetverbindung',
        isOffline: true,
      });
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockApi.get.mockRejectedValue(networkError);

      await expect(api.get('/test')).rejects.toThrow('Network Error');
    });

    it('should handle HTTP errors', async () => {
      const httpError = {
        response: {
          status: 404,
          data: { message: 'Not found' },
        },
      };
      mockApi.get.mockRejectedValue(httpError);

      await expect(api.get('/test')).rejects.toEqual(httpError);
    });

    it('should handle timeout errors', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'Timeout',
      };
      mockApi.get.mockRejectedValue(timeoutError);

      await expect(api.get('/test')).rejects.toEqual(timeoutError);
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
  });
});
