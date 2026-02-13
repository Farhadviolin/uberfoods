import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { isAuthError, isAxiosErrorResponse } from '../utils/errorHandler';

interface Invoice {
  invoiceId: string;
  orderId: string;
  restaurant?: {
    id: string;
    name: string;
  };
  amount: number;
  taxAmount?: number;
  status: string;
  issuedAt: string;
  dueDate?: string;
  pdfUrl?: string;
  downloadUrl?: string;
}

interface InvoiceListResponse {
  invoices: Invoice[];
  total: number;
  totalAmount: number;
}

export function useInvoices(filters?: { period?: string; status?: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invoicesQuery = useQuery({
    queryKey: ['invoices', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) {
        return { invoices: [], total: 0, totalAmount: 0 };
      }
      try {
        const params = new URLSearchParams();
        if (filters?.period) params.append('period', filters.period);
        if (filters?.status) params.append('status', filters.status);
        
        const response = await api.get<InvoiceListResponse>(
          `/financial/customers/${user.id}/invoices?${params.toString()}`
        );
        return response.data;
      } catch (error: unknown) {
        if (isAuthError(error)) {
          return { invoices: [], total: 0, totalAmount: 0 };
        }
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: async ({ period, type }: { period?: string; type?: 'order' | 'monthly' | 'custom' }) => {
      if (!user?.id) throw new Error('User not authenticated');
      const response = await api.post<Invoice>(
        `/financial/customers/${user.id}/invoices/generate`,
        { period, type }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', user?.id] });
    },
  });

  const downloadInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await api.get<{ downloadUrl: string; filename: string }>(
        `/financial/invoices/${invoiceId}/download`
      );
      return response.data;
    },
  });

  return {
    invoices: invoicesQuery.data?.invoices || [],
    total: invoicesQuery.data?.total || 0,
    totalAmount: invoicesQuery.data?.totalAmount || 0,
    isLoading: invoicesQuery.isLoading,
    error: invoicesQuery.error,
    refetch: invoicesQuery.refetch,
    generateInvoice: generateInvoiceMutation.mutateAsync,
    downloadInvoice: downloadInvoiceMutation.mutateAsync,
    isGenerating: generateInvoiceMutation.isPending,
    isDownloading: downloadInvoiceMutation.isPending,
  };
}

export function useInvoice(invoiceId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      if (!invoiceId || !user?.id) return null;
      try {
        const response = await api.get<Invoice>(`/financial/invoices/${invoiceId}`);
        return response.data;
      } catch (error: unknown) {
        if (isAxiosErrorResponse(error) && error.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!invoiceId && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

