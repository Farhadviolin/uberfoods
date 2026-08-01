import axios from 'axios';
import api, { markDriverSessionActive } from '../api';
import {
  DRIVER_AUTH_RESET_EVENT,
  DRIVER_AUTH_STORAGE_KEYS,
} from '../authSession';

type RejectedHandler = (error: unknown) => Promise<unknown>;

const getRejectedHandler = (): RejectedHandler => {
  const handlers = (api.interceptors.response as unknown as {
    handlers: Array<{ rejected?: RejectedHandler }>;
  }).handlers;
  const handler = handlers.find((entry) => entry.rejected)?.rejected;
  if (!handler) throw new Error('Response interceptor not installed');
  return handler;
};

const seedStorage = () => {
  localStorage.setItem('driver_token', 'stale-token');
  localStorage.setItem('driver_refresh_token', 'refresh-token');
  localStorage.setItem('driver_data', JSON.stringify({ id: 'driver-1' }));
  localStorage.setItem('driver_user', JSON.stringify({ id: 'driver-1' }));
};

describe('driver auth response interceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    markDriverSessionActive();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    delete api.defaults.headers.common.Authorization;
  });

  it('clears every auth artifact and emits one reset for a final 401 without refresh', async () => {
    seedStorage();
    localStorage.removeItem('driver_refresh_token');
    const resetListener = jest.fn();
    window.addEventListener(DRIVER_AUTH_RESET_EVENT, resetListener);
    const error = { config: { url: '/api/drivers/driver-1/orders' }, response: { status: 401 } };

    await expect(getRejectedHandler()(error)).rejects.toBe(error);

    expect(resetListener).toHaveBeenCalledTimes(1);
    DRIVER_AUTH_STORAGE_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBeNull());
    window.removeEventListener(DRIVER_AUTH_RESET_EVENT, resetListener);
  });

  it('coalesces parallel final 401 responses into one auth reset', async () => {
    seedStorage();
    localStorage.removeItem('driver_refresh_token');
    const resetListener = jest.fn();
    window.addEventListener(DRIVER_AUTH_RESET_EVENT, resetListener);
    const handler = getRejectedHandler();
    const errors = [1, 2, 3].map((index) => ({
      config: { url: `/api/drivers/driver-1/orders/${index}` },
      response: { status: 401 },
    }));

    await Promise.allSettled(errors.map((error) => handler(error)));

    expect(resetListener).toHaveBeenCalledTimes(1);
    window.removeEventListener(DRIVER_AUTH_RESET_EVENT, resetListener);
  });

  it('does not clear a valid session for a 403 response', async () => {
    seedStorage();
    const resetListener = jest.fn();
    window.addEventListener(DRIVER_AUTH_RESET_EVENT, resetListener);
    const error = { config: { url: '/api/drivers/driver-1/orders' }, response: { status: 403 } };

    await expect(getRejectedHandler()(error)).rejects.toBe(error);

    expect(resetListener).not.toHaveBeenCalled();
    expect(localStorage.getItem('driver_token')).toBe('stale-token');
    expect(localStorage.getItem('driver_data')).not.toBeNull();
    window.removeEventListener(DRIVER_AUTH_RESET_EVENT, resetListener);
  });

  it('clears the session when the existing refresh flow rejects', async () => {
    seedStorage();
    const resetListener = jest.fn();
    window.addEventListener(DRIVER_AUTH_RESET_EVENT, resetListener);
    const refreshSpy = jest.spyOn(axios, 'post').mockRejectedValueOnce(new Error('refresh rejected'));
    const error = { config: { url: '/api/drivers/driver-1/orders' }, response: { status: 401 } };

    await expect(getRejectedHandler()(error)).rejects.toThrow('refresh rejected');

    expect(refreshSpy).toHaveBeenCalledWith('/api/auth/refresh', { refresh_token: 'refresh-token' });
    expect(resetListener).toHaveBeenCalledTimes(1);
    DRIVER_AUTH_STORAGE_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBeNull());
    refreshSpy.mockRestore();
    window.removeEventListener(DRIVER_AUTH_RESET_EVENT, resetListener);
  });
});
