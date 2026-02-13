import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

interface GoBDOverview {
  totalDocuments: number;
  totalSize: number;
  verifiedDocuments: number;
  oldestDocument: string | null;
}

interface GoBDDocument {
  id: string;
  name: string;
  type: string;
  date: string;
  size: number;
  hash: string;
  integrityStatus: string;
}

interface AuditTrailEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  document: string;
  details: string;
}

interface GoBDExport {
  id: string;
  name: string;
  type: string;
  year: string;
  createdAt: string;
  size: number;
}

interface DocumentIntegrityResult {
  documentId: string;
  type: string;
  isValid: boolean;
  hash: string;
  verifiedAt: string;
  details: any;
}

interface ArchiveSchedule {
  scheduleId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  enabled: boolean;
  createdAt: string;
  nextRun: string;
}

export function useGoBDData(year: string) {
  // Overview
  const overviewQuery = useQuery({
    queryKey: ['gobd', 'overview', year],
    queryFn: () =>
      api
        .get<GoBDOverview>(`/accounting/gobd/archives?period=${year}`)
        .then((res) => res.data)
        .catch(() => ({
          totalDocuments: 0,
          totalSize: 0,
          verifiedDocuments: 0,
          oldestDocument: null,
        })),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Documents
  const documentsQuery = useQuery({
    queryKey: ['gobd', 'documents', year],
    queryFn: () =>
      api
        .get<GoBDDocument[]>(`/accounting/gobd/archives?period=${year}&type=documents`)
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Audit Trail
  const auditTrailQuery = useQuery({
    queryKey: ['gobd', 'audit-trail', year],
    queryFn: () =>
      api
        .get<AuditTrailEntry[]>(`/accounting/gobd/audit-trail?period=${year}`)
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
  });

  // Exports
  const exportsQuery = useQuery({
    queryKey: ['gobd', 'exports', year],
    queryFn: () =>
      api
        .get<GoBDExport[]>(`/accounting/gobd/archives?period=${year}&type=exports`)
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
  });

  const isLoading =
    overviewQuery.isLoading ||
    documentsQuery.isLoading ||
    auditTrailQuery.isLoading ||
    exportsQuery.isLoading;

  const error =
    overviewQuery.error ||
    documentsQuery.error ||
    auditTrailQuery.error ||
    exportsQuery.error;

  const queryClient = useQueryClient();

  // Verify Document Integrity Mutation
  const verifyIntegrityMutation = useMutation({
    mutationFn: async ({ documentId, period }: { documentId: string; period: string }) => {
      const response = await api.get<DocumentIntegrityResult>(
        `/accounting/gobd/documents/${documentId}/verify?period=${period}`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gobd', 'documents'] });
    },
  });

  // Search Archives Mutation
  const searchArchivesMutation = useMutation({
    mutationFn: async (params: { period: string; type?: string; verified?: boolean; search?: string }) => {
      const queryParams = new URLSearchParams({ period: params.period });
      if (params.type) queryParams.append('type', params.type);
      if (params.verified !== undefined) queryParams.append('verified', params.verified.toString());
      if (params.search) queryParams.append('search', params.search);
      
      const response = await api.get<GoBDDocument[]>(`/accounting/gobd/search?${queryParams.toString()}`);
      return response.data;
    },
  });

  // Schedule Automated Archiving Mutation
  const scheduleArchivingMutation = useMutation({
    mutationFn: async (schedule: { frequency: 'daily' | 'weekly' | 'monthly'; time?: string }) => {
      const response = await api.post<ArchiveSchedule>(`/accounting/gobd/schedule`, schedule);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gobd'] });
    },
  });

  return {
    overview: overviewQuery.data,
    documents: documentsQuery.data || [],
    auditTrail: auditTrailQuery.data || [],
    exports: exportsQuery.data || [],
    isLoading,
    error,
    refetch: () => {
      overviewQuery.refetch();
      documentsQuery.refetch();
      auditTrailQuery.refetch();
      exportsQuery.refetch();
    },
    verifyIntegrity: verifyIntegrityMutation.mutateAsync,
    searchArchives: searchArchivesMutation.mutateAsync,
    scheduleArchiving: scheduleArchivingMutation.mutateAsync,
    isVerifyingIntegrity: verifyIntegrityMutation.isPending,
    isSearching: searchArchivesMutation.isPending,
    isScheduling: scheduleArchivingMutation.isPending,
    searchResults: searchArchivesMutation.data || [],
  };
}

