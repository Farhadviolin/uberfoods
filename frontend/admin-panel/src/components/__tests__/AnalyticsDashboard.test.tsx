import { fireEvent, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AnalyticsDashboard from '../../pages/analytics/AnalyticsDashboard';
import { api } from '../../utils/api';

jest.unmock('@tanstack/react-query');
jest.mock('../../utils/api', () => ({
  api: { get: jest.fn() },
  default: { get: jest.fn() },
}));

const render = (global as any).customRender;
const mockGet = api.get as jest.Mock;

const overview = {
  todayMetrics: {
    orders: 23,
    revenue: 450.75,
    avgOrderValue: 19.6,
    activeDrivers: 12,
    onlineRestaurants: 8,
  },
  growth: { orders: 12.5, revenue: -3.2 },
  trends: { metric: 'orders', period: 'week', data: [], overallGrowth: 0 },
};

const revenue = {
  period: 'week',
  dateRange: { start: '2024-01-01', end: '2024-01-07' },
  summary: { totalRevenue: 25680.5, totalOrders: 1250, avgOrderValue: 20.54, avgDailyRevenue: 3668.64 },
  dailyData: [{ date: '2024-01-01', orders: 20, revenue: 400, deliveryFees: 30, avgOrderValue: 20 }],
  byPaymentMethod: [{ method: 'CARD', count: 20, amount: 400 }],
};

const trends = {
  overallGrowth: 7.5,
  data: [{ date: '2024-01-01', value: 20, growth: 5, predicted: 22 }],
};

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AnalyticsDashboard />
    </QueryClientProvider>,
  );
}

describe('AnalyticsDashboard Component', () => {
  beforeEach(() => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/analytics/dashboard/overview') return Promise.resolve({ data: overview });
      if (url.startsWith('/analytics/revenue')) return Promise.resolve({ data: revenue });
      if (url.startsWith('/analytics/trends')) return Promise.resolve({ data: trends });
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
  });

  it('renders the localized loading state initially', () => {
    mockGet.mockReturnValueOnce(new Promise(() => undefined));
    renderDashboard();
    expect(screen.getByText('Lade Analytics-Daten...')).toBeInTheDocument();
  });

  it('loads all current analytics endpoints', async () => {
    renderDashboard();
    await screen.findByRole('heading', { name: 'Analytics Dashboard' });
    expect(mockGet).toHaveBeenCalledWith('/analytics/dashboard/overview');
    expect(mockGet).toHaveBeenCalledWith('/analytics/revenue?period=week');
    expect(mockGet).toHaveBeenCalledWith('/analytics/trends?metric=orders&period=week');
  });

  it('displays the current KPI contract', async () => {
    renderDashboard();
    await screen.findByText('€450.75');
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('€19.60')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders positive and negative daily growth', async () => {
    renderDashboard();
    await screen.findByText('12.5%');
    expect(screen.getByText('3.2%')).toBeInTheDocument();
    expect(screen.getAllByText('vs gestern')).toHaveLength(2);
  });

  it('renders the trend sections from the current response', async () => {
    renderDashboard();
    await screen.findByText('Umsatz-Trend');
    expect(screen.getByText('Bestellungen-Trend')).toBeInTheDocument();
    expect(screen.getByText('+7.5%')).toBeInTheDocument();
  });

  it('changes the revenue endpoint when the period changes', async () => {
    renderDashboard();
    fireEvent.click(await screen.findByText('Dieser Monat'));
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/analytics/revenue?period=month'));
  });

  it('offers every supported reporting period', async () => {
    renderDashboard();
    await screen.findByRole('heading', { name: 'Analytics Dashboard' });
    expect(screen.getByText('Heute')).toBeInTheDocument();
    expect(screen.getByText('Diese Woche')).toBeInTheDocument();
    expect(screen.getByText('Dieser Monat')).toBeInTheDocument();
    expect(screen.getByText('Dieses Jahr')).toBeInTheDocument();
  });

  it('exposes the export action', async () => {
    renderDashboard();
    expect(await screen.findByRole('button', { name: /Export/ })).toBeEnabled();
  });
});
