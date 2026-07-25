import { screen } from '@testing-library/react';
import { OrdersManagement } from '../OrdersManagement';

const render = (global as any).customRender;

jest.mock('../../hooks/useOrders', () => ({
  useOrdersInfinite: () => ({
    data: { pages: [{ data: [], hasMore: false }] },
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useUpdateOrderStatus: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useAssignDriver: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock('../../hooks/useRestaurants', () => ({ useRestaurants: () => ({ data: [] }) }));
jest.mock('../../hooks/useDrivers', () => ({ useDrivers: () => ({ data: [] }) }));
jest.mock('../../hooks/useWebSocket', () => ({ useWebSocket: () => ({ isConnected: false }) }));

describe('Current order management contract', () => {
  it('renders search, status filters, and the empty order table', () => {
    render(<OrdersManagement />);
    expect(screen.getByPlaceholderText('Nach ID, Kunde, Restaurant suchen...')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ausstehend' })).toHaveValue('PENDING');
    expect(screen.getByRole('option', { name: 'Geliefert' })).toHaveValue('DELIVERED');
    expect(screen.getByText('Keine Bestellungen gefunden')).toBeInTheDocument();
  });
});
