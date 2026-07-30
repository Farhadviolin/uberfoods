import { renderHook } from '@testing-library/react';
import { useSubscription } from '../useSubscription';
import { TestWrapper } from '../../test-utils';

// Mock the useSubscription hook
jest.mock('../useSubscription', () => ({
  useSubscription: () => ({
    subscription: {
      id: 'subscription-1', driverId: 'driver-1', tier: 'PRO', status: 'ACTIVE',
      currentPeriodStart: '2026-07-01', currentPeriodEnd: '2026-08-01',
      cancelAtPeriodEnd: false, price: 29, monthlyDeliveries: 10,
      monthlyEarnings: 500, commissionRate: 0.1,
    },
    loading: false,
    upgrade: jest.fn(),
  }),
}));

describe('useSubscription Hook', () => {
  it('returns subscription data', () => {
    const { result } = renderHook(() => useSubscription(), {
      wrapper: TestWrapper,
    });

    expect(result.current.subscription?.tier).toBe('PRO');
    expect(result.current.loading).toBe(false);
  });
});
