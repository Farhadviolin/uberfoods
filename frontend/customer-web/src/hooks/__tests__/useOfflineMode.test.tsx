import { act, renderHook } from '@testing-library/react';
import { useOfflineMode } from '../useOfflineMode';

const originalOnLineDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'onLine');
const setNavigatorOnline = (onLine: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: onLine,
  });
};

describe('useOfflineMode', () => {
  beforeEach(() => {
    setNavigatorOnline(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalOnLineDescriptor) {
      Object.defineProperty(window.navigator, 'onLine', originalOnLineDescriptor);
    } else {
      delete (window.navigator as unknown as { onLine?: boolean }).onLine;
    }
  });

  it('starts online by default', () => {
    const { result } = renderHook(() => useOfflineMode());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });

  it('starts offline when the browser is offline', () => {
    setNavigatorOnline(false);

    const { result } = renderHook(() => useOfflineMode());

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
  });

  it('detects going offline', () => {
    const { result } = renderHook(() => useOfflineMode());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
  });

  it('detects coming back online', () => {
    const { result } = renderHook(() => useOfflineMode());

    // Go offline first
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.isOffline).toBe(true);

    // Come back online
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });

  it('provides queued requests array', () => {
    const { result } = renderHook(() => useOfflineMode());

    expect(result.current.queuedRequests).toEqual([]);
  });

  it('cleans up event listeners on unmount', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    const { result, rerender, unmount } = renderHook(() => useOfflineMode());
    const onlineHandler = addEventListenerSpy.mock.calls.find(([event]) => event === 'online')?.[1];
    const offlineHandler = addEventListenerSpy.mock.calls.find(([event]) => event === 'offline')?.[1];

    rerender();

    expect(
      addEventListenerSpy.mock.calls.filter(([event]) => event === 'online' || event === 'offline')
    ).toHaveLength(2);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', onlineHandler);
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', offlineHandler);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.isOnline).toBe(true);
  });
});




