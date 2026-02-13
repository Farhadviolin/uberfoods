import { retryWithBackoff, apiCallWithRetry } from '../retryWithBackoff';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('führt erfolgreiche Calls ohne Retry aus', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    
    const result = await retryWithBackoff(fn);
    
    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retried bei retryable Fehlern', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce({ code: 'ERR_NETWORK' })
      .mockRejectedValueOnce({ code: 'ERR_NETWORK' })
      .mockResolvedValue('success');

    const promise = retryWithBackoff(fn, {
      maxAttempts: 3,
      initialDelay: 100,
    });

    // Warte auf erste Retries
    await jest.advanceTimersByTimeAsync(100);
    await jest.advanceTimersByTimeAsync(200);

    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('gibt auf nach maxAttempts', async () => {
    const fn = jest.fn().mockRejectedValue({ code: 'ERR_NETWORK' });

    const promise = retryWithBackoff(fn, {
      maxAttempts: 2,
      initialDelay: 100,
    });

    await jest.advanceTimersByTimeAsync(100);

    const result = await promise;

    expect(result.success).toBe(false);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('verwendet exponential backoff', async () => {
    const fn = jest.fn().mockRejectedValue({ code: 'ERR_NETWORK' });
    const onRetry = jest.fn();

    const promise = retryWithBackoff(fn, {
      maxAttempts: 3,
      initialDelay: 100,
      backoffMultiplier: 2,
      onRetry,
    });

    await jest.advanceTimersByTimeAsync(100);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Object));

    await jest.advanceTimersByTimeAsync(200);
    expect(onRetry).toHaveBeenCalledWith(2, expect.any(Object));

    await promise;
  });

  it('apiCallWithRetry wirft Fehler bei Misserfolg', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Failed'));

    await expect(
      apiCallWithRetry(fn, { maxAttempts: 1 })
    ).rejects.toThrow('Failed');
  });
});
