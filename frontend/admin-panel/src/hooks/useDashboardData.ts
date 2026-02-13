import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { logger } from '../utils/logger';
import { extractData } from '../utils/apiResponse';
import { handleApiError } from '../utils/errorHandler';

interface DashboardStats {
  orders: {
    total: number;
    completed: number;
    completionRate: number;
  };
  revenue: {
    total: number;
    average: number;
  };
  customers: {
    total: number;
    new: number;
  };
  restaurants: {
    total: number;
  };
  drivers: {
    total: number;
    active: number;
  };
}

interface TrendData {
  ordersTrend: number;
  revenueTrend: number;
  customersTrend: number;
  driversTrend: number;
}

// Allowlist für optionale Endpoints die 404 → [] konvertieren dürfen
const OPTIONAL_ENDPOINTS_ALLOWLIST = [
  '/admin/statistics/top-restaurants',
  '/admin/statistics/driver-performance',
  '/admin/statistics/top-promotions',
  '/admin/statistics/promotion-performance',
  '/admin/statistics/customer-growth',
  '/admin/statistics/order-status-distribution',
];

// Default Stats für den Fall, dass API fehlschlägt
const defaultStats: DashboardStats = {
  orders: {
    total: 0,
    completed: 0,
    completionRate: 0,
  },
  revenue: {
    total: 0,
    average: 0,
  },
  customers: {
    total: 0,
    new: 0,
  },
  restaurants: {
    total: 0,
  },
  drivers: {
    total: 0,
    active: 0,
  },
};

