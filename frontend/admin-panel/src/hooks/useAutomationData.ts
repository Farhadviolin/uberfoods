import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  actionCount: number;
  enabled: boolean;
  executionCount: number;
  lastExecuted: string | null;
}

interface Rule {
  id: string;
  name: string;
  condition: string;
  action: string;
  enabled: boolean;
  executionCount: number;
}

interface Trigger {
  id: string;
  name: string;
  type: string;
  description: string;
  activeWorkflows: number;
  lastFired: string | null;
}

interface ScheduledTask {
  id: string;
  name: string;
  type: string;
  schedule: string;
  nextRun: string;
  status: string;
}

interface ExecutionLog {
  id: string;
  timestamp: string;
  type: string;
  name: string;
  status: string;
  duration: number;
  details: string;
}

export function useAutomationData() {
  // Workflows
  const workflowsQuery = useQuery({
    queryKey: ['automation', 'workflows'],
    queryFn: () =>
      api
        .get<Workflow[]>('/automation/workflows')
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
  });

  // Rules
  const rulesQuery = useQuery({
    queryKey: ['automation', 'rules'],
    queryFn: () =>
      api
        .get<Rule[]>('/automation/rules')
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  // Triggers
  const triggersQuery = useQuery({
    queryKey: ['automation', 'triggers'],
    queryFn: () =>
      api
        .get<Trigger[]>('/automation/triggers')
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Scheduled Tasks
  const scheduledQuery = useQuery({
    queryKey: ['automation', 'scheduled'],
    queryFn: () =>
      api
        .get<ScheduledTask[]>('/automation/scheduled-tasks')
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: false,
  });

  // Execution Logs
  const logsQuery = useQuery({
    queryKey: ['automation', 'logs'],
    queryFn: () =>
      api
        .get<ExecutionLog[]>('/automation/logs')
        .then((res) => res.data || [])
        .catch(() => []),
    staleTime: 30 * 1000, // 30 seconds
    retry: false,
  });

  const isLoading =
    workflowsQuery.isLoading ||
    rulesQuery.isLoading ||
    triggersQuery.isLoading ||
    scheduledQuery.isLoading ||
    logsQuery.isLoading;

  const error =
    workflowsQuery.error ||
    rulesQuery.error ||
    triggersQuery.error ||
    scheduledQuery.error ||
    logsQuery.error;

  return {
    workflows: workflowsQuery.data || [],
    rules: rulesQuery.data || [],
    triggers: triggersQuery.data || [],
    scheduledTasks: scheduledQuery.data || [],
    executionLogs: logsQuery.data || [],
    isLoading,
    error,
    refetch: () => {
      workflowsQuery.refetch();
      rulesQuery.refetch();
      triggersQuery.refetch();
      scheduledQuery.refetch();
      logsQuery.refetch();
    },
  };
}

