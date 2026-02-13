import { screen, waitFor, fireEvent } from '@testing-library/react';

// Use the global custom render that includes providers
const render = (global as any).customRender;
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AnalyticsDashboard from '../../pages/analytics/AnalyticsDashboard';
import * as api from '../../utils/api';

// Mock the API
jest.mock('../../utils/api');
const mockApi = api as jest.Mocked<typeof api>;

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('AnalyticsDashboard Component', () => {
  const mockAnalyticsData = {
    overview: {
      totalOrders: 1250,
      totalRevenue: 25680.50,
      activeCustomers: 890,
      activeRestaurants: 45,
      averageOrderValue: 20.54,
      ordersToday: 23,
      revenueToday: 450.75,
      growthRate: 12.5,
    },
    charts: {
      revenueByDay: [
        { date: '2024-01-01', revenue: 1250.00 },
        { date: '2024-01-02', revenue: 1380.50 },
        { date: '2024-01-03', revenue: 1120.75 },
        { date: '2024-01-04', revenue: 1450.25 },
        { date: '2024-01-05', revenue: 1320.00 },
      ],
      ordersByHour: [
        { hour: '10:00', orders: 5 },
        { hour: '11:00', orders: 8 },
        { hour: '12:00', orders: 15 },
        { hour: '13:00', orders: 12 },
        { hour: '18:00', orders: 25 },
        { hour: '19:00', orders: 35 },
        { hour: '20:00', orders: 28 },
      ],
      topDishes: [
        { name: 'Pizza Margherita', orders: 245, revenue: 3208.55 },
        { name: 'Burger', orders: 189, revenue: 2457.00 },
        { name: 'Pasta Carbonara', orders: 156, revenue: 2028.00 },
        { name: 'Sushi Roll', orders: 134, revenue: 1742.00 },
        { name: 'Chicken Curry', orders: 98, revenue: 1274.00 },
      ],
      customerRetention: {
        new: 245,
        returning: 645,
        churned: 45,
      },
    },
    alerts: [
      {
        id: 'high-demand',
        type: 'WARNING',
        title: 'High Demand Alert',
        message: 'Pizza orders increased by 45% in the last hour',
        timestamp: '2024-01-01T12:30:00Z',
        acknowledged: false,
      },
      {
        id: 'low-stock',
        type: 'INFO',
        title: 'Low Stock Alert',
        message: 'Pizza Margherita ingredients running low',
        timestamp: '2024-01-01T11:15:00Z',
        acknowledged: true,
      },
    ],
    insights: [
      {
        id: 'peak-hours',
        title: 'Peak Hours Identified',
        description: 'Your busiest hours are 6-8 PM with 35% of daily orders',
        impact: 'HIGH',
        recommendation: 'Consider adding more drivers during peak hours',
      },
      {
        id: 'popular-dish',
        title: 'Best Performing Dish',
        description: 'Pizza Margherita generates 25% of your revenue',
        impact: 'MEDIUM',
        recommendation: 'Consider promoting this dish more prominently',
      },
    ],
  };

  beforeEach(() => {
    mockApi.getAnalytics.mockResolvedValue(mockAnalyticsData);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    renderWithProviders(<AnalyticsDashboard />);
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });

  it('displays key metrics overview', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('1,250')).toBeInTheDocument(); // Total Orders
    });

    expect(screen.getByText('€25,680.50')).toBeInTheDocument(); // Total Revenue
    expect(screen.getByText('890')).toBeInTheDocument(); // Active Customers
    expect(screen.getByText('45')).toBeInTheDocument(); // Active Restaurants
    expect(screen.getByText('€20.54')).toBeInTheDocument(); // Average Order Value
  });

  it('shows daily metrics', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('23')).toBeInTheDocument(); // Orders Today
    });

    expect(screen.getByText('€450.75')).toBeInTheDocument(); // Revenue Today
    expect(screen.getByText('+12.5%')).toBeInTheDocument(); // Growth Rate
  });

  it('renders revenue chart', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Revenue Trend')).toBeInTheDocument();
    });

    // Chart should be rendered (mocked in test)
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
  });

  it('displays orders by hour chart', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Orders by Hour')).toBeInTheDocument();
    });

    // Should show peak hours data
    expect(screen.getByText('35 orders at 7 PM')).toBeInTheDocument();
  });

  it('shows top performing dishes', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Top Dishes')).toBeInTheDocument();
    });

    expect(screen.getByText('Pizza Margherita')).toBeInTheDocument();
    expect(screen.getByText('245 orders')).toBeInTheDocument();
    expect(screen.getByText('€3,208.55')).toBeInTheDocument();
  });

  it('displays customer retention metrics', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Customer Retention')).toBeInTheDocument();
    });

    expect(screen.getByText('New: 245')).toBeInTheDocument();
    expect(screen.getByText('Returning: 645')).toBeInTheDocument();
    expect(screen.getByText('Churned: 45')).toBeInTheDocument();
  });

  it('shows alerts section', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Alerts')).toBeInTheDocument();
    });

    expect(screen.getByText('High Demand Alert')).toBeInTheDocument();
    expect(screen.getByText('Pizza orders increased by 45%')).toBeInTheDocument();
  });

  it('allows acknowledging alerts', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('High Demand Alert')).toBeInTheDocument();
    });

    const acknowledgeButton = screen.getByText('Acknowledge');
    fireEvent.click(acknowledgeButton);

    // Alert should be marked as acknowledged
    expect(screen.getByText('Acknowledged')).toBeInTheDocument();
  });

  it('displays insights and recommendations', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Insights')).toBeInTheDocument();
    });

    expect(screen.getByText('Peak Hours Identified')).toBeInTheDocument();
    expect(screen.getByText('Best Performing Dish')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument(); // Impact level
  });

  it('allows filtering by date range', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Revenue Trend')).toBeInTheDocument();
    });

    // Date range picker should be available
    const datePicker = screen.getByLabelText('Date Range');
    expect(datePicker).toBeInTheDocument();

    // Select custom range (mock)
    fireEvent.click(datePicker);
    fireEvent.click(screen.getByText('Last 7 days'));

    // Should trigger data refetch
    expect(mockApi.getAnalytics).toHaveBeenCalledTimes(2);
  });

  it('supports different chart views', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Revenue Trend')).toBeInTheDocument();
    });

    // Chart type selector
    const chartSelector = screen.getByLabelText('Chart Type');
    fireEvent.change(chartSelector, { target: { value: 'bar' } });

    // Chart should re-render with new type
    expect(chartSelector).toHaveValue('bar');
  });

  it('allows exporting data', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);

    // Should show export options
    expect(screen.getByText('Export as CSV')).toBeInTheDocument();
    expect(screen.getByText('Export as PDF')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockApi.getAnalytics.mockRejectedValue(new Error('API Error'));

    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load analytics')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows loading states for individual sections', async () => {
    // Simulate slow API for specific sections
    mockApi.getAnalytics.mockImplementation(
      () => new Promise(resolve =>
        setTimeout(() => resolve(mockAnalyticsData), 100)
      )
    );

    renderWithProviders(<AnalyticsDashboard />);

    // Should show section loading states
    expect(screen.getByText('Loading charts...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Revenue Trend')).toBeInTheDocument();
    });
  });

  it('provides real-time updates toggle', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Real-time Updates')).toBeInTheDocument();
    });

    const toggle = screen.getByLabelText('Enable real-time updates');
    fireEvent.click(toggle);

    // Should connect to WebSocket or polling
    expect(toggle).toBeChecked();
  });

  it('is accessible with proper ARIA labels', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('1,250')).toBeInTheDocument();
    });

    // Key metrics should have aria-labels
    const totalOrdersMetric = screen.getByText('1,250');
    expect(totalOrdersMetric).toHaveAttribute('aria-label', 'Total Orders: 1250');
  });

  it('supports keyboard navigation', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    // Tab navigation should work
    const exportButton = screen.getByText('Export');
    exportButton.focus();

    expect(document.activeElement).toBe(exportButton);
  });
});



