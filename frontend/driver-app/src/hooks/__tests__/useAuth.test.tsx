import { act, renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

jest.mock('../../utils/api');

const mockedApi = api as jest.Mocked<typeof api>;
const driver = {
  id: 'driver-123',
  name: 'Test Driver',
  email: 'driver@test.com',
  phone: '+4312345678',
  isActive: true,
  userType: 'driver',
};

describe('useAuth contract', () => {
  beforeEach(() => {
    localStorage.clear();
    delete mockedApi.defaults.headers.common.Authorization;
    jest.clearAllMocks();
  });

  it('restores a persisted authenticated driver session', async () => {
    localStorage.setItem('driver_token', 'persisted-token');
    localStorage.setItem('driver_user', JSON.stringify(driver));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.driver).toEqual(driver);
    expect(result.current.token).toBe('persisted-token');
    expect(result.current.isAuthenticated).toBe(true);
    expect(mockedApi.defaults.headers.common.Authorization).toBe('Bearer persisted-token');
  });

  it('clears persisted and in-memory authentication on logout', async () => {
    localStorage.setItem('driver_token', 'persisted-token');
    localStorage.setItem('driver_user', JSON.stringify(driver));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    act(() => result.current.logout());

    expect(result.current.driver).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('driver_token')).toBeNull();
    expect(localStorage.getItem('driver_user')).toBeNull();
    expect(mockedApi.defaults.headers.common.Authorization).toBeUndefined();
  });
});
