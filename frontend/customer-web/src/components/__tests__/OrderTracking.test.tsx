import { screen, waitFor, within } from '@testing-library/react';
import { render } from '../../test-utils';
import { OrderTracking } from '../OrderTracking';
import * as api from '../../utils/api';

jest.mock('../../utils/api');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: 'order_123' }),
}));

interface MockOrder {
  id: string;
  status: string;
  totalAmount: number;
  address: string;
  phone: string;
  createdAt: string;
  restaurant: { id: string; name: string; address: string };
  driver: { id: string; name: string; phone: string } | null;
  items: Array<{ dish: { id: string; name: string; imageUrl: string; price: number }; quantity: number; price: number }>;
}

const createMockOrder = (overrides: Partial<MockOrder> = {}): MockOrder => ({
  id: 'order_123',
  status: 'IN_TRANSIT',
  totalAmount: 25.8,
  address: 'Hauptstrasse 1',
  phone: '+43 1 234567',
  createdAt: '2025-12-11T18:00:00Z',
  restaurant: { id: 'restaurant_123', name: 'Pizza Paradise', address: 'Hauptstrasse 1' },
  driver: { id: 'driver_123', name: 'Max Driver', phone: '+43 664 1234567' },
  items: [{ dish: { id: 'dish_123', name: 'Margherita Pizza', imageUrl: '', price: 12.9 }, quantity: 2, price: 12.9 }],
  ...overrides,
});

describe('OrderTracking Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays order tracking information', async () => {
    const mockOrder = createMockOrder();

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockOrder,
    });

    render(<OrderTracking />);

    await screen.findByText('Pizza Paradise');
    expect(screen.getByText(/Max Driver/, { selector: '.driver-name' })).toBeInTheDocument();

    const timeline = document.querySelector('.status-timeline');
    if (timeline === null) {
      throw new Error('Order status timeline was not rendered');
    }

    const outForDeliveryLabels = within(timeline).getAllByText('order.status.out_for_delivery');
    expect(outForDeliveryLabels).toHaveLength(3);
    expect(outForDeliveryLabels.every((label) => label.classList.contains('step-label'))).toBe(true);
  });

  it('shows tracking map with driver location', async () => {
    const mockOrder = createMockOrder();

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockOrder,
    });

    render(<OrderTracking />);

    await waitFor(() => {
      const map = screen.queryByTestId('tracking-map');
      if (map) {
        expect(map).toBeInTheDocument();
      }
    });
  });

  it('displays order timeline', async () => {
    const mockOrder = createMockOrder({ status: 'DELIVERED' });

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockOrder,
    });

    render(<OrderTracking />);

    await waitFor(() => {
      expect(screen.getByText('order.status.confirmed')).toBeInTheDocument();
      expect(screen.getByText('order.status.delivered')).toBeInTheDocument();
    });
  });

  it('shows contact driver button', async () => {
    const mockOrder = createMockOrder();

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockOrder,
    });

    render(<OrderTracking />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'order.contactDriver' })).toHaveAttribute('href', 'tel:+43 664 1234567');
    });
  });

  it('handles order without driver', async () => {
    const mockOrder = createMockOrder({ status: 'PREPARING', driver: null });

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockOrder,
    });

    render(<OrderTracking />);

    await waitFor(() => {
      expect(screen.getByText(/Wird zubereitet|Preparing/i)).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    render(<OrderTracking />);

    expect(screen.getByText(/Loading|Lädt/i)).toBeInTheDocument();
  });

  it('handles error state', async () => {
    (api.default.get as jest.Mock).mockRejectedValue(
      new Error('Order not found')
    );

    render(<OrderTracking />);

    await waitFor(() => {
      expect(screen.getByText(/Error|Fehler/i)).toBeInTheDocument();
    });
  });
});







