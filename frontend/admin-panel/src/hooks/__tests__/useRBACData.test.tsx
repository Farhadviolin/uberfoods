import { renderHook, waitFor } from '@testing-library/react';

// Use the global custom render that includes providers
const render = (global as any).customRender;
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { createTestQueryClient } from '../../setupTestRender';

// Mock API before importing useRBACData
jest.mock('../../utils/api', () => {
  const mockApi = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    defaults: {
      headers: {
        common: {},
      },
    },
  };
  return {
    __esModule: true,
    default: mockApi,
  };
});

import { useRBACData } from '../useRBACData';
import api from '../../utils/api';

const mockedApi = api as jest.Mocked<typeof api>;

const createWrapper = () => {
  // Create a new QueryClient for each test to avoid caching between tests
  const queryClient = createTestQueryClient();

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useRBACData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch roles successfully', async () => {
    const mockRoles = [
      { id: '1', name: 'Admin', description: 'Administrator', permissions: [] },
      { id: '2', name: 'User', description: 'Regular User', permissions: [] },
    ];

    mockedApi.get.mockImplementation((url: string) => {
      if (url.includes('/rbac/roles')) {
        return Promise.resolve({ data: mockRoles });
      }
      if (url.includes('/rbac/permissions')) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('/rbac/users')) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('/rbac/sessions')) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('/rbac/2fa')) {
        return Promise.resolve({ data: { enabledCount: 0, totalUsers: 0 } });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useRBACData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.roles).toEqual(mockRoles);
  });

  it('should handle API errors gracefully', async () => {
    mockedApi.get.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useRBACData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.roles).toEqual([]);
    expect(result.current.permissions).toEqual([]);
    expect(result.current.users).toEqual([]);
  });

  it('should fetch permissions', async () => {
    const mockPermissions = [
      { id: '1', name: 'read:users', description: 'Read users' },
      { id: '2', name: 'write:users', description: 'Write users' },
    ];

    jest.clearAllMocks();
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/rbac/permissions') {
        return Promise.resolve({ data: { success: true, data: mockPermissions } });
      }
      if (url === '/rbac/roles') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url === '/rbac/users') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url === '/rbac/sessions') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url === '/rbac/2fa/status') {
        return Promise.resolve({ data: { success: true, data: { enabledCount: 0, totalUsers: 0 } } });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    const { result } = renderHook(() => useRBACData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.permissions).toEqual(mockPermissions);
  });

  it('should fetch 2FA status', async () => {
    const mock2FAStatus = { enabledCount: 5, totalUsers: 10 };

    jest.clearAllMocks();
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/rbac/2fa/status') {
        return Promise.resolve({ data: { success: true, data: mock2FAStatus } });
      }
      if (url === '/rbac/roles') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url === '/rbac/permissions') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url === '/rbac/users') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url === '/rbac/sessions') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    const { result } = renderHook(() => useRBACData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.twoFactorStatus).toEqual(mock2FAStatus);
  });
});




