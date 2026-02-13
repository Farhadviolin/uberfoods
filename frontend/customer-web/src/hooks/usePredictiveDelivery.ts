import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { AxiosErrorWithResponse } from '../types';

export interface DeliveryPrediction {
  estimatedDeliveryTime: number;
  confidence: number;
  factors: {
    restaurant: string;
    currentLoad: number;
    distance: number;
    weather: string;
    timeOfDay: string;
    dayOfWeek: string;
  };
  bestTimeToOrder?: string;
  alternativeRestaurants?: Array<{
    id: string;
    name: string;
    estimatedTime: number;
    reason: string;
  }>;
}

export interface DeliveryPattern {
  restaurantId: string;
  restaurantName: string;
  totalOrders: number;
  averageEstimatedTime: number;
  averageActualTime: number;
  accuracy: number;
  reliability: string;
}

export interface PredictDeliveryData {
  restaurantId: string;
  dish?: string;
  customerLat: number;
  customerLng: number;
  preferredDeliveryTime?: string;
}

// Delivery Prediction laden
export function useDeliveryPrediction(data: PredictDeliveryData | null) {
  const query = useQuery({
    queryKey: ['analytics', 'predict-delivery', data],
    queryFn: async () => {
      if (!data) return null;
      const response = await api.post('/analytics/predict-delivery', data);
      return response.data as DeliveryPrediction;
    },
    enabled: !!data && data !== null,
    retry: false,
  });
  
  // Return null when disabled (for test compatibility)
  if (!data) {
    return { ...query, data: null };
  }
  
  return query;
}

// Delivery Patterns laden
export function useDeliveryPatterns() {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;

  return useQuery({
    queryKey: ['analytics', 'delivery-patterns'],
    queryFn: async () => {
      if (!isAuthenticated) {
        return [];
      }
      try {
        const response = await api.get('/analytics/delivery-patterns');
        return response.data as DeliveryPattern[];
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

// Delivery Prediction als Mutation (für on-demand requests)
export function usePredictDelivery() {
  return useMutation({
    mutationFn: async (data: PredictDeliveryData) => {
      const response = await api.post('/analytics/predict-delivery', data);
      return response.data as DeliveryPrediction;
    },
  });
}