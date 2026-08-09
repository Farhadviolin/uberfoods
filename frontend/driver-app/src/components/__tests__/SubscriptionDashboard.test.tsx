import { render, screen, waitFor } from '@testing-library/react';
import { SubscriptionDashboard } from '../SubscriptionDashboard';
import api from '../../utils/api';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ driver: { id: 'driver-1' } }),
}));

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock('../../hooks/useSubscription', () => ({
  useSubscription: () => ({
    subscription: {
      id: 'subscription-1',
      driverId: 'driver-1',
      tier: 'PRO',
      status: 'ACTIVE',
      currentPeriodStart: '2026-07-01',
      currentPeriodEnd: '2026-08-01',
      trialEndsAt: null,
      cancelAtPeriodEnd: false,
      price: 49,
      monthlyDeliveries: 10,
      monthlyEarnings: 500,
      commissionRate: 0.3,
    },
    insights: null,
    loading: false,
    trialDaysRemaining: null,
    isTrialEndingSoon: false,
    upgradeSubscription: jest.fn(),
  }),
}));

const mockedApi = jest.mocked(api);
const stalePerformanceRequest = ['/drivers', 'driver-1', 'insights', 'performance'].join('/') + '?period=30d';

describe('SubscriptionDashboard', () => {
  beforeEach(() => {
    mockedApi.get.mockReset().mockResolvedValue({ data: [] } as never);
  });

  it('renders the canonical subscription fields', async () => {
    render(<SubscriptionDashboard />);

    expect(screen.getByText('Aktuelle Subscription')).toBeInTheDocument();
    expect(screen.getByText('PRO')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('€49/Monat')).toBeInTheDocument();
    expect(screen.getByText('30.0%')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/drivers/driver-1/earnings/history?limit=20');
    });
  });

  it('does not request the removed performance insights endpoint', async () => {
    render(<SubscriptionDashboard />);

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/drivers/driver-1/earnings/history?limit=20');
    });

    expect(mockedApi.get).not.toHaveBeenCalledWith(stalePerformanceRequest);
  });
});
