import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export interface DriverStatusUpdate {
  status: 'online' | 'offline' | 'busy';
  reason?: string;
  currentLocation?: {
    lat: number;
    lng: number;
    accuracy: number;
  };
}

export function useDriverStatus() {
  return useQuery({
    queryKey: ['driver-status'],
    queryFn: async () => (await api.get('/drivers/me/status')).data,
  });
}

export function useUpdateDriverStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (update: DriverStatusUpdate) =>
      (await api.put('/drivers/me/status', update)).data,
    onSuccess: (status) => {
      queryClient.setQueryData(['driver-status'], status);
    },
  });
}

export function useDriverStats() {
  return useQuery({
    queryKey: ['driver-stats'],
    queryFn: async () => (await api.get('/drivers/me/stats')).data,
  });
}
