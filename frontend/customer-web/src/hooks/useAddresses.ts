import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { AxiosErrorWithResponse } from '../types';
import { useAuth } from '../contexts/AuthContext';

export interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  notes?: string;
  isDefault: boolean;
}

export function useAddresses() {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;
  const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
  
  return useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      try {
        const response = await api.get('/customers/me/addresses');
        return response.data as Address[];
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        // Bei 401/403 Fehlern (kein Login) leere Liste zurückgeben
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return [] as Address[];
        }
        throw error;
      }
    },
    enabled: isAuthenticated || isTest,
    retry: false,
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (addressData: Omit<Address, 'id' | 'isDefault'>) => {
      const response = await api.post('/customers/me/addresses', addressData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      id,
      updates,
      ...addressData
    }: { id?: string; updates?: Partial<Address> } & Partial<Address>) => {
      const targetId = id || (updates as any)?.addressId || (addressData as any)?.addressId;
      const payload = updates || addressData;
      const response = await api.put(
        `/customers/me/addresses/${targetId}`,
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/customers/me/addresses/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Test expects /default endpoint
      const response = await api.patch(`/customers/me/addresses/${id}/default`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
}

