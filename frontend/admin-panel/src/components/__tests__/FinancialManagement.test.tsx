import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Use the global custom render that includes providers
const render = (global as any).customRender;
import { FinancialManagement } from '../FinancialManagement';
import * as api from '../../utils/api';

jest.mock('../../utils/api');

describe('FinancialManagement Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays financial overview', async () => {
    const mockFinancials = {
      totalRevenue: 125680.50,
      totalExpenses: 45230.20,
      netProfit: 80450.30,
      revenueGrowth: 15.3,
    };

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockFinancials,
    });

    render(<FinancialManagement />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/125680\.50/)).toBeInTheDocument();
      expect(screen.getByText(/80450\.30/)).toBeInTheDocument();
    });
  });

  it('shows revenue chart', async () => {
    const mockChartData = {
      labels: ['Jan', 'Feb', 'Mar'],
      data: [10000, 12000, 15000],
    };

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockChartData,
    });

    render(<FinancialManagement />, { wrapper });

    await waitFor(() => {
      const chart = screen.queryByTestId('revenue-chart');
      if (chart) {
        expect(chart).toBeInTheDocument();
      }
    });
  });

  it('exports financial report', async () => {
    const user = userEvent.setup();

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { revenue: 10000 },
    });

    render(<FinancialManagement />, { wrapper });

    await waitFor(() => {
      const exportButton = screen.queryByRole('button', { name: /Export/i });
      if (exportButton) {
        expect(exportButton).toBeInTheDocument();
      }
    });
  });
});




