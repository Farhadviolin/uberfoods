import { render, screen } from '@testing-library/react';
import { OrdersList } from '../OrdersList';
import { Order } from '../../types';

jest.mock('../OrderCard', () => ({
  OrderCard: ({ order }: any) => <div data-testid={`order-${order.id}`}>{order.id}</div>,
}));

jest.mock('../SkeletonLoader', () => ({
  SkeletonOrderCard: ({ count }: any) => (
    <div data-testid="skeleton-loader">Loading {count} items...</div>
  ),
}));

const mockOrders: Order[] = [
  {
    id: 'order-1',
    status: 'ACCEPTED',
    totalAmount: 25.50,
    restaurant: { name: 'Restaurant 1', address: 'Address 1' },
    customer: { name: 'Customer 1', phone: '+49123456789' },
    address: 'Delivery 1',
    items: [{ dish: { name: 'Pizza' }, quantity: 1, price: 25.50 }],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'order-2',
    status: 'PICKED_UP',
    driverId: 'driver-123',
    totalAmount: 30.00,
    restaurant: { name: 'Restaurant 2', address: 'Address 2' },
    customer: { name: 'Customer 2', phone: '+49123456790' },
    address: 'Delivery 2',
    items: [{ dish: { name: 'Burger' }, quantity: 1, price: 30.00 }],
    createdAt: new Date().toISOString(),
  },
];

describe('OrdersList', () => {
  const mockOnStatusUpdate = jest.fn();
  const mockOnAccept = jest.fn();
  const mockOnReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('zeigt Loading-State', () => {
    render(
      <OrdersList
        orders={[]}
        loading={true}
        onStatusUpdate={mockOnStatusUpdate}
      />
    );

    expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
  });

  it('zeigt Empty-State wenn keine Bestellungen', () => {
    render(
      <OrdersList
        orders={[]}
        loading={false}
        onStatusUpdate={mockOnStatusUpdate}
        emptyMessage="Keine Bestellungen"
      />
    );

    expect(screen.getByText('Keine Bestellungen')).toBeInTheDocument();
  });

  it('rendert alle Bestellungen', () => {
    render(
      <OrdersList
        orders={mockOrders}
        loading={false}
        onStatusUpdate={mockOnStatusUpdate}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByTestId('order-order-1')).toBeInTheDocument();
    expect(screen.getByTestId('order-order-2')).toBeInTheDocument();
  });

  it('verwendet Custom Empty-Message', () => {
    render(
      <OrdersList
        orders={[]}
        loading={false}
        onStatusUpdate={mockOnStatusUpdate}
        emptyMessage="Custom message"
      />
    );

    expect(screen.getByText('Custom message')).toBeInTheDocument();
  });

  it('memoized Komponente verhindert unnötige Re-Renders', () => {
    const { rerender } = render(
      <OrdersList
        orders={mockOrders}
        loading={false}
        onStatusUpdate={mockOnStatusUpdate}
      />
    );

    const initialRenderCount = screen.getAllByTestId(/order-/).length;

    // Re-render mit gleichen Props
    rerender(
      <OrdersList
        orders={mockOrders}
        loading={false}
        onStatusUpdate={mockOnStatusUpdate}
      />
    );

    // Sollte nicht neu rendern (memoized)
    expect(screen.getAllByTestId(/order-/).length).toBe(initialRenderCount);
  });
});
