/**
 * Fallback values for React Query queries
 * Provides sensible defaults when API calls fail
 */
import { logger } from './logger';

/**
 * Creates fallback data for analytics queries
 */
export const createAnalyticsFallback = (period: 'week' | 'month' | 'quarter' | 'year' = 'month') => ({
  period,
  deliveries: {
    total: 0,
    completed: 0,
    cancelled: 0,
    averagePerDay: 0,
    trend: 0,
  },
  earnings: {
    total: 0,
    averagePerDelivery: 0,
    trend: 0,
    breakdown: [],
  },
  performance: {
    averageDeliveryTime: 0,
    onTimeRate: 0,
    customerRating: 0,
    efficiencyScore: 0,
    trends: {
      deliveryTime: 0,
      onTimeRate: 0,
      rating: 0,
    },
  },
  activity: {
    totalHours: 0,
    averageHoursPerDay: 0,
    peakHours: [],
    daysActive: 0,
  },
  comparison: {
    rank: 0,
    totalDrivers: 0,
    percentile: 0,
    vsAverage: {
      deliveries: 0,
      earnings: 0,
      rating: 0,
    },
  },
});

/**
 * Creates fallback data for performance comparison queries
 */
export const createPerformanceComparisonFallback = () => ({
  drivers: [],
  averages: {
    deliveries: 0,
    earnings: 0,
    rating: 0,
    averageDeliveryTime: 0,
    onTimeRate: 0,
    efficiencyScore: 0,
  },
  selectedDrivers: [],
});

/**
 * Creates fallback data for earnings queries
 */
export const createEarningsFallback = () => ({
  total: 0,
  averagePerDelivery: 0,
  trend: 0,
  breakdown: [],
});

/**
 * Creates fallback data for driver list queries
 */
export const createDriverListFallback = () => [];

/**
 * Creates fallback data for driver performance queries
 */
export const createDriverPerformanceFallback = () => ({
  driverId: '',
  driverName: '',
  currentRating: 0,
  todayDeliveries: 0,
  todayEarnings: 0,
  averageDeliveryTime: 0,
  onTimeDeliveryRate: 0,
  customerSatisfaction: 0,
  efficiencyScore: 0,
  status: 'OFFLINE' as const,
  lastActivity: new Date(),
});

/**
 * Wraps a query function with fallback handling
 */
export function withQueryFallback<T>(
  queryFn: () => Promise<T>,
  fallback: T,
  context?: string
): () => Promise<T> {
  return async () => {
    try {
      return await queryFn();
    } catch (error: any) {
      // Log error but return fallback
      if (import.meta.env.DEV) {
        logger.warn(`[Query Fallback] ${context || 'Unknown'}`, error);
      }
      return fallback;
    }
  };
}

