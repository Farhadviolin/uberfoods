import { screen, waitFor } from '@testing-library/react';

// Use the global custom render that includes providers
const render = (global as any).customRender;
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrdersManagement } from '../OrdersManagement';
import api from '../../utils/api';

// Mock API
jest.mock('../../utils/api');
const mockApi = api as jest.Mocked<typeof api>;

// Mock WebSocket
jest.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({ isConnected: true }),
}));

// Mock Navigation
jest.mock('../../utils/navigation', () => ({
  openCustomerProfile: jest.fn(),
  openCustomerOrder: jest.fn(),
  openDriverProfile: jest.fn(),
  openDriverOrder: jest.fn(),
  openRestaurantDashboard: jest.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const mockOrders = [
  {
    id: 'order-1',
    status: 'PENDING',
    totalAmount: 25.50,
    createdAt: '2024-01-01T10:00:00Z',
    customer: { id: '1', name: 'John Doe', email: 'john@example.com' },
    restaurant: { id: '1', name: 'Pizza Palace' },
    driver: null,
    items: [
      { dish: { id: '1', name: 'Margherita Pizza' }, quantity: 1, price: 15.50 },
      { dish: { id: '2', name: 'Coke' }, quantity: 1, price: 10.00 },
    ],
  },
  {
    id: 'order-2',
    status: 'DELIVERED',
    totalAmount: 45.00,
    createdAt: '2024-01-02T11:00:00Z',
    customer: { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    restaurant: { id: '2', name: 'Burger Joint' },
    driver: { id: '1', name: 'Driver One' },
    items: [
      { dish: { id: '3', name: 'Cheeseburger' }, quantity: 2, price: 22.50 },
    ],
  },
];

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('OrdersManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();

    // Mock successful API response
    mockApi.get.mockResolvedValue({
      data: {
        data: mockOrders,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      },
    });
  });

  it('should render orders table', async () => {
    renderWithProviders(<OrdersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Bestellungen')).toBeInTheDocument();
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
    expect(screen.getByText('25,50 €')).toBeInTheDocument();
  });

  it('should filter orders by status', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrdersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Bestellungen')).toBeInTheDocument();
    });

    // Find status filter select
    const statusFilter = screen.getByDisplayValue('Alle Status');
    await user.selectOptions(statusFilter, 'PENDING');

    // Should still show John Doe's order
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    // Should not show Jane Smith's delivered order
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  it('should search orders', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrdersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Bestellungen')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Nach Bestellungen suchen...');
    await user.type(searchInput, 'John');

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  it('should update order status', async () => {
    const user = userEvent.setup();

    mockApi.patch.mockResolvedValue({
      data: {
        ...mockOrders[0],
        status: 'CONFIRMED',
      },
    });

    renderWithProviders(<OrdersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Bestellungen')).toBeInTheDocument();
    });

    // Find status update button/dropdown for first order
    const statusButtons = screen.getAllByRole('button', { name: /Ausstehend|Bestätigen/ });
    await user.click(statusButtons[0]);

    // Mock status update call
    expect(mockApi.patch).toHaveBeenCalledWith('/orders/order-1/status', {
      status: 'CONFIRMED',
    });
  });

  it('should assign driver to order', async () => {
    const user = userEvent.setup();

    mockApi.patch.mockResolvedValue({
      data: {
        ...mockOrders[0],
        driver: { id: '1', name: 'Driver One' },
      },
    });

    // Mock drivers API call
    mockApi.get.mockImplementation((url) => {
      if (url === '/drivers') {
        return Promise.resolve({
          data: {
            data: [{ id: '1', name: 'Driver One', isActive: true }],
          },
        });
      }
      return Promise.resolve({ data: { data: mockOrders } });
    });

    renderWithProviders(<OrdersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Bestellungen')).toBeInTheDocument();
    });

    // Find assign driver button
    const assignButtons = screen.getAllByRole('button', { name: /Fahrer zuweisen/ });
    await user.click(assignButtons[0]);

    // Mock driver assignment
    expect(mockApi.patch).toHaveBeenCalledWith('/orders/order-1/assign', {
      driverId: '1',
    });
  });

  it('should handle API errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockApi.get.mockRejectedValueOnce(new Error('API Error'));

    renderWithProviders(<OrdersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Fehler beim Laden der Bestellungen')).toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should show loading state', () => {
    mockApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<OrdersManagement />);

    expect(screen.getByText('Bestellungen werden geladen...')).toBeInTheDocument();
  });

  it('should export orders', async () => {
    const user = userEvent.setup();

    // Mock export functions
    const mockExportToCSV = jest.fn();
    const mockExportToPDF = jest.fn();
    const mockExportToExcel = jest.fn();

    jest.doMock('../../utils/export', () => ({
      exportOrdersToCSV: mockExportToCSV,
      exportOrdersToPDF: mockExportToPDF,
      exportOrdersToExcel: mockExportToExcel,
    }));

    renderWithProviders(<OrdersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Bestellungen')).toBeInTheDocument();
    });

    // Find export button
    const exportButton = screen.getByText('Exportieren');
    await user.click(exportButton);

    // Should show export options
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('Excel')).toBeInTheDocument();
  });
});




