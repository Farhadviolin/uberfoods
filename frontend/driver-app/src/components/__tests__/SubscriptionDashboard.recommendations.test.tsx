import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SubscriptionDashboard } from '../SubscriptionDashboard';

const mockApiGet = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({ socket: null }),
}));

describe('SubscriptionDashboard recommendations', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ driver: { id: 'driver-1' } });
    mockApiGet.mockImplementation((path: string) => {
      if (path === '/drivers/subscription') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              subscription: {
                id: 'subscription-1',
                driverId: 'driver-1',
                tier: 'BASIC',
                status: 'ACTIVE',
                currentPeriodStart: '2026-08-01',
                currentPeriodEnd: '2026-09-01',
                cancelAtPeriodEnd: false,
                price: 29,
                monthlyDeliveries: 10,
                monthlyEarnings: 80,
                commissionRate: 0.25,
              },
            },
          },
        });
      }

      if (path === '/drivers/insights/roi') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              roi: 175.9,
              netProfit: 51,
              totalSubscriptionCost: 29,
              totalEarnings: 80,
              monthsActive: 1,
              earningsPerMonth: 80,
            },
          },
        });
      }

      if (path === '/drivers/insights/recommendations') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              recommendations: [
                {
                  type: 'PERFORMANCE',
                  title: 'Focus on high-value orders',
                  description: 'Target orders with higher delivery fees',
                  priority: 'HIGH',
                },
              ],
            },
          },
        });
      }

      return Promise.resolve({ data: [] });
    });
  });

  it('renders a canonical recommendation instead of the empty state', async () => {
    render(<SubscriptionDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Aktuelle Subscription' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Insights' }));

    expect(screen.getByText('PERFORMANCE')).toBeVisible();
    expect(screen.getByText('HIGH')).toBeVisible();
    expect(screen.getByText('Focus on high-value orders')).toBeVisible();
    expect(screen.getByText('Target orders with higher delivery fees')).toBeVisible();
    expect(screen.queryByText('Keine Upgrade-Empfehlungen verfügbar.')).not.toBeInTheDocument();
  });
});
