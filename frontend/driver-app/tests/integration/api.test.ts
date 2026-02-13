import api from '../../src/utils/api';

describe('API Integration Tests', () => {
  const originalFetch = global.fetch;
  
  beforeEach(() => {
    global.fetch = jest.fn();
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('Authentifizierung', () => {
    it('fügt Token zu Requests hinzu', async () => {
      localStorage.setItem('driver_token', 'test-token');
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      await api.get('/test');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('handelt 401 Fehler mit Token Refresh', async () => {
      localStorage.setItem('driver_token', 'expired-token');
      localStorage.setItem('driver_refresh_token', 'refresh-token');

      // Erster Call: 401
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      });

      // Refresh Call: Erfolg
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'new-token',
          refresh_token: 'new-refresh-token',
        }),
      });

      // Retry Call: Erfolg
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'success' }),
      });

      const response = await api.get('/test');
      
      expect(response.data).toBe('success');
      expect(localStorage.getItem('driver_token')).toBe('new-token');
    });
  });

  describe('Offline-Handling', () => {
    it('queued Requests bei Offline-Status', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: false,
      });

      (global.fetch as jest.Mock).mockRejectedValueOnce({
        code: 'ERR_NETWORK',
        message: 'Network error',
      });

      try {
        await api.post('/test', { data: 'test' });
      } catch (error: any) {
        expect(error.isOffline).toBe(true);
      }

      const pendingRequests = JSON.parse(
        localStorage.getItem('pending_requests') || '[]'
      );
      expect(pendingRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('handelt 404 Fehler korrekt', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
      });

      try {
        await api.get('/nonexistent');
      } catch (error: any) {
        expect(error.response?.status).toBe(404);
      }
    });

    it('handelt 500 Server-Fehler', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error' }),
      });

      try {
        await api.get('/test');
      } catch (error: any) {
        expect(error.response?.status).toBe(500);
      }
    });
  });
});
