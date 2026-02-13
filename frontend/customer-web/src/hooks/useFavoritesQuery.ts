import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { logWarning } from '../utils/errorReporting';
import { AxiosErrorWithResponse } from '../types';

export interface Favorite {
  id: string;
  restaurantId: string;
  restaurant: {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
  };
}

export function useFavoritesQuery() {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;
  
  const query = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      if (!isAuthenticated) {
        return [] as Favorite[];
      }
      try {
        const response = await api.get('/customers/me/favorites');
        return response.data as Favorite[];
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        // Bei 401/403 Fehlern (kein Login) oder 500-Fehlern leere Liste zurückgeben
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403 || axiosError.response?.status === 500) {
          logWarning('Fehler beim Laden der Favoriten', { component: 'useFavoritesQuery', action: 'fetchFavorites', metadata: { status: axiosError.response?.status } });
          return [] as Favorite[];
        }
        // Andere Fehler auch abfangen
        logWarning('Fehler beim Laden der Favoriten', { component: 'useFavoritesQuery', action: 'fetchFavorites', metadata: { error } });
        return [] as Favorite[];
      }
    },
    enabled: isAuthenticated, // Nur ausführen wenn User eingeloggt
    retry: false,
  });

  // Return empty array when not authenticated
  if (!isAuthenticated) {
    return { ...query, data: [] as Favorite[] };
  }

  return query;
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (restaurantId: string) => {
      const response = await api.post('/customers/me/favorites', { restaurantId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

