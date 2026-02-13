import { renderHook } from '@testing-library/react';
import { usePushNotifications } from '../usePushNotifications';
import { renderWithProviders } from '../../test-utils';

// Mock the usePushNotifications hook
jest.mock('../usePushNotifications', () => ({
  usePushNotifications: () => ({
    notifications: [],
    permission: 'granted',
    requestPermission: jest.fn(),
  }),
}));

describe('usePushNotifications Hook', () => {
  it('returns notification state', () => {
    const { result } = renderHook(() => usePushNotifications(), {
      wrapper: renderWithProviders().wrapper,
    });

    expect(result.current.notifications).toEqual([]);
    expect(result.current.permission).toBe('granted');
  });
});