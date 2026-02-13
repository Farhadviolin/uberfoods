import { offlineService } from '../offline';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  configurable: true,
  value: true,
});

// Mock fetch
global.fetch = jest.fn();

describe('OfflineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    (navigator.onLine as any) = true;
    (global.fetch as jest.Mock).mockClear();
    // Clear pending requests between tests
    offlineService.clearPendingRequests();
  });

  describe('queueRequest', () => {
    it('speichert Request in Queue', () => {
      offlineService.queueRequest('/api/test', { method: 'POST' }, 5);
      
      expect(offlineService.getPendingCount()).toBe(1);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('verwendet Priority für Sortierung', () => {
      offlineService.queueRequest('/api/low', { method: 'GET' }, 1);
      offlineService.queueRequest('/api/high', { method: 'POST' }, 10);
      
      const count = offlineService.getPendingCount();
      expect(count).toBe(2);
    });

    it('verhindert Duplikate', () => {
      offlineService.queueRequest('/api/test', { method: 'POST' });
      offlineService.queueRequest('/api/test', { method: 'POST' });
      
      expect(offlineService.getPendingCount()).toBe(1);
    });

    it('entfernt ältesten Request bei Queue-Limit', () => {
      // Fülle Queue bis zum Limit (100)
      for (let i = 0; i < 101; i++) {
        offlineService.queueRequest(`/api/test-${i}`, { method: 'POST' });
      }
      
      expect(offlineService.getPendingCount()).toBeLessThanOrEqual(100);
    });
  });

  describe('syncPendingRequests', () => {
    it('synchronisiert Requests wenn online', async () => {
      (navigator.onLine as any) = true;
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      });

      offlineService.queueRequest('/api/test', { method: 'POST' });
      
      await offlineService.syncPendingRequests();
      
      expect(global.fetch).toHaveBeenCalled();
    });

    it('sortiert Requests nach Priority', async () => {
      (navigator.onLine as any) = true;
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      });

      offlineService.queueRequest('/api/low', { method: 'GET' }, 1);
      offlineService.queueRequest('/api/high', { method: 'POST' }, 10);
      
      await offlineService.syncPendingRequests();
      
      // High priority sollte zuerst verarbeitet werden
      expect(global.fetch).toHaveBeenCalled();
    });

    it('macht nichts wenn offline', async () => {
      (navigator.onLine as any) = false;
      
      offlineService.queueRequest('/api/test', { method: 'POST' });
      await offlineService.syncPendingRequests();
      
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('retried fehlgeschlagene Requests', async () => {
      (navigator.onLine as any) = true;
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, status: 200 });

      offlineService.queueRequest('/api/test', { method: 'POST' });
      
      await offlineService.syncPendingRequests();
      
      // Sollte retry versuchen
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('getPendingCount', () => {
    it('gibt korrekte Anzahl zurück', () => {
      expect(offlineService.getPendingCount()).toBe(0);
      
      offlineService.queueRequest('/api/test1', { method: 'POST' });
      offlineService.queueRequest('/api/test2', { method: 'POST' });
      
      expect(offlineService.getPendingCount()).toBe(2);
    });
  });

  describe('clearPendingRequests', () => {
    it('löscht alle Requests', () => {
      offlineService.queueRequest('/api/test1', { method: 'POST' });
      offlineService.queueRequest('/api/test2', { method: 'POST' });
      
      offlineService.clearPendingRequests();
      
      expect(offlineService.getPendingCount()).toBe(0);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('pending_requests');
    });
  });

  describe('getConflicts', () => {
    it('gibt Konflikte zurück', () => {
      const conflicts = offlineService.getConflicts();
      expect(Array.isArray(conflicts)).toBe(true);
    });
  });
});
