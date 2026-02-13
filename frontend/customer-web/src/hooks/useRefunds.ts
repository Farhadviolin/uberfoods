import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { isAuthError, isAxiosErrorResponse } from '../utils/errorHandler';

interface Refund {
  refundId: string;
  orderId: string;
  amount: number;
  reason: string;
  description?: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: string;
  processedAt?: string;
}

interface RefundRequest {
  orderId: string;
  amount?: number;
  reason: string;
  description?: string;
}

interface RefundStatus {
  refundId: string;
  orderId: string;
  amount: number;
  reason: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: string;
  processedAt?: string;
  estimatedProcessingTime: string;
}

export function useRefunds(filters?: { status?: string; orderId?: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const refundsQuery = useQuery({
    queryKey: ['refunds', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) {
        return { refunds: [], total: 0 };
      }
      try {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.orderId) params.append('orderId', filters.orderId);
        
        const response = await api.get<{ refunds: Refund[]; total: number }>(
          `/payments/customers/${user.id}/refunds?${params.toString()}`
        );
        return response.data;
      } catch (error: unknown) {
        if (isAuthError(error)) {
          return { refunds: [], total: 0 };
        }
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
  });

  const requestRefundMutation = useMutation({
    mutationFn: async (data: RefundRequest) => {
      const response = await api.post<Refund>('/payments/refund/request', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refunds', user?.id] });
    },
  });

  const getRefundStatusMutation = useMutation({
    mutationFn: async (refundId: string) => {
      const response = await api.get<RefundStatus>(`/payments/refund/status/${refundId}`);
      return response.data;
    },
  });

  return {
    refunds: refundsQuery.data?.refunds || [],
    total: refundsQuery.data?.total || 0,
    isLoading: refundsQuery.isLoading,
    error: refundsQuery.error,
    refetch: refundsQuery.refetch,
    requestRefund: requestRefundMutation.mutateAsync,
    getRefundStatus: getRefundStatusMutation.mutateAsync,
    isRequesting: requestRefundMutation.isPending,
    isCheckingStatus: getRefundStatusMutation.isPending,
  };
}

export function useRefund(refundId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['refund', refundId],
    queryFn: async () => {
      if (!refundId || !user?.id) return null;
      try {
        const response = await api.get<RefundStatus>(`/payments/refund/status/${refundId}`);
        return response.data;
      } catch (error: unknown) {
        if (isAxiosErrorResponse(error) && error.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!refundId && !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: false,
  });
}

