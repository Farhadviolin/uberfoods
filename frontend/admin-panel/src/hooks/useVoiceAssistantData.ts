import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../utils/api';

interface VoiceCommand {
  id: string;
  command: string;
  intent: string;
  entities: any;
  response: string;
  confidence: number;
  success: boolean;
  executedAt: string;
  userId?: string;
  userType?: string;
}

interface VoiceCommandHistory {
  commands: VoiceCommand[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface VoiceSettings {
  enabled: boolean;
  language: string;
  confidenceThreshold: number;
  autoProcess: boolean;
  saveHistory: boolean;
  maxHistoryDays: number;
}

export function useVoiceAssistantData() {
  // Voice Command History
  const historyQuery = useQuery<VoiceCommandHistory>({
    queryKey: ['voice-assistant', 'history'],
    queryFn: () =>
      api
        .get<VoiceCommandHistory>('/ai-ml/voice-command/history?page=1&limit=100')
        .then((res) => res.data)
        .catch(() => ({ commands: [], total: 0, page: 1, limit: 100, totalPages: 0 })),
    staleTime: 30 * 1000, // 30 seconds
    retry: false,
  });

  // Voice Settings
  const settingsQuery = useQuery<VoiceSettings>({
    queryKey: ['voice-assistant', 'settings'],
    queryFn: () =>
      api
        .get<VoiceSettings>('/ai-ml/voice-command/settings')
        .then((res) => res.data)
        .catch(() => ({
          enabled: true,
          language: 'de-DE',
          confidenceThreshold: 0.7,
          autoProcess: true,
          saveHistory: true,
          maxHistoryDays: 30,
        })),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Update Settings
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: Partial<VoiceSettings>) =>
      api.put('/ai-ml/voice-command/settings', settings),
    onSuccess: () => {
      settingsQuery.refetch();
    },
  });

  // Analyze Command
  const analyzeCommandMutation = useMutation({
    mutationFn: (text: string) =>
      api.post('/ai-ml/voice-command/analyze', { text }),
  });

  const isLoading = historyQuery.isLoading || settingsQuery.isLoading;
  const error = historyQuery.error || settingsQuery.error;

  return {
    history: historyQuery.data,
    settings: settingsQuery.data,
    isLoading,
    error,
    refetch: () => {
      historyQuery.refetch();
      settingsQuery.refetch();
    },
    updateSettings: updateSettingsMutation.mutate,
    analyzeCommand: analyzeCommandMutation.mutate,
    isAnalyzing: analyzeCommandMutation.isPending,
    analysisResult: analyzeCommandMutation.data?.data,
  };
}

