import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../utils/api";

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface RestaurantStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalDishes: number;
  activeDishes: number;
  completedOrders?: number;
  activeOrders?: number;
  completionRate?: number;
}

export interface DashboardStats {
  orders: {
    total: number;
    completed: number;
    active: number;
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
    active: number;
  };
  drivers: {
    total: number;
    active: number;
  };
}

export interface RevenueData {
  date: string;
  revenue: number;
}

export function useRestaurant() {
  return useQuery({
    queryKey: ["restaurant", "me"],
    queryFn: async () => {
      const response = await api.get<Restaurant>("/restaurants/me");
      return response.data;
    },
  });
}

export function useRestaurantStats(
  period: "week" | "month" | "year" | string = "week",
) {
  return useQuery({
    queryKey: ["restaurant-stats", "me", period],
    queryFn: async () => {
      const response = await api.get(`/restaurants/me/stats?period=${period}`);
      return response.data || null;
    },
  });
}

export function useRestaurantRevenue(period: "7d" | "30d" | "90d" = "7d") {
  return useQuery({
    queryKey: ["restaurant-revenue", "me", period],
    queryFn: async () => {
      const response = await api.get<RevenueData[]>(
        `/restaurants/me/revenue?period=${period}`,
      );
      return response.data || [];
    },
    staleTime: 60 * 1000,
  });
}

export function useUpdateRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Restaurant>) => {
      const response = await api.put(`/restaurants/me`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant", "me"] });
    },
  });
}

// Analytics & Performance
export interface AnalyticsData {
  revenue: {
    total: number;
    average: number;
    growth: number;
  };
  revenueForecast?: number;
  orders: {
    total: number;
    completed: number;
    cancelled: number;
    averageTime: number;
  };
  customers: {
    total: number;
    new: number;
    returning: number;
  };
  customerLifetimeValue?: number;
  menuEngineeringScore?: number;
  averageOrderValue?: number;
  dishes: {
    topSelling: Array<{
      id: string;
      name: string;
      quantity: number;
      revenue: number;
    }>;
  };
  period: {
    start: string;
    end: string;
  };
}

export interface PerformanceData {
  averagePreparationTime: number;
  averageDeliveryTime: number;
  onTimeDeliveryRate: number;
  customerSatisfaction: number;
  peakHours: Array<{
    hour: number;
    orderCount: number;
  }>;
}

export interface RatingsSummary {
  average: number;
  total: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export function useRestaurantAnalytics(period: "7d" | "30d" | "90d" = "7d") {
  return useQuery({
    queryKey: ["restaurant-analytics", "me", period],
    queryFn: async () => {
      const response = await api.get<AnalyticsData>(
        `/restaurants/me/analytics?period=${period}`,
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
}

export function useRestaurantPerformance(period: "7d" | "30d" | "90d" = "7d") {
  return useQuery({
    queryKey: ["restaurant-performance", "me", period],
    queryFn: async () => {
      const response = await api.get<PerformanceData>(
        `/restaurants/me/performance?period=${period}`,
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRestaurantRatingsSummary(restaurantId?: string | null) {
  const id = restaurantId || "me";
  return useQuery({
    queryKey: ["restaurant-ratings", id],
    queryFn: async () => {
      const response = await api.get<RatingsSummary>(
        `/restaurants/${id}/ratings/summary`,
      );
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

// Operating Hours
export interface DayHours {
  open: string;
  close: string;
  isClosed: boolean;
}

export interface OperatingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export function useOperatingHours(restaurantId: string | null) {
  return useQuery({
    queryKey: ["operating-hours", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const response = await api.get<OperatingHours>(
        `/restaurants/${restaurantId}/operating-hours`,
      );
      return response.data;
    },
    enabled: !!restaurantId,
  });
}

// Business Hours (me)
export function useBusinessHours() {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: (hours: Record<string, any>) =>
      api.put("/restaurants/me/business-hours", hours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-hours", "me"] });
    },
  });

  const query = useQuery({
    queryKey: ["business-hours", "me"],
    queryFn: async () => {
      const response = await api.get("/restaurants/me/business-hours");
      return response.data;
    },
  });

  const updateHours = updateMutation.mutate;

  return {
    ...query,
    updateHours,
    isError: query.isError || updateMutation.isError,
    error: query.error || updateMutation.error,
  };
}

export function useUpdateOperatingHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      restaurantId,
      hours,
    }: {
      restaurantId: string;
      hours: OperatingHours;
    }) => api.put(`/restaurants/${restaurantId}/operating-hours`, hours),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["operating-hours", variables.restaurantId],
      });
    },
  });
}

// Delivery Zones
export interface Coordinate {
  lat: number;
  lng: number;
}

export interface DeliveryZone {
  id: string;
  name: string;
  coordinates: Coordinate[];
  fee: number;
  restaurantId: string;
}

export function useDeliveryZones(restaurantId: string | null) {
  return useQuery({
    queryKey: ["delivery-zones", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const response = await api.get<DeliveryZone[]>(
        `/restaurants/${restaurantId}/delivery-zones`,
      );
      return response.data || [];
    },
    enabled: !!restaurantId,
  });
}

export function useCreateDeliveryZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      restaurantId,
      zone,
    }: {
      restaurantId: string;
      zone: Omit<DeliveryZone, "id" | "restaurantId">;
    }) => api.post(`/restaurants/${restaurantId}/delivery-zones`, zone),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["delivery-zones", variables.restaurantId],
      });
    },
  });
}

