import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { extractData } from '../utils/apiResponse';

interface InventoryOverview {
  totalValue: number;
  stockLevels: {
    low: number;
    normal: number;
    high: number;
  };
  pendingOrders: number;
  monthlyWaste: number;
}

interface StockItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  unitPrice: number;
  unit: string;
}

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierName: string;
  itemCount: number;
  totalAmount: number;
  status: string;
  expectedDelivery: string;
}

interface WasteData {
  totalCost: number;
  totalItems: number;
  dailyAverage: number;
  period: string;
  monthlyBreakdown: Array<{
    month: string;
    cost: number;
  }>;
}

interface Alert {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  itemName?: string;
  createdAt: string;
}

export function useInventoryData() {
  // Overview
  const overviewQuery = useQuery({
    queryKey: ['inventory', 'overview'],
    queryFn: () =>
      api
        .get<InventoryOverview>('/inventory/overview')
        .then((res) => extractData(res.data) || res.data)
        .catch(() => ({
          totalValue: 0,
          stockLevels: { low: 0, normal: 0, high: 0 },
          pendingOrders: 0,
          monthlyWaste: 0,
        })),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
  });

  // Stock Items
  const stockQuery = useQuery({
    queryKey: ['inventory', 'stock'],
    queryFn: () =>
      api
        .get<StockItem[] | { data: StockItem[]; pagination: any }>('/inventory/stock')
        .then((res) => {
          const data = extractData(res.data);
          return Array.isArray(data) ? data : [];
        })
        .catch(() => []),
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: false,
  });

  // Suppliers
  const suppliersQuery = useQuery({
    queryKey: ['inventory', 'suppliers'],
    queryFn: () =>
      api
        .get<Supplier[] | { data: Supplier[]; pagination: any }>('/inventory/suppliers')
        .then((res) => {
          const data = extractData(res.data);
          return Array.isArray(data) ? data : [];
        })
        .catch(() => []),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Purchase Orders
  const purchasesQuery = useQuery({
    queryKey: ['inventory', 'purchases'],
    queryFn: () =>
      api
        .get<PurchaseOrder[] | { data: PurchaseOrder[]; pagination: any }>('/inventory/purchase-orders')
        .then((res) => {
          const data = extractData(res.data);
          return Array.isArray(data) ? data : [];
        })
        .catch(() => []),
    staleTime: 1 * 60 * 1000,
    retry: false,
  });

  // Waste Data
  const wasteQuery = useQuery({
    queryKey: ['inventory', 'waste'],
    queryFn: () =>
      api
        .get<WasteData>('/inventory/waste')
        .then((res) => extractData(res.data) || res.data)
        .catch(() => ({
          totalCost: 0,
          totalItems: 0,
          dailyAverage: 0,
          period: '',
          monthlyBreakdown: [],
        })),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Alerts
  const alertsQuery = useQuery({
    queryKey: ['inventory', 'alerts'],
    queryFn: () =>
      api
        .get<Alert[]>('/inventory/alerts')
        .then((res) => {
          const data = extractData(res.data);
          return Array.isArray(data) ? data : [];
        })
        .catch(() => []),
    staleTime: 30 * 1000, // 30 seconds
    retry: false,
  });

  const isLoading =
    overviewQuery.isLoading ||
    stockQuery.isLoading ||
    suppliersQuery.isLoading ||
    purchasesQuery.isLoading ||
    wasteQuery.isLoading ||
    alertsQuery.isLoading;

  const error =
    overviewQuery.error ||
    stockQuery.error ||
    suppliersQuery.error ||
    purchasesQuery.error ||
    wasteQuery.error ||
    alertsQuery.error;

  return {
    inventoryOverview: overviewQuery.data,
    stockItems: stockQuery.data || [],
    suppliers: suppliersQuery.data || [],
    purchaseOrders: purchasesQuery.data || [],
    wasteData: wasteQuery.data,
    alerts: alertsQuery.data || [],
    isLoading,
    error,
    refetch: () => {
      overviewQuery.refetch();
      stockQuery.refetch();
      suppliersQuery.refetch();
      purchasesQuery.refetch();
      wasteQuery.refetch();
      alertsQuery.refetch();
    },
  };
}

