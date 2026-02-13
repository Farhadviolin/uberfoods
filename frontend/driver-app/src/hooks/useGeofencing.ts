import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { isAuthError, isAxiosErrorResponse } from '../utils/errorHandler';

interface Geofence {
  id: string;
  name: string;
  type: 'restaurant' | 'customer' | 'zone' | 'custom';
  center: { lat: number; lng: number };
  radius: number;
  enabled: boolean;
  metadata?: any;
}

interface GeofenceEvent {
  geofenceId: string;
  driverId?: string;
  orderId?: string;
  eventType: 'enter' | 'exit' | 'inside';
  location: { lat: number; lng: number };
  timestamp: string;
}

interface LocationCheckResult {
  insideGeofences: Geofence[];
  events: GeofenceEvent[];
}

export function useGeofencing(orderId?: string) {
  const { driver } = useAuth();
  const queryClient = useQueryClient();

  // Get geofences for order
  const geofencesQuery = useQuery({
    queryKey: ['geofences', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      try {
        const response = await api.get<Geofence[]>(`/geofencing/order/${orderId}`);
        return response.data;
      } catch (error: unknown) {
        if (isAxiosErrorResponse(error) && error.response?.status === 404) return [];
        throw error;
      }
    },
    enabled: !!orderId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Check location mutation
  const checkLocationMutation = useMutation({
    mutationFn: async (location: { lat: number; lng: number }) => {
      if (!driver?.id) throw new Error('Driver not authenticated');
      const response = await api.post<LocationCheckResult>('/geofencing/check', {
        driverId: driver.id,
        location,
        orderId,
      });
      return response.data;
    },
  });

  // Get geofence events
  const eventsQuery = useQuery({
    queryKey: ['geofence-events', driver?.id, orderId],
    queryFn: async () => {
      if (!driver?.id) return [];
      try {
        const params = new URLSearchParams();
        params.append('driverId', driver.id);
        if (orderId) params.append('orderId', orderId);
        
        const response = await api.get<GeofenceEvent[]>(`/geofencing/events?${params.toString()}`);
        return response.data;
      } catch (error: unknown) {
        if (isAuthError(error)) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!driver?.id,
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: false,
  });

  return {
    geofences: geofencesQuery.data || [],
    events: eventsQuery.data || [],
    isLoading: geofencesQuery.isLoading || eventsQuery.isLoading,
    error: geofencesQuery.error || eventsQuery.error,
    refetch: () => {
      geofencesQuery.refetch();
      eventsQuery.refetch();
    },
    checkLocation: checkLocationMutation.mutateAsync,
    isCheckingLocation: checkLocationMutation.isPending,
    locationCheckResult: checkLocationMutation.data,
  };
}

export function useRestaurantGeofences(restaurantId: string | null) {
  return useQuery({
    queryKey: ['geofences', 'restaurant', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      try {
        const response = await api.get<Geofence[]>(`/geofencing/restaurant/${restaurantId}`);
        return response.data;
      } catch (error: unknown) {
        if (isAxiosErrorResponse(error) && error.response?.status === 404) return [];
        throw error;
      }
    },
    enabled: !!restaurantId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
  });
}

