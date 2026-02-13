import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { extractData } from '../utils/apiResponse';
import { Restaurant, RestaurantFormData } from '../types/restaurant';
import { handleApiError } from '../utils/errorHandler';

export function useRestaurants() {
  return useQuery({
    queryKey: ['restaurants'],
    queryFn: () => api.get<Restaurant[]>('/admin/restaurants')
      .then(res => {
        const data = extractData<Restaurant[] | { data: Restaurant[] }>(res.data);
        return Array.isArray(data) ? data : [];
      })
      .catch((error) => handleApiError(error, {
        allowlist: [], // Restaurants sind kritisch - keine silent fails für 404
        fallbackValue: [],
        context: 'Restaurants List',
        endpoint: '/admin/restaurants'
      })),
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data) => Array.isArray(data) ? data : [],
  });
}

export function useActiveRestaurants() {
  return useQuery({
    queryKey: ['restaurants', 'active'],
    queryFn: () => api.get<Restaurant[]>('/admin/restaurants')
      .then(res => {
        const data = extractData<Restaurant[] | { data: Restaurant[] }>(res.data);
        return Array.isArray(data) ? data : [];
      })
      .catch((error) => handleApiError(error, {
        allowlist: [], // Active restaurants sind kritisch - keine silent fails für 404
        fallbackValue: [],
        context: 'Active Restaurants',
        endpoint: '/admin/restaurants'
      })),
    staleTime: 2 * 60 * 1000,
    select: (data) => (Array.isArray(data) ? data : []).filter(r => r.isActive),
  });
}

export function useRestaurant(id: string | null) {
  return useQuery({
    queryKey: ['restaurants', id],
    queryFn: () => api.get<Restaurant>(`/restaurants/${id}`).then(res => extractData<Restaurant>(res.data)),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateRestaurant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<Restaurant>) => api.post('/admin/restaurants', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
    },
  });
}

export function useUpdateRestaurant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Restaurant> }) =>
      api.put(`/restaurants/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      queryClient.invalidateQueries({ queryKey: ['restaurants', variables.id] });
    },
  });
}

export function useDeleteRestaurant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.delete(`/restaurants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
    },
  });
}

