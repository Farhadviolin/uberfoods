import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../utils/api";
import { logError, handleApiError } from "../utils/errorUtils";

export interface Staff {
  id: string;
  restaurantId: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  permissions?: string[];
  isActive: boolean;
  hourlyRate?: number;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  shifts?: StaffShift[];
}

export interface StaffShift {
  id: string;
  staffId: string;
  startTime: string;
  endTime?: string;
  breakDuration?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export function useRestaurantStaff(restaurantId: string | null) {
  return useQuery({
    queryKey: ["staff", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      try {
        const response = await api.get<Staff[]>(
          `/staff/restaurant/${restaurantId}`,
        );
        return response.data || [];
      } catch (error) {
        const appError = handleApiError(error);
        logError(appError, "useRestaurantStaff");
        return [];
      }
    },
    enabled: !!restaurantId,
    placeholderData: [],
    retry: false,
  });
}

export function useStaffStats(
  restaurantId: string | null,
  period: string = "30d",
) {
  return useQuery({
    queryKey: ["staff-stats", restaurantId, period],
    queryFn: async () => {
      if (!restaurantId) return [];
      try {
        const response = await api.get(
          `/staff/restaurant/${restaurantId}/stats?period=${period}`,
        );
        return response.data || [];
      } catch (error) {
        const appError = handleApiError(error);
        logError(appError, "useStaffStats");
        return [];
      }
    },
    enabled: !!restaurantId,
    placeholderData: [],
    retry: false,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      restaurantId,
      data,
    }: {
      restaurantId: string;
      data: Partial<Staff>;
    }) => api.post(`/staff/restaurant/${restaurantId}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["staff", variables.restaurantId],
      });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Staff> }) =>
      api.put(`/staff/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

export function useToggleStaffStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.patch(`/staff/${id}/toggle-status`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}
