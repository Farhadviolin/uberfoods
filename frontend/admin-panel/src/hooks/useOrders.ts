import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { extractData } from '../utils/apiResponse';
import { handleApiError } from '../utils/errorHandler';

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  address: string;
  phone: string;
  notes: string;
  createdAt: string;
  version?: number; // Optimistic Locking
  customer: {
    id: string;
    name: string;
    email: string;
  };
  restaurant: {
    id: string;
    name: string;
  };
  driver: {
    id: string;
    name: string;
  } | null;
  items: Array<{
    dish: {
      id: string;
      name: string;
    };
    quantity: number;
    price: number;
  }>;
}

export function useOrders(filters?: { status?: string; restaurantId?: string; driverId?: string }) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.restaurantId) params.append('restaurantId', filters.restaurantId);
      if (filters?.driverId) params.append('driverId', filters.driverId);
      
      const endpoint = `/orders?${params.toString()}`;
      return api.get<Order[]>(endpoint)
        .then(res => {
          const data = extractData<Order[] | { data: Order[] }>(res.data);
          return Array.isArray(data) ? data : [];
        })
        .catch((error) => handleApiError(error, {
          allowlist: [], // Orders sind kritisch - keine silent fails für 404
          fallbackValue: [],
          context: 'Orders List',
          endpoint
        }));
    },
    staleTime: 30 * 1000, // 30 seconds - orders change frequently
    select: (data) => Array.isArray(data) ? data : [],
  });
}

export function useActiveOrders() {
  return useQuery({
    queryKey: ['orders', 'active'],
    queryFn: () =>
      api
        .get('/orders', {
          params: { status: ['PENDING', 'PREPARING', 'READY', 'IN_TRANSIT'] },
        })
        .then(res => {
          const data = extractData<Order[] | { data: Order[] }>(res.data);
          return Array.isArray(data) ? data : [];
        })
        .catch((error) => handleApiError(error, {
          allowlist: [], // Active orders sind kritisch - keine silent fails für 404
          fallbackValue: [],
          context: 'Active Orders',
          endpoint: '/orders'
        })),
    staleTime: 30 * 1000,
    select: (data) => (Array.isArray(data) ? data : []).filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status)),
  });
}

export function useOrder(id: string | null) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => api.get<Order>(`/orders/${id}`).then(res => extractData<Order>(res.data)),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status, version }: { id: string; status: string; version?: number }) => {
      const body: { status: string; version?: number } = { status };
      if (version !== undefined) {
        body.version = version;
      }
      return api.patch(`/orders/${id}/status`, body);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      // Wenn Version-Conflict, invalidiere Queries für Refresh
      if (error.response?.data?.message?.includes('Version')) {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
    },
  });
}

export function useAssignDriver() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, driverId }: { orderId: string; driverId: string }) =>
      api.patch(`/orders/${orderId}/assign`, { driverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Infinite Orders Hook für skalierbare Cursor-basierte Pagination
 * Verwendet useInfiniteQuery für Millionen von Datensätzen
 */
export function useOrdersInfinite(filters?: {
  status?: string;
  restaurantId?: string;
  driverId?: string;
  customerId?: string;
}, options?: {
  limit?: number;
  enabled?: boolean;
}) {
  const { limit = 50, enabled = true } = options || {};

  return useInfiniteQuery({
    queryKey: ['orders-infinite', filters, limit],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();

      // Add filters
      if (filters?.status) params.append('status', filters.status);
      if (filters?.restaurantId) params.append('restaurantId', filters.restaurantId);
      if (filters?.driverId) params.append('driverId', filters.driverId);
      if (filters?.customerId) params.append('customerId', filters.customerId);

      // Add pagination
      params.append('limit', limit.toString());
      if (pageParam) {
        params.append('cursor', pageParam);
      }

      const endpoint = `/orders?${params.toString()}`;

      try {
        const response = await api.get(endpoint);
        const data = extractData<{
          data: Order[];
          nextCursor?: string;
          hasMore: boolean;
        }>(response.data);

        return {
          data: Array.isArray(data.data) ? data.data : [],
          nextCursor: data.nextCursor,
          hasMore: data.hasMore || false,
        };
      } catch (error) {
        // Handle API errors gracefully
        return handleApiError(error, {
          allowlist: [], // Orders sind kritisch - keine silent fails
          fallbackValue: {
            data: [],
            nextCursor: undefined,
            hasMore: false,
          },
          context: 'Orders Infinite Query',
          endpoint
        });
      }
    },
    getNextPageParam: (lastPage: { data: Order[]; nextCursor?: string; hasMore: boolean }) => {
      // Return next cursor if there are more pages
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    initialPageParam: undefined as string | undefined,
    enabled,
    staleTime: 30 * 1000, // 30 seconds - orders change frequently
    // Disable refetch on window focus for better UX with large datasets
    refetchOnWindowFocus: false,
    // Keep previous data while loading new pages
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook für alle Orders mit Infinite Query
 */
export function useAllOrdersInfinite(options?: { limit?: number; enabled?: boolean }) {
  return useOrdersInfinite({}, options);
}

/**
 * Hook für Orders nach Status mit Infinite Query
 */
export function useOrdersByStatusInfinite(
  status: string,
  options?: { limit?: number; enabled?: boolean }
) {
  return useOrdersInfinite({ status }, options);
}

/**
 * Hook für Restaurant Orders mit Infinite Query
 */
export function useRestaurantOrdersInfinite(
  restaurantId: string,
  status?: string,
  options?: { limit?: number; enabled?: boolean }
) {
  return useOrdersInfinite(
    { restaurantId, ...(status && { status }) },
    options
  );
}