export function useUpdateDeliveryZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      restaurantId,
      zoneId,
      zone,
    }: {
      restaurantId: string;
      zoneId: string;
      zone: Partial<DeliveryZone>;
    }) =>
      api.put(`/restaurants/${restaurantId}/delivery-zones/${zoneId}`, zone),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["delivery-zones", variables.restaurantId],
      });
    },
  });
}

export function useDeleteDeliveryZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      restaurantId,
      zoneId,
    }: {
      restaurantId: string;
      zoneId: string;
    }) => api.delete(`/restaurants/${restaurantId}/delivery-zones/${zoneId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["delivery-zones", variables.restaurantId],
      });
    },
  });
}

// Delivery Fees
export interface DeliveryFees {
  baseFee: number;
  perKmFee: number;
  minOrderAmount: number;
}

export function useDeliveryFees(restaurantId: string | null) {
  return useQuery({
    queryKey: ["delivery-fees", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const response = await api.get<DeliveryFees>(
        `/restaurants/${restaurantId}/delivery-fees`,
      );
      return response.data;
    },
    enabled: !!restaurantId,
  });
}

export function useSetDeliveryFees() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      restaurantId,
      fees,
    }: {
      restaurantId: string;
      fees: DeliveryFees;
    }) => api.put(`/restaurants/${restaurantId}/delivery-fees`, fees),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["delivery-fees", variables.restaurantId],
      });
    },
  });
}

// Minimum Order
export function useMinimumOrder(restaurantId: string | null) {
  return useQuery({
    queryKey: ["minimum-order", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const response = await api.get<{ minOrderAmount: number }>(
        `/restaurants/${restaurantId}/minimum-order`,
      );
      return response.data;
    },
    enabled: !!restaurantId,
  });
}

export function useUpdateMinimumOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      restaurantId,
      minOrderAmount,
    }: {
      restaurantId: string;
      minOrderAmount: number;
    }) =>
      api.put(`/restaurants/${restaurantId}/minimum-order`, { minOrderAmount }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["minimum-order", variables.restaurantId],
      });
    },
  });
}

// Capacity
export interface Capacity {
  maxOrders: number;
  maxConcurrentOrders: number;
  currentOrders: number;
}

export function useCapacity(restaurantId: string | null) {
  return useQuery({
    queryKey: ["capacity", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const response = await api.get<Capacity>(
        `/restaurants/${restaurantId}/capacity`,
      );
      return response.data;
    },
    enabled: !!restaurantId,
    refetchInterval: 30 * 1000, // Alle 30 Sekunden aktualisieren
  });
}

export function useUpdateCapacity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      restaurantId,
      capacity,
    }: {
      restaurantId: string;
      capacity: { maxOrders: number; maxConcurrentOrders: number };
    }) => api.put(`/restaurants/${restaurantId}/capacity`, capacity),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["capacity", variables.restaurantId],
      });
    },
  });
}

// Notifications
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  read: boolean;
  createdAt: string;
}

export function useNotifications(restaurantId: string | null) {
  return useQuery({
    queryKey: ["notifications", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const response = await api.get<Notification[]>(
        `/restaurants/${restaurantId}/notifications`,
      );
      return response.data || [];
    },
    enabled: !!restaurantId,
    refetchInterval: 60 * 1000, // Alle 60 Sekunden aktualisieren
  });
}

export function useUnreadNotificationCount(restaurantId: string | null) {
  return useQuery({
    queryKey: ["unread-notifications-count", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return 0;
      const response = await api.get<{ count: number }>(
        `/restaurants/${restaurantId}/notifications/unread-count`,
      );
      return response.data.count || 0;
    },
    enabled: !!restaurantId,
    refetchInterval: 30 * 1000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      restaurantId,
      notificationId,
    }: {
      restaurantId: string;
      notificationId: string;
    }) =>
      api.put(
        `/restaurants/${restaurantId}/notifications/${notificationId}/read`,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", variables.restaurantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["unread-notifications-count", variables.restaurantId],
      });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      restaurantId,
      notificationId,
    }: {
      restaurantId: string;
      notificationId: string;
    }) =>
      api.delete(
        `/restaurants/${restaurantId}/notifications/${notificationId}`,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", variables.restaurantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["unread-notifications-count", variables.restaurantId],
      });
    },
  });
}
