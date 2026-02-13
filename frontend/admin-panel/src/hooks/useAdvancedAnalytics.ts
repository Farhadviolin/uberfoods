import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import api from '../utils/api';
import { extractData } from '../utils/apiResponse';

interface PredictiveData {
  expectedOrders: number;
  expectedRevenue: number;
  growthRate: number;
  trend: 'up' | 'down' | 'stable';
}

interface CohortData {
  period: string;
  retentionRate: number;
  revenue: number;
  customerCount: number;
}

interface RevenueForecast {
  date: string;
  revenue: number;
  type: 'actual' | 'forecast';
  confidence?: number;
}

interface CustomerSegment {
  segment: string;
  count: number;
  averageClv: number;
  averageOrderValue: number;
  orderFrequency: number;
}

interface ChurnPrediction {
  lowRisk: number;
  mediumRisk: number;
  highRisk: number;
  totalCustomers: number;
}

interface CLVData {
  segment: string;
  clv: number;
  customerCount: number;
}

export function useAdvancedAnalytics(
  period: string = '30d',
  forecastDays: number = 30,
  cohortType: string = 'month'
) {
  const [softError, setSoftError] = useState<Error | null>(null);
  const recordError = useCallback((err: any) => {
    const normalized =
      err instanceof Error
        ? err
        : new Error(err?.message || 'Analytics Anfrage fehlgeschlagen');
    setSoftError(normalized);
  }, []);

  // Predictive Analytics
  const predictiveQuery = useQuery({
    queryKey: ['analytics', 'predictive', period],
    queryFn: () =>
      api
        .get<PredictiveData>(`/analytics/predictive?period=${period}`)
        .then((res) => extractData<PredictiveData>(res.data))
        .catch((error) => {
          recordError(error);
          return {
          expectedOrders: 0,
          expectedRevenue: 0,
          growthRate: 0,
          trend: 'stable' as const,
          };
        }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Cohort Analysis
  const cohortQuery = useQuery<CohortData[]>({
    queryKey: ['analytics', 'cohort', period, cohortType],
    queryFn: () =>
      api
        .get<CohortData[]>(
          `/analytics/cohort?period=${period}&type=${cohortType}`
        )
        .then((res) => {
          const data = extractData<CohortData[] | { data: CohortData[] }>(res.data);
          if (Array.isArray(data)) return data;
          if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data: CohortData[] }).data)) {
            return (data as { data: CohortData[] }).data;
          }
          return [];
        })
        .catch((error) => {
          recordError(error);
          return [];
        }),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
  });

  // Revenue Forecast
  const forecastQuery = useQuery<RevenueForecast[]>({
    queryKey: ['analytics', 'forecast', period, forecastDays],
    queryFn: () =>
      api
        .get<RevenueForecast[] | { data: RevenueForecast[] }>(
          `/analytics/revenue-forecast?period=${period}&days=${forecastDays}`
        )
        .then((res) => {
          const data = extractData<RevenueForecast[] | { data: RevenueForecast[] }>(res.data);
          if (Array.isArray(data)) return data;
          if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data: RevenueForecast[] }).data)) {
            return (data as { data: RevenueForecast[] }).data;
          }
          return [];
        })
        .catch((error) => {
          recordError(error);
          return [];
        }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Customer Segmentation
  const segmentationQuery = useQuery<CustomerSegment[]>({
    queryKey: ['analytics', 'segmentation', period],
    queryFn: () =>
      api
        .get<CustomerSegment[] | { data: CustomerSegment[] }>(
          `/analytics/customer-segmentation?period=${period}`
        )
        .then((res) => {
          const data = extractData<CustomerSegment[] | { data: CustomerSegment[] }>(res.data);
          if (Array.isArray(data)) return data;
          if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data: CustomerSegment[] }).data)) {
            return (data as { data: CustomerSegment[] }).data;
          }
          return [];
        })
        .catch((error) => {
          recordError(error);
          return [];
        }),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  // Churn Prediction
  const churnQuery = useQuery({
    queryKey: ['analytics', 'churn', period],
    queryFn: () =>
      api
        .get<ChurnPrediction>(`/analytics/churn-prediction?period=${period}`)
        .then((res) => extractData<ChurnPrediction>(res.data))
        .catch((error) => {
          recordError(error);
          return {
          lowRisk: 0,
          mediumRisk: 0,
          highRisk: 0,
          totalCustomers: 0,
          };
        }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Customer Lifetime Value
  const clvQuery = useQuery<CLVData[]>({
    queryKey: ['analytics', 'clv', period],
    queryFn: () =>
      api
        .get<CLVData[] | { data: CLVData[] }>(`/analytics/customer-lifetime-value?period=${period}`)
        .then((res) => {
          const data = extractData<CLVData[] | { data: CLVData[] }>(res.data);
          if (Array.isArray(data)) return data;
          if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data: CLVData[] }).data)) {
            return (data as { data: CLVData[] }).data;
          }
          return [];
        })
        .catch((error) => {
          recordError(error);
          return [];
        }),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const isLoading =
    predictiveQuery.isLoading ||
    cohortQuery.isLoading ||
    forecastQuery.isLoading ||
    segmentationQuery.isLoading ||
    churnQuery.isLoading ||
    clvQuery.isLoading;

  const error =
    softError ||
    predictiveQuery.error ||
    cohortQuery.error ||
    forecastQuery.error ||
    segmentationQuery.error ||
    churnQuery.error ||
    clvQuery.error;

  // Sicherstellen dass alle Array-Felder korrekt behandelt werden
  const safeRevenueForecast = Array.isArray(forecastQuery.data) ? forecastQuery.data : [];
  const safeCohortData = Array.isArray(cohortQuery.data) ? cohortQuery.data : [];
  const safeCustomerSegmentation = Array.isArray(segmentationQuery.data) ? segmentationQuery.data : [];
  const safeClvData = Array.isArray(clvQuery.data) ? clvQuery.data : [];

  return {
    predictiveData: predictiveQuery.data,
    cohortData: safeCohortData,
    revenueForecast: safeRevenueForecast,
    customerSegmentation: safeCustomerSegmentation,
    churnPrediction: churnQuery.data,
    clvData: safeClvData,
    isLoading,
    error,
    refetch: () => {
      predictiveQuery.refetch();
      cohortQuery.refetch();
      forecastQuery.refetch();
      segmentationQuery.refetch();
      churnQuery.refetch();
      clvQuery.refetch();
    },
  };
}

