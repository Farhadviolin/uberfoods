import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../utils/api";

function unwrapApiData<T>(payload: unknown, fallback: T): T {
  if (payload && typeof payload === "object" && !Array.isArray(payload) && "success" in payload) {
    const envelope = payload as { success?: unknown; data?: unknown };
    return envelope.success === true ? (envelope.data as T) : fallback;
  }
  return payload as T;
}

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
      return unwrapApiData<Restaurant | null>(response.data, null);
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
      return unwrapApiData<RestaurantStats | null>(response.data, null);
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
      return unwrapApiData<RevenueData[]>(response.data, []);
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
  /** Canonical response of GET /restaurants/me/analytics. */
  period: string;
  totalRevenue: number | null;
  totalOrders: number | null;
  avgOrderValue: number | null;
  ordersByStatus: Record<string, number>;
  topDishes: Array<{
    dishId: string;
    count: number;
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Keeps the backend analytics contract flat while making partial responses
 * renderable. Missing numeric values remain visible as unavailable instead of
 * being replaced with fabricated zeroes.
 */
export function normalizeRestaurantAnalytics(
  payload: unknown,
): AnalyticsData | null {
  if (!isRecord(payload)) return null;

  const rawStatusCounts = isRecord(payload.ordersByStatus)
    ? payload.ordersByStatus
    : {};
  const ordersByStatus = Object.entries(rawStatusCounts).reduce(
    (result, [status, value]) => {
      const count = finiteNumberOrNull(value);
      if (count !== null && count >= 0) result[status] = count;
      return result;
    },
    {} as Record<string, number>,
  );

  const topDishes = Array.isArray(payload.topDishes)
    ? payload.topDishes.reduce<AnalyticsData["topDishes"]>((result, item) => {
        if (!isRecord(item) || typeof item.dishId !== "string") return result;
        const count = finiteNumberOrNull(item.count);
        if (count === null || count < 0) return result;
        result.push({ dishId: item.dishId, count });
        return result;
      }, [])
    : [];

  return {
    period: typeof payload.period === "string" ? payload.period : "",
    totalRevenue: finiteNumberOrNull(payload.totalRevenue),
    totalOrders: finiteNumberOrNull(payload.totalOrders),
    avgOrderValue: finiteNumberOrNull(payload.avgOrderValue),
    ordersByStatus,
    topDishes,
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
  average: number | null;
  count: number | null;
  distribution: {
    5: number | null;
    4: number | null;
    3: number | null;
    2: number | null;
    1: number | null;
  };
}

export function normalizeRatingsSummary(payload: unknown): RatingsSummary | null {
  if (!isRecord(payload)) return null;
  const rawDistribution = isRecord(payload.distribution)
    ? payload.distribution
    : {};

  return {
    average: finiteNumberOrNull(payload.average),
    count: finiteNumberOrNull(payload.count),
    distribution: {
      5: finiteNumberOrNull(rawDistribution[5]),
      4: finiteNumberOrNull(rawDistribution[4]),
      3: finiteNumberOrNull(rawDistribution[3]),
      2: finiteNumberOrNull(rawDistribution[2]),
      1: finiteNumberOrNull(rawDistribution[1]),
    },
  };
}

export function useRestaurantAnalytics(period: "7d" | "30d" | "90d" = "7d") {
  return useQuery({
    queryKey: ["restaurant-analytics", "me", period],
    queryFn: async () => {
      const response = await api.get<unknown>(
        `/restaurants/me/analytics?period=${period}`,
      );
      return normalizeRestaurantAnalytics(
        unwrapApiData<unknown>(response.data, null),
      );
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
      return unwrapApiData<PerformanceData | null>(response.data, null);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRestaurantRatingsSummary(restaurantId?: string | null) {
  const id = restaurantId || "me";
  return useQuery({
    queryKey: ["restaurant-ratings", id],
    queryFn: async () => {
      const response = await api.get<unknown>(
        `/restaurants/${id}/ratings/summary`,
      );
      return normalizeRatingsSummary(unwrapApiData<unknown>(response.data, null));
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
      return unwrapApiData<OperatingHours | null>(response.data, null);
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
    mutationFn: async ({
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
  deliveryFee?: number;
  restaurantId: string;
  isActive?: boolean;
}

type DeliveryZoneResponse = DeliveryZone[] | {
  success: boolean;
  data?: unknown;
};

function normalizeDeliveryZones(response: DeliveryZoneResponse): DeliveryZone[] {
  const payload = typeof response === 'object' && response !== null && 'success' in response
    ? response.success === true ? response.data : undefined
    : response;
  if (!Array.isArray(payload)) {
    throw new Error('Ungültige Lieferzonen-Antwort.');
  }

  return payload.map((zone) => {
    if (!zone || typeof zone !== 'object' || typeof (zone as DeliveryZone).name !== 'string') {
      throw new Error('Ungültige Lieferzonen-Antwort.');
    }
    const value = zone as DeliveryZone;
    const fee = typeof value.fee === 'number' ? value.fee : value.deliveryFee ?? 0;
    return { ...value, fee, deliveryFee: value.deliveryFee ?? fee };
  });
}

function serializeDeliveryZone(zone: DeliveryZone) {
  return {
    name: zone.name,
    coordinates: zone.coordinates,
    deliveryFee: zone.deliveryFee ?? zone.fee,
    isActive: zone.isActive !== false,
  };
}

export function useDeliveryZones(restaurantId: string | null) {
  return useQuery({
    queryKey: ["delivery-zones", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const response = await api.get<DeliveryZoneResponse>(
        `/restaurants/${restaurantId}/delivery-zones`,
      );
      return normalizeDeliveryZones(response.data);
    },
    enabled: !!restaurantId,
  });
}

export function useCreateDeliveryZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      restaurantId,
      zone,
    }: {
      restaurantId: string;
      zone: Omit<DeliveryZone, "id" | "restaurantId">;
    }) => {
      const existing = await api.get<DeliveryZoneResponse>(
        `/restaurants/${restaurantId}/delivery-zones`,
      );
      const existingZones = normalizeDeliveryZones(existing.data);
      const zones = [
        ...existingZones.map(serializeDeliveryZone),
        {
          name: zone.name,
          coordinates: zone.coordinates,
          deliveryFee: zone.deliveryFee ?? zone.fee,
          isActive: zone.isActive !== false,
        },
      ];
      const response = await api.put(`/restaurants/${restaurantId}/delivery-zones`, {
        zones,
      });
      return response.data;
    },
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
    mutationFn: async ({
      restaurantId,
      zoneId,
      zone,
    }: {
      restaurantId: string;
      zoneId: string;
      zone: Partial<DeliveryZone>;
    }) => {
      const existing = await api.get<DeliveryZoneResponse>(
        `/restaurants/${restaurantId}/delivery-zones`,
      );
      const zones = normalizeDeliveryZones(existing.data).map((current) =>
        current.id === zoneId
          ? serializeDeliveryZone({ ...current, ...zone })
          : serializeDeliveryZone(current),
      );
      const response = await api.put(`/restaurants/${restaurantId}/delivery-zones`, { zones });
      return response.data;
    },
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
    mutationFn: async ({
      restaurantId,
      zoneId,
    }: {
      restaurantId: string;
      zoneId: string;
    }) => {
      const existing = await api.get<DeliveryZoneResponse>(
        `/restaurants/${restaurantId}/delivery-zones`,
      );
      const zones = normalizeDeliveryZones(existing.data)
        .filter((zone) => zone.id !== zoneId)
        .map(serializeDeliveryZone);
      const response = await api.put(`/restaurants/${restaurantId}/delivery-zones`, { zones });
      return response.data;
    },
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
  freeDeliveryThreshold?: number | null;
}

export function useDeliveryFees(restaurantId: string | null) {
  return useQuery<DeliveryFees | null>({
    queryKey: ["delivery-fees", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const response = await api.get<
        DeliveryFees | { data?: DeliveryFees }
      >(`/restaurants/${restaurantId}/delivery-fees`);
      const payload: unknown = response.data;
      if (
        payload &&
        typeof payload === "object" &&
        !Array.isArray(payload) &&
        "data" in payload
      ) {
        return (payload as { data?: DeliveryFees }).data ?? null;
      }
      return (payload as DeliveryFees | null) ?? null;
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
    }) =>
      api.put(`/restaurants/${restaurantId}/delivery-fees`, {
        baseFee: fees.baseFee,
        minOrderAmount: fees.minOrderAmount,
      }),
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
