import { performanceMonitor } from '../performanceMonitor';
import { logger } from '../../utils/logger';

jest.mock('../../utils/logger');

// Mock Performance API
const mockPerformanceObserver = jest.fn();
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();

(global as any).PerformanceObserver = jest.fn().mockImplementation((callback) => {
  return {
    observe: mockObserve,
    disconnect: mockDisconnect,
  };
});

Object.defineProperty(window, 'performance', {
  value: {
    getEntriesByType: jest.fn(() => []),
    now: jest.fn(() => Date.now()),
  },
  writable: true,
});

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNavigationTiming', () => {
    it('gibt Navigation Timing zurück', () => {
      const mockNavigation = {
        responseStart: 100,
        requestStart: 50,
        domContentLoadedEventEnd: 200,
        fetchStart: 0,
      };

      (window.performance.getEntriesByType as jest.Mock).mockReturnValue([mockNavigation]);

      const timing = performanceMonitor.getNavigationTiming();
      
      expect(timing).toBeDefined();
      expect(window.performance.getEntriesByType).toHaveBeenCalledWith('navigation');
    });

    it('berechnet TTFB korrekt', () => {
      const mockNavigation = {
        responseStart: 100,
        requestStart: 50,
        domContentLoadedEventEnd: 200,
        fetchStart: 0,
      };

      (window.performance.getEntriesByType as jest.Mock).mockReturnValue([mockNavigation]);

      performanceMonitor.getNavigationTiming();
      const metrics = performanceMonitor.getMetrics();
      
      expect(metrics.ttfb).toBe(50); // responseStart - requestStart
    });
  });

  describe('getResourceTimings', () => {
    it('gibt Resource Timings zurück', () => {
      const mockResources = [
        { name: '/api/test', duration: 100 },
        { name: '/static/asset.js', duration: 50 },
      ];

      (window.performance.getEntriesByType as jest.Mock).mockReturnValue(mockResources);

      const timings = performanceMonitor.getResourceTimings();
      
      expect(timings.length).toBe(2);
      expect(window.performance.getEntriesByType).toHaveBeenCalledWith('resource');
    });
  });

  describe('getMetrics', () => {
    it('gibt alle Metriken zurück', () => {
      const metrics = performanceMonitor.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('object');
    });
  });

  describe('measure', () => {
    it('misst Custom Metrik', async () => {
      const fn = jest.fn().mockResolvedValue(undefined);
      
      const duration = await performanceMonitor.measure('test-operation', fn);
      
      expect(fn).toHaveBeenCalled();
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('misst synchrone Funktionen', async () => {
      const fn = jest.fn(() => {});
      
      const duration = await performanceMonitor.measure('sync-operation', fn);
      
      expect(fn).toHaveBeenCalled();
      expect(typeof duration).toBe('number');
    });
  });
});
