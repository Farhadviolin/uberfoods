import { render, screen } from '@testing-library/react';
import { SubscriptionDashboard } from '../SubscriptionDashboard';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ driver: null }),
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

describe('SubscriptionDashboard', () => {
  it('renders the canonical subscription fields', () => {
    render(<SubscriptionDashboard />);

    expect(screen.getByText('Aktuelle Subscription')).toBeInTheDocument();
    expect(screen.getByText('PRO')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('€49/Monat')).toBeInTheDocument();
    expect(screen.getByText('30.0%')).toBeInTheDocument();
  });
});
