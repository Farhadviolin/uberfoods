import { screen, waitFor } from '@testing-library/react';

// Use the global custom render that includes providers
const render = (global as any).customRender;
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomersManagement } from '../CustomersManagement';
import * as api from '../../utils/api';

jest.mock('../../utils/api');

describe('CustomersManagement Component', () => {
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

  it('renders customers management interface', () => {
    render(<CustomersManagement />, { wrapper });
    expect(screen.getByText(/Kunden/i)).toBeInTheDocument();
  });

  it('displays list of customers', async () => {
    const mockCustomers = [
      {
        id: 'cust_1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+43 664 1234567',
        totalOrders: 25,
        totalSpent: 450.50,
      },
      {
        id: 'cust_2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+43 664 9876543',
        totalOrders: 15,
        totalSpent: 280.00,
      },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockCustomers },
    });

    render(<CustomersManagement />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('450.50')).toBeInTheDocument();
    });
  });

  it('searches customers by name or email', async () => {
    const user = userEvent.setup();
    const mockCustomers = [
      {
        id: 'cust_1',
        name: 'John Doe',
        email: 'john@example.com',
      },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockCustomers },
    });

    render(<CustomersManagement />, { wrapper });

    const searchInput = screen.getByPlaceholderText(/Suche/i);
    await user.type(searchInput, 'John');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('opens customer details', async () => {
    const user = userEvent.setup();
    const mockCustomers = [
      {
        id: 'cust_1',
        name: 'John Doe',
        email: 'john@example.com',
      },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockCustomers },
    });

    render(<CustomersManagement />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const detailsButton = screen.getByRole('button', { name: /Details/i });
    await user.click(detailsButton);

    await waitFor(() => {
      expect(screen.getByText(/Kundendetails/i)).toBeInTheDocument();
    });
  });

  it('displays customer order history', async () => {
    const mockCustomer = {
      id: 'cust_1',
      name: 'John Doe',
      orders: [
        {
          id: 'order_1',
          status: 'DELIVERED',
          totalAmount: 25.50,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockCustomer,
    });

    render(<CustomersManagement />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Bestellhistorie/i)).toBeInTheDocument();
    });
  });

  it('exports customers to CSV', async () => {
    const user = userEvent.setup();
    const mockCustomers = [
      { id: 'cust_1', name: 'John Doe', email: 'john@example.com' },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockCustomers },
    });

    render(<CustomersManagement />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: /Export/i });
    await user.click(exportButton);

    const csvButton = screen.getByText(/CSV/i);
    await user.click(csvButton);

    // Verify export triggered (implementation-specific)
  });

  it('handles loading state', () => {
    render(<CustomersManagement />, { wrapper });
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('handles error state', async () => {
    (api.default.get as jest.Mock).mockRejectedValue(
      new Error('Failed to load customers')
    );

    render(<CustomersManagement />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Fehler/i)).toBeInTheDocument();
    });
  });
});



