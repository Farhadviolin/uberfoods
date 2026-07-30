import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils';
import api from '../../utils/api';
import { Dashboard } from '../Dashboard';

jest.mock('../../utils/api');
jest.mock('../../hooks/useLocation', () => ({
  useLocation: () => ({ location: null }),
}));
jest.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({ connectionError: null }),
}));
jest.mock('../../hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    isSupported: false,
    isSubscribed: false,
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  }),
}));
jest.mock('../../hooks/useSmartAcceptance', () => ({
  useSmartAcceptance: () => ({
    isAnalyzing: false,
    stats: {
      averageScore: 0,
      autoAcceptedCount: 0,
      recommendations: { accept: 0, auto_accept: 0 },
    },
  }),
}));
jest.mock('../../hooks/useSubscription', () => ({
  useSubscription: () => ({
    subscription: null,
    isTrialEndingSoon: false,
    trialDaysRemaining: null,
  }),
}));
jest.mock('../../hooks/useRetry', () => ({
  useRetry: () => ({
    execute: async (operation: () => Promise<unknown>) => ({
      success: true,
      data: await operation(),
    }),
  }),
}));

const mockedApi = api as jest.Mocked<typeof api>;
const driver = {
  id: 'driver-123',
  name: 'Test Driver',
  email: 'driver@test.com',
  phone: '+43123456789',
  isActive: true,
  role: 'DRIVER' as const,
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    localStorage.setItem('driver_token', 'test-token');
    localStorage.setItem('driver_user', JSON.stringify(driver));
    mockedApi.get.mockResolvedValue({ data: [] });
  });

  afterEach(() => localStorage.clear());

  it('mounts the authenticated driver dashboard and loads both order feeds', async () => {
    renderWithProviders(<Dashboard />);

    expect(await screen.findByTestId('driver-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/drivers/driver-123/orders/available');
      expect(mockedApi.get).toHaveBeenCalledWith('/drivers/driver-123/orders/active');
    });
  });

  it('shows a load error when both order feeds fail', async () => {
    mockedApi.get.mockRejectedValue(new Error('backend unavailable'));

    renderWithProviders(<Dashboard />);

    expect(await screen.findByTestId('driver-dashboard')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Fehler beim Laden der Bestellungen. Bitte versuchen Sie es später erneut.',
    );
  });
});
