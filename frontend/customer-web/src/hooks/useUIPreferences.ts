import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

// E2E Mode: Skip API calls and use only localStorage
const isE2EMode = import.meta.env.VITE_E2E_DISABLE_UI_PREFS === 'true';

export interface UIPreferences {
  sidebarCollapsed?: boolean;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  [key: string]: any;
}

export function useUIPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Load preferences from backend (skip API in E2E mode)
  const { data: preferences, isLoading } = useQuery<UIPreferences>({
    queryKey: ['uiPreferences', user?.id],
    queryFn: async () => {
      // E2E Mode: Skip API calls, use only localStorage
      if (isE2EMode) {
        const stored = localStorage.getItem('uiPreferences');
        if (stored) return JSON.parse(stored);
        return { theme: 'light', language: 'en', notifications: true, compactView: false };
      }

      try {
        const response = await api.get('/customers/me/ui-preferences');
        // Backend returns the preferences directly or wrapped in data
        const prefs = response.data?.sidebarCollapsed !== undefined
          ? { sidebarCollapsed: response.data.sidebarCollapsed }
          : response.data?.preferences || response.data || {};
        return Object.keys(prefs).length
          ? prefs
          : { theme: 'light', language: 'en', notifications: true, compactView: false };
      } catch (error) {
        // Fallback to localStorage on error
        const stored = localStorage.getItem('uiPreferences');
        if (stored) return JSON.parse(stored);
        return { theme: 'light', language: 'en', notifications: true, compactView: false };
      }
    },
    enabled: true, // Always enabled
    staleTime: isE2EMode ? Infinity : 5 * 60 * 1000, // Cache forever in E2E mode
  });

  // Update preferences mutation
  const updateMutation = useMutation({
    mutationFn: async (newPreferences: Partial<UIPreferences>) => {
      // Update localStorage immediately for instant feedback
      const current = preferences || {};
      const updated = { ...current, ...newPreferences };
      localStorage.setItem('uiPreferences', JSON.stringify(updated));

      // Skip API calls in E2E mode
      if (!isE2EMode && user) {
        try {
          await api.put('/customers/me/ui-preferences', updated);
        } catch (error) {
          // If backend fails, localStorage is already updated
          console.error('Failed to sync UI preferences to backend:', error);
        }
      }

      return updated;
    },
    onSuccess: (data) => {
      // Update query cache
      queryClient.setQueryData(['uiPreferences', user?.id], data);
    },
  });

  // Helper function to update a single preference
  const updatePreference = (key: string, value: any) => {
    updateMutation.mutate({ [key]: value });
  };

  // Helper function to toggle sidebar
  const toggleSidebar = () => {
    const currentCollapsed = preferences?.sidebarCollapsed ?? false;
    updatePreference('sidebarCollapsed', !currentCollapsed);
  };

  return {
    data: preferences || {},
    preferences: preferences || {},
    isLoading,
    updatePreference,
    updatePreferences: updateMutation.mutate,
    toggleSidebar,
    isUpdating: updateMutation.isPending,
  };
}

// Separater Hook für Tests/Verbraucher
export function useUpdateUIPreferences() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newPreferences: Partial<UIPreferences>) => {
      const stored = localStorage.getItem('uiPreferences');
      const current = stored ? JSON.parse(stored) : {};
      const updated = { ...current, ...newPreferences };
      localStorage.setItem('uiPreferences', JSON.stringify(updated));

      // Skip API calls in E2E mode
      if (!isE2EMode) {
        try {
          await api.put('/customers/me/ui-preferences', updated);
        } catch (_e) {
          // ignore sync errors in tests
        }
      }
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['uiPreferences', undefined], data);
      queryClient.setQueryData(['uiPreferences'], data);
    },
  });

  return { mutate: mutation.mutate, isSuccess: mutation.isSuccess, isPending: mutation.isPending };
}

