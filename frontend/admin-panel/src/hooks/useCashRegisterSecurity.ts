import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

interface TSStatus {
  connected: boolean;
  serialNumber: string;
  certificateExpiry: string;
  signatureAlgorithm: string;
  status: string;
  lastSync: string;
  restaurantId: string | null;
  transactions: {
    total: number;
    today: number;
    thisMonth: number;
  };
}

interface CashRegisterCompliance {
  tseCompliant: boolean;
  tseStatus: TSStatus;
  dailyClosings: number;
  lastDailyClosing: string | null;
  complianceScore: number;
  requirements: {
    tseRequired: boolean;
    dailyClosingRequired: boolean;
    receiptValidationRequired: boolean;
    auditTrailRequired: boolean;
  };
  status: 'compliant' | 'non-compliant';
}

interface ReceiptValidation {
  receiptId: string;
  isValid: boolean;
  signature: string;
  validatedAt: string;
  details: {
    amount: number;
    tax: number;
    date: string;
    status: string;
  };
}

export function useCashRegisterSecurity(restaurantId?: string) {
  const queryClient = useQueryClient();

  // Compliance Status Query
  const complianceQuery = useQuery({
    queryKey: ['cash-register', 'compliance', restaurantId],
    queryFn: () =>
      api
        .get<CashRegisterCompliance>(`/cash-register/compliance${restaurantId ? `?restaurantId=${restaurantId}` : ''}`)
        .then((res) => res.data)
        .catch(() => ({
          tseCompliant: false,
          tseStatus: {
            connected: false,
            serialNumber: '',
            certificateExpiry: '',
            signatureAlgorithm: '',
            status: 'inactive',
            lastSync: '',
            restaurantId: null,
            transactions: { total: 0, today: 0, thisMonth: 0 },
          },
          dailyClosings: 0,
          lastDailyClosing: null,
          complianceScore: 0,
          requirements: {
            tseRequired: true,
            dailyClosingRequired: true,
            receiptValidationRequired: true,
            auditTrailRequired: true,
          },
          status: 'non-compliant' as const,
        })),
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: false,
  });

  // TSE Status Query
  const tseStatusQuery = useQuery({
    queryKey: ['cash-register', 'tse', 'status', restaurantId],
    queryFn: () =>
      api
        .get<TSStatus>(`/cash-register/tse/status${restaurantId ? `?restaurantId=${restaurantId}` : ''}`)
        .then((res) => res.data)
        .catch(() => ({
          connected: false,
          serialNumber: '',
          certificateExpiry: '',
          signatureAlgorithm: '',
          status: 'inactive',
          lastSync: '',
          restaurantId: null,
          transactions: { total: 0, today: 0, thisMonth: 0 },
        })),
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: false,
  });

  // Initialize TSE Mutation
  const initializeTSEMutation = useMutation({
    mutationFn: async ({ restaurantId, config }: { restaurantId: string; config: { serialNumber: string; certificate: string } }) => {
      const response = await api.post(`/cash-register/tse/initialize?restaurantId=${restaurantId}`, config);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-register'] });
    },
  });

  // Update TSE Certificate Mutation
  const updateTSECertificateMutation = useMutation({
    mutationFn: async ({ restaurantId, certificate }: { restaurantId: string; certificate: string }) => {
      const response = await api.put(`/cash-register/tse/certificate?restaurantId=${restaurantId}`, { certificate });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-register', 'tse'] });
    },
  });

  // Validate Receipt Mutation
  const validateReceiptMutation = useMutation({
    mutationFn: async ({ receiptId, restaurantId }: { receiptId: string; restaurantId?: string }) => {
      const queryParams = restaurantId ? `?restaurantId=${restaurantId}` : '';
      const response = await api.get<ReceiptValidation>(`/cash-register/receipts/${receiptId}/validate${queryParams}`);
      return response.data;
    },
  });

  return {
    compliance: complianceQuery.data,
    tseStatus: tseStatusQuery.data,
    isLoading: complianceQuery.isLoading || tseStatusQuery.isLoading,
    error: complianceQuery.error || tseStatusQuery.error,
    refetch: () => {
      complianceQuery.refetch();
      tseStatusQuery.refetch();
    },
    initializeTSE: initializeTSEMutation.mutateAsync,
    updateTSECertificate: updateTSECertificateMutation.mutateAsync,
    validateReceipt: validateReceiptMutation.mutateAsync,
    isInitializingTSE: initializeTSEMutation.isPending,
    isUpdatingCertificate: updateTSECertificateMutation.isPending,
    isValidatingReceipt: validateReceiptMutation.isPending,
  };
}

