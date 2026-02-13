import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { AxiosErrorWithResponse } from '../types';
import { useAuth } from '../contexts/AuthContext';

export interface ScheduledOrderItem {
  dishId: string;
  quantity: number;
  price: number;
}

export interface ScheduledOrder {
  id: string;
  restaurantId: string;
  items: ScheduledOrderItem[];
  scheduledAt: string;
  frequency?: string;
  isActive: boolean;
  lastOrdered?: string;
  nextOrder?: string;
  address: string;
  phone: string;
  notes?: string;
  restaurant: {
    id: string;
    name: string;
    address: string;
    imageUrl?: string;
  };
}

export function useScheduledOrders() {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;
  
  return useQuery({
    queryKey: ['scheduled-orders'],
    queryFn: async () => {
      try {
        const response = await api.get('/customers/me/scheduled-orders');
        return response.data as ScheduledOrder[];
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

export function useScheduledOrder(id: string) {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;
  
  return useQuery({
    queryKey: ['scheduled-order', id],
    queryFn: async () => {
      try {
        const response = await api.get(`/customers/me/scheduled-orders/${id}`);
        return response.data as ScheduledOrder;
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return null;
        }
        throw error;
      }
    },
    enabled: isAuthenticated && !!id,
    retry: false,
  });
}

export function useCreateScheduledOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      restaurantId: string;
      items: ScheduledOrderItem[];
      scheduledAt: Date;
      frequency?: string;
      address: string;
      phone: string;
      notes?: string;
    }) => {
      const response = await api.post('/customers/me/scheduled-orders', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-orders'] });
    },
  });
}

export function useUpdateScheduledOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ScheduledOrder> }) => {
      const response = await api.put(`/customers/me/scheduled-orders/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-orders'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-order', variables.id] });
    },
  });
}

export function useDeleteScheduledOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/customers/me/scheduled-orders/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-orders'] });
    },
  });
}

export function useExecuteScheduledOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/customers/me/scheduled-orders/${id}/execute`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

