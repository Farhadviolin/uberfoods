import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../utils/api";
import { useAuth } from "../contexts/AuthContext";

interface KitchenOrder {
  id: string;
  status: string;
  items: Array<{
    id: string;
    dish: {
      id: string;
      name: string;
      category: string;
      preparationTime: number;
    };
    quantity: number;
    metadata?: any;
  }>;
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  createdAt: string;
}

interface KitchenStation {
  id: string;
  name: string;
  type: "grill" | "pizza" | "salad" | "drinks" | "other";
  activeOrders: number;
  averagePrepTime: number;
}

interface OrderTimeline {
  orderId: string;
  createdAt: string;
  estimatedReadyTime: string;
  items: Array<{
    itemId: string;
    dishName: string;
    category: string;
    status: string;
    startedAt?: string;
    completedAt?: string;
    estimatedTime: number;
    station: string;
  }>;
}

interface KitchenPerformance {
  period: string;
  totalOrders: number;
  totalItems: number;
  averagePrepTime: number;
  onTimeRate: number;
  averageOrderValue: number;
}

export function useKitchenOrders(
  restaurantId: string | null,
  filters?: { station?: string; status?: string[] },
) {
  return useQuery({
    queryKey: ["kitchen-orders", restaurantId, filters],
    queryFn: async () => {
      if (!restaurantId) return [];
      try {
        const params = new URLSearchParams();
        if (filters?.station) params.append("station", filters.station);
        if (filters?.status) params.append("status", filters.status.join(","));

        const response = await api.get<KitchenOrder[]>(
          `/kitchen-display/restaurant/${restaurantId}/orders?${params.toString()}`,
        );
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) return [];
        throw error;
      }
    },
    enabled: !!restaurantId,
    staleTime: 5 * 1000, // 5 seconds (real-time updates)
    refetchInterval: 10 * 1000, // Refetch every 10 seconds
    retry: false,
  });
}

export function useKitchenStations(restaurantId: string | null) {
  return useQuery({
    queryKey: ["kitchen-stations", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      try {
        const response = await api.get<KitchenStation[]>(
          `/kitchen-display/restaurant/${restaurantId}/stations`,
        );
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) return [];
        throw error;
      }
    },
    enabled: !!restaurantId,
    staleTime: 30 * 1000, // 30 seconds
    retry: false,
  });
}

export function useOrderTimeline(
  restaurantId: string | null,
  orderId: string | null,
) {
  return useQuery({
    queryKey: ["order-timeline", restaurantId, orderId],
    queryFn: async () => {
      if (!restaurantId || !orderId) return null;
      try {
        const response = await api.get<OrderTimeline>(
          `/kitchen-display/restaurant/${restaurantId}/orders/${orderId}/timeline`,
        );
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!restaurantId && !!orderId,
    staleTime: 5 * 1000, // 5 seconds
    retry: false,
  });
}

export function useKitchenPerformance(
  restaurantId: string | null,
  period: "today" | "week" | "month" = "today",
) {
  return useQuery({
    queryKey: ["kitchen-performance", restaurantId, period],
    queryFn: async () => {
      if (!restaurantId) return null;
      try {
        const response = await api.get<KitchenPerformance>(
          `/kitchen-display/restaurant/${restaurantId}/performance?period=${period}`,
        );
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!restaurantId,
    staleTime: 60 * 1000, // 1 minute
    retry: false,
  });
}

export function useUpdateItemStatus() {
  const queryClient = useQueryClient();
  const { restaurantId } = useAuth();

  return useMutation({
    mutationFn: async ({
      orderId,
      itemId,
      status,
    }: {
      orderId: string;
      itemId: string;
      status: "pending" | "preparing" | "ready" | "served";
    }) => {
      if (!restaurantId) throw new Error("Restaurant not authenticated");
      const response = await api.post(
        `/kitchen-display/restaurant/${restaurantId}/orders/${orderId}/items/${itemId}/status`,
        { status },
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["kitchen-orders", restaurantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["order-timeline", restaurantId, variables.orderId],
      });
    },
  });
}
