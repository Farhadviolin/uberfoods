import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import * as api from '../../utils/api';

jest.mock('../../utils/api');

describe('useAuth Hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  const mockedApi = jest.mocked(api.default);

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    delete api.default.defaults.headers.common.Authorization;
  });

  it('initializes with unauthenticated state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('logs in successfully', async () => {
    const mockLoginResponse = {
      data: {
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        user: {
          id: 'user_1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'CUSTOMER',
        },
      },
    };

    mockedApi.post.mockResolvedValue(mockLoginResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('test@example.com');
    });
  });

  it('handles login failure', async () => {
    mockedApi.post.mockRejectedValue(
      new Error('Invalid credentials')
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      act(async () => {
        await result.current.login('test@example.com', 'wrongpassword');
      })
    ).rejects.toThrow();

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('logs out successfully', async () => {
    const mockLoginResponse = {
      data: {
        accessToken: 'mock_access_token',
        user: {
          id: 'user_1',
          email: 'test@example.com',
        },
      },
    };

    mockedApi.post.mockResolvedValue(mockLoginResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Login first
    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    // Then logout
    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('persists the customer session in localStorage', async () => {
    const mockLoginResponse = {
      data: {
        accessToken: 'mock_access_token',
        user: {
          id: 'user_1',
          email: 'test@example.com',
        },
      },
    };

    mockedApi.post.mockResolvedValue(mockLoginResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    await waitFor(() => {
      const storedToken = localStorage.getItem('customer_token');
      expect(storedToken).toBe('mock_access_token');
    });
  });

  it('refreshes an authenticated customer session', async () => {
    const mockRefreshResponse = {
      data: {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      },
    };

    localStorage.setItem('customer_refresh_token', 'old_refresh_token');
    mockedApi.post.mockResolvedValue(mockRefreshResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.refreshSession();
    });

    await waitFor(() => {
      const storedToken = localStorage.getItem('customer_token');
      expect(storedToken).toBe('new_access_token');
    });
  });

  it('clears the customer session when refresh fails', async () => {
    localStorage.setItem('customer_token', 'old_access_token');
    localStorage.setItem('customer_refresh_token', 'old_refresh_token');
    localStorage.setItem('customer_user', JSON.stringify({ id: 'user_1', email: 'test@example.com' }));
    mockedApi.post.mockRejectedValue(new Error('Invalid refresh token'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(act(async () => {
      await result.current.refreshSession();
    })).rejects.toThrow('Invalid refresh token');

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('customer_token')).toBeNull();
    expect(localStorage.getItem('customer_refresh_token')).toBeNull();
  });
});





