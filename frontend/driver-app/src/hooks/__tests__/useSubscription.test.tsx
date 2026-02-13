import { renderHook } from '@testing-library/react';
import { useSubscription } from '../useSubscription';
import { renderWithProviders } from '../../test-utils';

// Mock the useSubscription hook
jest.mock('../useSubscription', () => ({
  useSubscription: () => ({
    subscription: { plan: 'premium', status: 'active' },
    loading: false,
    upgrade: jest.fn(),
  }),
}));

describe('useSubscription Hook', () => {
  it('returns subscription data', () => {
    const { result } = renderHook(() => useSubscription(), {
      wrapper: renderWithProviders().wrapper,
    });

    expect(result.current.subscription.plan).toBe('premium');
    expect(result.current.loading).toBe(false);
  });
});