import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useRBACData } from './useRBACData';
import api from '../utils/api';

export function usePermissions() {
  // Safely get auth context - useAuth now returns defaults instead of throwing
  const authContext = useAuth();
  const user = authContext?.user || null;
  const isAuthenticated = authContext?.isAuthenticated || false;
  
  // Safely get RBAC data - ensure it always returns arrays
  const rbacData = useRBACData();
  const roles = Array.isArray(rbacData?.roles) ? rbacData.roles : [];
  const permissions = Array.isArray(rbacData?.permissions) ? rbacData.permissions : [];

  // Try to fetch user permissions directly from API (more accurate)
  const { data: userPermissionsData } = useQuery<{ permissions: string[]; roles: string[] }>({
    queryKey: ['userPermissions', user?.id],
    queryFn: async () => {
      if (!isAuthenticated || !user?.id) {
        return { permissions: [], roles: [] };
      }
      try {
        const response = await api.get(`/rbac/user-permissions/${user.id}`);
        return response.data;
      } catch (error) {
        // Fallback to role-based permissions if API fails
        return { permissions: [], roles: [] };
      }
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  const userPermissions = useMemo(() => {
    if (!user || !user.role) {
      return [];
    }

    const userRole = user.role.toUpperCase();
    
    // Super Admin has all permissions
    if (userRole === 'SUPER_ADMIN') {
      return ['*:*'];
    }

    // Use API-fetched permissions if available (more accurate)
    if (userPermissionsData?.permissions && userPermissionsData.permissions.length > 0) {
      return userPermissionsData.permissions;
    }

    // Fallback: Find user's role in roles list
    // Ensure roles is an array before calling .find()
    const rolesArray = Array.isArray(roles) ? roles : [];
    const userRoleData = rolesArray.find((r: any) => r.name?.toUpperCase() === userRole);
    
    if (userRoleData && userRoleData.permissions) {
      return userRoleData.permissions;
    }

    // Default permissions based on role (last resort)
    const defaultPermissions: Record<string, string[]> = {
      ADMIN: [
        'order:*',
        'driver:*',
        'restaurant:*',
        'customer:*',
        'analytics:*',
        'financial:read',
        'system:read',
        'rbac:read',
      ],
      MODERATOR: [
        'order:read',
        'order:update',
        'driver:read',
        'restaurant:read',
        'customer:read',
        'analytics:read',
      ],
      SUPPORT: [
        'order:read',
        'customer:read',
        'customer:update',
        'support:*',
      ],
    };

    return defaultPermissions[userRole] || [];
  }, [user, roles, userPermissionsData]);

  const hasPermission = (permission: string): boolean => {
    if (!permission) return false;

    // Super Admin has all permissions
    if (userPermissions.includes('*:*')) {
      return true;
    }

    // Check exact match
    if (userPermissions.includes(permission)) {
      return true;
    }

    // Check wildcard permissions (e.g., "order:*" matches "order:read")
    const [resource, action] = permission.split(':');
    if (resource && action) {
      const wildcardPermission = `${resource}:*`;
      return userPermissions.includes(wildcardPermission);
    }

    return false;
  };

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.some((permission) => hasPermission(permission));
  };

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.every((permission) => hasPermission(permission));
  };

  const hasRole = (role: string): boolean => {
    if (!user || !user.role) return false;
    return user.role.toUpperCase() === role.toUpperCase();
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (!user || !user.role) return false;
    return roles.some((role) => user.role?.toUpperCase() === role.toUpperCase());
  };

  return {
    userPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    isSuperAdmin: hasRole('SUPER_ADMIN'),
    isAdmin: hasRole('ADMIN') || hasRole('SUPER_ADMIN'),
  };
}

