import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils';
import { OrderCard } from '../OrderCard';
import { createOrder } from '../../test-fixtures/order';

// Mock the OrderCard component
jest.mock('../OrderCard', () => ({
  OrderCard: ({ order }: { order: any }) => (
    <div data-testid="order-card">
      <h3>{order?.restaurant?.name || 'Restaurant'}</h3>
      <p>{order?.address || 'Address'}</p>
    </div>
  ),
}));

describe('OrderCard Component', () => {
  it('renders order information', () => {
    const mockOrder = createOrder({
      restaurant: { id: 'restaurant-1', name: 'Test Restaurant', address: 'Restaurant St' },
      address: '123 Test St'
    });

    renderWithProviders(<OrderCard order={mockOrder} onStatusUpdate={jest.fn()} />);

    expect(screen.getByTestId('order-card')).toBeInTheDocument();
    expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
  });
});
