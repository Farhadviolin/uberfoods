import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '../utils/api';
import type { Dish } from '../types';

interface Restaurant {
  id: string;
  name: string;
  description: string;
  rating: number;
  cuisines: string[];
  deliveryFee: number;
  minOrderAmount: number;
  estimatedDeliveryTime: number;
  isOpen: boolean;
  imageUrl?: string;
  address: string;
  phone: string;
  dishes?: Dish[];
}

interface UseRestaurantsOptions {
  searchTerm?: string;
  cuisines?: string[];
  isOpen?: boolean;
  sortBy?: 'rating' | 'deliveryTime' | 'deliveryFee' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export const useRestaurants = (options: UseRestaurantsOptions = {}) => {
  const {
    searchTerm = '',
    cuisines = [],
    isOpen,
    sortBy = 'rating',
    sortOrder = 'desc',
  } = options;

  // Create stable query key
  const queryKey = useMemo(() => {
    const key = ['restaurants'];
    if (searchTerm) key.push(`search:${searchTerm}`);
    if (cuisines.length > 0) key.push(`cuisines:${cuisines.join(',')}`);
    if (isOpen !== undefined) key.push(`open:${isOpen}`);
    if (sortBy !== 'rating') key.push(`sort:${sortBy}`);
    if (sortOrder !== 'desc') key.push(`order:${sortOrder}`);
    return key;
  }, [searchTerm, cuisines, isOpen, sortBy, sortOrder]);

  // Create stable query function
  const queryFn = useMemo(() => async (): Promise<Restaurant[]> => {
    const params = new URLSearchParams();

    if (searchTerm) params.append('search', searchTerm);
    if (cuisines.length > 0) params.append('cuisines', cuisines.join(','));
    if (isOpen !== undefined) params.append('isOpen', isOpen.toString());
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);

    const queryString = params.toString();
    const url = `/restaurants/public${queryString ? `?${queryString}` : ''}`;

    const response = await api.get(url);
    // Handle backend response format: { data: [...], pagination: {...} }
    // Normalize to just the restaurants array for frontend compatibility
    const body = response.data;
    const restaurants = Array.isArray(body) ? body : (body?.data ?? body?.items ?? []);

    // Map backend restaurant data to frontend Restaurant interface
    const normalizedRestaurants = restaurants.map((restaurant: any) => ({
      id: restaurant.id,
      name: restaurant.name,
      description: restaurant.description,
      rating: restaurant.rating || 0,
      cuisines: restaurant.cuisines || [],
      deliveryFee: restaurant.deliveryFee || 0,
      minOrderAmount: restaurant.minOrderAmount || 0,
      estimatedDeliveryTime: restaurant.estimatedDeliveryTime || 30,
      isOpen: restaurant.status === 'OPEN' && restaurant.isActive === true,
      imageUrl: restaurant.imageUrl,
      address: restaurant.address,
      phone: restaurant.phone,
      dishes: restaurant.dishes || restaurant.menuItems || [],
    }));

    return normalizedRestaurants;
  }, [searchTerm, cuisines, isOpen, sortBy, sortOrder]);

  return useQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status >= 400 && status < 500) {
          return false;
        }
      }
      return failureCount < 3;
    },
  });
};