// Hilfsfunktion: Berechnet Trend-Prozentsatz zwischen zwei Werten
function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function useDashboardData(period: string = '7d') {
  const queryClient = useQueryClient();
  
  // Local state for real-time updates (overrides query data when updated)
  const [realtimeStats, setRealtimeStats] = useState<DashboardStats | null>(null);
  const [realtimeRevenueData, setRealtimeRevenueData] = useState<any[] | null>(null);
  const [realtimeTopRestaurants, setRealtimeTopRestaurants] = useState<any[] | null>(null);
  const [realtimeDriverPerformance, setRealtimeDriverPerformance] = useState<any[] | null>(null);
  const [realtimeOrderStatusDistribution, setRealtimeOrderStatusDistribution] = useState<any | null>(null);
  const [softError, setSoftError] = useState<Error | null>(null);

  const recordError = useCallback((err: any) => {
    const normalized =
      err instanceof Error
        ? err
        : new Error(err?.message || 'Dashboard Anfrage fehlgeschlagen');
    setSoftError(normalized);
  }, []);

  const statsQuery = useQuery<DashboardStats | null>({
    queryKey: ['dashboard', 'stats', period],
    queryFn: () => api.get<DashboardStats>(`/admin/statistics/dashboard?period=${period}`)
      .then(res => extractData<DashboardStats | null>(res.data) ?? null)
      .catch((error) => handleApiError(error, {
        allowlist: [], // Dashboard stats sind kritisch - keine silent fails
        fallbackValue: null,
        context: 'Dashboard Stats',
        endpoint: `/admin/statistics/dashboard?period=${period}`
      })),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1, // Einmal retryen bei Fehlern
  });

  interface RevenueDataPoint {
    date: string;
    revenue: number;
  }
  
  const revenueQuery = useQuery<RevenueDataPoint[]>({
    queryKey: ['dashboard', 'revenue', period],
    queryFn: () => api.get<RevenueDataPoint[] | { data: RevenueDataPoint[] }>(`/admin/statistics/revenue?period=${period}`)
      .then(res => {
      const data = extractData<RevenueDataPoint[] | { data: RevenueDataPoint[] }>(res.data);
      if (Array.isArray(data)) return data;
      if (Array.isArray((data as { data?: RevenueDataPoint[] })?.data)) return (data as { data: RevenueDataPoint[] }).data;
      return [];
      })
      .catch((error) => handleApiError(error, {
        allowlist: [], // Revenue data ist kritisch - keine silent fails
        fallbackValue: [],
        context: 'Dashboard Revenue',
        endpoint: `/admin/statistics/revenue?period=${period}`
      })),
    staleTime: 2 * 60 * 1000,
    retry: 1, // Einmal retryen bei Fehlern
  });

  interface TopRestaurant {
    id: string;
    name: string;
    revenue: number;
    orderCount: number;
    averageOrderValue: number;
  }
  
  const topRestaurantsQuery = useQuery<TopRestaurant[]>({
    queryKey: ['dashboard', 'top-restaurants'],
    queryFn: () => api.get<TopRestaurant[] | { data: TopRestaurant[] }>(`/admin/statistics/top-restaurants?limit=5`)
      .then(res => {
        const data = extractData<TopRestaurant[] | { data: TopRestaurant[] }>(res.data);
        if (Array.isArray(data)) return data;
        if (Array.isArray((data as { data?: TopRestaurant[] })?.data)) return (data as { data: TopRestaurant[] }).data;
        return [];
      })
      .catch((error) => handleApiError(error, {
        allowlist: OPTIONAL_ENDPOINTS_ALLOWLIST.includes('/admin/statistics/top-restaurants') ? [404] : [],
        fallbackValue: [],
        logLevel: OPTIONAL_ENDPOINTS_ALLOWLIST.includes('/admin/statistics/top-restaurants') ? 'warn' : 'error',
        context: 'Dashboard Top Restaurants',
        endpoint: '/admin/statistics/top-restaurants?limit=5'
      })),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Optional endpoint - nicht retryen bei Fehlern
  });

  interface DriverPerformance {
    id: string;
    name: string;
    completedOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  }
  
  const driverPerformanceQuery = useQuery<DriverPerformance[]>({
    queryKey: ['dashboard', 'driver-performance', period],
    queryFn: () => api.get<DriverPerformance[] | { data: DriverPerformance[] }>(`/admin/statistics/driver-performance?period=${period}`)
      .then(res => {
      const data = extractData<DriverPerformance[] | { data: DriverPerformance[] }>(res.data);
      if (Array.isArray(data)) return data;
      if (Array.isArray((data as { data?: DriverPerformance[] })?.data)) return (data as { data: DriverPerformance[] }).data;
      return [];
      })
      .catch((error) => handleApiError(error, {
        allowlist: OPTIONAL_ENDPOINTS_ALLOWLIST.includes('/admin/statistics/driver-performance') ? [404] : [],
        fallbackValue: [],
        logLevel: OPTIONAL_ENDPOINTS_ALLOWLIST.includes('/admin/statistics/driver-performance') ? 'warn' : 'error',
        context: 'Dashboard Driver Performance',
        endpoint: `/admin/statistics/driver-performance?period=${period}`
      })),
    staleTime: 2 * 60 * 1000,
    retry: false, // Optional endpoint - nicht retryen bei Fehlern
  });

  interface TopPromotion {
    id: string;
    name: string;
    code?: string;
    uses: number;
    maxUses?: number;
    totalDiscount: number;
    totalRevenue: number;
  }
  
  const topPromotionsQuery = useQuery<TopPromotion[]>({
    queryKey: ['dashboard', 'top-promotions'],
    queryFn: () => api.get<TopPromotion[] | { data: TopPromotion[] }>(`/admin/statistics/top-promotions?limit=5`)
      .then(res => {
      const data = extractData<TopPromotion[] | { data: TopPromotion[] }>(res.data);
      if (Array.isArray(data)) return data;
      if (Array.isArray((data as { data?: TopPromotion[] })?.data)) return (data as { data: TopPromotion[] }).data;
      return [];
      })
      .catch((error) => handleApiError(error, {
        allowlist: OPTIONAL_ENDPOINTS_ALLOWLIST.includes('/admin/statistics/top-promotions') ? [404] : [],
        fallbackValue: [],
        logLevel: OPTIONAL_ENDPOINTS_ALLOWLIST.includes('/admin/statistics/top-promotions') ? 'warn' : 'error',
        context: 'Dashboard Top Promotions',
        endpoint: '/admin/statistics/top-promotions?limit=5'
      })),
    staleTime: 5 * 60 * 1000,
    retry: false, // Optional endpoint - nicht retryen bei Fehlern
  });

  interface PromotionPerformance {
    id: string;
    name: string;
    totalUses: number;
    totalDiscount: number;
    totalRevenue: number;
    conversionRate: number | null;
    promotion?: { name: string };
  }
  
  const promotionPerformanceQuery = useQuery<PromotionPerformance[] | PromotionPerformance>({
    queryKey: ['dashboard', 'promotion-performance', period],
    queryFn: () => api.get<PromotionPerformance[] | PromotionPerformance | { data: PromotionPerformance[] | PromotionPerformance }>(`/admin/statistics/promotion-performance?period=${period}`)
      .then(res => {
      const data = extractData<PromotionPerformance[] | PromotionPerformance | { data: PromotionPerformance[] | PromotionPerformance }>(res.data);
      if (Array.isArray(data)) return data;
      if ((data as { data?: PromotionPerformance[] | PromotionPerformance })?.data) return (data as { data: PromotionPerformance[] | PromotionPerformance }).data;
      return [];
      })
      .catch((error) => handleApiError(error, {
        allowlist: OPTIONAL_ENDPOINTS_ALLOWLIST.includes('/admin/statistics/promotion-performance') ? [404] : [],
        fallbackValue: [],
        logLevel: OPTIONAL_ENDPOINTS_ALLOWLIST.includes('/admin/statistics/promotion-performance') ? 'warn' : 'error',
        context: 'Dashboard Promotion Performance',
        endpoint: `/admin/statistics/promotion-performance?period=${period}`
      })),
    staleTime: 2 * 60 * 1000,
    retry: false, // Optional endpoint - nicht retryen bei Fehlern
  });

  interface CustomerGrowth {
    date: string;
    count: number;
  }
  
  const customerGrowthQuery = useQuery<CustomerGrowth[]>({
    queryKey: ['dashboard', 'customer-growth', period],
    queryFn: () => api.get<CustomerGrowth[] | { data: CustomerGrowth[] }>(`/admin/statistics/customer-growth?period=${period}`)
      .then(res => {
      const data = extractData<CustomerGrowth[] | { data: CustomerGrowth[] }>(res.data);
      if (Array.isArray(data)) return data;
      if (Array.isArray((data as { data?: CustomerGrowth[] })?.data)) return (data as { data: CustomerGrowth[] }).data;
      return [];
      })
      .catch((error) => handleApiError(error, {
        allowlist: OPTIONAL_ENDPOINTS_ALLOWLIST.includes('/admin/statistics/customer-growth') ? [404] : [],
        fallbackValue: [],
        logLevel: OPTIONAL_ENDPOINTS_ALLOWLIST.includes('/admin/statistics/customer-growth') ? 'warn' : 'error',
        context: 'Dashboard Customer Growth',
        endpoint: `/admin/statistics/customer-growth?period=${period}`
      })),
    staleTime: 2 * 60 * 1000,
    retry: false, // Don't retry if this endpoint doesn't exist
  });

  interface OrderStatusDistribution {
    distribution: Record<string, number>;
  }
  
  const orderStatusQuery = useQuery<OrderStatusDistribution | { data: OrderStatusDistribution } | null>({
    queryKey: ['dashboard', 'order-status', period],
    queryFn: () => api.get<OrderStatusDistribution | { data: OrderStatusDistribution }>(`/admin/statistics/order-status-distribution?period=${period}`)
      .then(res => {
      const data = extractData<OrderStatusDistribution | { data: OrderStatusDistribution } | null>(res.data);
      if (data && 'distribution' in data) return data as OrderStatusDistribution;
      if ((data as { data?: OrderStatusDistribution })?.data) return (data as { data: OrderStatusDistribution }).data;
      return null;
      })
      .catch((error) => handleApiError(error, {
        allowlist: OPTIONAL_ENDPOINTS_ALLOWLIST.includes('/admin/statistics/order-status-distribution') ? [404] : [],
        fallbackValue: null,
        logLevel: OPTIONAL_ENDPOINTS_ALLOWLIST.includes('/admin/statistics/order-status-distribution') ? 'warn' : 'error',
        context: 'Dashboard Order Status Distribution',
        endpoint: `/admin/statistics/order-status-distribution?period=${period}`
      })),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  // Berechne Trends basierend auf revenueData (Vergleich erster vs. letzter Wert)
  // Memoized für bessere Performance
  const trends: TrendData | null = useMemo(() => {
    const revenueDataArray = revenueQuery.data || [];
    if (!statsQuery.data || revenueDataArray.length <= 1) {
      return null;
    }

    // Berechne Trends basierend auf revenueData
    const revenueValues = revenueDataArray.map((d: { revenue: number }) => d.revenue);
    const firstHalf = revenueValues.slice(0, Math.floor(revenueValues.length / 2));
    const secondHalf = revenueValues.slice(Math.floor(revenueValues.length / 2));
    const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const revenueTrend = calculateTrend(secondHalfAvg, firstHalfAvg);

    // Für andere Trends verwenden wir vereinfachte Berechnungen
    // (können später durch echte vorherige Periode ersetzt werden)
    return {
      ordersTrend: revenueTrend * 0.8, // Geschätzt basierend auf Revenue-Trend
      revenueTrend,
      customersTrend: revenueTrend * 1.2, // Geschätzt basierend auf Revenue-Trend
      driversTrend: 0, // Keine einfache Schätzung möglich
    };
  }, [statsQuery.data, revenueQuery.data]);

  // Memoized Loading & Error States
  const isLoading = useMemo(
    () =>
      statsQuery.isLoading ||
      revenueQuery.isLoading ||
      topRestaurantsQuery.isLoading ||
      driverPerformanceQuery.isLoading ||
      topPromotionsQuery.isLoading ||
      promotionPerformanceQuery.isLoading,
    [
      statsQuery.isLoading,
      revenueQuery.isLoading,
      topRestaurantsQuery.isLoading,
      driverPerformanceQuery.isLoading,
      topPromotionsQuery.isLoading,
      promotionPerformanceQuery.isLoading,
    ]
  );

  const error = useMemo(
    () =>
      softError ||
      statsQuery.error ||
      revenueQuery.error ||
      topRestaurantsQuery.error ||
      driverPerformanceQuery.error ||
      topPromotionsQuery.error ||
      promotionPerformanceQuery.error,
    [
      softError,
      statsQuery.error,
      revenueQuery.error,
      topRestaurantsQuery.error,
      driverPerformanceQuery.error,
      topPromotionsQuery.error,
      promotionPerformanceQuery.error,
    ]
  );

  // Sicherstellen dass stats immer die richtige Struktur hat
  const safeStats = useMemo(() => {
    const data = statsQuery.data;
    if (!data) return defaultStats;
    
    // Sicherstellen dass alle benötigten Felder vorhanden sind
    return {
      orders: {
        total: data.orders?.total ?? defaultStats.orders.total,
        completed: data.orders?.completed ?? defaultStats.orders.completed,
        completionRate: data.orders?.completionRate ?? defaultStats.orders.completionRate,
      },
      revenue: {
        total: data.revenue?.total ?? defaultStats.revenue.total,
        average: data.revenue?.average ?? defaultStats.revenue.average,
      },
      customers: {
        total: data.customers?.total ?? defaultStats.customers.total,
        new: data.customers?.new ?? defaultStats.customers.new,
      },
      restaurants: {
        total: data.restaurants?.total ?? defaultStats.restaurants.total,
      },
      drivers: {
        total: data.drivers?.total ?? defaultStats.drivers.total,
        active: data.drivers?.active ?? defaultStats.drivers.active,
      },
    };
  }, [statsQuery.data]);

  // Sicherstellen dass alle Array-Felder korrekt behandelt werden
  const safeDriverPerformance = useMemo(() => {
    const data = driverPerformanceQuery.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data?: DriverPerformance[] }).data)) {
      return (data as { data: DriverPerformance[] }).data;
    }
    return [];
  }, [driverPerformanceQuery.data]);

  const safeTopPromotions = useMemo(() => {
    const data = topPromotionsQuery.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data?: TopPromotion[] }).data)) {
      return (data as { data: TopPromotion[] }).data;
    }
    return [];
  }, [topPromotionsQuery.data]);

  const safePromotionPerformance = useMemo(() => {
    const data = promotionPerformanceQuery.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && 'data' in data) {
      const nestedData = (data as { data?: PromotionPerformance[] | PromotionPerformance }).data;
      if (Array.isArray(nestedData)) return nestedData;
      if (nestedData) return [nestedData];
    }
    return [];
  }, [promotionPerformanceQuery.data]);

  const safeCustomerGrowth = useMemo(() => {
    const data = customerGrowthQuery.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data?: CustomerGrowth[] }).data)) {
      return (data as { data: CustomerGrowth[] }).data;
    }
    return [];
  }, [customerGrowthQuery.data]);

  const safeTopRestaurants = useMemo(() => {
    const data = topRestaurantsQuery.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data?: TopRestaurant[] }).data)) {
      return (data as { data: TopRestaurant[] }).data;
    }
    return [];
  }, [topRestaurantsQuery.data]);

  // Use real-time data if available, otherwise fall back to query data
  const finalStats = useMemo(() => {
    return realtimeStats || safeStats;
  }, [realtimeStats, safeStats]);

  const finalRevenueData = useMemo(() => {
    if (realtimeRevenueData) return realtimeRevenueData;
    const data = revenueQuery.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data?: RevenueDataPoint[] }).data)) {
      return (data as { data: RevenueDataPoint[] }).data;
    }
    return [];
  }, [realtimeRevenueData, revenueQuery.data]);

  const finalTopRestaurants = useMemo(() => {
    return realtimeTopRestaurants || safeTopRestaurants;
  }, [realtimeTopRestaurants, safeTopRestaurants]);

  const finalDriverPerformance = useMemo(() => {
    return realtimeDriverPerformance || safeDriverPerformance;
  }, [realtimeDriverPerformance, safeDriverPerformance]);

  const finalOrderStatusDistribution = useMemo(() => {
    if (realtimeOrderStatusDistribution) return realtimeOrderStatusDistribution;
    const data = orderStatusQuery.data;
    if (!data) return null;
    if (data && typeof data === 'object' && 'distribution' in data) {
      return data as OrderStatusDistribution;
    }
    if (data && typeof data === 'object' && 'data' in data && (data as { data?: OrderStatusDistribution }).data) {
      return (data as { data: OrderStatusDistribution }).data;
    }
    return null;
  }, [realtimeOrderStatusDistribution, orderStatusQuery.data]);

  // Update functions for real-time WebSocket updates
  const updateStats = useCallback((updater: (prev: DashboardStats) => DashboardStats) => {
    setRealtimeStats((prev) => {
      const current = prev || safeStats;
      return updater(current);
    });
  }, [safeStats]);

  const updateRevenueData = useCallback((updater: (prev: any[]) => any[]) => {
    setRealtimeRevenueData((prev) => {
      if (prev) return updater(prev);
      const data = revenueQuery.data;
      const current = Array.isArray(data) ? data : (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data?: RevenueDataPoint[] }).data)) ? (data as { data: RevenueDataPoint[] }).data : [];
      return updater(current);
    });
  }, [revenueQuery.data]);

  const updateTopRestaurants = useCallback((updater: (prev: any[]) => any[]) => {
    setRealtimeTopRestaurants((prev) => {
      const current = prev || safeTopRestaurants;
      return updater(current);
    });
  }, [safeTopRestaurants]);

  const updateDriverPerformance = useCallback((updater: (prev: any[]) => any[]) => {
    setRealtimeDriverPerformance((prev) => {
      const current = prev || safeDriverPerformance;
      return updater(current);
    });
  }, [safeDriverPerformance]);

  const updateOrderStatusDistribution = useCallback((updater: (prev: any) => any) => {
    setRealtimeOrderStatusDistribution((prev) => {
      if (prev) return updater(prev);
      const data = orderStatusQuery.data;
      if (!data) return updater(null);
      if (data && typeof data === 'object' && 'distribution' in data) {
        return updater(data as OrderStatusDistribution);
      }
      if (data && typeof data === 'object' && 'data' in data && (data as { data?: OrderStatusDistribution }).data) {
        return updater((data as { data: OrderStatusDistribution }).data);
      }
      return updater(null);
    });
  }, [orderStatusQuery.data]);

  return {
    stats: finalStats,
    revenueData: finalRevenueData,
    topRestaurants: finalTopRestaurants,
    driverPerformance: finalDriverPerformance,
    topPromotions: safeTopPromotions,
    promotionPerformance: safePromotionPerformance,
    customerGrowth: safeCustomerGrowth,
    orderStatusDistribution: finalOrderStatusDistribution,
    trends, // Neue Trend-Daten
    isLoading,
    error,
    refetch: useCallback(() => {
      // Reset real-time data when manually refetching
      setRealtimeStats(null);
      setRealtimeRevenueData(null);
      setRealtimeTopRestaurants(null);
      setRealtimeDriverPerformance(null);
      setRealtimeOrderStatusDistribution(null);
      
      statsQuery.refetch();
      revenueQuery.refetch();
      topRestaurantsQuery.refetch();
      driverPerformanceQuery.refetch();
      topPromotionsQuery.refetch();
      promotionPerformanceQuery.refetch();
      customerGrowthQuery.refetch();
      orderStatusQuery.refetch();
    }, [
      statsQuery.refetch,
      revenueQuery.refetch,
      topRestaurantsQuery.refetch,
      driverPerformanceQuery.refetch,
      topPromotionsQuery.refetch,
      promotionPerformanceQuery.refetch,
      customerGrowthQuery.refetch,
      orderStatusQuery.refetch,
    ]),
    // Real-time update functions
    updateStats,
    updateRevenueData,
    updateTopRestaurants,
    updateDriverPerformance,
    updateOrderStatusDistribution,
  };
}

