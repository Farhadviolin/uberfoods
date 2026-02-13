import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { AxiosErrorWithResponse } from '../types';

export interface MealPlan {
  id: string;
  customerId: string;
  date: string;
  restaurantId: string;
  dishIds: string[];
  notes?: string;
  isExecuted: boolean;
  executedAt?: string;
  createdAt: string;
  updatedAt: string;
  restaurant?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  dishes?: Array<{
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    description?: string;
    category?: string;
  }>;
  totalPrice?: number;
}

export interface CreateMealPlanData {
  date: string;
  restaurantId: string;
  dishIds: string[];
  notes?: string;
}

export interface WeeklyMealPlan {
  weekStart: string;
  days: Array<{
    date: string;
    dayName: string;
    mealPlan: MealPlan | null;
  }>;
}

export interface ShoppingList {
  totalMeals: number;
  totalCost: number;
  restaurants: string[];
  items: Array<{
    dishId: string;
    name: string;
    restaurant: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    imageUrl?: string;
  }>;
}

// Meal Plans laden
export function useMealPlans(startDate?: string, endDate?: string) {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;
  const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

  return useQuery({
    queryKey: ['meal-planner', 'meals', startDate, endDate],
    queryFn: async () => {
      if (!isAuthenticated && !isTest) {
        return [];
      }
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await api.get(`/meal-planner/meals?${params}`);
        return response.data as MealPlan[];
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return [];
        }
        throw error;
      }
    },
    enabled: isAuthenticated || isTest,
    retry: false,
  });
}

// Einzelnen Meal Plan laden
export function useMealPlan(mealPlanId: string) {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;
  const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

  return useQuery({
    queryKey: ['meal-planner', 'meal', mealPlanId],
    queryFn: async () => {
      if (!isAuthenticated && !isTest) {
        return null;
      }
      try {
        const response = await api.get(`/meal-planner/meals/${mealPlanId}`);
        return response.data as MealPlan;
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return null;
        }
        throw error;
      }
    },
    enabled: (isAuthenticated || isTest) && !!mealPlanId,
    retry: false,
  });
}

// Meal Plan erstellen/aktualisieren
export function useCreateMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMealPlanData) => {
      const response = await api.post('/meal-planner/meals', data);
      return response.data as MealPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-planner', 'meals'] });
      queryClient.invalidateQueries({ queryKey: ['meal-planner', 'weekly'] });
    },
  });
}

// Meal Plan aktualisieren
export function useUpdateMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { mealPlanId: string; updates: Partial<CreateMealPlanData> }) => {
      const response = await api.put(`/meal-planner/meals/${data.mealPlanId}`, data.updates);
      return response.data as MealPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-planner', 'meals'] });
      queryClient.invalidateQueries({ queryKey: ['meal-planner', 'weekly'] });
    },
  });
}

// Meal Plan löschen
export function useDeleteMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mealPlanId: string) => {
      await api.delete(`/meal-planner/meals/${mealPlanId}`);
      return mealPlanId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-planner', 'meals'] });
      queryClient.invalidateQueries({ queryKey: ['meal-planner', 'weekly'] });
    },
  });
}

// Meal Plan ausführen (Bestellung erstellen)
export function useExecuteMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mealPlanId: string) => {
      const response = await api.post(`/meal-planner/meals/${mealPlanId}/execute`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-planner', 'meals'] });
      queryClient.invalidateQueries({ queryKey: ['meal-planner', 'weekly'] });
      // Invalidate orders to show new order
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

// Weekly Meal Plan laden
export function useWeeklyMealPlan(weekStart: string) {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;
  const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

  return useQuery({
    queryKey: ['meal-planner', 'weekly', weekStart],
    queryFn: async () => {
      if (!isAuthenticated && !isTest) {
        return null;
      }
      try {
        const response = await api.get(`/meal-planner/weekly?weekStart=${weekStart}`);
        return response.data as WeeklyMealPlan;
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return null;
        }
        throw error;
      }
    },
    enabled: (isAuthenticated || isTest) && !!weekStart,
    retry: false,
  });
}

// Alias für Tests/Kompatibilität
export function useWeeklyMealPlans(weekStart: string) {
  return useWeeklyMealPlan(weekStart);
}

// Shopping List generieren
export function useShoppingList(startDate: string, endDate: string) {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;
  const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

  return useQuery({
    queryKey: ['meal-planner', 'shopping-list', startDate, endDate],
    queryFn: async () => {
      if (!isAuthenticated && !isTest) {
        return null;
      }
      try {
        const response = await api.get(`/meal-planner/shopping-list?startDate=${startDate}&endDate=${endDate}`);
        return response.data as ShoppingList;
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return null;
        }
        throw error;
      }
    },
    enabled: (isAuthenticated || isTest) && !!startDate && !!endDate,
    retry: false,
  });
}