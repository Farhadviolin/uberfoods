import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

interface DriverOverview {
  activeDrivers: number;
  totalDrivers: number;
  totalDeliveries: number;
  avgDeliveryTime: number;
  avgRating: number;
}

interface Schedule {
  id: string;
  driverName: string;
  date: string;
  shiftStart: string;
  shiftEnd: string;
  status: string;
  orderCount: number;
}

interface PerformanceData {
  id: string;
  name: string;
  totalDeliveries: number;
  avgDeliveryTime: number;
  rating: number;
  onTimeRate: number;
  status: string;
}

interface EarningsData {
  totalEarnings: number;
  avgEarningsPerDriver: number;
  pendingPayments: number;
  monthlyBreakdown: Array<{
    month: string;
    earnings: number;
  }>;
}

interface DriverAnalytics {
  growthRate: number;
  retentionRate: number;
  avgActivityHours: number;
  performanceTrend: Array<{
    date: string;
    avgDeliveryTime: number;
  }>;
}

export function useDriverData() {
  // Overview
  const overviewQuery = useQuery({
    queryKey: ['drivers', 'advanced', 'overview'],
    queryFn: () =>
      api
        .get<DriverOverview>('/drivers/advanced/overview')
        .then((res) => res.data)
        .catch(() => ({
          activeDrivers: 0,
          totalDrivers: 0,
          totalDeliveries: 0,
          avgDeliveryTime: 0,
          avgRating: 0,
        })),
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: false,
  });

  // Schedules
  const schedulesQuery = useQuery({
    queryKey: ['drivers', 'advanced', 'schedules'],
    queryFn: () =>
      api
        .get<Schedule[]>('/drivers/advanced/schedules')
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
  });

  // Performance
  const performanceQuery = useQuery({
    queryKey: ['drivers', 'advanced', 'performance'],
    queryFn: () =>
      api
        .get<PerformanceData[]>('/drivers/advanced/performance')
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  // Earnings
  const earningsQuery = useQuery({
    queryKey: ['drivers', 'advanced', 'earnings'],
    queryFn: () =>
      api
        .get<EarningsData>('/drivers/advanced/earnings')
        .then((res) => res.data)
        .catch(() => ({
          totalEarnings: 0,
          avgEarningsPerDriver: 0,
          pendingPayments: 0,
          monthlyBreakdown: [],
        })),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Analytics
  const analyticsQuery = useQuery({
    queryKey: ['drivers', 'advanced', 'analytics'],
    queryFn: () =>
      api
        .get<DriverAnalytics>('/drivers/advanced/analytics')
        .then((res) => res.data)
        .catch(() => ({
          growthRate: 0,
          retentionRate: 0,
          avgActivityHours: 0,
          performanceTrend: [],
        })),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const isLoading =
    overviewQuery.isLoading ||
    schedulesQuery.isLoading ||
    performanceQuery.isLoading ||
    earningsQuery.isLoading ||
    analyticsQuery.isLoading;

  const error =
    overviewQuery.error ||
    schedulesQuery.error ||
    performanceQuery.error ||
    earningsQuery.error ||
    analyticsQuery.error;

  return {
    driverOverview: overviewQuery.data,
    schedules: schedulesQuery.data || [],
    performanceData: performanceQuery.data || [],
    earningsData: earningsQuery.data,
    driverAnalytics: analyticsQuery.data,
    isLoading,
    error,
    refetch: () => {
      overviewQuery.refetch();
      schedulesQuery.refetch();
      performanceQuery.refetch();
      earningsQuery.refetch();
      analyticsQuery.refetch();
    },
  };
}

