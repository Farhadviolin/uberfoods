import axios from 'axios';
import { api, API_BASE_URL } from '../api';

// Mock axios
jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('API Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API_BASE_URL', () => {
    it('should be defined', () => {
      expect(API_BASE_URL).toBeDefined();
      expect(typeof API_BASE_URL).toBe('string');
    });

    it('should include environment variables when available', () => {
      // This would be tested in an integration test
      // with actual environment variables
      expect(API_BASE_URL).toContain('http');
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

    it('should handle GET requests', async () => {
      const mockResponse = { data: { test: 'data' } };
      mockAxios.get.mockResolvedValue(mockResponse);

      const result = await api.get('/test');

      expect(mockAxios.get).toHaveBeenCalledWith('/test', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should handle POST requests', async () => {
      const mockData = { name: 'test' };
      const mockResponse = { data: { id: 1, ...mockData } };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await api.post('/test', mockData);

      expect(mockAxios.post).toHaveBeenCalledWith('/test', mockData, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should handle PUT requests', async () => {
      const mockData = { name: 'updated' };
      const mockResponse = { data: { id: 1, ...mockData } };
      mockAxios.put.mockResolvedValue(mockResponse);

      const result = await api.put('/test/1', mockData);

      expect(mockAxios.put).toHaveBeenCalledWith('/test/1', mockData, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should handle DELETE requests', async () => {
      const mockResponse = { data: { success: true } };
      mockAxios.delete.mockResolvedValue(mockResponse);

      const result = await api.delete('/test/1');

      expect(mockAxios.delete).toHaveBeenCalledWith('/test/1', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should include custom config', async () => {
      const mockResponse = { data: { test: 'data' } };
      const config = { headers: { 'X-Custom': 'value' } };
      mockAxios.get.mockResolvedValue(mockResponse);

      const result = await api.get('/test', config);

      expect(mockAxios.get).toHaveBeenCalledWith('/test', config);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockAxios.get.mockRejectedValue(networkError);

      await expect(api.get('/test')).rejects.toThrow('Network Error');
    });

    it('should handle HTTP errors', async () => {
      const httpError = {
        response: {
          status: 404,
          data: { message: 'Not found' },
        },
      };
      mockAxios.get.mockRejectedValue(httpError);

      await expect(api.get('/test')).rejects.toEqual(httpError);
    });

    it('should handle timeout errors', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'Timeout',
      };
      mockAxios.get.mockRejectedValue(timeoutError);

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