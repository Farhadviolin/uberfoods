import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { AxiosErrorWithResponse } from '../types';

export interface NutritionInfo {
  id: string;
  dishId: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium?: number;
  vitamins?: Record<string, number>;
  minerals?: Record<string, number>;
  allergens?: string[];
  dish?: {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
  };
}

export interface NutritionAnalytics {
  totalOrders: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  totalSugar: number;
  totalSodium: number;
  healthScore: number;
}

export interface CreateNutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium?: number;
  vitamins?: Record<string, number>;
  minerals?: Record<string, number>;
  allergens?: string[];
}

export interface PopularNutritiousDish {
  id: string;
  name: string;
  restaurant: string;
  restaurantId?: string;
  healthScore?: number;
  orders?: number;
  imageUrl?: string;
}

// Gericht-Nährwerte laden
export function useDishNutrition(dishId: string) {
  return useQuery({
    queryKey: ['nutrition', 'dish', dishId],
    queryFn: async () => {
      const response = await api.get(`/dishes/${dishId}/nutrition`);
      return response.data as NutritionInfo;
    },
    enabled: !!dishId,
  });
}

// Nährwert-Analytics laden
export function useNutritionAnalytics(period: 'today' | 'week' | 'month' = 'week') {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;

  return useQuery({
    queryKey: ['analytics', 'nutrition', period],
    queryFn: async () => {
      if (!isAuthenticated) {
        return null;
      }
      try {
        const response = await api.get(`/analytics/nutrition/${period}`);
        return response.data as NutritionAnalytics;
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return null;
        }
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: false,
  });
}

// Beliebte nährwertreiche Gerichte laden
export function usePopularNutritiousDishes(limit: number = 10) {
  return useQuery({
    queryKey: ['dishes', 'popular-nutritious', limit],
    queryFn: async () => {
      const response = await api.get(`/dishes/popular-nutritious?limit=${limit}`);
      return response.data as PopularNutritiousDish[];
    },
  });
}

// Nährwerte für Gericht hinzufügen (Admin-Funktion)
export function useCreateNutrition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { dishId: string; nutrition: CreateNutritionData }) => {
      const response = await api.post(`/dishes/${data.dishId}/nutrition`, data.nutrition);
      return response.data as NutritionInfo;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'dish', variables.dishId] });
      queryClient.invalidateQueries({ queryKey: ['dishes', 'popular-nutritious'] });
    },
  });
}

// Nährwerte aktualisieren (Admin-Funktion)
export function useUpdateNutrition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { dishId: string; nutrition: Partial<CreateNutritionData> }) => {
      const response = await api.put(`/dishes/${data.dishId}/nutrition`, data.nutrition);
      return response.data as NutritionInfo;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'dish', variables.dishId] });
      queryClient.invalidateQueries({ queryKey: ['dishes', 'popular-nutritious'] });
    },
  });
}