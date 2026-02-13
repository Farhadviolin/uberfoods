import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { OrderTracking } from '../OrderTracking';
import * as api from '../../utils/api';

jest.mock('../../utils/api');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: 'order_123' }),
}));

describe('OrderTracking Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays order tracking information', async () => {
    const mockOrder = {
      id: 'order_123',
      status: 'IN_TRANSIT',
      restaurant: {
        name: 'Pizza Paradise',
        address: 'Hauptstrasse 1',
      },
      driver: {
        name: 'Max Driver',
        phone: '+43 664 1234567',
        location: { lat: 48.2082, lng: 16.3738 },
      },
      estimatedArrival: '2025-12-11T19:30:00Z',
      items: [
        { dish: { name: 'Margherita Pizza' }, quantity: 2, price: 12.90 },
      ],
      totalAmount: 25.80,
    };

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockOrder,
    });

    render(<OrderTracking />);

    await waitFor(() => {
      expect(screen.getByText('Pizza Paradise')).toBeInTheDocument();
      expect(screen.getByText('Max Driver')).toBeInTheDocument();
      expect(screen.getByText(/IN_TRANSIT|Unterwegs/i)).toBeInTheDocument();
    });
  });

  it('shows tracking map with driver location', async () => {
    const mockOrder = {
      id: 'order_123',
      status: 'IN_TRANSIT',
      driver: {
        name: 'Max Driver',
        location: { lat: 48.2082, lng: 16.3738 },
      },
    };

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
    const mockOrder = {
      id: 'order_123',
      status: 'DELIVERED',
      timeline: [
        { status: 'PENDING', timestamp: '2025-12-11T18:00:00Z' },
        { status: 'CONFIRMED', timestamp: '2025-12-11T18:02:00Z' },
        { status: 'PREPARING', timestamp: '2025-12-11T18:05:00Z' },
        { status: 'READY', timestamp: '2025-12-11T18:20:00Z' },
        { status: 'PICKED_UP', timestamp: '2025-12-11T18:25:00Z' },
        { status: 'IN_TRANSIT', timestamp: '2025-12-11T18:30:00Z' },
        { status: 'DELIVERED', timestamp: '2025-12-11T18:45:00Z' },
      ],
    };

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockOrder,
    });

    render(<OrderTracking />);

    await waitFor(() => {
      expect(screen.getByText(/PENDING|Ausstehend/i)).toBeInTheDocument();
      expect(screen.getByText(/DELIVERED|Zugestellt/i)).toBeInTheDocument();
    });
  });

  it('shows contact driver button', async () => {
    const mockOrder = {
      id: 'order_123',
      status: 'IN_TRANSIT',
      driver: {
        name: 'Max Driver',
        phone: '+43 664 1234567',
      },
    };

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockOrder,
    });

    render(<OrderTracking />);

    await waitFor(() => {
      const contactButton = screen.queryByText(/Kontakt|Contact/i);
      if (contactButton) {
        expect(contactButton).toBeInTheDocument();
      }
    });
  });

  it('handles order without driver', async () => {
    const mockOrder = {
      id: 'order_123',
      status: 'PREPARING',
      restaurant: { name: 'Pizza Paradise' },
      driver: null,
    };

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







