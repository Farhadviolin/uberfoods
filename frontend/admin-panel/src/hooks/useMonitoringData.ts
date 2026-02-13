import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import api from '../utils/api';

interface SystemHealth {
  overallStatus: string;
  uptime: string;
  services: Array<{
    name: string;
    status: string;
    uptime: string;
    version: string;
    lastCheck: string;
  }>;
}

interface PerformanceMetrics {
  currentCpu: number;
  currentMemory: number;
  currentDisk: number;
  avgResponseTime: number;
  cpuUsage: Array<{
    timestamp: string;
    value: number;
  }>;
  memoryUsage: Array<{
    timestamp: string;
    value: number;
  }>;
}

interface ErrorTracking {
  totalErrors: number;
  errorRate: number;
  criticalErrors: number;
  errorTypes: Record<string, number>;
  recentErrors: Array<{
    id: string;
    timestamp: string;
    type: string;
    message: string;
    severity: string;
  }>;
}

interface APIMetrics {
  requestsPerMinute: number;
  avgLatency: number;
  errorRate: number;
  successRate: number;
  topEndpoints: Array<{
    path: string;
    requests: number;
    avgLatency: number;
    errorRate: number;
    status: string;
  }>;
}

interface DatabaseMetrics {
  activeConnections: number;
  maxConnections: number;
  avgQueryTime: number;
  slowQueries: number;
  databaseSize: number;
  slowQueriesList: Array<{
    id: string;
    query: string;
    duration: number;
    calls: number;
    timestamp: string;
  }>;
}

export function useMonitoringData(refetchInterval?: number | null) {
  const [softError, setSoftError] = useState<Error | null>(null);
  const recordError = useCallback((err: any) => {
    const normalized =
      err instanceof Error
        ? err
        : new Error(err?.message || 'Monitoring Anfrage fehlgeschlagen');
    setSoftError(normalized);
  }, []);

  // System Health
  const healthQuery = useQuery({
    queryKey: ['monitoring', 'health'],
    queryFn: () =>
      api
        .get<SystemHealth>('/monitoring/health')
        .then((res) => res.data)
        .catch((error) => {
          recordError(error);
          return {
            overallStatus: 'unknown',
            uptime: '0d 0h 0m',
            services: [],
          };
        }),
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: refetchInterval || false,
    retry: false,
  });

  // Performance Metrics
  const performanceQuery = useQuery({
    queryKey: ['monitoring', 'performance'],
    queryFn: () =>
      api
        .get<PerformanceMetrics>('/monitoring/performance')
        .then((res) => res.data)
        .catch((error) => {
          recordError(error);
          return {
            currentCpu: 0,
            currentMemory: 0,
            currentDisk: 0,
            avgResponseTime: 0,
            cpuUsage: [],
            memoryUsage: [],
          };
        }),
    staleTime: 10 * 1000,
    refetchInterval: refetchInterval || false,
    retry: false,
  });

  // Error Tracking
  const errorsQuery = useQuery({
    queryKey: ['monitoring', 'errors'],
    queryFn: () =>
      api
        .get<ErrorTracking>('/monitoring/errors')
        .then((res) => res.data)
        .catch((error) => {
          recordError(error);
          return {
            totalErrors: 0,
            errorRate: 0,
            criticalErrors: 0,
            errorTypes: {},
            recentErrors: [],
          };
        }),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: refetchInterval || false,
    retry: false,
  });

  // API Metrics
  const apiQuery = useQuery({
    queryKey: ['monitoring', 'api'],
    queryFn: () =>
      api
        .get<APIMetrics>('/monitoring/api')
        .then((res) => res.data)
        .catch((error) => {
          recordError(error);
          return {
            requestsPerMinute: 0,
            avgLatency: 0,
            errorRate: 0,
            successRate: 0,
            topEndpoints: [],
          };
        }),
    staleTime: 10 * 1000,
    refetchInterval: refetchInterval || false,
    retry: false,
  });

  // Database Metrics
  const databaseQuery = useQuery({
    queryKey: ['monitoring', 'database'],
    queryFn: () =>
      api
        .get<DatabaseMetrics>('/monitoring/database')
        .then((res) => res.data)
        .catch((error) => {
          recordError(error);
          return {
            activeConnections: 0,
            maxConnections: 0,
            avgQueryTime: 0,
            slowQueries: 0,
            databaseSize: 0,
            slowQueriesList: [],
          };
        }),
    staleTime: 30 * 1000,
    refetchInterval: refetchInterval || false,
    retry: false,
  });

  const isLoading =
    healthQuery.isLoading ||
    performanceQuery.isLoading ||
    errorsQuery.isLoading ||
    apiQuery.isLoading ||
    databaseQuery.isLoading;

  const error =
    softError ||
    healthQuery.error ||
    performanceQuery.error ||
    errorsQuery.error ||
    apiQuery.error ||
    databaseQuery.error;

  return {
    systemHealth: healthQuery.data,
    performanceMetrics: performanceQuery.data,
    errorTracking: errorsQuery.data,
    apiMetrics: apiQuery.data,
    databaseMetrics: databaseQuery.data,
    isLoading,
    error,
    refetch: () => {
      healthQuery.refetch();
      performanceQuery.refetch();
      errorsQuery.refetch();
      apiQuery.refetch();
      databaseQuery.refetch();
    },
  };
}

