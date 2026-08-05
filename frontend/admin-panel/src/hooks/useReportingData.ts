import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import api from '../utils/api';

function extractList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && 'data' in value) {
    const data = (value as { data?: unknown }).data;
    return Array.isArray(data) ? (data as T[]) : [];
  }
  return [];
}

export interface Report {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  lastRun: string | null;
  status: string;
}

export interface Dashboard {
  id: string;
  name: string;
  widgetCount: number;
  createdAt: string;
  lastViewed: string | null;
}

export interface ScheduledReport {
  id: string;
  reportName: string;
  schedule: string;
  format: string;
  recipients: string[];
  nextRun: string;
  status: string;
}

export function useReportingData() {
  const [softError, setSoftError] = useState<Error | null>(null);
  const recordError = useCallback((err: any) => {
    const normalized =
      err instanceof Error
        ? err
        : new Error(err?.message || 'Reporting Anfrage fehlgeschlagen');
    setSoftError(normalized);
  }, []);

  // Reports
  const reportsQuery = useQuery({
    queryKey: ['reporting', 'reports'],
    queryFn: () =>
      api
        .get<Report[]>('/reporting/reports')
        .then((res) => extractList<Report>(res.data))
        .catch((error) => {
          recordError(error);
          return [];
        }),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
  });

  // Dashboards
  const dashboardsQuery = useQuery({
    queryKey: ['reporting', 'dashboards'],
    queryFn: () =>
      api
        .get<Dashboard[]>('/reporting/dashboards')
        .then((res) => extractList<Dashboard>(res.data))
        .catch((error) => {
          recordError(error);
          return [];
        }),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  // Scheduled Reports
  const scheduledQuery = useQuery({
    queryKey: ['reporting', 'scheduled'],
    queryFn: () =>
      api
        .get<ScheduledReport[]>('/reporting/scheduled')
        .then((res) => extractList<ScheduledReport>(res.data))
        .catch((error) => {
          recordError(error);
          return [];
        }),
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: false,
  });

  const isLoading =
    reportsQuery.isLoading ||
    dashboardsQuery.isLoading ||
    scheduledQuery.isLoading;

  const error =
    softError ||
    reportsQuery.error ||
    dashboardsQuery.error ||
    scheduledQuery.error;

  return {
    reports: reportsQuery.data || [],
    dashboards: dashboardsQuery.data || [],
    scheduledReports: scheduledQuery.data || [],
    isLoading,
    error,
    refetch: () => {
      reportsQuery.refetch();
      dashboardsQuery.refetch();
      scheduledQuery.refetch();
    },
  };
}

