import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '../utils/api';

interface DashboardAnalytics {
  totalOrders: number;
  monthlySpending: number;
  averageOrderValue: number;
  ordersChange: number; // percentage change
  spendingChange: number; // percentage change
  favoriteRestaurant?: string;
  lastOrderDate?: string;
  preferredCuisine?: string;
  totalRestaurantsUsed: number;
  loyaltyPoints: number;
  personalizedRecommendations?: Array<{
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    reason: string;
  }>;
}

export const useDashboardAnalytics = (userId: string) => {
  // Create stable query key
  const queryKey = useMemo(() => ['dashboard-analytics', userId], [userId]);

  // Create stable query function
  const queryFn = useMemo(() => async (): Promise<DashboardAnalytics> => {
    const response = await api.get(`/analytics/dashboard/${userId}`);
    return response.data;
  }, [userId]);

  return useQuery({
    queryKey,
    queryFn,
    staleTime: 10 * 60 * 1000, // 10 minutes - analytics don't change frequently
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    enabled: !!userId,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status >= 400 && status < 500) {
          return false;
        }
      }
      return failureCount < 2;
    },
  });
};