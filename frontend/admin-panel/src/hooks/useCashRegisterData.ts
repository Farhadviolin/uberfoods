import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

interface CashOverview {
  dailyRevenue: number;
  receiptsCount: number;
  tseSignatures: number;
  complianceStatus: string;
}

interface Receipt {
  id: string;
  receiptNumber: string;
  restaurantName: string;
  amount: number;
  timestamp: string;
  tseSignature: string;
  status: string;
}

interface DailyClosings {
  totalClosings: number;
  avgDailyRevenue: number;
  lastClosing: string | null;
  revenueTrend: Array<{
    date: string;
    revenue: number;
  }>;
  recentClosings: Array<{
    id: string;
    date: string;
    revenueGross: number;
    revenueNet: number;
    ust10: number;
    ust20: number;
    receiptCount: number;
  }>;
}

interface TSEStatus {
  isConnected: boolean;
  serialNumber: string | null;
  certificateValidUntil: string | null;
  signatureCounter: number;
  lastSignature: string | null;
}

interface ComplianceStatus {
  isCompliant: boolean;
  message: string;
  tseConnected: boolean;
  receiptsGenerated: boolean;
  dailyClosingsComplete: boolean;
  archivingCompliant: boolean;
  dataIntegrity: boolean;
  requirementsMet: number;
  totalRequirements: number;
}

export function useCashRegisterData(date: string) {
  // Overview
  const overviewQuery = useQuery({
    queryKey: ['cash-register', 'overview', date],
    queryFn: () =>
      api
        .get<CashOverview>(`/accounting/cash-register/daily-closing?date=${date}`)
        .then((res) => res.data)
        .catch(() => ({
          dailyRevenue: 0,
          receiptsCount: 0,
          tseSignatures: 0,
          complianceStatus: 'unknown',
        })),
    staleTime: 30 * 1000, // 30 seconds
    retry: false,
  });

  // Receipts
  const receiptsQuery = useQuery({
    queryKey: ['cash-register', 'receipts', date],
    queryFn: () =>
      api
        .get<Receipt[]>(`/accounting/cash-register/receipts?period=${date}`)
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 30 * 1000,
    retry: false,
  });

  // Daily Closings
  const closingsQuery = useQuery({
    queryKey: ['cash-register', 'daily-closings'],
    queryFn: () =>
      api
        .get<DailyClosings>('/accounting/cash-register/daily-closing')
        .then((res) => res.data)
        .catch(() => ({
          totalClosings: 0,
          avgDailyRevenue: 0,
          lastClosing: null,
          revenueTrend: [],
          recentClosings: [],
        })),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
  });

  // TSE Status
  const tseQuery = useQuery({
    queryKey: ['cash-register', 'tse-status'],
    queryFn: () =>
      api
        .get<TSEStatus>('/accounting/cash-register/tse-status')
        .then((res) => res.data)
        .catch(() => ({
          isConnected: false,
          serialNumber: null,
          certificateValidUntil: null,
          signatureCounter: 0,
          lastSignature: null,
        })),
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: false,
  });

  // Compliance Status
  const complianceQuery = useQuery({
    queryKey: ['cash-register', 'compliance'],
    queryFn: () =>
      api
        .get<ComplianceStatus>('/cash-register/compliance')
        .then((res) => res.data)
        .catch(() => ({
          isCompliant: false,
          message: 'Compliance-Status konnte nicht geladen werden',
          tseConnected: false,
          receiptsGenerated: false,
          dailyClosingsComplete: false,
          archivingCompliant: false,
          dataIntegrity: false,
          requirementsMet: 0,
          totalRequirements: 5,
        })),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  const isLoading =
    overviewQuery.isLoading ||
    receiptsQuery.isLoading ||
    closingsQuery.isLoading ||
    tseQuery.isLoading ||
    complianceQuery.isLoading;

  const error =
    overviewQuery.error ||
    receiptsQuery.error ||
    closingsQuery.error ||
    tseQuery.error ||
    complianceQuery.error;

  return {
    overview: overviewQuery.data,
    receipts: receiptsQuery.data || [],
    dailyClosings: closingsQuery.data,
    tseStatus: tseQuery.data,
    complianceStatus: complianceQuery.data,
    isLoading,
    error,
    refetch: () => {
      overviewQuery.refetch();
      receiptsQuery.refetch();
      closingsQuery.refetch();
      tseQuery.refetch();
      complianceQuery.refetch();
    },
  };
}

