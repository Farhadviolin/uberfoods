import { fireEvent, screen } from '@testing-library/react';
import { OrdersManagement } from '../OrdersManagement';

const render = (global as any).customRender;
const mockRefetch = jest.fn();
const mockUseOrdersInfinite = jest.fn();
const mockOrders = [
  {
    id: 'order-1', status: 'PENDING', totalAmount: 25.5, address: 'Wien', phone: '123',
    createdAt: '2026-07-25T10:00:00Z', customer: { id: 'c1', name: 'John Doe', email: 'john@example.com' },
    restaurant: { id: 'r1', name: 'Pizza Palace' }, driver: null,
    items: [{ dish: { id: 'd1', name: 'Pizza' }, quantity: 1, price: 25.5 }],
  },
  {
    id: 'order-2', status: 'DELIVERED', totalAmount: 45, address: 'Graz', phone: '456',
    createdAt: '2026-07-24T10:00:00Z', customer: { id: 'c2', name: 'Jane Smith', email: 'jane@example.com' },
    restaurant: { id: 'r2', name: 'Burger Joint' }, driver: { id: 'd1', name: 'Driver One' },
    items: [],
  },
];

jest.mock('../../hooks/useOrders', () => ({
  useOrdersInfinite: (...args: any[]) => {
    mockUseOrdersInfinite(...args);
    return {
    data: { pages: [{ data: mockOrders, hasMore: false }] },
    fetchNextPage: jest.fn(), hasNextPage: false, isFetchingNextPage: false,
    isLoading: false, error: null, refetch: mockRefetch,
    };
  },
}));
jest.mock('../../hooks/useRestaurants', () => ({
  useRestaurants: () => ({ data: mockOrders.map(o => o.restaurant) }),
}));
jest.mock('../../hooks/useDrivers', () => ({
  useDrivers: () => ({ data: [{ id: 'd1', name: 'Driver One' }] }),
}));
jest.mock('../../hooks/useWebSocket', () => ({ useWebSocket: () => ({ isConnected: true }) }));

describe('OrdersManagement', () => {
  beforeEach(() => mockUseOrdersInfinite.mockClear());

  it('renders the current order records and filter controls', () => {
    render(<OrdersManagement />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getAllByText('Pizza Palace').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('option', { name: 'Geliefert' })[0]).toHaveValue('DELIVERED');
  });

  it('filters orders by status', () => {
    render(<OrdersManagement />);
    const status = screen.getAllByRole('option', { name: 'Ausstehend' })[0].parentElement!;
    fireEvent.change(status, { target: { value: 'PENDING' } });
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(mockUseOrdersInfinite).toHaveBeenLastCalledWith(
      { status: 'PENDING' },
      { limit: 50, enabled: true },
    );
  });

  it('filters orders by customer search', () => {
    render(<OrdersManagement />);
    fireEvent.change(screen.getByPlaceholderText('Nach ID, Kunde, Restaurant suchen...'), {
      target: { value: 'Jane' },
    });
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('shows the live connection indicator and export action', () => {
    render(<OrdersManagement />);
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export/ })).toBeEnabled();
  });
});
