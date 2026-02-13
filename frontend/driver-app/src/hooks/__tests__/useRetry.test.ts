import { renderHook, waitFor } from '@testing-library/react';
import { useRetry } from '../useRetry';

jest.useFakeTimers();

describe('useRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('führt erfolgreiche Calls ohne Retry aus', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useRetry('test'));

    const promise = result.current.execute(mockFn);

    await waitFor(() => {
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    const retryResult = await promise;
    expect(retryResult.success).toBe(true);
    if (retryResult.success) {
      expect(retryResult.data).toBe('success');
    }
  });

  it('retried bei retryable Fehlern', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce({ code: 'ERR_NETWORK' })
      .mockRejectedValueOnce({ code: 'ERR_NETWORK' })
      .mockResolvedValue('success');

    const { result } = renderHook(() => useRetry('test'));

    const promise = result.current.execute(mockFn, {
      maxAttempts: 3,
      initialDelay: 100,
    });

    await jest.advanceTimersByTimeAsync(100);
    await jest.advanceTimersByTimeAsync(200);

    const retryResult = await promise;
    expect(retryResult.success).toBe(true);
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('gibt auf nach maxAttempts', async () => {
    const mockFn = jest.fn().mockRejectedValue({ code: 'ERR_NETWORK' });
    const { result } = renderHook(() => useRetry('test'));

    const promise = result.current.execute(mockFn, {
      maxAttempts: 2,
      initialDelay: 100,
    });

    await jest.advanceTimersByTimeAsync(100);

    const retryResult = await promise;
    expect(retryResult.success).toBe(false);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('verwendet konfigurierbare Retry-Optionen', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce({ code: 'ERR_NETWORK' })
      .mockResolvedValue('success');

    const onRetry = jest.fn();
    const { result } = renderHook(() => useRetry('test'));

    const promise = result.current.execute(mockFn, {
      maxAttempts: 3,
      initialDelay: 100,
      onRetry,
    });

    await jest.advanceTimersByTimeAsync(100);

    const retryResult = await promise;
    expect(retryResult.success).toBe(true);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Object));
  });
});
