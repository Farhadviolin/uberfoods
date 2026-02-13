import { screen, waitFor, fireEvent } from '@testing-library/react';

// Use the global custom render that includes providers
const render = (global as any).customRender;
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrdersManagement } from '../OrdersManagement';
import * as api from '../../services/api';

// Mock the API
jest.mock('../../services/api');
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

describe('OrdersManagement Component', () => {
  const mockOrders = [
    {
      id: 'order1',
      customerId: 'customer1',
      customerName: 'John Doe',
      restaurantId: 'restaurant1',
      restaurantName: 'Test Restaurant',
      status: 'PENDING',
      total: 25.99,
      items: [
        {
          id: '1',
          name: 'Pizza Margherita',
          quantity: 2,
          price: 12.99,
        },
      ],
      deliveryAddress: '123 Test Street',
      createdAt: '2024-01-01T12:00:00Z',
      estimatedDeliveryTime: '2024-01-01T12:30:00Z',
    },
    {
      id: 'order2',
      customerId: 'customer2',
      customerName: 'Jane Smith',
      restaurantId: 'restaurant2',
      restaurantName: 'Another Restaurant',
      status: 'PREPARING',
      total: 18.50,
      items: [
        {
          id: '2',
          name: 'Burger',
          quantity: 1,
          price: 18.50,
        },
      ],
      deliveryAddress: '456 Another Street',
      createdAt: '2024-01-01T12:15:00Z',
      estimatedDeliveryTime: '2024-01-01T12:45:00Z',
    },
  ];

  beforeEach(() => {
    mockApi.getOrders.mockResolvedValue(mockOrders);
    mockApi.getOrder.mockImplementation((id) =>
      Promise.resolve(mockOrders.find(o => o.id === id))
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    renderWithProviders(<OrdersManagement />);
    expect(screen.getByText('Loading orders...')).toBeInTheDocument();
  });

  it('renders orders list after loading', async () => {
    renderWithProviders(<OrdersManagement />);

    await waitFor(() => {
      expect(screen.getByText('order1')).toBeInTheDocument();
    });

    expect(screen.getByText('order2')).toBeInTheDocument();
  });

  it('displays order details correctly', async () => {
    renderWithProviders(<OrdersManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
      expect(screen.getByText('€25.99')).toBeInTheDocument();
    });
  });

  it('shows order status with correct styling', async () => {
    renderWithProviders(<OrdersManagement />);

    await waitFor(() => {
      expect(screen.getByText('PENDING')).toBeInTheDocument();
      expect(screen.getByText('PREPARING')).toBeInTheDocument();
    });

    const pendingStatus = screen.getByText('PENDING');
    const preparingStatus = screen.getByText('PREPARING');

    expect(pendingStatus).toHaveClass('status-pending');
    expect(preparingStatus).toHaveClass('status-preparing');
  });

  it('allows filtering by status', async () => {
    renderWithProviders(<OrdersManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const statusFilter = screen.getByLabelText('Status');
    fireEvent.change(statusFilter, { target: { value: 'PENDING' } });

    expect(statusFilter).toHaveValue('PENDING');
  });

  it('allows searching orders', async () => {
    renderWithProviders(<OrdersManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search orders...');
    fireEvent.change(searchInput, { target: { value: 'John' } });

    expect(searchInput).toHaveValue('John');
  });

  it('opens order details modal', async () => {
    renderWithProviders(<OrdersManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const viewButton = screen.getByText('View Details');
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByText('Order Details')).toBeInTheDocument();
    });

    expect(screen.getByText('Pizza Margherita')).toBeInTheDocument();
    expect(screen.getByText('2 x €12.99')).toBeInTheDocument();
  });

  it('allows updating order status', async () => {
    mockApi.updateOrderStatus.mockResolvedValue();

    renderWithProviders(<OrdersManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const viewButton = screen.getByText('View Details');
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByText('Order Details')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText('Order Status');
    fireEvent.change(statusSelect, { target: { value: 'PREPARING' } });

    const updateButton = screen.getByText('Update Status');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(mockApi.updateOrderStatus).toHaveBeenCalledWith('order1', 'PREPARING');
    });
  });

  it('handles order cancellation', async () => {
    mockApi.cancelOrder.mockResolvedValue();

    renderWithProviders(<OrdersManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel Order');
    fireEvent.click(cancelButton);

    // Confirm cancellation
    const confirmButton = screen.getByText('Confirm Cancellation');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockApi.cancelOrder).toHaveBeenCalledWith('order1');
    });
  });

  it('shows real-time updates', async () => {
    renderWithProviders(<OrdersManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // This would require WebSocket mocking in a real implementation
    expect(screen.getByText('Real-time')).toBeInTheDocument();
  });

  it('displays delivery information', async () => {
    renderWithProviders(<OrdersManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const viewButton = screen.getByText('View Details');
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByText('Delivery Address')).toBeInTheDocument();
      expect(screen.getByText('123 Test Street')).toBeInTheDocument();
    });
  });

  it('handles bulk status updates', async () => {
    mockApi.bulkUpdateOrderStatus.mockResolvedValue();

    renderWithProviders(<OrdersManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Select orders for bulk update
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // Select first order

    const bulkActionSelect = screen.getByLabelText('Bulk Action');
    fireEvent.change(bulkActionSelect, { target: { value: 'PREPARING' } });

    const applyButton = screen.getByText('Apply');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockApi.bulkUpdateOrderStatus).toHaveBeenCalledWith(['order1'], 'PREPARING');
    });
  });

  it('shows order analytics', async () => {
    renderWithProviders(<OrdersManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Orders')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockApi.getOrders.mockRejectedValue(new Error('API Error'));

    renderWithProviders(<OrdersManagement />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load orders')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});




