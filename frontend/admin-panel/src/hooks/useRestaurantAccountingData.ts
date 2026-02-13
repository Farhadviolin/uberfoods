import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

interface AccountingOverview {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  costOfGoods: number;
}

interface EARechnung {
  revenue: number;
  otherRevenue: number;
  totalRevenue: number;
  costOfGoods: number;
  personnel: number;
  rent: number;
  utilities: number;
  otherExpenses: number;
  totalExpenses: number;
  profit: number;
}

interface BWA {
  revenueExpenses: Array<{
    month: string;
    revenue: number;
    expenses: number;
  }>;
  positions: Array<{
    id: string;
    name: string;
    plan: number;
    actual: number;
    deviation: number;
    deviationPercent: number;
  }>;
}

interface Inventory {
  inventoryValue: number;
  costOfGoods: number;
  turnoverRate: number;
  waste: number;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalValue: number;
    category: string;
  }>;
}

interface AccountingReport {
  id: string;
  name: string;
  type: string;
  period: string;
  createdAt: string;
}

export function useRestaurantAccountingData(restaurantId: string | null, period: string) {
  // Overview
  const overviewQuery = useQuery({
    queryKey: ['accounting', 'restaurant', 'overview', restaurantId, period],
    queryFn: () =>
      api
        .get<AccountingOverview>(
          `/accounting/restaurant/overview?restaurantId=${restaurantId || 'all'}&period=${period}`
        )
        .then((res) => res.data)
        .catch(() => ({
          totalRevenue: 0,
          totalExpenses: 0,
          profit: 0,
          costOfGoods: 0,
        })),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!restaurantId || true,
    retry: false,
  });

  // E/A-Rechnung
  const eaRechnungQuery = useQuery({
    queryKey: ['accounting', 'restaurant', 'ea-rechnung', restaurantId, period],
    queryFn: () =>
      api
        .get<EARechnung>(
          `/accounting/restaurant/ea-rechnung?restaurantId=${restaurantId || 'all'}&period=${period}`
        )
        .then((res) => res.data)
        .catch(() => ({
          revenue: 0,
          otherRevenue: 0,
          totalRevenue: 0,
          costOfGoods: 0,
          personnel: 0,
          rent: 0,
          utilities: 0,
          otherExpenses: 0,
          totalExpenses: 0,
          profit: 0,
        })),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!restaurantId || true,
    retry: false,
  });

  // BWA
  const bwaQuery = useQuery({
    queryKey: ['accounting', 'restaurant', 'bwa', restaurantId, period],
    queryFn: () =>
      api
        .get<BWA>(
          `/accounting/restaurant/bwa?restaurantId=${restaurantId || 'all'}&period=${period}`
        )
        .then((res) => res.data)
        .catch(() => ({
          revenueExpenses: [],
          positions: [],
        })),
    staleTime: 5 * 60 * 1000,
    enabled: !!restaurantId || true,
    retry: false,
  });

  // Inventory
  const inventoryQuery = useQuery({
    queryKey: ['accounting', 'restaurant', 'inventory', restaurantId, period],
    queryFn: () =>
      api
        .get<Inventory>(
          `/accounting/restaurant/inventory?restaurantId=${restaurantId || 'all'}&period=${period}`
        )
        .then((res) => res.data)
        .catch(() => ({
          inventoryValue: 0,
          costOfGoods: 0,
          turnoverRate: 0,
          waste: 0,
          items: [],
        })),
    staleTime: 5 * 60 * 1000,
    enabled: !!restaurantId || true,
    retry: false,
  });

  // Reports
  const reportsQuery = useQuery({
    queryKey: ['accounting', 'restaurant', 'reports', restaurantId],
    queryFn: () =>
      api
        .get<AccountingReport[]>(
          `/accounting/restaurant/reports?restaurantId=${restaurantId || 'all'}`
        )
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!restaurantId || true,
    retry: false,
  });

  const isLoading =
    overviewQuery.isLoading ||
    eaRechnungQuery.isLoading ||
    bwaQuery.isLoading ||
    inventoryQuery.isLoading ||
    reportsQuery.isLoading;

  const error =
    overviewQuery.error ||
    eaRechnungQuery.error ||
    bwaQuery.error ||
    inventoryQuery.error ||
    reportsQuery.error;

  return {
    overview: overviewQuery.data,
    eaRechnung: eaRechnungQuery.data,
    bwa: bwaQuery.data,
    inventory: inventoryQuery.data,
    reports: reportsQuery.data || [],
    isLoading,
    error,
    refetch: () => {
      overviewQuery.refetch();
      eaRechnungQuery.refetch();
      bwaQuery.refetch();
      inventoryQuery.refetch();
      reportsQuery.refetch();
    },
  };
}

