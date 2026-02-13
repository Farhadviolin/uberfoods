import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { extractData } from '../utils/apiResponse';

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  location: { lat: number; lng: number } | null;
}

export function useDrivers() {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: () => api.get<Driver[]>('/admin/drivers').then(res => extractData<Driver[] | { data: Driver[] }>(res.data) || []),
    staleTime: 1 * 60 * 1000, // 1 minute - driver locations change frequently
    select: (data) => Array.isArray(data) ? data : [],
  });
}

export function useActiveDrivers() {
  return useQuery({
    queryKey: ['drivers', 'active'],
    queryFn: () => api.get<Driver[]>('/admin/drivers').then(res => extractData<Driver[] | { data: Driver[] }>(res.data) || []),
    staleTime: 1 * 60 * 1000,
    select: (data) => (Array.isArray(data) ? data : []).filter(d => d.isActive),
  });
}

export function useDriver(id: string | null) {
  return useQuery({
    queryKey: ['drivers', id],
    queryFn: () => api.get<Driver>(`/admin/drivers/${id}`).then(res => extractData<Driver>(res.data)),
    enabled: !!id,
    staleTime: 1 * 60 * 1000,
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<Driver>) => api.post('/admin/drivers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Driver> }) =>
      api.put(`/admin/drivers/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['drivers', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteDriver() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/drivers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

