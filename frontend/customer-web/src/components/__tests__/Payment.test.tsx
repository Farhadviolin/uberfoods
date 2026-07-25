import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Payment } from '../Payment';
import api from '../../utils/api';

interface StripeBoundaryProps {
  orderId: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const mockStripePayment = jest.fn(
  ({ orderId, amount }: StripeBoundaryProps) => (
    <div
      data-testid="stripe-payment"
      data-order-id={orderId}
      data-amount={amount}
    >
      Stripe payment
    </div>
  )
);

jest.mock('../../utils/api');
jest.mock('../StripePayment', () => ({
  StripePayment: (props: StripeBoundaryProps) => mockStripePayment(props),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'payment.iban': 'IBAN',
        'payment.invalidIban': 'Ungültige IBAN',
        'payment.paypalRedirect': 'Sie werden zu PayPal weitergeleitet.',
      };
      return translations[key] || key;
    },
  }),
}));

describe('Payment Component', () => {
  const mockOnSuccess = jest.fn();
  const mockOnCancel = jest.fn();
  const mockApi = jest.mocked(api);

  const renderPayment = async () => {
    const result = render(
      <Payment
        orderId="order123"
        amount={25.98}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/customers/me/payment-methods');
    });
    return result;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockResolvedValue({ data: [] });
    mockApi.post.mockReset();
  });

  it('renders payment method selection', async () => {
    await renderPayment();

    expect(screen.getByRole('heading', { level: 2, name: 'Zahlung' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Zahlungsmethode wählen' })
    ).toBeInTheDocument();

    for (const method of [
      'Kreditkarte',
      'PayPal',
      'Apple Pay',
      'SEPA Lastschrift',
      'Überweisung',
      'Sofortüberweisung',
    ]) {
      expect(screen.getByRole('button', { name: method })).toBeInTheDocument();
    }
  });

  it('displays the order amount in euros', async () => {
    await renderPayment();

    expect(screen.getByText('Gesamtbetrag:')).toBeInTheDocument();
    expect(screen.getByText('25.98 €')).toBeInTheDocument();
  });

  it('passes the current order contract to the Stripe boundary', async () => {
    await renderPayment();

    expect(mockStripePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order123',
        amount: 25.98,
        onSuccess: mockOnSuccess,
        onCancel: mockOnCancel,
      })
    );
    expect(screen.getByTestId('stripe-payment')).toHaveAttribute('data-order-id', 'order123');
    expect(screen.getByTestId('stripe-payment')).toHaveAttribute('data-amount', '25.98');
  });

  it('handles a successful card payment once', async () => {
    await renderPayment();

    fireEvent.click(screen.getByRole('button', { name: 'Jetzt bezahlen' }));

    await waitFor(() => {
      expect(screen.getByTestId('success-message')).toHaveTextContent('Zahlung erfolgreich!');
    });
    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).not.toHaveBeenCalled();
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it('handles PayPal payment flow', async () => {
    await renderPayment();

    const paypalMethod = screen.getByRole('button', { name: 'PayPal' });
    fireEvent.click(paypalMethod);
    expect(paypalMethod).toHaveClass('active');

    fireEvent.click(screen.getByRole('button', { name: 'Mit PayPal bezahlen' }));

    expect(await screen.findByText('PayPal-Zahlung erfolgreich!')).toBeInTheDocument();
    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it('invokes cancellation without reporting payment success', async () => {
    await renderPayment();

    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it('shows validation feedback for an invalid SEPA IBAN', async () => {
    await renderPayment();

    fireEvent.click(screen.getByRole('button', { name: 'SEPA Lastschrift' }));
    const iban = screen.getByRole('textbox', { name: 'IBAN' });
    fireEvent.change(iban, { target: { value: 'invalid-iban' } });

    expect(screen.getByText('Ungültige IBAN')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jetzt bezahlen' })).toBeDisabled();
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it('renders saved payment methods from the current API boundary', async () => {
    mockApi.get.mockResolvedValue({
      data: [{ id: 'saved-card', type: 'card', brand: 'visa', last4: '4242' }],
    });

    await renderPayment();

    const savedMethodToggle = await screen.findByRole('checkbox', {
      name: 'Gespeicherte Zahlungsmethode verwenden',
    });
    fireEvent.click(savedMethodToggle);

    expect(screen.getByRole('option', { name: 'VISA •••• 4242' })).toBeInTheDocument();
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it('shows the bank-transfer contract with the unchanged euro amount', async () => {
    await renderPayment();

    fireEvent.click(screen.getByRole('button', { name: 'Überweisung' }));

    expect(
      screen.getByText('Bitte überweisen Sie 25.98 € auf folgendes Konto:')
    ).toBeInTheDocument();
    expect(screen.getByText('Verwendungszweck: Bestellung order123')).toBeInTheDocument();
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it('changes methods without triggering callbacks or payment requests', async () => {
    await renderPayment();

    const sofort = screen.getByRole('button', { name: 'Sofortüberweisung' });
    fireEvent.click(sofort);

    expect(sofort).toHaveClass('active');
    expect(
      screen.getByRole('button', { name: '⚡ Mit Sofortüberweisung bezahlen' })
    ).toBeInTheDocument();
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnCancel).not.toHaveBeenCalled();
    expect(mockApi.post).not.toHaveBeenCalled();
  });
});


