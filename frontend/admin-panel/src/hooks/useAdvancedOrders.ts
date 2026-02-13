import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

interface OrderStats {
  activeOrders: number;
  avgDeliveryTime: number;
  routeEfficiency: number;
  activeBatches: number;
}

interface RoutingData {
  suggestedRoutes: Array<{
    orderId: string;
    orderNumber: string;
    restaurant: string;
    destination: string;
    estimatedTime: number;
    routeDistance: number;
    routeType: string;
  }>;
  routeEfficiency: {
    optimized: number;
    nonOptimized: number;
  };
}

interface BatchSuggestion {
  id: string;
  orderIds: string[];
  estimatedTime: number;
  totalDistance: number;
  efficiency: number;
}

interface PriorityOrder {
  id: string;
  orderNumber: string;
  customer: string;
  restaurant: string;
  amount: number;
  priority: number;
  status: string;
}

interface OptimizationResult {
  timeSaved: number;
  distanceReduction: number;
  costSavings: number;
  suggestions: Array<{
    id: string;
    type: string;
    description: string;
    impact: string;
  }>;
}

export function useAdvancedOrders() {
  // Order Stats
  const statsQuery = useQuery({
    queryKey: ['orders', 'advanced', 'stats'],
    queryFn: () =>
      api
        .get<OrderStats>('/orders/advanced/stats')
        .then((res) => res.data)
        .catch(() => ({
          activeOrders: 0,
          avgDeliveryTime: 0,
          routeEfficiency: 0,
          activeBatches: 0,
        })),
    staleTime: 30 * 1000, // 30 seconds
    retry: false,
  });

  // Routing Data
  const routingQuery = useQuery({
    queryKey: ['orders', 'advanced', 'routing'],
    queryFn: () =>
      api
        .get<RoutingData>('/orders/advanced/routing')
        .then((res) => res.data)
        .catch(() => ({
          suggestedRoutes: [],
          routeEfficiency: { optimized: 0, nonOptimized: 0 },
        })),
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: false,
  });

  // Batch Suggestions
  const batchesQuery = useQuery({
    queryKey: ['orders', 'advanced', 'batches'],
    queryFn: () =>
      api
        .get<BatchSuggestion[]>('/orders/advanced/batch-suggestions')
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
  });

  // Priority Queue
  const priorityQuery = useQuery({
    queryKey: ['orders', 'advanced', 'priority'],
    queryFn: () =>
      api
        .get<PriorityOrder[]>('/orders/advanced/priority-queue')
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 30 * 1000,
    retry: false,
  });

  // Optimization Results
  const optimizationQuery = useQuery({
    queryKey: ['orders', 'advanced', 'optimization'],
    queryFn: () =>
      api
        .get<OptimizationResult>('/orders/advanced/optimization')
        .then((res) => res.data)
        .catch(() => ({
          timeSaved: 0,
          distanceReduction: 0,
          costSavings: 0,
          suggestions: [],
        })),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  const isLoading =
    statsQuery.isLoading ||
    routingQuery.isLoading ||
    batchesQuery.isLoading ||
    priorityQuery.isLoading ||
    optimizationQuery.isLoading;

  const error =
    statsQuery.error ||
    routingQuery.error ||
    batchesQuery.error ||
    priorityQuery.error ||
    optimizationQuery.error;

  return {
    orderStats: statsQuery.data,
    routingData: routingQuery.data,
    batchSuggestions: batchesQuery.data || [],
    priorityQueue: priorityQuery.data || [],
    optimizationResults: optimizationQuery.data,
    isLoading,
    error,
    refetch: () => {
      statsQuery.refetch();
      routingQuery.refetch();
      batchesQuery.refetch();
      priorityQuery.refetch();
      optimizationQuery.refetch();
    },
  };
}

