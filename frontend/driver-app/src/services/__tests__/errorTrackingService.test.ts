import { errorTrackingService } from '../errorTrackingService';
import { logger } from '../../utils/logger';

jest.mock('../../utils/logger');

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

Object.defineProperty(window, 'location', {
  value: { href: 'http://localhost:3004' },
  writable: true,
});

Object.defineProperty(navigator, 'userAgent', {
  value: 'test-agent',
  writable: true,
});

describe('ErrorTrackingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    errorTrackingService.clearErrors();
  });

  describe('trackError', () => {
    it('tracked Fehler mit Kontext', () => {
      const error = new Error('Test error');
      errorTrackingService.trackError(error, {
        component: 'TestComponent',
        action: 'testAction',
      });

      const errors = errorTrackingService.getErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe('Test error');
      expect(errors[0].context.component).toBe('TestComponent');
      expect(logger.error).toHaveBeenCalled();
    });

    it('tracked String-Fehler', () => {
      errorTrackingService.trackError('String error');
      
      const errors = errorTrackingService.getErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe('String error');
    });

    it('begrenzt Queue-Größe', () => {
      for (let i = 0; i < 101; i++) {
        errorTrackingService.trackError(`Error ${i}`);
      }

      const errors = errorTrackingService.getErrors();
      expect(errors.length).toBeLessThanOrEqual(100);
    });

    it('fügt User-ID hinzu wenn verfügbar', () => {
      localStorageMock.setItem('driver_user', JSON.stringify({ id: 'user-123' }));
      
      errorTrackingService.trackError('Test error');
      
      const errors = errorTrackingService.getErrors();
      expect(errors[0].context.userId).toBe('user-123');
    });
  });

  describe('trackApiError', () => {
    it('tracked API-Fehler mit Details', () => {
      errorTrackingService.trackApiError(
        '/api/test',
        'POST',
        500,
        new Error('Server error'),
        { component: 'API' }
      );

      const errors = errorTrackingService.getErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].context.action).toBe('api_call');
      expect(errors[0].context.metadata?.status).toBe(500);
    });
  });

  describe('trackWebSocketError', () => {
    it('tracked WebSocket-Fehler', () => {
      errorTrackingService.trackWebSocketError(
        new Error('WebSocket error'),
        { component: 'WebSocket' }
      );

      const errors = errorTrackingService.getErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].context.component).toBe('WebSocket');
      expect(errors[0].context.action).toBe('connection');
    });
  });

  describe('getErrors', () => {
    it('gibt alle getrackten Fehler zurück', () => {
      errorTrackingService.trackError('Error 1');
      errorTrackingService.trackError('Error 2');

      const errors = errorTrackingService.getErrors();
      expect(errors.length).toBe(2);
    });
  });

  describe('clearErrors', () => {
    it('löscht alle Fehler', () => {
      errorTrackingService.trackError('Error 1');
      errorTrackingService.trackError('Error 2');

      errorTrackingService.clearErrors();

      const errors = errorTrackingService.getErrors();
      expect(errors.length).toBe(0);
    });
  });
});
