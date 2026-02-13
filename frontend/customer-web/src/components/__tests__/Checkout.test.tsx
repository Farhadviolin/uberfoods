import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithCart } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import { Cart } from '../Cart';
import * as api from '../../utils/api';

jest.mock('../../utils/api');

describe('Checkout Component', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays checkout summary', () => {
    renderWithCart(<Cart />);
    expect(screen.getByText(/Checkout|Kasse/i)).toBeInTheDocument();
  });

  it('shows cart items', async () => {
    const mockCart = {
      items: [
        { dish: { name: 'Margherita Pizza', price: 12.90 }, quantity: 2 },
      ],
      total: 25.80,
    };

    renderWithCart(<Cart />);

    await waitFor(() => {
      if (mockCart.items.length > 0) {
        expect(screen.queryByText('Margherita Pizza')).toBeInTheDocument();
      }
    });
  });

  it('validates delivery address', async () => {
    const user = userEvent.setup();

    renderWithCart(<Cart />);

    const submitButton = screen.getByRole('button', { name: /Place Order|Bestellen/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Adresse|Address/i)).toBeInTheDocument();
    });
  });

  it('processes payment with Stripe', async () => {
    const user = userEvent.setup();

    (api.default.post as jest.Mock).mockResolvedValue({
      data: {
        clientSecret: 'pi_test_secret',
        orderId: 'order_123',
      },
    });

    renderWithCart(<Cart />);

    // Fill address
    await user.type(screen.getByLabelText(/Street|Strasse/i), 'Teststrasse 1');
    await user.type(screen.getByLabelText(/City|Stadt/i), 'Wien');
    await user.type(screen.getByLabelText(/ZIP|PLZ/i), '1010');

    // Select payment method
    await user.click(screen.getByText(/Stripe|Kreditkarte/i));

    // Submit
    await user.click(screen.getByRole('button', { name: /Place Order|Bestellen/i }));

    await waitFor(() => {
      expect(api.default.post).toHaveBeenCalledWith(
        expect.stringContaining('/orders'),
        expect.any(Object)
      );
    });
  });

  it('applies promo code', async () => {
    const user = userEvent.setup();

    (api.default.post as jest.Mock).mockResolvedValue({
      data: {
        valid: true,
        discount: 5.00,
        finalAmount: 20.80,
      },
    });

    renderWithCart(<Cart />);

    const promoInput = screen.getByPlaceholderText(/Promo|Gutschein/i);
    await user.type(promoInput, 'SAVE20');
    await user.click(screen.getByRole('button', { name: /Apply|Anwenden/i }));

    await waitFor(() => {
      expect(screen.getByText(/20\.80/)).toBeInTheDocument();
    });
  });
});




