import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { CreateOrderData, AxiosErrorWithResponse } from '../types';
import { useAuth } from '../contexts/AuthContext';

export interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  restaurant: {
    id: string;
    name: string;
  };
}

export function useOrders() {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;
  const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
  
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      if (!isAuthenticated && !isTest) {
        return [] as Order[];
      }
      try {
        const response = await api.get('/orders/my');
        const payload = response.data;
        // Support both shapes: Order[] OR { data: Order[] }
        return Array.isArray(payload) ? payload : (payload?.data ?? []);
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        // Bei 401/403 Fehlern (kein Login) leere Liste zurückgeben
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return [] as Order[];
        }
        throw error;
      }
    },
    enabled: isAuthenticated, // Nur ausführen wenn User eingeloggt
    retry: false,
  });
}

export function useOrder(id: string) {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;
  const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
  
  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      if (!id) return null;
      if (!isAuthenticated && !isTest) return null;
      try {
        const response = await api.get(`/orders/${id}`);
        return response.data as Order;
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        // Bei 401/403 Fehlern (kein Login) null zurückgeben
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return null;
        }
        throw error;
      }
    },
    enabled: true,
    refetchInterval: 5000, // Refetch every 5 seconds for live updates
    retry: false,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (orderData: CreateOrderData) => {
      const response = await api.post('/orders', orderData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      orderId,
      reason,
      refundRequested,
    }: { orderId: string; reason: string; refundRequested?: boolean }) => {
      const response = await api.post(`/orders/${orderId}/cancel`, {
        reason,
        refundRequested,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
    },
  });
}

export function useReorder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await api.post(`/orders/${orderId}/reorder`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

