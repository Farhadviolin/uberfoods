import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../utils/api";
import { logError, handleApiError } from "../utils/errorUtils";

export interface StockItem {
  id: string;
  name: string;
  category?: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  unitPrice: number;
  restaurantId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryOverview {
  totalValue: number;
  stockLevels: {
    low: number;
    normal: number;
    high: number;
  };
  totalItems: number;
  monthlyWaste: number;
}

export interface InventoryAlert {
  id: string;
  type: string;
  severity: "CRITICAL" | "WARNING";
  message: string;
  itemName: string;
  currentStock: number;
  minStock: number;
  unit: string;
  createdAt: string;
}

export function useRestaurantInventory(restaurantId: string | null) {
  return useQuery({
    queryKey: ["inventory", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      try {
        const response = await api.get<InventoryOverview>(
          `/inventory/restaurant/${restaurantId}/overview`,
        );
        return response.data;
      } catch (error) {
        const appError = handleApiError(error);
        logError(appError, "useRestaurantInventory");
        return null;
      }
    },
    enabled: !!restaurantId,
    retry: false,
  });
}

export function useRestaurantStockItems(restaurantId: string | null) {
  return useQuery({
    queryKey: ["stock-items", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      try {
        const response = await api.get<StockItem[]>(
          `/inventory/restaurant/${restaurantId}/stock`,
        );
        return response.data || [];
      } catch (error) {
        const appError = handleApiError(error);
        logError(appError, "useRestaurantStockItems");
        return [];
      }
    },
    enabled: !!restaurantId,
    placeholderData: [],
    retry: false,
  });
}

export function useRestaurantInventoryAlerts(restaurantId: string | null) {
  return useQuery({
    queryKey: ["inventory-alerts", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      try {
        const response = await api.get<InventoryAlert[]>(
          `/inventory/restaurant/${restaurantId}/alerts`,
        );
        return response.data || [];
      } catch (error) {
        const appError = handleApiError(error);
        logError(appError, "useRestaurantInventoryAlerts");
        return [];
      }
    },
    enabled: !!restaurantId,
    placeholderData: [],
    retry: false,
    refetchInterval: 60000, // Alle 60 Sekunden aktualisieren
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      api.patch(`/inventory/stock/${id}`, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-alerts"] });
    },
  });
}
