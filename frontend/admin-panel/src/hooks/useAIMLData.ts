import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

interface AIOverview {
  activeModels: number;
  predictionsToday: number;
  avgAccuracy: number;
  fraudDetected: number;
}

interface FraudData {
  detectedCases: number;
  preventedLosses: number;
  accuracy: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  recentCases: Array<{
    id: string;
    timestamp: string;
    type: string;
    riskLevel: string;
    amount: number;
    status: string;
  }>;
}

interface ForecastingData {
  accuracy: number;
  predictedRevenue: number;
  predictedOrders: number;
  predictions: Array<{
    date: string;
    actual: number;
    predicted: number;
  }>;
}

interface PricingData {
  optimizedPrices: number;
  expectedIncrease: number;
  avgPriceChange: number;
  suggestions: Array<{
    id: string;
    itemName: string;
    currentPrice: number;
    suggestedPrice: number;
    change: number;
    expectedEffect: string;
  }>;
}

interface Recommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  impact: string;
}

interface MLModel {
  id: string;
  name: string;
  type: string;
  status: string;
  accuracy: number;
  version: string;
  lastTrained: string;
}

export function useAIMLData() {
  // Overview
  const overviewQuery = useQuery({
    queryKey: ['ai-ml', 'overview'],
    queryFn: () =>
      api
        .get<AIOverview>('/ai-ml/overview')
        .then((res) => res.data)
        .catch(() => ({
          activeModels: 0,
          predictionsToday: 0,
          avgAccuracy: 0,
          fraudDetected: 0,
        })),
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: false,
  });

  // Fraud Data
  const fraudQuery = useQuery({
    queryKey: ['ai-ml', 'fraud'],
    queryFn: () =>
      api
        .get<FraudData>('/ai-ml/fraud')
        .then((res) => res.data)
        .catch(() => ({
          detectedCases: 0,
          preventedLosses: 0,
          accuracy: 0,
          riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
          recentCases: [],
        })),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
  });

  // Forecasting Data
  const forecastingQuery = useQuery({
    queryKey: ['ai-ml', 'forecasting'],
    queryFn: () =>
      api
        .get<ForecastingData>('/ai-ml/forecasting')
        .then((res) => res.data)
        .catch(() => ({
          accuracy: 0,
          predictedRevenue: 0,
          predictedOrders: 0,
          predictions: [],
        })),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Pricing Data
  const pricingQuery = useQuery({
    queryKey: ['ai-ml', 'pricing'],
    queryFn: () =>
      api
        .get<PricingData>('/ai-ml/pricing')
        .then((res) => res.data)
        .catch(() => ({
          optimizedPrices: 0,
          expectedIncrease: 0,
          avgPriceChange: 0,
          suggestions: [],
        })),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
  });

  // Recommendations
  const recommendationsQuery = useQuery({
    queryKey: ['ai-ml', 'recommendations'],
    queryFn: () =>
      api
        .get<Recommendation[]>('/ai-ml/recommendations')
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // ML Models
  const modelsQuery = useQuery({
    queryKey: ['ai-ml', 'models'],
    queryFn: () =>
      api
        .get<MLModel[]>('/ai-ml/models')
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  const isLoading =
    overviewQuery.isLoading ||
    fraudQuery.isLoading ||
    forecastingQuery.isLoading ||
    pricingQuery.isLoading ||
    recommendationsQuery.isLoading ||
    modelsQuery.isLoading;

  const error =
    overviewQuery.error ||
    fraudQuery.error ||
    forecastingQuery.error ||
    pricingQuery.error ||
    recommendationsQuery.error ||
    modelsQuery.error;

  return {
    aiOverview: overviewQuery.data,
    fraudData: fraudQuery.data,
    forecastingData: forecastingQuery.data,
    pricingData: pricingQuery.data,
    recommendations: recommendationsQuery.data || [],
    mlModels: modelsQuery.data || [],
    isLoading,
    error,
    refetch: () => {
      overviewQuery.refetch();
      fraudQuery.refetch();
      forecastingQuery.refetch();
      pricingQuery.refetch();
      recommendationsQuery.refetch();
      modelsQuery.refetch();
    },
  };
}

