import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { config } from '../config';
import api from '../utils/api';
import { extractErrorMessage } from '../utils/errorHandler';
import { logError } from '../utils/errorReporting';
import { AxiosErrorWithResponse } from '../types';
import './StripePayment.css';

// Stripe nur initialisieren wenn Key vorhanden ist
const stripePromise = config.stripePublishableKey 
  ? loadStripe(config.stripePublishableKey)
  : null;

interface StripePaymentProps {
  orderId: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

function PaymentForm({ orderId, amount, onSuccess, onCancel }: StripePaymentProps) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [saveCard, setSaveCard] = useState(false);

  useEffect(() => {
    // Create PaymentIntent
    const createPaymentIntent = async () => {
      if (!orderId || amount <= 0) {
        return;
      }

      try {
        const response = await api.post('/payments/create-intent', {
          orderId,
          amount: Math.round(amount * 100), // Convert to cents
        });
        setClientSecret(response.data.clientSecret);
      } catch (err: unknown) {
        const axiosError = err as AxiosErrorWithResponse;
        // Besseres Error-Handling für verschiedene Fehlertypen
        if (axiosError.response?.status === 500) {
          setError('Zahlungsservice ist derzeit nicht verfügbar. Bitte versuchen Sie es später erneut.');
        } else if (axiosError.response?.status === 404) {
          setError('Zahlungsendpunkt nicht gefunden. Bitte kontaktieren Sie den Support.');
        } else {
          setError(extractErrorMessage(axiosError) || 'Fehler beim Erstellen der Zahlung');
        }
      }
    };

    createPaymentIntent();
  }, [orderId, amount]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setLoading(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setError('Kartenelement nicht gefunden');
      setLoading(false);
      return;
    }

    try {
      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              // Add billing details if available
            },
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message || t('payment.failed'));
        setLoading(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        // Save card if requested
        if (saveCard) {
          try {
            await api.post('/payments/save-method', {
              paymentIntentId: paymentIntent.id,
            });
          } catch (saveError) {
            logError(saveError, { component: 'StripePayment', action: 'saveCard', metadata: { orderId } });
            // Don't fail the payment if saving fails
          }
        }

        // Confirm payment on backend
        await api.post(`/orders/${orderId}/payment/confirm`, {
          paymentIntentId: paymentIntent.id,
        });

        onSuccess();
      }
    } catch (err) {
      setError(extractErrorMessage(err) || t('payment.failed'));
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#050505',
        '::placeholder': {
          color: '#8A8D91',
        },
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      },
      invalid: {
        color: '#E41E3F',
        iconColor: '#E41E3F',
      },
    },
    hidePostalCode: false,
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-payment-form">
      <div className="payment-amount">
        <span>Gesamtbetrag:</span>
        <strong>{amount.toFixed(2)} €</strong>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="card-element-container">
        <label>Kartendaten</label>
        <div className="card-element-wrapper">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={saveCard}
          onChange={(e) => setSaveCard(e.target.checked)}
        />
        Karte für zukünftige Bestellungen speichern
      </label>

      <div className="payment-actions">
        <button type="button" onClick={onCancel} className="cancel-btn" disabled={loading}>
          Abbrechen
        </button>
        <button
          type="submit"
          className="pay-btn"
          disabled={!stripe || loading || !clientSecret}
        >
          {loading ? 'Wird verarbeitet...' : `${amount.toFixed(2)} € bezahlen`}
        </button>
      </div>
    </form>
  );
}

export function StripePayment(props: StripePaymentProps) {
  const options: StripeElementsOptions = {
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#1877F2',
        colorBackground: '#FFFFFF',
        colorText: '#050505',
        colorDanger: '#E41E3F',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  };

  if (!config.stripePublishableKey || !stripePromise) {
    return (
      <div className="payment-error">
        <p>Stripe ist nicht konfiguriert</p>
        <p className="error-detail">
          Bitte setzen Sie VITE_STRIPE_PUBLISHABLE_KEY in Ihrer .env Datei.
        </p>
      </div>
    );
  }

  return (
    <div className="payment-modal">
      <div className="payment-content">
        <h2>Zahlung mit Kreditkarte</h2>
        <Elements stripe={stripePromise} options={options}>
          <PaymentForm {...props} />
        </Elements>
      </div>
    </div>
  );
}

