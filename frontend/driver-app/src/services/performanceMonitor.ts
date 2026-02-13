/**
 * Performance Monitoring Service
 * Trackt Web Vitals und Performance-Metriken
 */

import { logger } from '../utils/logger';

export interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  navigation?: PerformanceNavigationTiming;
  resourceTimings?: PerformanceResourceTiming[];
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];

  private constructor() {
    this.initializeObservers();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Initialisiere Performance Observers
   */
  private initializeObservers(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
        this.logMetric('LCP', this.metrics.lcp);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.fid = entry.processingStart - entry.startTime;
          this.logMetric('FID', this.metrics.fid);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as any[];
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.metrics.cls = clsValue;
            this.logMetric('CLS', this.metrics.cls);
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (error) {
      logger.warn('Performance Observer nicht unterstützt', 'PerformanceMonitor', error);
    }
  }

  /**
   * Hole Navigation Timing
   */
  getNavigationTiming(): PerformanceNavigationTiming | null {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return null;
    }

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      this.metrics.navigation = navigation;
      this.metrics.ttfb = navigation.responseStart - navigation.requestStart;
      this.metrics.fcp = navigation.domContentLoadedEventEnd - navigation.fetchStart;
    }

    return navigation || null;
  }

  /**
   * Hole Resource Timings
   */
  getResourceTimings(): PerformanceResourceTiming[] {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return [];
    }

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    this.metrics.resourceTimings = resources;
    return resources;
  }

  /**
   * Hole alle Metriken
   */
  getMetrics(): PerformanceMetrics {
    this.getNavigationTiming();
    this.getResourceTimings();
    return { ...this.metrics };
  }

  /**
   * Logge Metrik
   */
  private logMetric(name: string, value: number | undefined): void {
    if (value === undefined) return;

    // Bewerte Metrik
    const rating = this.rateMetric(name, value);
    
    logger.info(`Performance: ${name} = ${value.toFixed(2)}ms (${rating})`, 'PerformanceMonitor');

    // In Production: Sende an Analytics
    try {
      if ((globalThis as any).import?.meta?.env?.PROD === true) {
        this.sendToAnalytics(name, value, rating);
      }
    } catch {
      // In Tests: Nicht senden
    }
  }

  /**
   * Bewerte Metrik (Good/Needs Improvement/Poor)
   */
  private rateMetric(name: string, value: number): string {
    const thresholds: Record<string, { good: number; poor: number }> = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      TTFB: { good: 800, poor: 1800 },
      FCP: { good: 1800, poor: 3000 },
    };

    const threshold = thresholds[name];
    if (!threshold) return 'Unknown';

    if (value <= threshold.good) return 'Good';
    if (value <= threshold.poor) return 'Needs Improvement';
    return 'Poor';
  }

  /**
   * Sende Metrik an Analytics
   */
  private sendToAnalytics(name: string, value: number, rating: string): void {
    // In Production: Hier würde Analytics-Service aufgerufen
    // Beispiel:
    // analytics.track('performance_metric', {
    //   metric: name,
    //   value,
    //   rating,
    // });
  }

  /**
   * Messe Custom Metrik
   */
  measure(name: string, fn: () => void | Promise<void>): Promise<number> {
    const start = performance.now();
    const result = fn();
    
    if (result instanceof Promise) {
      return result.then(() => {
        const duration = performance.now() - start;
        this.logMetric(`Custom: ${name}`, duration);
        return duration;
      });
    }
    
    const duration = performance.now() - start;
    this.logMetric(`Custom: ${name}`, duration);
    return Promise.resolve(duration);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();
