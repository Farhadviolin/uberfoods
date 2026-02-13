import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook } from '../../test-utils';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../utils/api';

jest.mock('../../utils/api');

describe('useAuth Hook', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('initializes with unauthenticated state', () => {
    const { result } = renderHook(() => useAuth());

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

    (api.default.post as jest.Mock).mockResolvedValue(mockLoginResponse);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('test@example.com');
    });
  });

  it('handles login failure', async () => {
    (api.default.post as jest.Mock).mockRejectedValue(
      new Error('Invalid credentials')
    );

    const { result } = renderHook(() => useAuth());

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

    (api.default.post as jest.Mock).mockResolvedValue(mockLoginResponse);

    const { result } = renderHook(() => useAuth());

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

  it('persists auth state in sessionStorage', async () => {
    const mockLoginResponse = {
      data: {
        accessToken: 'mock_access_token',
        user: {
          id: 'user_1',
          email: 'test@example.com',
        },
      },
    };

    (api.default.post as jest.Mock).mockResolvedValue(mockLoginResponse);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    await waitFor(() => {
      const storedToken = sessionStorage.getItem('accessToken');
      expect(storedToken).toBe('mock_access_token');
    });
  });

  it('handles token refresh', async () => {
    const mockRefreshResponse = {
      data: {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      },
    };

    sessionStorage.setItem('refreshToken', 'old_refresh_token');
    (api.default.post as jest.Mock).mockResolvedValue(mockRefreshResponse);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.refreshToken();
    });

    await waitFor(() => {
      const storedToken = sessionStorage.getItem('accessToken');
      expect(storedToken).toBe('new_access_token');
    });
  });
});





