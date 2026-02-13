import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { AxiosErrorWithResponse } from '../types';

export interface DietaryPreference {
  type: 'vegan' | 'vegetarian' | 'keto' | 'low-carb' | 'gluten-free' | 'halal' | 'none';
  confidence: number;
}

export interface Allergy {
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
}

export interface TasteProfile {
  spicy: number;
  sweet: number;
  savory: number;
  salty: number;
}

export interface ChefProfile {
  dietaryType: DietaryPreference;
  allergies: Allergy[];
  favoriteCuisines: string[];
  dislikedIngredients: string[];
  preferredPriceRange: 'budget' | 'mid' | 'premium';
  healthScore: number;
  tasteProfile: TasteProfile;
}

// Chef-Profile laden
export function useChefProfile() {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;

  return useQuery({
    queryKey: ['chef-profile'],
    queryFn: async () => {
      if (!isAuthenticated) {
        return null;
      }
      try {
        const response = await api.get('/customers/me/chef-profile');
        return response.data as ChefProfile;
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Allergien laden
export function useAllergies() {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;

  return useQuery({
    queryKey: ['allergies'],
    queryFn: async () => {
      if (!isAuthenticated) {
        return [] as Allergy[];
      }
      try {
        const response = await api.get('/customers/me/allergies');
        return response.data as Allergy[];
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return [] as Allergy[];
        }
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: false,
  });
}

// Taste-Profile aktualisieren
export function useUpdateTasteProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tasteProfile: TasteProfile) => {
      const response = await api.post('/customers/me/taste-profile', tasteProfile);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chef-profile'] });
    },
  });
}

