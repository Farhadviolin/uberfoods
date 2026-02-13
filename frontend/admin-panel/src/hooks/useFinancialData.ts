import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { extractData } from '../utils/apiResponse';
import { withErrorHandling, withArrayErrorHandling, logError } from '../utils/errorHandler';

interface FinancialOverview {
  totalRevenue: number;
  pendingPayouts: number;
  pendingPayoutsCount: number;
  taxableAmount: number;
  taxRate: number;
  netProfit: number;
  revenueTrend: Array<{
    date: string;
    revenue: number;
  }>;
}

interface Payout {
  id: string;
  restaurantId: string;
  restaurantName: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  dueDate: string;
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  restaurantId: string;
  restaurantName: string;
  amount: number;
  date: string;
  status: string;
  pdfUrl?: string;
}

interface TaxData {
  vatAmount: number;
  vatRate: number;
  incomeTax: number;
  incomeTaxRate: number;
  totalTax: number;
  monthlyBreakdown: Array<{
    month: string;
    revenue: number;
    vat: number;
    incomeTax: number;
    total: number;
  }>;
}

interface Reconciliation {
  discrepancies: Array<{
    id: string;
    date: string;
    type: string;
    expected: number;
    actual: number;
    discrepancy: number;
    status: string;
  }>;
  totalDiscrepancyAmount: number;
  reconciliationRate: number;
}

export function useFinancialData(period: string = '30d') {
  // Financial Overview
  const overviewQuery = useQuery({
    queryKey: ['financial', 'overview', period],
    queryFn: () =>
      withErrorHandling(
        () => api.get<FinancialOverview>(`/financial/overview?period=${period}`).then((res) => extractData(res.data) || res.data),
        {
          totalRevenue: 0,
          pendingPayouts: 0,
          pendingPayoutsCount: 0,
          taxableAmount: 0,
          taxRate: 0,
          netProfit: 0,
          revenueTrend: [],
        },
        'Financial Overview',
        false // Log errors
      ),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
  });

  // Payouts
  const payoutsQuery = useQuery<Payout[]>({
    queryKey: ['financial', 'payouts', period],
    queryFn: () =>
      withArrayErrorHandling(
        () => api.get<Payout[] | { data: Payout[] }>(`/financial/payouts?period=${period}`).then((res) => {
          const data = extractData(res.data);
          return Array.isArray(data) ? data : [];
        }),
        'Financial Payouts',
        false
      ),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  // Invoices
  const invoicesQuery = useQuery({
    queryKey: ['financial', 'invoices', period],
    queryFn: () =>
      withArrayErrorHandling(
        () => api.get<Invoice[]>(`/financial/invoices?period=${period}`).then((res) => {
          const data = extractData(res.data);
          return Array.isArray(data) ? data : [];
        }),
        'Financial Invoices',
        false
      ),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Tax Data
  const taxQuery = useQuery({
    queryKey: ['financial', 'taxes', period],
    queryFn: () =>
      withErrorHandling(
        () => api.get<TaxData>(`/financial/taxes?period=${period}`).then((res) => extractData(res.data) || res.data),
        {
          vatAmount: 0,
          vatRate: 0,
          incomeTax: 0,
          incomeTaxRate: 0,
          totalTax: 0,
          monthlyBreakdown: [],
        },
        'Financial Taxes',
        false
      ),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
  });

  // Reconciliation
  const reconciliationQuery = useQuery({
    queryKey: ['financial', 'reconciliation', period],
    queryFn: () =>
      withErrorHandling(
        () => api.get<Reconciliation>(`/financial/reconciliation?period=${period}`).then((res) => extractData(res.data) || res.data),
        {
          discrepancies: [],
          totalDiscrepancyAmount: 0,
          reconciliationRate: 0,
        },
        'Financial Reconciliation',
        false
      ),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const isLoading =
    overviewQuery.isLoading ||
    payoutsQuery.isLoading ||
    invoicesQuery.isLoading ||
    taxQuery.isLoading ||
    reconciliationQuery.isLoading;

  const error =
    overviewQuery.error ||
    payoutsQuery.error ||
    invoicesQuery.error ||
    taxQuery.error ||
    reconciliationQuery.error;

  return {
    financialOverview: overviewQuery.data,
    payouts: Array.isArray(payoutsQuery.data) ? payoutsQuery.data : [],
    invoices: Array.isArray(invoicesQuery.data) ? invoicesQuery.data : [],
    taxData: taxQuery.data,
    reconciliation: reconciliationQuery.data,
    isLoading,
    error,
    refetch: () => {
      overviewQuery.refetch();
      payoutsQuery.refetch();
      invoicesQuery.refetch();
      taxQuery.refetch();
      reconciliationQuery.refetch();
    },
  };
}

