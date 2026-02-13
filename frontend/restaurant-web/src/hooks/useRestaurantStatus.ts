import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../utils/api";
import { logError, handleApiError } from "../utils/errorUtils";

export type RestaurantStatus = "OPEN" | "CLOSED" | "IN_WORK";

export interface RestaurantStatusData {
  status: RestaurantStatus;
  isActive: boolean;
}

export function useRestaurantStatus(restaurantId: string | null) {
  return useQuery({
    queryKey: ["restaurant-status", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      try {
        const response = await api.get<RestaurantStatusData>(
          `/restaurants/${restaurantId}/status`,
        );
        return response.data;
      } catch (error) {
        const appError = handleApiError(error);
        logError(appError, "useRestaurantStatus");
        return null;
      }
    },
    enabled: !!restaurantId,
    refetchInterval: 30000, // Alle 30 Sekunden aktualisieren
    retry: false,
  });
}

export function useUpdateRestaurantStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      restaurantId,
      status,
    }: {
      restaurantId: string;
      status: RestaurantStatus;
    }) => api.patch(`/restaurants/${restaurantId}/status`, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["restaurant-status", variables.restaurantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["restaurant", variables.restaurantId],
      });
    },
  });
}
