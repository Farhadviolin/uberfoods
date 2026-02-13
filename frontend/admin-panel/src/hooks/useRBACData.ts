import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { extractData } from '../utils/apiResponse';

interface Role {
  id: string;
  name: string;
  description: string;
  permissionCount: number;
  userCount: number;
  createdAt: string;
  permissions?: string[];
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  roleCount?: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  has2FA: boolean;
  lastLogin: string;
}

interface Session {
  id: string;
  userName: string;
  ipAddress: string;
  device: string;
  startedAt: string;
  lastActivity: string;
}

interface TwoFactorStatus {
  enabledCount: number;
  totalUsers: number;
}

export function useRBACData() {
  // Roles
  const rolesQuery = useQuery<Role[]>({
    queryKey: ['rbac', 'roles'],
    queryFn: () =>
      api
        .get<Role[] | { data: Role[] } | { roles: Role[] }>('/rbac/roles')
        .then((res) => {
          const data = extractData(res.data);
          if (Array.isArray(data)) {
            return data;
          }
          // Fallback for legacy format
          if (data && typeof data === 'object' && 'roles' in data && Array.isArray((data as { roles?: Role[] }).roles)) {
            return (data as { roles: Role[] }).roles;
          }
          return [];
        })
        .catch(() => []),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
    select: (data) => Array.isArray(data) ? data : [],
  });

  // Permissions
  const permissionsQuery = useQuery<Permission[]>({
    queryKey: ['rbac', 'permissions'],
    queryFn: () =>
      api
        .get<Permission[] | { data: Permission[] } | { permissions: Permission[] }>('/rbac/permissions')
        .then((res) => {
          const data = extractData(res.data);
          if (Array.isArray(data)) {
            return data;
          }
          // Fallback for legacy format
          if (data && typeof data === 'object' && 'permissions' in data && Array.isArray((data as { permissions?: Permission[] }).permissions)) {
            return (data as { permissions: Permission[] }).permissions;
          }
          return [];
        })
        .catch(() => []),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
    select: (data) => Array.isArray(data) ? data : [],
  });

  // Users
  const usersQuery = useQuery<User[]>({
    queryKey: ['rbac', 'users'],
    queryFn: () =>
      api
        .get<User[] | { data: User[] } | { users: User[] }>('/rbac/users')
        .then((res) => {
          const data = extractData(res.data);
          if (Array.isArray(data)) {
            return data;
          }
          // Fallback for legacy format
          if (data && typeof data === 'object' && 'users' in data && Array.isArray((data as { users?: User[] }).users)) {
            return (data as { users: User[] }).users;
          }
          return [];
        })
        .catch(() => []),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false,
    select: (data) => Array.isArray(data) ? data : [],
  });

  // Sessions
  const sessionsQuery = useQuery<Session[]>({
    queryKey: ['rbac', 'sessions'],
    queryFn: () =>
      api
        .get<Session[] | { data: Session[] } | { sessions: Session[] }>('/rbac/sessions')
        .then((res) => {
          const data = extractData(res.data);
          if (Array.isArray(data)) {
            return data;
          }
          // Fallback for legacy format
          if (data && typeof data === 'object' && 'sessions' in data && Array.isArray((data as { sessions?: Session[] }).sessions)) {
            return (data as { sessions: Session[] }).sessions;
          }
          return [];
        })
        .catch(() => []),
    staleTime: 30 * 1000, // 30 seconds
    retry: false,
    select: (data) => Array.isArray(data) ? data : [],
  });

  // 2FA Status
  const twoFactorQuery = useQuery({
    queryKey: ['rbac', '2fa'],
    queryFn: () =>
      api
        .get<TwoFactorStatus>('/rbac/2fa/status')
        .then((res) => extractData(res.data) || {
          enabledCount: 0,
          totalUsers: 0,
        })
        .catch(() => ({
          enabledCount: 0,
          totalUsers: 0,
        })),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const isLoading =
    rolesQuery.isLoading ||
    permissionsQuery.isLoading ||
    usersQuery.isLoading ||
    sessionsQuery.isLoading ||
    twoFactorQuery.isLoading;

  const error =
    rolesQuery.error ||
    permissionsQuery.error ||
    usersQuery.error ||
    sessionsQuery.error ||
    twoFactorQuery.error;

  return {
    roles: Array.isArray(rolesQuery.data) ? rolesQuery.data : [],
    permissions: Array.isArray(permissionsQuery.data) ? permissionsQuery.data : [],
    users: Array.isArray(usersQuery.data) ? usersQuery.data : [],
    sessions: Array.isArray(sessionsQuery.data) ? sessionsQuery.data : [],
    twoFactorStatus: (twoFactorQuery.data || { enabledCount: 0, totalUsers: 0 }) as TwoFactorStatus,
    isLoading,
    error,
    refetch: () => {
      rolesQuery.refetch();
      permissionsQuery.refetch();
      usersQuery.refetch();
      sessionsQuery.refetch();
      twoFactorQuery.refetch();
    },
  };
}

