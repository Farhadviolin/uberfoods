import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

export interface RestaurantStatus {
  restaurantId: string;
  status: string;
  isOpen: boolean;
  queueLength: number;
  activeOrders: number;
  estimatedWaitMinutes: number;
  busyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  lastUpdated: string;
}

export interface QueueInfo {
  queueLength: number;
  orders: Array<{
    orderId: string;
    position: number;
    status: string;
    customerName: string;
    createdAt: string;
  }>;
}

export interface EstimatedWait {
  estimatedMinutes: number;
  queueLength: number;
  busyLevel: string;
}

export interface PeakHours {
  peakHours: Array<{
    hour: number;
    label: string;
    orderCount: number;
  }>;
  currentHour: number;
  isPeakHour: boolean;
}

export function useRestaurantStatus(restaurantId: string | null) {
  return useQuery({
    queryKey: ['restaurant-status', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const response = await api.get(`/restaurants/public/${restaurantId}/status`);
      return response.data as RestaurantStatus;
    },
    enabled: !!restaurantId,
    initialData: null, // Return null when disabled
    refetchInterval: 30000, // Alle 30 Sekunden aktualisieren
    retry: false,
  });
}

export function useRestaurantQueue(restaurantId: string | null) {
  return useQuery({
    queryKey: ['restaurant-queue', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const response = await api.get(`/restaurants/public/${restaurantId}/queue`);
      return response.data as QueueInfo;
    },
    enabled: !!restaurantId,
    initialData: null, // Return null when disabled
    refetchInterval: 10000, // Alle 10 Sekunden aktualisieren
    retry: false,
  });
}

export function useEstimatedWait(restaurantId: string | null) {
  return useQuery({
    queryKey: ['estimated-wait', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const response = await api.get(`/restaurants/public/${restaurantId}/estimated-wait`);
      return response.data as EstimatedWait;
    },
    enabled: !!restaurantId,
    initialData: null, // Return null when disabled
    refetchInterval: 30000,
    retry: false,
  });
}

export function usePeakHours(restaurantId: string | null) {
  return useQuery({
    queryKey: ['peak-hours', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const response = await api.get(`/restaurants/public/${restaurantId}/peak-hours`);
      return response.data as PeakHours;
    },
    enabled: !!restaurantId,
    initialData: null, // Return null when disabled
    retry: false,
  });
}

