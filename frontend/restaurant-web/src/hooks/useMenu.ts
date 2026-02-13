import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../utils/api";
import { useAuth } from "../contexts/AuthContext";

export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  isAvailable: boolean;
  restaurantId: string;
  // Erweiterte Felder
  ingredients?: string;
  allergens?: Record<string, boolean>;
  nutrition?: Record<string, number>;
  preparationTime?: number;
  spiceLevel?: number;
  tags?: string[];
  servingSize?: string;
  dietaryInfo?: Record<string, boolean>;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export function useRestaurantDishes(restaurantId: string | null) {
  return useQuery({
    queryKey: ["dishes", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const response = await api.get<Dish[]>(
        `/dishes/restaurant/${restaurantId}`,
      );
      return response.data || [];
    },
    enabled: !!restaurantId,
  });
}

// Neues Hook: gesamtes Menü für eingeloggtes Restaurant
export function useMenu() {
  const { restaurantId: contextRestaurantId } = useAuth();
  const restaurantId =
    contextRestaurantId || localStorage.getItem("restaurant_id");

  return useQuery({
    queryKey: ["menu", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const response = await api.get(`/restaurants/${restaurantId}/menu`);
      return response.data || [];
    },
    enabled: !!restaurantId,
  });
}

export function useCreateDish() {
  const queryClient = useQueryClient();
  const { restaurantId: contextRestaurantId } = useAuth();
  const restaurantId =
    contextRestaurantId || localStorage.getItem("restaurant_id");

  return useMutation({
    mutationFn: (data: FormData | Record<string, any>) => {
      if (!restaurantId) {
        throw new Error("Kein Restaurant ausgewählt");
      }
      if (data instanceof FormData) {
        return api
          .post(`/restaurants/${restaurantId}/menu`, data, {
            headers: { "Content-Type": "multipart/form-data" },
          })
          .then((res) => res.data);
      }
      return api
        .post(`/restaurants/${restaurantId}/menu`, data)
        .then((res) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      queryClient.invalidateQueries({ queryKey: ["dishes"] });
    },
  });
}

export function useUpdateDish() {
  const queryClient = useQueryClient();
  const { restaurantId: contextRestaurantId } = useAuth();
  const restaurantId =
    contextRestaurantId || localStorage.getItem("restaurant_id");

  return useMutation({
    mutationFn: ({
      id,
      dishId,
      updates,
    }: {
      id?: string;
      dishId?: string;
      updates: FormData | Partial<Dish>;
    }) => {
      if (!restaurantId) {
        throw new Error("Kein Restaurant ausgewählt");
      }
      const targetId = id ?? dishId;
      if (!targetId) {
        throw new Error("Keine Dish-ID angegeben");
      }
      if (updates instanceof FormData) {
        return api
          .put(`/restaurants/${restaurantId}/menu/${targetId}`, updates, {
            headers: { "Content-Type": "multipart/form-data" },
          })
          .then((res) => res.data);
      }
      return api
        .put(`/restaurants/${restaurantId}/menu/${targetId}`, updates)
        .then((res) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      queryClient.invalidateQueries({ queryKey: ["dishes"] });
    },
  });
}

export function useDeleteDish() {
  const queryClient = useQueryClient();
  const { restaurantId: contextRestaurantId } = useAuth();
  const restaurantId =
    contextRestaurantId || localStorage.getItem("restaurant_id");

  return useMutation({
    mutationFn: (id: string) => {
      if (!restaurantId) {
        throw new Error("Kein Restaurant ausgewählt");
      }
      return api.delete(`/restaurants/${restaurantId}/menu/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      queryClient.invalidateQueries({ queryKey: ["dishes"] });
    },
  });
}

export interface DishCategory {
  id: string;
  name: string;
  description?: string;
  dishCount?: number;
  isActive?: boolean;
  sortOrder?: number;
  imageUrl?: string;
}

export function useDishCategories() {
  const { restaurantId: contextRestaurantId } = useAuth();
  const restaurantId =
    contextRestaurantId || localStorage.getItem("restaurant_id");

  return useQuery({
    queryKey: ["dish-categories", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const response = await api.get(
        `/restaurants/${restaurantId}/menu/categories`,
      );
      return response.data || [];
    },
    enabled: !!restaurantId,
  });
}
