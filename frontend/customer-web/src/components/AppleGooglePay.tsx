import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { logError } from '../utils/errorReporting';
import './AppleGooglePay.css';

interface PaymentRequestDetails {
  methodName: string;
  details: Record<string, unknown>;
  complete: (status: 'success' | 'fail') => void;
}

interface PaymentRequest {
  request: PaymentRequest;
  canMakePayment: () => Promise<boolean>;
  show: () => Promise<PaymentRequestDetails>;
}

interface AppleGooglePayProps {
  orderId: string;
  amount: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function AppleGooglePay({ orderId, amount, onSuccess, onError }: AppleGooglePayProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('PaymentRequest' in window) {
      const PaymentRequestConstructor = (window as any)['PaymentRequest'];
      if (!PaymentRequestConstructor) return;
      const request = new PaymentRequestConstructor(
        [
          {
            supportedMethods: 'https://apple.com/apple-pay',
            data: {
              version: 3,
              merchantIdentifier: import.meta.env.VITE_APPLE_MERCHANT_ID || 'merchant.uberfoods',
              countryCode: 'AT',
              currencyCode: 'EUR',
              supportedNetworks: ['visa', 'masterCard', 'amex'],
            },
          },
          {
            supportedMethods: 'https://google.com/pay',
            data: {
              environment: 'PRODUCTION',
              apiVersion: 2,
              apiVersionMinor: 0,
              merchantInfo: {
                merchantId: import.meta.env.VITE_GOOGLE_MERCHANT_ID || '123456789',
                merchantName: 'UberFoods',
              },
              allowedPaymentMethods: [
                {
                  type: 'CARD',
                  parameters: {
                    allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                    allowedCardNetworks: ['VISA', 'MASTERCARD'],
                  },
                },
              ],
            },
          },
        ],
        {
          total: {
            label: 'UberFoods Bestellung',
            amount: { currency: 'EUR', value: amount.toFixed(2) },
          },
        }
      );

      request.canMakePayment().then((canPay: boolean) => {
        setIsSupported(canPay || false);
        if (canPay) {
          setPaymentRequest({
            request,
            canMakePayment: () => request.canMakePayment(),
            show: () => request.show(),
          });
        }
      });
    }
  }, [amount]);

  const handlePayment = async () => {
    if (!paymentRequest) return;

    setLoading(true);
    try {
      const canPay = await paymentRequest.canMakePayment();
      if (!canPay) {
        onError?.(t('payment.notAvailable') || 'Apple Pay / Google Pay ist nicht verfügbar');
        return;
      }

      const paymentResponse = await paymentRequest.show();
      const method = paymentResponse.methodName;

      // Process payment based on method
      if (method.includes('apple')) {
        await api.post(`/payments/apple-pay`, {
          orderId,
          paymentData: paymentResponse.details,
        });
      } else if (method.includes('google')) {
        await api.post(`/payments/google-pay`, {
          orderId,
          paymentData: paymentResponse.details,
        });
      }

      paymentResponse.complete('success');
      onSuccess?.();
    } catch (error: unknown) {
      logError(error, { component: 'AppleGooglePay', action: 'handlePayment', metadata: { orderId } });
      const errorMessage = error instanceof Error ? error.message : (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      onError?.(errorMessage || t('payment.failed') || 'Zahlung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported || !paymentRequest) {
    return null;
  }

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="apple-google-pay-btn"
      type="button"
    >
      {loading ? '...' : '🍎 Apple Pay / Google Pay'}
    </button>
  );
}

