import { screen, waitFor } from '@testing-library/react';

// Use the global custom render that includes providers
const render = (global as any).customRender;
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from '../Dashboard';

// Mock the API module
jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

import api from '../../utils/api';
const mockApiGet = api.get as jest.MockedFunction<typeof api.get>;

describe('Dashboard Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard title and welcome message', () => {
    render(<Dashboard />, { wrapper });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Willkommen im Admin-Panel')).toBeInTheDocument();
  });

  it('renders dashboard sections and stats', async () => {
    const mockData = {
      totalRestaurants: 15,
      totalDishes: 120,
      totalOrders: 450,
      totalRevenue: 12500.50,
      activeOrders: 8,
    };

    mockApiGet.mockImplementation((url) => {
      if (url.includes('/admin/statistics/dashboard')) {
        return Promise.resolve({ data: mockData });
      }
      return Promise.resolve({ data: {} });
    });

    render(<Dashboard />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Top Restaurants')).toBeInTheDocument();
      expect(screen.getByText('Fahrer-Performance')).toBeInTheDocument();
      expect(screen.getByText('Letzte Aktivitäten')).toBeInTheDocument();
      expect(screen.getByText('Schnellzugriff')).toBeInTheDocument();
    });
  });

  it('shows error state', async () => {
    mockApiGet.mockImplementation((url) => {
      if (url.includes('/admin/statistics/dashboard')) {
        return Promise.reject(new Error('API Error'));
      }
      return Promise.resolve({ data: {} });
    });

    render(<Dashboard />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Fehler beim Laden des Dashboards')).toBeInTheDocument();
      expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
    });
  });
});




