import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import api from '../utils/api';

export interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  config?: Record<string, unknown>;
}

export interface APIKey {
  id: string;
  name: string;
  key: string;
  environment: 'production' | 'staging' | 'development';
  permissions: string[];
  createdAt: string;
  lastUsed?: string;
  expiresAt?: string;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  eventTypes: string[];
  secret?: string;
  status: 'active' | 'inactive' | 'error';
  createdAt: string;
  lastTriggered?: string;
}

export function useIntegrationsData() {
  const [softError, setSoftError] = useState<Error | null>(null);
  const queryClient = useQueryClient();

  const recordError = useCallback((err: any) => {
    const normalized =
      err instanceof Error
        ? err
        : new Error(err?.message || 'Integration Anfrage fehlgeschlagen');
    setSoftError(normalized);
  }, []);

  // Available integrations
  const availableQuery = useQuery({
    queryKey: ['integrations', 'available'],
    queryFn: () =>
      api
        .get<Integration[]>('/integrations/available')
        .then((res) => res.data || [])
        .catch((error) => {
          recordError(error);
          return [];
        }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Connected integrations
  const connectedQuery = useQuery({
    queryKey: ['integrations', 'connected'],
    queryFn: () =>
      api
        .get<Integration[]>('/integrations/connected')
        .then((res) => res.data || [])
        .catch((error) => {
          recordError(error);
          return [];
        }),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
  });

  // API Keys
  const apiKeysQuery = useQuery({
    queryKey: ['integrations', 'api-keys'],
    queryFn: () =>
      api
        .get<APIKey[]>('/integrations/api-keys')
        .then((res) => res.data || [])
        .catch((error) => {
          recordError(error);
          return [];
        }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Webhooks
  const webhooksQuery = useQuery({
    queryKey: ['integrations', 'webhooks'],
    queryFn: () =>
      api
        .get<Webhook[]>('/integrations/webhooks')
        .then((res) => res.data || [])
        .catch((error) => {
          recordError(error);
          return [];
        }),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  // Connect integration mutation
  const connectMutation = useMutation({
    mutationFn: ({ id, config }: { id: string; config: Record<string, unknown> }) =>
      api.post(`/integrations/${id}/connect`, { config }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: recordError,
  });

  // Disconnect integration mutation
  const disconnectMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/integrations/${id}/disconnect`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: recordError,
  });

  // Create API key mutation
  const createAPIKeyMutation = useMutation({
    mutationFn: (data: {
      name: string;
      environment?: 'production' | 'staging' | 'development';
      permissions?: string[];
    }) =>
      api.post('/integrations/api-keys', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'api-keys'] });
    },
    onError: recordError,
  });

  // Create webhook mutation
  const createWebhookMutation = useMutation({
    mutationFn: (data: {
      name: string;
      url: string;
      eventTypes: string[];
      secret?: string;
    }) =>
      api.post('/integrations/webhooks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'webhooks'] });
    },
    onError: recordError,
  });

  const isLoading =
    availableQuery.isLoading ||
    connectedQuery.isLoading ||
    apiKeysQuery.isLoading ||
    webhooksQuery.isLoading;

  const error =
    softError ||
    availableQuery.error ||
    connectedQuery.error ||
    apiKeysQuery.error ||
    webhooksQuery.error;

  return {
    available: availableQuery.data || [],
    connected: connectedQuery.data || [],
    apiKeys: apiKeysQuery.data || [],
    webhooks: webhooksQuery.data || [],
    isLoading,
    error,
    connectIntegration: connectMutation.mutate,
    disconnectIntegration: disconnectMutation.mutate,
    createAPIKey: createAPIKeyMutation.mutate,
    createWebhook: createWebhookMutation.mutate,
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    isCreatingAPIKey: createAPIKeyMutation.isPending,
    isCreatingWebhook: createWebhookMutation.isPending,
    refetch: () => {
      availableQuery.refetch();
      connectedQuery.refetch();
      apiKeysQuery.refetch();
      webhooksQuery.refetch();
    },
  };
}