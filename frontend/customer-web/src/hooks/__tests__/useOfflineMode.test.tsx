import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { useOfflineMode } from '../useOfflineMode';

// Mock navigator.onLine
const mockNavigator = {
  onLine: true,
};
Object.defineProperty(window.navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock online/offline events
let onlineCallback: (() => void) | null = null;
let offlineCallback: (() => void) | null = null;

const mockAddEventListener = jest.fn((event: string, callback: () => void) => {
  if (event === 'online') onlineCallback = callback;
  if (event === 'offline') offlineCallback = callback;
});

const mockRemoveEventListener = jest.fn();

Object.defineProperty(window, 'addEventListener', {
  writable: true,
  value: mockAddEventListener,
});

Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  value: mockRemoveEventListener,
});

describe('useOfflineMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    onlineCallback = null;
    offlineCallback = null;
    mockNavigator.onLine = true;
  });

  it('starts online by default', () => {
    const { result } = renderHook(() => useOfflineMode());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });

  it('detects going offline', () => {
    const { result } = renderHook(() => useOfflineMode());

    act(() => {
      if (offlineCallback) offlineCallback();
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
  });

  it('detects coming back online', () => {
    const { result } = renderHook(() => useOfflineMode());

    // Go offline first
    act(() => {
      if (offlineCallback) offlineCallback();
    });
    expect(result.current.isOffline).toBe(true);

    // Come back online
    act(() => {
      if (onlineCallback) onlineCallback();
    });
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });

  it('provides queued requests array', () => {
    const { result } = renderHook(() => useOfflineMode());

    expect(result.current.queuedRequests).toEqual([]);
  });

  it('cleans up event listeners on unmount', () => {
    const { unmount } = renderHook(() => useOfflineMode());

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});




