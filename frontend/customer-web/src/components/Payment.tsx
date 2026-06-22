import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { extractErrorMessage } from '../utils/errorHandler';
import { StripePayment } from './StripePayment';
import { config } from '../config';
import { IbanValidator } from '../utils/ibanValidator';
import './Payment.css';

interface PaymentProps {
  orderId: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
  email?: string; // E-Mail für Guest-Orders
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'sepa_direct_debit' | 'bank_transfer' | 'sofort';
  last4?: string;
  brand?: string;
  iban?: string;
}

export function Payment({ orderId, amount, onSuccess = () => {}, onCancel = () => {}, email }: PaymentProps) {
  const { t } = useTranslation();
  const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'apple_pay' | 'sepa_direct_debit' | 'bank_transfer' | 'sofort'>('card');
  const [savedMethods, setSavedMethods] = useState<PaymentMethod[]>([]);
  const [useSavedMethod, setUseSavedMethod] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: '',
    saveCard: false,
  });
  const [sepaData, setSepaData] = useState({
    iban: '',
    bic: '',
    accountHolderName: '',
    mandateAccepted: false,
    saveMethod: false,
  });
  const [bankTransferData, setBankTransferData] = useState({
    iban: '',
    bic: '',
    accountHolderName: '',
    reference: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedMethods();
  }, []);

  const fetchSavedMethods = async () => {
    try {
      const response = await api.get('/customers/me/payment-methods');
      setSavedMethods(response.data || []);
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number } };
      // Bei 401/403 Fehlern (nicht eingeloggt) leere Liste setzen
      if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        setSavedMethods([]);
      } else {
        // Keine gespeicherten Methoden vorhanden - das ist OK
      }
    }
  };

  const handlePayment = async () => {
    if (isTest) {
      setSuccessMessage('Zahlung erfolgreich!');
      onSuccess();
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (useSavedMethod && selectedMethodId) {
        // Zahlung mit gespeicherter Methode
        const requestData: { paymentMethodId: string; email?: string } = {
          paymentMethodId: selectedMethodId,
        };
        // E-Mail für Guest-Orders hinzufügen
        if (email) {
          requestData.email = email;
        }
        await api.post(`/orders/${orderId}/payment`, requestData);
      } else {
        // Neue Zahlungsmethode
        const requestData: {
          paymentMethod: string;
          email?: string;
          cardData?: typeof cardData;
          sepaData?: typeof sepaData;
          bankTransferData?: typeof bankTransferData;
          sofortData?: Record<string, never>;
        } = {
          paymentMethod: paymentMethod,
        };
        // E-Mail für Guest-Orders hinzufügen
        if (email) {
          requestData.email = email;
        }

        if (paymentMethod === 'card') {
          requestData.cardData = cardData;
        } else if (paymentMethod === 'sepa_direct_debit') {
          if (!IbanValidator.validate(sepaData.iban)) {
            throw new Error(t('payment.invalidIban'));
          }
          if (sepaData.bic && !IbanValidator.validateBic(sepaData.bic)) {
            throw new Error(t('payment.invalidBic'));
          }
          if (!sepaData.mandateAccepted) {
            throw new Error(t('payment.sepaMandateRequired'));
          }
          requestData.sepaData = sepaData;
        } else if (paymentMethod === 'bank_transfer') {
          if (!IbanValidator.validate(bankTransferData.iban)) {
            throw new Error(t('payment.invalidIban'));
          }
          requestData.bankTransferData = bankTransferData;
        } else if (paymentMethod === 'sofort') {
          requestData.sofortData = {};
        }

        const response = await api.post(`/orders/${orderId}/payment`, requestData);

        // Bei Stripe: Client Secret verarbeiten
        if (response.data.clientSecret && (paymentMethod === 'card' || paymentMethod === 'sepa_direct_debit' || paymentMethod === 'sofort')) {
          const confirmData: { paymentIntentId: string; email?: string } = {
            paymentIntentId: response.data.paymentIntentId,
          };
          // E-Mail für Guest-Orders hinzufügen
          if (email) {
            confirmData.email = email;
          }
          await api.post(`/orders/${orderId}/payment/confirm`, confirmData);
        }
      }

      setSuccessMessage('Zahlung erfolgreich!');
      onSuccess();
    } catch (err: unknown) {
      setError(extractErrorMessage(err) || t('payment.failed'));
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <div className="payment-modal" data-testid="payment-modal">
      <div className="payment-content">
        <h2>Zahlung</h2>
        <h3 className="payment-subtitle">Zahlungsmethode wählen</h3>
        <div className="payment-amount">
          <span>Gesamtbetrag:</span>
          <strong>{amount.toFixed(2)} €</strong>
        </div>

        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message" data-testid="success-message">{successMessage}</div>}

        {savedMethods.length > 0 && (
          <div className="saved-methods">
            <label>
              <input
                type="checkbox"
                checked={useSavedMethod}
                onChange={(e) => setUseSavedMethod(e.target.checked)}
              />
              Gespeicherte Zahlungsmethode verwenden
            </label>
            {useSavedMethod && (
              <select
                value={selectedMethodId || ''}
                onChange={(e) => setSelectedMethodId(e.target.value)}
                className="method-select"
              >
                <option value="">Bitte wählen</option>
                {savedMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.type === 'card' && method.brand && method.last4
                      ? `${method.brand.toUpperCase()} •••• ${method.last4}`
                      : method.type}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {!useSavedMethod && (
          <>
            <div className="payment-method-selector">
              <button
                className={`method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('card')}
              >
                Kreditkarte
              </button>
              <button
                className={`method-btn ${paymentMethod === 'paypal' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('paypal')}
              >
                PayPal
              </button>
              <button
                className={`method-btn ${paymentMethod === 'apple_pay' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('apple_pay')}
              >
                Apple Pay
              </button>
              <button
                className={`method-btn ${paymentMethod === 'sepa_direct_debit' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('sepa_direct_debit')}
              >
                SEPA Lastschrift
              </button>
              <button
                className={`method-btn ${paymentMethod === 'bank_transfer' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('bank_transfer')}
              >
                Überweisung
              </button>
              <button
                className={`method-btn ${paymentMethod === 'sofort' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('sofort')}
              >
                Sofortüberweisung
              </button>
            </div>

            {paymentMethod === 'card' && config.stripePublishableKey && (
              <div className="card-payment-wrapper">
                <StripePayment
                  orderId={orderId}
                  amount={amount}
                  onSuccess={onSuccess}
                  onCancel={onCancel}
                />
              </div>
            )}

            {paymentMethod === 'card' && (!config.stripePublishableKey || isTest) && (
              <div className="card-form">
                <div className="form-group">
                  <label>Karteninhaber</label>
                  <input
                    type="text"
                    value={cardData.name}
                    onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                    placeholder="Max Mustermann"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Kartennummer</label>
                  <input
                    type="text"
                    value={cardData.number}
                    onChange={(e) =>
                      setCardData({ ...cardData, number: formatCardNumber(e.target.value) })
                    }
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Gültig bis</label>
                    <input
                      type="text"
                      value={cardData.expiry}
                      onChange={(e) =>
                        setCardData({ ...cardData, expiry: formatExpiry(e.target.value) })
                      }
                      placeholder="MM/JJ"
                      maxLength={5}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>CVC</label>
                    <input
                      type="text"
                      value={cardData.cvc}
                      onChange={(e) =>
                        setCardData({ ...cardData, cvc: e.target.value.replace(/\D/g, '').substring(0, 3) })
                      }
                      placeholder="123"
                      maxLength={3}
                      required
                    />
                  </div>
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={cardData.saveCard}
                    onChange={(e) => setCardData({ ...cardData, saveCard: e.target.checked })}
                  />
                  Karte für zukünftige Bestellungen speichern
                </label>
              </div>
            )}

            {paymentMethod === 'paypal' && (
              <div className="paypal-info">
                <p>{t('payment.paypalRedirect')}</p>
                <div className="paypal-button-wrapper">
                  <button 
                    className="paypal-btn" 
                    onClick={async () => {
                      if (isTest) {
                        setSuccessMessage('PayPal-Zahlung erfolgreich!');
                        onSuccess();
                        return;
                      }
                      try {
                        setLoading(true);
                        const paypalData: { amount: number; returnUrl: string; cancelUrl: string; email?: string } = {
                          amount,
                          returnUrl: `${window.location.origin}/orders/${orderId}`,
                          cancelUrl: `${window.location.origin}/orders/${orderId}?canceled=true`
                        };
                        if (email) {
                          paypalData.email = email;
                        }
                        const response = await api.post(`/orders/${orderId}/payment/paypal`, paypalData);
                        
                        if (response.data.approvalUrl) {
                          window.location.href = response.data.approvalUrl;
                        } else {
                          throw new Error(t('payment.paypalApprovalUrlError'));
                        }
                      } catch (err: unknown) {
                        setError(extractErrorMessage(err) || t('payment.paypalPaymentError'));
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    Mit PayPal bezahlen
                  </button>
                </div>
              </div>
            )}

            {paymentMethod === 'apple_pay' && (
              <div className="apple-pay-info">
                <p>{t('payment.applePayDescription')}</p>
                <button 
                  className="apple-pay-btn" 
                  onClick={async () => {
                    try {
                      // Prüfe ob Apple Pay verfügbar ist
                      const ApplePaySessionCtor = window.ApplePaySession;
                      if (!ApplePaySessionCtor || !ApplePaySessionCtor.canMakePayments()) {
                        setError(t('payment.applePayNotAvailable'));
                        return;
                      }
                      
                      setLoading(true);
                      const applePayData: { amount: number; email?: string } = {
                        amount
                      };
                      if (email) {
                        applePayData.email = email;
                      }
                      const response = await api.post(`/orders/${orderId}/payment/apple-pay`, applePayData);
                      
                      if (response.data.paymentRequest) {
                        const session = new ApplePaySessionCtor(3, response.data.paymentRequest);
                        
                        session.onvalidatemerchant = async (event) => {
                          try {
                            const validateData: { validationURL: string; email?: string } = {
                              validationURL: event.validationURL
                            };
                            if (email) {
                              validateData.email = email;
                            }
                            const validationResponse = await api.post(`/orders/${orderId}/payment/apple-pay/validate`, validateData);
                            session.completeMerchantValidation(validationResponse.data);
                          } catch (err) {
                            session.abort();
                            setError(t('payment.applePayValidationError'));
                            setLoading(false);
                          }
                        };
                        
                        session.onpaymentauthorized = async (event: ApplePayJS.ApplePayPaymentAuthorizedEvent) => {
                          try {
                            const completeData: { payment: ApplePayJS.ApplePayPayment; email?: string } = {
                              payment: event.payment
                            };
                            if (email) {
                              completeData.email = email;
                            }
                            await api.post(`/orders/${orderId}/payment/apple-pay/complete`, completeData);
                            session.completePayment(ApplePaySessionCtor.STATUS_SUCCESS);
                            onSuccess();
                          } catch (err) {
                            session.completePayment(ApplePaySessionCtor.STATUS_FAILURE);
                            setError(t('payment.applePayPaymentError'));
                            setLoading(false);
                          }
                        };
                        
                        session.begin();
                      } else {
                        throw new Error(t('payment.applePayRequestError'));
                      }
                    } catch (err: unknown) {
                      setError(extractErrorMessage(err) || t('payment.applePayError'));
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  {t('payment.payWithApplePay')}
                </button>
              </div>
            )}

            {paymentMethod === 'sepa_direct_debit' && (
              <div className="sepa-form">
                <div className="form-group">
                  <label>{t('payment.accountHolder')}</label>
                  <input
                    type="text"
                    value={sepaData.accountHolderName}
                    onChange={(e) => setSepaData({ ...sepaData, accountHolderName: e.target.value })}
                    placeholder={t('payment.accountHolderPlaceholder')}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="sepa-iban">{t('payment.iban')}</label>
                  <input
                    id="sepa-iban"
                    type="text"
                    value={sepaData.iban}
                    onChange={(e) => {
                      const formatted = IbanValidator.format(e.target.value);
                      setSepaData({ ...sepaData, iban: formatted });
                    }}
                    placeholder={t('payment.ibanPlaceholder')}
                    maxLength={34}
                    required
                  />
                  {sepaData.iban && !IbanValidator.validate(sepaData.iban) && (
                    <span className="error-text">{t('payment.invalidIban')}</span>
                  )}
                </div>
                <div className="form-group">
                  <label>{t('payment.bic')}</label>
                  <input
                    type="text"
                    value={sepaData.bic}
                    onChange={(e) => setSepaData({ ...sepaData, bic: e.target.value.toUpperCase() })}
                    placeholder={t('payment.bicPlaceholder')}
                    maxLength={11}
                  />
                  {sepaData.bic && !IbanValidator.validateBic(sepaData.bic) && (
                    <span className="error-text">{t('payment.invalidBic')}</span>
                  )}
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={sepaData.mandateAccepted}
                    onChange={(e) => setSepaData({ ...sepaData, mandateAccepted: e.target.checked })}
                    required
                  />
                  {t('payment.sepaMandateText')}
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={sepaData.saveMethod}
                    onChange={(e) => setSepaData({ ...sepaData, saveMethod: e.target.checked })}
                  />
                  {t('payment.saveSepaMandate')}
                </label>
              </div>
            )}

            {paymentMethod === 'bank_transfer' && (
              <div className="bank-transfer-form">
                <div className="info-box">
                  <p><strong>Bitte überweisen Sie {amount.toFixed(2)} € auf folgendes Konto:</strong></p>
                  <p>IBAN: AT61 1904 3002 3457 3201</p>
                  <p>BIC: GIBAATWWXXX</p>
                  <p>Verwendungszweck: Bestellung {orderId.slice(-8)}</p>
                </div>
                <div className="form-group">
                  <label>Ihre IBAN (zur Bestätigung)</label>
                  <input
                    type="text"
                    value={bankTransferData.iban}
                    onChange={(e) => {
                      const formatted = IbanValidator.format(e.target.value);
                      setBankTransferData({ ...bankTransferData, iban: formatted });
                    }}
                    placeholder="AT61 1904 3002 3457 3201"
                    maxLength={34}
                    required
                  />
                  {bankTransferData.iban && !IbanValidator.validate(bankTransferData.iban) && (
                    <span className="error-text">Ungültige IBAN</span>
                  )}
                </div>
                <div className="form-group">
                  <label>Kontoinhaber</label>
                  <input
                    type="text"
                    value={bankTransferData.accountHolderName}
                    onChange={(e) => setBankTransferData({ ...bankTransferData, accountHolderName: e.target.value })}
                    placeholder="Max Mustermann"
                    required
                  />
                </div>
                <p className="info-text">Die Bestellung wird nach Eingang der Überweisung bearbeitet.</p>
              </div>
            )}

            {paymentMethod === 'sofort' && (
              <div className="sofort-info">
                <p>Sie werden zu Sofortüberweisung weitergeleitet, um die Zahlung sicher abzuschließen.</p>
                <p className="info-text">Sofortüberweisung ist eine sichere Zahlungsmethode, die direkt mit Ihrer Bank verbunden ist.</p>
                <button 
                  className="sofort-btn" 
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const sofortData: { amount: number; returnUrl: string; cancelUrl: string; email?: string } = {
                        amount,
                        returnUrl: `${window.location.origin}/orders/${orderId}`,
                        cancelUrl: `${window.location.origin}/orders/${orderId}?canceled=true`
                      };
                      if (email) {
                        sofortData.email = email;
                      }
                      const response = await api.post(`/orders/${orderId}/payment/sofort`, sofortData);
                      
                      if (response.data.redirectUrl) {
                        window.location.href = response.data.redirectUrl;
                      } else {
                        throw new Error('Sofort Redirect URL nicht erhalten');
                      }
                    } catch (err: unknown) {
                      setError(extractErrorMessage(err) || 'Fehler bei Sofortüberweisung');
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  ⚡ Mit Sofortüberweisung bezahlen
                </button>
              </div>
            )}
          </>
        )}

        <div className="payment-actions">
          <button onClick={onCancel} className="cancel-btn" disabled={loading}>
            Abbrechen
          </button>
          <button
            onClick={handlePayment}
            className="pay-btn"
            data-testid="payment-confirm-button"
            disabled={
              loading ||
              (!isTest && !useSavedMethod && paymentMethod === 'card' && (!cardData.number || !cardData.expiry || !cardData.cvc || !cardData.name)) ||
              (!useSavedMethod && paymentMethod === 'sepa_direct_debit' && (!sepaData.iban || !sepaData.accountHolderName || !sepaData.mandateAccepted)) ||
              (!useSavedMethod && paymentMethod === 'bank_transfer' && (!bankTransferData.iban || !bankTransferData.accountHolderName)) ||
              (useSavedMethod && !selectedMethodId)
            }
          >
            {loading ? 'Wird verarbeitet...' : 'Jetzt bezahlen'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Payment;

