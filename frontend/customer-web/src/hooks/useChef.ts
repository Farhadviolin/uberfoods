import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { AxiosErrorWithResponse } from '../types';

export interface ChefProfile {
  id: string;
  customerId: string;
  dietaryType?: {
    type: string;
    confidence: number;
  };
  allergies?: string[];
  favoriteCuisines?: string[];
  dislikedIngredients?: string[];
  preferredPriceRange?: 'budget' | 'mid' | 'premium';
  healthScore?: number;
  tasteProfile?: {
    spicy: number;
    sweet: number;
    savory: number;
    salty: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PersonalizedRecommendation {
  id: string;
  name: string;
  price: number;
  restaurant: string;
  rating: number;
  recommendationScore: number;
  imageUrl?: string;
  tags?: string[];
}

export interface PreferenceAnalysis {
  totalOrders: number;
  favoriteCuisines: Record<string, number>;
  favoriteIngredients: Record<string, number>;
  averageOrderValue: number;
  preferredOrderTimes: Record<string, number>;
  dietaryPatterns: {
    vegetarian: number;
    vegan: number;
    'gluten-free': number;
  };
}

export interface UpdateChefProfileData {
  dietaryType?: {
    type: string;
    confidence: number;
  };
  allergies?: string[];
  favoriteCuisines?: string[];
  dislikedIngredients?: string[];
  preferredPriceRange?: 'budget' | 'mid' | 'premium';
  tasteProfile?: {
    spicy: number;
    sweet: number;
    savory: number;
    salty: number;
  };
}

// Chef-Profil laden (öffentlich oder eigenes Profil)
export function useChefProfile(chefId?: string) {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;
  const isPublic = !!chefId;

  return useQuery({
    queryKey: ['chef-profile', isPublic ? `public-${chefId}` : user?.id],
    queryFn: async () => {
      if (!isPublic && !isAuthenticated) {
        return null;
      }
      const endpoint = chefId
        ? `/chefs/${chefId}`
        : '/customers/me/chef-profile';
      try {
        const response = await api.get(endpoint);
        return response.data as ChefProfile;
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return null;
        }
        throw error;
      }
    },
    enabled: isPublic ? !!chefId : isAuthenticated,
    gcTime: 0,
    staleTime: 0,
    retry: false,
  });
}

// Chef-Profil aktualisieren
export function useUpdateChefProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateChefProfileData) => {
      const response = await api.put('/customers/me/chef-profile', data);
      return response.data as ChefProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chef', 'profile'] });
      queryClient.invalidateQueries({ queryKey: ['chef', 'recommendations'] });
    },
  });
}

// Allergien laden
export function useAllergies() {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;

  return useQuery({
    queryKey: ['chef', 'allergies'],
    queryFn: async () => {
      if (!isAuthenticated) {
        return [];
      }
      try {
        const response = await api.get('/customers/me/allergies');
        return response.data as string[];
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return [];
        }
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: false,
  });
}

// Geschmacksprofil aktualisieren
export function useUpdateTasteProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tasteProfile: {
      spicy: number;
      sweet: number;
      savory: number;
      salty: number;
    }) => {
      const response = await api.post('/customers/me/taste-profile', tasteProfile);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chef', 'profile'] });
      queryClient.invalidateQueries({ queryKey: ['chef', 'recommendations'] });
    },
  });
}

// Personalisierte Empfehlungen laden
export function usePersonalizedRecommendations(limit: number = 10) {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;

  return useQuery({
    queryKey: ['chef', 'recommendations', limit],
    queryFn: async () => {
      if (!isAuthenticated) {
        return [];
      }
      try {
        const response = await api.get(`/customers/me/recommendations?limit=${limit}`);
        return response.data as PersonalizedRecommendation[];
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return [];
        }
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: false,
  });
}

// Öffentliche Chef-Empfehlungen (z.B. Liste)
export function useChefRecommendations(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['chef', 'recommendations', filters],
    queryFn: async () => {
      const query = filters ? new URLSearchParams(filters as Record<string, string>).toString() : '';
      const suffix = query ? `?${query}` : '';
      const response = await api.get(`/chefs/recommendations${suffix}`);
      const data = response.data;
      return Array.isArray(data) ? data : [];
    },
    retry: false,
  });
}

// Personalisierte Chef-Empfehlungen basierend auf User-Präferenzen
export function usePersonalizedChef() {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;

  return useQuery({
    queryKey: ['chef', 'personalized'],
    queryFn: async () => {
      if (!isAuthenticated) {
        return null;
      }
      const response = await api.get('/chefs/personalized');
      return response.data;
    },
    enabled: isAuthenticated,
    retry: false,
  });
}

// Präferenz-Analyse laden
export function usePreferenceAnalysis() {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;

  return useQuery({
    queryKey: ['chef', 'preference-analysis'],
    queryFn: async () => {
      if (!isAuthenticated) {
        return null;
      }
      try {
        const response = await api.get('/customers/me/preference-analysis');
        return response.data as PreferenceAnalysis;
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

// Chef bewerten
export function useRateChef() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      chefId: string;
      eventId?: string;
      rating: number;
      comment?: string;
      categories?: Record<string, number>;
    }) => {
      const response = await api.post('/chefs/rate', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chef', 'profile'] });
      queryClient.invalidateQueries({ queryKey: ['chef', 'recommendations'] });
    },
  });
}
