import { act, renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { DRIVER_AUTH_RESET_EVENT } from '../../utils/authSession';

jest.mock('../../utils/api');

const mockedApi = api as jest.Mocked<typeof api>;
const driver = {
  id: 'driver-123',
  name: 'Test Driver',
  email: 'driver@test.com',
  phone: '+4312345678',
  isActive: true,
  role: 'driver' as const,
};

describe('useAuth contract', () => {
  beforeEach(() => {
    localStorage.clear();
    delete mockedApi.defaults.headers.common.Authorization;
    jest.clearAllMocks();
    mockedApi.get.mockResolvedValue({
      data: { id: driver.id, role: 'driver', isActive: true },
    } as never);
  });

  it('restores a persisted authenticated driver session', async () => {
    localStorage.setItem('driver_token', 'persisted-token');
    localStorage.setItem('driver_data', JSON.stringify(driver));
    localStorage.setItem('driver_user', JSON.stringify(driver));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.driver).toEqual(driver);
    expect(result.current.token).toBe('persisted-token');
    expect(result.current.isAuthenticated).toBe(true);
    expect(mockedApi.defaults.headers.common.Authorization).toBe('Bearer persisted-token');
    expect(mockedApi.get).toHaveBeenCalledWith('/auth/me');
  });

  it.each([
    ['invalid JSON', '{not-json'],
    ['incomplete profile', JSON.stringify({ id: driver.id, role: 'driver' })],
    ['non-driver role', JSON.stringify({ ...driver, role: 'admin' })],
    ['inactive driver', JSON.stringify({ ...driver, isActive: false })],
  ])('fails closed for %s', async (_label, storedProfile) => {
    localStorage.setItem('driver_token', 'persisted-token');
    localStorage.setItem('driver_user', storedProfile);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.driver).toBeNull();
    expect(localStorage.getItem('driver_token')).toBeNull();
    expect(localStorage.getItem('driver_user')).toBeNull();
  });

  it('fails closed when the token is missing or the persisted profiles disagree', async () => {
    localStorage.setItem('driver_user', JSON.stringify(driver));
    const { result: missingToken } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(missingToken.current.loading).toBe(false));
    expect(missingToken.current.isAuthenticated).toBe(false);
    expect(localStorage.length).toBe(0);

    localStorage.setItem('driver_token', 'persisted-token');
    localStorage.setItem('driver_data', JSON.stringify(driver));
    localStorage.setItem('driver_user', JSON.stringify({ ...driver, name: 'Other Driver' }));
    const { result: conflictingProfiles } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(conflictingProfiles.current.loading).toBe(false));
    expect(conflictingProfiles.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('driver_token')).toBeNull();
  });

  it('fails closed when the server rejects the persisted token', async () => {
    mockedApi.get.mockRejectedValueOnce({ response: { status: 401 } });
    localStorage.setItem('driver_token', 'stale-token');
    localStorage.setItem('driver_user', JSON.stringify(driver));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('driver_token')).toBeNull();
  });

  it('resets the in-memory session when a protected request emits an auth reset', async () => {
    localStorage.setItem('driver_token', 'persisted-token');
    localStorage.setItem('driver_user', JSON.stringify(driver));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    act(() => window.dispatchEvent(new Event(DRIVER_AUTH_RESET_EVENT)));

    expect(result.current.driver).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('clears persisted and in-memory authentication on logout', async () => {
    localStorage.setItem('driver_token', 'persisted-token');
    localStorage.setItem('driver_refresh_token', 'refresh-token');
    localStorage.setItem('driver_data', JSON.stringify(driver));
    localStorage.setItem('driver_user', JSON.stringify(driver));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    act(() => result.current.logout());

    expect(result.current.driver).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('driver_token')).toBeNull();
    expect(localStorage.getItem('driver_refresh_token')).toBeNull();
    expect(localStorage.getItem('driver_data')).toBeNull();
    expect(localStorage.getItem('driver_user')).toBeNull();
    expect(mockedApi.defaults.headers.common.Authorization).toBeUndefined();
  });
});
