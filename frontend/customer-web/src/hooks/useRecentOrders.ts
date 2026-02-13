import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '../utils/api';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface RecentOrder {
  id: string;
  customerName: string;
  restaurantName: string;
  status: string;
  total: number;
  createdAt: string;
  estimatedDeliveryTime: string;
  items: OrderItem[];
}

interface UseRecentOrdersOptions {
  limit?: number;
  userId?: string;
}

export const useRecentOrders = (userId?: string, options: UseRecentOrdersOptions = {}) => {
  const { limit = 10 } = options;

  // Create stable query key
  const queryKey = useMemo(() =>
    ['recent-orders', userId, limit],
    [userId, limit]
  );

  // Create stable query function
  const queryFn = useMemo(() => async (): Promise<RecentOrder[]> => {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (userId) params.append('userId', userId);

    const response = await api.get(`/orders/recent?${params}`);
    return response.data;
  }, [userId, limit]);

  return useQuery({
    queryKey,
    queryFn,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: !!userId, // Only run if userId is provided
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status >= 400 && status < 500) {
          return false;
        }
      }
      return failureCount < 2; // Less retries for user-specific data
    },
  });
};