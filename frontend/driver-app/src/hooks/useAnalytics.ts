import { useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook for tracking analytics events
 */
export function useAnalytics() {
  const { driver } = useAuth();

  useEffect(() => {
    if (driver?.id) {
      analyticsService.setUserId(driver.id);
    }
  }, [driver?.id]);

  const track = (eventName: string, properties?: Record<string, any>) => {
    analyticsService.track(eventName, properties);
  };

  const trackPageView = (pageName: string) => {
    track('page_view', { page: pageName });
  };

  const trackOrderAction = (action: string, orderId: string, properties?: Record<string, any>) => {
    track('order_action', {
      action,
      orderId,
      ...properties,
    });
  };

  const trackPerformance = (metric: string, value: number) => {
    track('performance_metric', {
      metric,
      value,
    });
  };

  return {
    track,
    trackPageView,
    trackOrderAction,
    trackPerformance,
  };
}

