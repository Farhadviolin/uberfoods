import { screen } from '@testing-library/react';

// Use the global custom render that includes providers
const render = (global as any).customRender;
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from '../components/Dashboard';
import { useDashboardData } from '../hooks/useDashboardData';

// Mock auth context
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', name: 'Admin User', role: 'admin' },
    isAuthenticated: true,
    logout: jest.fn(),
  }),
}));

// Mock WebSocket hook
jest.mock('../hooks/useWebSocket', () => ({
  useWebSocket: () => ({ isConnected: true }),
}));

// Mock dashboard data hook
jest.mock('../hooks/useDashboardData', () => ({
  __esModule: true,
  useDashboardData: jest.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Use the global custom render that includes all providers
const renderWithProviders = render;

describe('Dashboard Component', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();

    (useDashboardData as unknown as jest.Mock).mockReturnValue({
      stats: {
        orders: { total: 1250, completed: 1200, completionRate: 96 },
        revenue: { total: 45670.5, average: 36.54 },
        customers: { total: 3400, new: 120 },
        restaurants: { total: 42 },
        drivers: { total: 200, active: 45 },
      },
      revenueData: [
        { date: '2024-01-01', revenue: 200 },
        { date: '2024-01-02', revenue: 300 },
      ],
      topRestaurants: [
        { id: 'r1', name: 'Pizza Palace', revenue: 2500, orderCount: 120, averageOrderValue: 20.8 },
      ],
      driverPerformance: [
        { id: 'd1', name: 'Driver One', completedOrders: 50, totalRevenue: 1500, averageOrderValue: 30 },
      ],
      topPromotions: [],
      promotionPerformance: [],
      customerGrowth: [],
      orderStatusDistribution: {
        distribution: { delivered: 1200, pending: 12, cancelled: 5 },
      },
      trends: { ordersTrend: 5, revenueTrend: 4, customersTrend: 6, driversTrend: 1 },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('renders dashboard sections and stats', () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Gesamt Bestellungen')).toBeInTheDocument();
    expect(screen.getByText('Gesamtumsatz')).toBeInTheDocument();
    expect(screen.getByText('Aktive Fahrer')).toBeInTheDocument();
  });

  it('renders tables for restaurants and drivers', () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByText('Top Restaurants')).toBeInTheDocument();
    expect(screen.getByText('Fahrer-Performance')).toBeInTheDocument();
  });

  it('shows error state', () => {
    (useDashboardData as unknown as jest.Mock).mockReturnValue({
      stats: null,
      revenueData: [],
      topRestaurants: [],
      driverPerformance: [],
      topPromotions: [],
      promotionPerformance: [],
      customerGrowth: [],
      orderStatusDistribution: null,
      trends: null,
      isLoading: false,
      error: new Error('API Error'),
      refetch: jest.fn(),
    });

    renderWithProviders(<Dashboard />);

    expect(screen.getByText('Fehler beim Laden des Dashboards')).toBeInTheDocument();
    expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
  });

  it('shows loading skeleton when loading', () => {
    (useDashboardData as unknown as jest.Mock).mockReturnValue({
      stats: null,
      revenueData: [],
      topRestaurants: [],
      driverPerformance: [],
      topPromotions: [],
      promotionPerformance: [],
      customerGrowth: [],
      orderStatusDistribution: null,
      trends: null,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    const { container } = renderWithProviders(<Dashboard />);
    expect(container.querySelector('.dashboard')).toBeInTheDocument();
  });
});





