import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

interface TaxOverview {
  ust10Amount: number;
  ust10Revenue: number;
  ust20Amount: number;
  ust20Revenue: number;
  inputTax: number;
  ustPayable: number;
  totalRevenueNet: number;
  totalRevenueGross: number;
  totalUst: number;
}

interface UstVA {
  id: string;
  period: string;
  status: string;
  ustPayable: number;
  dueDate: string;
  submittedAt: string | null;
}

interface UstRates {
  breakdown: {
    rate10: number;
    rate10Revenue: number;
    rate10Ust: number;
    rate20: number;
    rate20Revenue: number;
    rate20Ust: number;
    rate0: number;
    rate0Revenue: number;
  };
}

interface VATReturn {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  outputTax: number;
  inputTax: number;
  vatPayable: number;
  breakdown: any;
  inputTaxDetails: any;
  status: 'draft' | 'submitted';
  submittedAt: string | null;
  createdAt: string;
  pdfUrl?: string;
}

interface VATRates {
  standard: number;
  reduced: number;
  superReduced: number;
  zero: number;
  rates: Array<{
    rate: number;
    description: string;
  }>;
}

interface InputTax {
  deductible: number;
  nonDeductible: number;
  total: number;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    supplier: string;
    date: string;
    amountNet: number;
    ustRate: number;
    inputTax: number;
    status: string;
  }>;
}

interface TaxReport {
  id: string;
  name: string;
  type: string;
  period: string;
  createdAt: string;
}

export function useAustrianTaxData(period: string = 'current-month') {
  // Tax Overview
  const overviewQuery = useQuery({
    queryKey: ['tax', 'austrian', 'overview', period],
    queryFn: () =>
      api
        .get<TaxOverview>(`/accounting/austrian-tax/vat-overview?period=${period}`)
        .then((res) => res.data)
        .catch(() => ({
          ust10Amount: 0,
          ust10Revenue: 0,
          ust20Amount: 0,
          ust20Revenue: 0,
          inputTax: 0,
          ustPayable: 0,
          totalRevenueNet: 0,
          totalRevenueGross: 0,
          totalUst: 0,
        })),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
  });

  // USt-Voranmeldung
  const ustVAQuery = useQuery({
    queryKey: ['tax', 'austrian', 'ust-va', period],
    queryFn: () =>
      api
        .get<UstVA[]>(`/accounting/austrian-tax/vat-breakdown?period=${period}`)
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  // USt Rates
  const ustRatesQuery = useQuery({
    queryKey: ['tax', 'austrian', 'ust-rates', period],
    queryFn: () =>
      api
        .get<UstRates>(`/accounting/austrian-tax/vat-breakdown?period=${period}`)
        .then((res) => res.data)
        .catch(() => ({
          breakdown: {
            rate10: 0,
            rate10Revenue: 0,
            rate10Ust: 0,
            rate20: 0,
            rate20Revenue: 0,
            rate20Ust: 0,
            rate0: 0,
            rate0Revenue: 0,
          },
        })),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Input Tax
  const inputTaxQuery = useQuery({
    queryKey: ['tax', 'austrian', 'input-tax', period],
    queryFn: () =>
      api
        .get<InputTax>(`/accounting/austrian-tax/input-tax?period=${period}`)
        .then((res) => res.data)
        .catch(() => ({
          deductible: 0,
          nonDeductible: 0,
          total: 0,
          invoices: [],
        })),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Tax Reports
  const reportsQuery = useQuery({
    queryKey: ['tax', 'austrian', 'reports'],
    queryFn: () =>
      api
        .get<TaxReport[]>(`/tax/austrian/reports`)
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
  });

  const isLoading =
    overviewQuery.isLoading ||
    ustVAQuery.isLoading ||
    ustRatesQuery.isLoading ||
    inputTaxQuery.isLoading ||
    reportsQuery.isLoading;

  const error =
    overviewQuery.error ||
    ustVAQuery.error ||
    ustRatesQuery.error ||
    inputTaxQuery.error ||
    reportsQuery.error;

  // VAT Rates Query
  const vatRatesQuery = useQuery({
    queryKey: ['tax', 'austrian', 'vat-rates'],
    queryFn: () =>
      api
        .get<VATRates>(`/accounting/austrian-tax/vat-rates`)
        .then((res) => res.data)
        .catch(() => ({
          standard: 20,
          reduced: 10,
          superReduced: 13,
          zero: 0,
          rates: [],
        })),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
  });

  const queryClient = useQueryClient();

  // Generate VAT Return Mutation
  const generateVATReturnMutation = useMutation({
    mutationFn: async ({ period, submit }: { period: string; submit?: boolean }) => {
      const response = await api.post<VATReturn>(`/accounting/austrian-tax/vat-return?period=${period}${submit ? '&submit=true' : ''}`, {
        submit: submit || false,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax', 'austrian'] });
    },
  });

  // Submit VAT Return Mutation
  const submitVATReturnMutation = useMutation({
    mutationFn: async ({ period }: { period: string }) => {
      const response = await api.post<VATReturn>(`/accounting/austrian-tax/vat-return?period=${period}&submit=true`, {
        submit: true,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax', 'austrian'] });
    },
  });

  // Update VAT Rates Mutation
  const updateVATRatesMutation = useMutation({
    mutationFn: async (rates: { standard?: number; reduced?: number; superReduced?: number }) => {
      const response = await api.post<VATRates>(`/accounting/austrian-tax/vat-rates`, rates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax', 'austrian', 'vat-rates'] });
    },
  });

  return {
    taxOverview: overviewQuery.data,
    ustVA: ustVAQuery.data || [],
    ustRates: ustRatesQuery.data,
    inputTax: inputTaxQuery.data,
    taxReports: reportsQuery.data || [],
    vatRates: vatRatesQuery.data,
    isLoading: isLoading || vatRatesQuery.isLoading,
    error: error || vatRatesQuery.error,
    refetch: () => {
      overviewQuery.refetch();
      ustVAQuery.refetch();
      ustRatesQuery.refetch();
      inputTaxQuery.refetch();
      reportsQuery.refetch();
      vatRatesQuery.refetch();
    },
    generateVATReturn: generateVATReturnMutation.mutateAsync,
    submitVATReturn: submitVATReturnMutation.mutateAsync,
    updateVATRates: updateVATRatesMutation.mutateAsync,
    isGeneratingVATReturn: generateVATReturnMutation.isPending,
    isSubmittingVATReturn: submitVATReturnMutation.isPending,
    isUpdatingVATRates: updateVATRatesMutation.isPending,
  };
}

