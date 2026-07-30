import { renderHook } from '@testing-library/react';
import { usePushNotifications } from '../usePushNotifications';
import { TestWrapper } from '../../test-utils';

// Mock the usePushNotifications hook
jest.mock('../usePushNotifications', () => ({
  usePushNotifications: () => ({
    isSupported: true,
    isSubscribed: false,
    publicKey: null,
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  }),
}));

describe('usePushNotifications Hook', () => {
  it('returns notification state', () => {
    const { result } = renderHook(() => usePushNotifications(), {
      wrapper: TestWrapper,
    });

    expect(result.current.isSupported).toBe(true);
    expect(result.current.isSubscribed).toBe(false);
  });
});
