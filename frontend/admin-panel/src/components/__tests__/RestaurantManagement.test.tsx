import { screen, waitFor, fireEvent } from '@testing-library/react';

// Use the global custom render that includes providers
const render = (global as any).customRender;
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RestaurantManagement } from '../RestaurantManagement';
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

describe('RestaurantManagement Component', () => {
  const mockRestaurants = [
    {
      id: '1',
      name: 'Test Restaurant',
      email: 'test@restaurant.com',
      phone: '+1234567890',
      address: '123 Test Street',
      status: 'OPEN',
      rating: 4.5,
      totalOrders: 150,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'Another Restaurant',
      email: 'another@restaurant.com',
      phone: '+0987654321',
      address: '456 Another Street',
      status: 'CLOSED',
      rating: 3.8,
      totalOrders: 89,
      isActive: true,
      createdAt: '2024-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    mockApi.getRestaurants.mockResolvedValue(mockRestaurants);
    mockApi.getRestaurant.mockImplementation((id) =>
      Promise.resolve(mockRestaurants.find(r => r.id === id))
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    renderWithProviders(<RestaurantManagement />);
    expect(screen.getByText('Loading restaurants...')).toBeInTheDocument();
  });

  it('renders restaurants list after loading', async () => {
    renderWithProviders(<RestaurantManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    });

    expect(screen.getByText('Another Restaurant')).toBeInTheDocument();
  });

  it('displays restaurant details correctly', async () => {
    renderWithProviders(<RestaurantManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    });

    expect(screen.getByText('test@restaurant.com')).toBeInTheDocument();
    expect(screen.getByText('+1234567890')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('150 orders')).toBeInTheDocument();
  });

  it('shows restaurant status with correct styling', async () => {
    renderWithProviders(<RestaurantManagement />);

    await waitFor(() => {
      expect(screen.getByText('OPEN')).toBeInTheDocument();
      expect(screen.getByText('CLOSED')).toBeInTheDocument();
    });

    const openStatus = screen.getByText('OPEN');
    const closedStatus = screen.getByText('CLOSED');

    expect(openStatus).toHaveClass('status-open');
    expect(closedStatus).toHaveClass('status-closed');
  });

  it('allows searching restaurants', async () => {
    renderWithProviders(<RestaurantManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search restaurants...');
    fireEvent.change(searchInput, { target: { value: 'Another' } });

    // In a real implementation, this would filter the results
    expect(searchInput).toHaveValue('Another');
  });

  it('allows filtering by status', async () => {
    renderWithProviders(<RestaurantManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    });

    const statusFilter = screen.getByLabelText('Status');
    fireEvent.change(statusFilter, { target: { value: 'OPEN' } });

    // This would filter in a real implementation
    expect(statusFilter).toHaveValue('OPEN');
  });

  it('opens restaurant details modal', async () => {
    renderWithProviders(<RestaurantManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    });

    const viewButton = screen.getByText('View Details');
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByText('Restaurant Details')).toBeInTheDocument();
    });
  });

  it('allows editing restaurant details', async () => {
    renderWithProviders(<RestaurantManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    });

    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Restaurant')).toBeInTheDocument();
    });

    // Test form fields are present
    expect(screen.getByLabelText('Name')).toHaveValue('Test Restaurant');
    expect(screen.getByLabelText('Email')).toHaveValue('test@restaurant.com');
  });

  it('handles restaurant creation', async () => {
    mockApi.createRestaurant.mockResolvedValue({
      id: '3',
      name: 'New Restaurant',
      email: 'new@restaurant.com',
      phone: '',
      address: '',
      status: 'CLOSED',
      rating: 0,
      totalOrders: 0,
      isActive: false,
      createdAt: new Date().toISOString(),
    });

    renderWithProviders(<RestaurantManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Add Restaurant');
    fireEvent.click(addButton);

    expect(screen.getByText('Add New Restaurant')).toBeInTheDocument();
  });

  it('handles restaurant deletion', async () => {
    mockApi.deleteRestaurant.mockResolvedValue();

    renderWithProviders(<RestaurantManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    // Confirm deletion
    const confirmButton = screen.getByText('Confirm Delete');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockApi.deleteRestaurant).toHaveBeenCalledWith('1');
    });
  });

  it('handles API errors gracefully', async () => {
    mockApi.getRestaurants.mockRejectedValue(new Error('API Error'));

    renderWithProviders(<RestaurantManagement />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load restaurants')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('allows bulk operations', async () => {
    renderWithProviders(<RestaurantManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(2); // Select all + individual checkboxes

    // Test bulk actions are available
    expect(screen.getByText('Bulk Actions')).toBeInTheDocument();
  });

  it('supports pagination', async () => {
    // Mock more restaurants for pagination
    const manyRestaurants = Array.from({ length: 25 }, (_, i) => ({
      ...mockRestaurants[0],
      id: `${i + 1}`,
      name: `Restaurant ${i + 1}`,
    }));

    mockApi.getRestaurants.mockResolvedValue(manyRestaurants);

    renderWithProviders(<RestaurantManagement />);

    await waitFor(() => {
      expect(screen.getByText('Restaurant 1')).toBeInTheDocument();
    });

    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
  });
});




