import { renderHook, waitFor } from '@testing-library/react';
import { useSubscription } from '../useSubscription';
import api from '../../utils/api';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ driver: { id: 'driver-1' } }),
}));

jest.mock('../useWebSocket', () => ({
  useWebSocket: () => ({ socket: null }),
}));

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const mockedApi = jest.mocked(api);
const stalePerformanceRequest = ['/drivers', 'driver-1', 'insights', 'performance'].join('/') + '?period=30d';

describe('useSubscription Hook', () => {
  beforeEach(() => {
    mockedApi.get.mockImplementation(async (url: string) => {
      if (url === '/drivers/subscription') {
        return {
          data: {
            subscription: {
              id: 'subscription-1',
              driverId: 'driver-1',
              tier: 'PRO',
              status: 'ACTIVE',
              currentPeriodStart: '2026-07-01',
              currentPeriodEnd: '2026-08-01',
              cancelAtPeriodEnd: false,
              trialEndsAt: null,
              price: 49,
              monthlyDeliveries: 10,
              monthlyEarnings: 500,
              commissionRate: 0.3,
            },
          },
        } as never;
      }
      if (url === '/drivers/insights/roi') {
        return {
          data: {
            roi: 175.9,
            netProfit: 51,
            totalSubscriptionCost: 29,
            totalEarnings: 80,
            monthsActive: 1,
            earningsPerMonth: 80,
          },
        } as never;
      }
      if (url === '/drivers/insights/recommendations') {
        return {
          data: {
            recommendations: [
              {
                tier: 'PRO',
                reason: 'Mehr Lieferungen ermöglichen',
                potentialEarnings: 100,
                netBenefit: 71,
                confidence: 'HIGH',
              },
            ],
          },
        } as never;
      }
      throw { response: { status: 404 } };
    });
  });

  it('fetches the canonical subscription and insight endpoints', async () => {
    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.insights?.roi).toBe(175.9));
    expect(result.current.subscription?.tier).toBe('PRO');
    expect(result.current.subscription?.commissionRate).toBe(0.3);
    expect(mockedApi.get).toHaveBeenCalledWith('/drivers/subscription');
    expect(mockedApi.get).toHaveBeenCalledWith('/drivers/insights/roi');
    expect(mockedApi.get).toHaveBeenCalledWith('/drivers/insights/recommendations');
    expect(mockedApi.get).not.toHaveBeenCalledWith('/drivers/driver-1/subscription');
    expect(mockedApi.get).not.toHaveBeenCalledWith(stalePerformanceRequest);
  });
});
