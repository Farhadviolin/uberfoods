import { useState, useEffect, useCallback, useMemo, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useGeocodeAddress } from '../hooks/useGeocoding';
import api from '../utils/api';
import { Payment } from './Payment';
import { PromoCodeInput } from './PromoCodeInput';
import { extractErrorMessage } from '../utils/errorHandler';
import { logDebug } from '../utils/errorReporting';
import { handleKeyboardButton } from '../utils/accessibility';
import './Cart.css';

interface Dish {
  id: string;
  name: string;
  price: number;
}

interface Restaurant {
  id: string;
  name: string;
}

interface CartItem {
  dish: Dish;
  quantity: number;
  modifications?: {
    extras?: string[];
    removals?: string[];
    notes?: string;
  };
  specialInstructions?: string;
}

interface CartProps {
  cart?: CartItem[];
  restaurant?: Restaurant;
  updateQuantity?: (dishId: string, quantity: number) => void;
  onClearCart?: () => void;
}

export function Cart({ cart, restaurant, updateQuantity, onClearCart }: CartProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<string>('PERCENTAGE');
  // promotionId wird für zukünftige Verwendung gespeichert
  const [, setPromotionId] = useState<string | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [minOrderAmount, setMinOrderAmount] = useState(0);
  const [minOrderMissing, setMinOrderMissing] = useState(0);
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState<number | null>(null);
  const [deliverySpeed, setDeliverySpeed] = useState<'standard' | 'priority'>('standard');
  const [serviceFee, setServiceFee] = useState(0);
  const [guestInfo, setGuestInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const { user } = useAuth();
  const cartContext = useCart();
  const navigate = useNavigate();

  const markCheckoutProbe = useCallback((patch: Record<string, unknown>) => {
    if (typeof window === 'undefined') return;
    const probe = (window as unknown as { __checkoutSubmitProbe?: Record<string, unknown> }).__checkoutSubmitProbe;
    if (!probe) return;
    (window as unknown as { __checkoutSubmitProbe?: Record<string, unknown> }).__checkoutSubmitProbe = {
      ...probe,
      ...patch,
    };
  }, []);

  const parseStoredJson = useCallback((raw: string | null): unknown => {
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') {
        try {
          return JSON.parse(parsed);
        } catch {
          return parsed;
        }
      }
      return parsed;
    } catch {
      return raw;
    }
  }, []);

  const effectiveCart = cart ?? cartContext.items.map(item => ({
    dish: {
      id: item.dishId,
      name: item.name,
      price: item.price,
    },
    quantity: item.quantity,
  }));
  const effectiveRestaurant = restaurant ?? {
    id: cartContext.restaurantId || 'unknown',
    name: t('cart.title'),
  };
  const effectiveUpdateQuantity = updateQuantity ?? ((dishId: string, quantity: number) => {
    const current = cartContext.items.find(item => item.dishId === dishId);
    if (!current) return;
    if (quantity <= 0) {
      cartContext.removeItem(dishId);
      return;
    }
    if (quantity > current.quantity) {
      for (let i = 0; i < quantity - current.quantity; i++) {
        cartContext.increaseQuantity(dishId);
      }
    } else if (quantity < current.quantity) {
      for (let i = 0; i < current.quantity - quantity; i++) {
        cartContext.decreaseQuantity(dishId);
      }
    }
  });
  const effectiveClearCart = onClearCart ?? cartContext.clearCart;

  // Geocode user address or guest address using the hook
  const addressToGeocode = user?.address || guestInfo.address || '';
  const { data: geocodeData } = useGeocodeAddress(addressToGeocode);

  // Memoize subtotal calculation
  const subtotal = useMemo(
    () => effectiveCart.reduce((sum, item) => sum + item.dish.price * item.quantity, 0),
    [effectiveCart]
  );

  // Lade Delivery Fee und Min Order Amount
  useEffect(() => {
    const loadDeliveryInfo = async () => {
      const address = user?.address || guestInfo.address;
      if (!address || !effectiveRestaurant.id) return;

      try {
        // Validiere Min Order Amount
        const minOrderResponse = await api.post(`/restaurants/${effectiveRestaurant.id}/validate-min-order`, {
          subtotal,
        });
        
        if (minOrderResponse.data) {
          setMinOrderAmount(minOrderResponse.data.minAmount);
          setMinOrderMissing(minOrderResponse.data.missing);
        }

        // Verwende gecoded Koordinaten vom Hook oder Fallback
        const customerLocation = geocodeData?.coordinates || { lat: 0, lng: 0 };

        // Berechne Delivery Fee mit echten Koordinaten
        const deliveryFeeResponse = await api.post(`/restaurants/${effectiveRestaurant.id}/delivery-fee`, {
          subtotal,
          customerLocation,
        });

        if (deliveryFeeResponse.data) {
          const baseFee = deliveryFeeResponse.data.deliveryFee || 0;
          setDeliveryFee(deliverySpeed === 'priority' ? baseFee * 1.5 : baseFee);
        }

        // Geschätzte Lieferzeit
        const deliveryTimeResponse = await api.post(`/restaurants/${effectiveRestaurant.id}/estimated-delivery-time`, {
          customerLocation,
        });

        if (deliveryTimeResponse.data) {
          const baseTime = deliveryTimeResponse.data.estimatedDeliveryTime || 30;
          setEstimatedDeliveryTime(deliverySpeed === 'priority' ? Math.max(15, baseTime - 10) : baseTime);
        }

        // Service Fee (2% des Subtotal, max 3€)
        const calculatedServiceFee = Math.min(subtotal * 0.02, 3);
        setServiceFee(calculatedServiceFee);
      } catch (err) {
        // Fehler ignorieren - verwende Standardwerte
        logDebug('Fehler beim Laden der Delivery-Info', err, { component: 'Cart', action: 'loadDeliveryInfo' });
        setDeliveryFee(2.5); // Fallback
      }
    };

    loadDeliveryInfo();
  }, [subtotal, effectiveRestaurant.id, user?.address, guestInfo.address, geocodeData, deliverySpeed]);
  
  // Memoize discount calculation
  const discountAmount = useMemo(() => {
    if (discount <= 0) return 0;
    const calculated = discountType === 'PERCENTAGE' 
      ? (subtotal * discount) / 100 
      : discount;
    // Stelle sicher, dass Discount nicht größer als Subtotal ist
    return Math.min(calculated, subtotal);
  }, [discount, discountType, subtotal]);

  // Memoize total amount calculation
  const totalAmount = useMemo(
    () => subtotal - discountAmount + deliveryFee + serviceFee,
    [subtotal, discountAmount, deliveryFee, serviceFee]
  );

  const resolveCustomerId = useCallback(() => {
    const candidateValues = [
      user && typeof user === 'object' ? (user as { customerId?: unknown; customer?: { id?: unknown }; id?: unknown }).customerId : undefined,
      user && typeof user === 'object' ? (user as { customerId?: unknown; customer?: { id?: unknown }; id?: unknown }).customer?.id : undefined,
      user?.id,
    ];

    const runtimeCandidates = candidateValues
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

    if (runtimeCandidates.length > 0) {
      return runtimeCandidates[0].trim();
    }

    try {
      const storedUserRaw = localStorage.getItem('customer_user');
      if (storedUserRaw) {
        const storedUser = JSON.parse(storedUserRaw) as {
          customerId?: unknown;
          customer?: { id?: unknown };
          id?: unknown;
        };
        const storedCandidate = [
          storedUser.customerId,
          storedUser.customer?.id,
          storedUser.id,
        ].find((value): value is string => typeof value === 'string' && value.trim().length > 0);
        if (storedCandidate) {
          return storedCandidate.trim();
        }
      }
    } catch {
      // ignore storage parse issues and fall through to error
    }

    return '';
  }, [user]);

  const placeOrder = useCallback(async () => {
    markCheckoutProbe({ placeOrderCalled: true });

    const normalizeAddress = (value: unknown): string => {
      if (typeof value === 'string') {
        return value.trim();
      }

      if (value && typeof value === 'object') {
        const addressObject = value as Record<string, unknown>;

        return [
          addressObject.street,
          addressObject.houseNumber,
          addressObject.zip,
          addressObject.zipCode,
          addressObject.postalCode,
          addressObject.city,
          addressObject.state,
          addressObject.country,
        ]
          .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
          .map((part) => part.trim())
          .join(' ')
          .trim();
      }

      return '';
    };

    const resolveEffectiveCustomerAddress = (): string => {
      const contextAddress = normalizeAddress(user?.address);

      if (contextAddress) {
        return contextAddress;
      }

      if (typeof window === 'undefined') {
        return '';
      }

      const storedCustomerUserRaw = window.localStorage.getItem('customer_user');
      const storedCustomerUser = parseStoredJson(storedCustomerUserRaw) as Record<string, unknown> | null;
      const storedProfileAddress = parseStoredJson(window.localStorage.getItem('customer_profile_address'));

      const candidateAddresses = [
        storedCustomerUser?.address,
        (storedCustomerUser?.user as Record<string, unknown> | undefined)?.address,
        (storedCustomerUser?.customer as Record<string, unknown> | undefined)?.address,
        (storedCustomerUser?.profile as Record<string, unknown> | undefined)?.address,
        (storedCustomerUser?.data as Record<string, unknown> | undefined)?.address,
        storedProfileAddress,
      ];

      for (const candidate of candidateAddresses) {
        const resolved = normalizeAddress(candidate);
        if (resolved) {
          return resolved;
        }
      }

      return '';
    };

    if (effectiveCart.length === 0) {
      markCheckoutProbe({ guard: 'empty-cart' });
      setError(t('cart.emptyError'));
      return;
    }

    // Guest-Checkout Validierung
    if (!user) {
      if (!guestInfo.name || !guestInfo.email || !guestInfo.phone || !guestInfo.address) {
        markCheckoutProbe({ guard: 'missing-guest-fields' });
        setError(t('cart.guestFieldsError'));
        return;
      }
    } else {
      const resolvedEffectiveAddress = resolveEffectiveCustomerAddress();
      console.log('checkoutResolvedAddressBeforeGuard', {
        contextUserAddress: user?.address ?? null,
        storedCustomerUserRaw: typeof window !== 'undefined'
          ? window.localStorage.getItem('customer_user')
          : null,
        resolvedEffectiveAddress,
      });
      if (!resolvedEffectiveAddress) {
        markCheckoutProbe({
          guard: 'missing-user-address',
          contextUserAddress: user?.address ?? null,
          storedCustomerUserRaw: typeof window === 'undefined'
            ? null
            : window.localStorage.getItem('customer_user'),
          resolvedEffectiveAddress,
        });
        setError(t('cart.addressRequiredError'));
        return;
      }
    }

    // Prüfe Mindestbestellwert
    if (minOrderMissing > 0) {
      markCheckoutProbe({ guard: 'minimum-order-missing', minOrderMissing });
      setError(`Mindestbestellwert von ${minOrderAmount.toFixed(2)}€ nicht erreicht. Noch ${minOrderMissing.toFixed(2)}€ fehlen.`);
      return;
    }

    markCheckoutProbe({ beforeApiPost: true, apiPostUrl: '/orders/customer' });
    setLoading(true);
    setError(null);

    try {
      const customerId = resolveCustomerId();
      const resolvedEffectiveAddress = resolveEffectiveCustomerAddress();
      const normalizedItems = effectiveCart.map(item => ({
        dishId: item.dish.id,
        quantity: item.quantity,
        ...(item.modifications ? { modifications: item.modifications } : {}),
        ...(item.specialInstructions ? { specialInstructions: item.specialInstructions } : {}),
      }));
      const order = {
        customerId,
        restaurantId: effectiveRestaurant.id,
        items: normalizedItems,
        address: resolvedEffectiveAddress,
        deliveryAddress: resolvedEffectiveAddress,
        phone: user?.phone || guestInfo.phone,
        notes: '',
        promotionId: promoCode || undefined,
        deliveryFee,
      };

      const forbiddenPayloadKeysPresent = [
        'totalAmount',
        'email',
        'name',
        'isGuest',
        'deliverySpeed',
        'estimatedDeliveryTime',
      ].filter((key) => Object.prototype.hasOwnProperty.call(order, key));

      logDebug('Checkout order payload summary', {
        component: 'Cart',
        action: 'placeOrder',
        metadata: {
          customerIdPresent: Boolean(customerId),
          customerIdType: typeof customerId,
          itemCount: order.items.length,
          itemKeys: order.items[0] ? Object.keys(order.items[0]) : [],
          forbiddenPayloadKeysPresent,
          hasAddress: Boolean(order.address),
          hasPhone: Boolean(order.phone),
          hasPromotionId: Boolean(order.promotionId),
          hasDeliveryFee: typeof order.deliveryFee === 'number',
        },
      });

      if (!customerId || typeof customerId !== 'string') {
        throw new Error('Cannot place order without customerId');
      }

      const response = await api.post('/orders/customer', order);
      markCheckoutProbe({ apiPostCalled: true });
      setOrderId(response.data.id);
      setShowPayment(true);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { status?: number; statusText?: string; data?: unknown };
        config?: { url?: string };
      };
      logDebug('Checkout order request failed', {
        component: 'Cart',
        action: 'placeOrder',
        metadata: {
          status: axiosError.response?.status ?? null,
          statusText: axiosError.response?.statusText ?? null,
          url: axiosError.config?.url ?? null,
          body: typeof axiosError.response?.data === 'string'
            ? (axiosError.response.data as string).slice(0, 500)
            : JSON.stringify(axiosError.response?.data ?? null).slice(0, 500),
        },
      });
      setError(extractErrorMessage(err) || t('cart.orderError'));
    } finally {
      setLoading(false);
    }
  }, [effectiveCart, user, guestInfo, effectiveRestaurant.id, promoCode, minOrderMissing, minOrderAmount, deliveryFee, logDebug, t, resolveCustomerId, parseStoredJson]);

  const handlePaymentSuccess = useCallback(() => {
    // Warenkorb leeren
    effectiveClearCart();
    localStorage.removeItem(`cart_${effectiveRestaurant.id}`);
    setShowPayment(false);
    // Zur Bestellverfolgung navigieren
    if (orderId) {
      // Speichere E-Mail für Guest-Orders, damit Tracking funktioniert
      if (!user && guestInfo.email) {
        localStorage.setItem(`guest_order_${orderId}`, guestInfo.email);
      }
      navigate(`/orders/${orderId}`);
    }
  }, [effectiveClearCart, effectiveRestaurant.id, orderId, navigate, user, guestInfo.email]);

  const handlePaymentCancel = useCallback(() => {
    setShowPayment(false);
    setOrderId(null);
  }, []);

  const handleCheckoutSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    markCheckoutProbe({ handleCheckoutSubmitCalled: true });
    void placeOrder();
  }, [markCheckoutProbe, placeOrder]);

  return (
    <>
      {showPayment && orderId && (
        <Payment
          orderId={orderId}
          amount={totalAmount}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
          email={!user && guestInfo.email ? guestInfo.email : undefined}
        />
      )}
      <div className="cart" data-testid="cart">
        <h3>{t('cart.title')}</h3>
        {effectiveCart.length === 0 ? (
        <div className="cart-empty">
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛒</div>
          <p style={{ color: '#65676B', fontSize: '15px' }}>{t('cart.empty')}</p>
        </div>
      ) : (
        <>
          {error && <div className="error-message">{error}</div>}
          
          {effectiveCart.map(item => (
            <div key={item.dish.id} className="cart-item">
              <div className="cart-item-info">
                <strong>{item.dish.name}</strong>
                <div className="cart-item-details">
                  {item.dish.price.toFixed(2)} € × {item.quantity}
                </div>
              </div>
              <div className="cart-item-actions">
                <button
                  onClick={() => effectiveUpdateQuantity(item.dish.id, item.quantity - 1)}
                  onKeyDown={(e) => handleKeyboardButton(e, () => effectiveUpdateQuantity(item.dish.id, item.quantity - 1))}
                  className="quantity-btn"
                  aria-label={t('cart.decreaseQuantity', { dish: item.dish.name })}
                >
                  -
                </button>
                <span className="quantity" aria-label={t('cart.currentQuantity', { quantity: item.quantity })}>{item.quantity}</span>
                <button
                  onClick={() => effectiveUpdateQuantity(item.dish.id, item.quantity + 1)}
                  onKeyDown={(e) => handleKeyboardButton(e, () => effectiveUpdateQuantity(item.dish.id, item.quantity + 1))}
                  className="quantity-btn"
                  aria-label={t('cart.increaseQuantity', { dish: item.dish.name })}
                >
                  +
                </button>
              </div>
            </div>
          ))}
          
          <PromoCodeInput
            restaurantId={effectiveRestaurant.id}
            subtotal={subtotal}
            onCodeApplied={(code, discountValue, discountTypeValue, promoId) => {
              setPromoCode(code);
              setDiscount(discountValue);
              setDiscountType(discountTypeValue);
              setPromotionId(promoId);
            }}
            onCodeRemoved={() => {
              setPromoCode(null);
              setDiscount(0);
              setDiscountType('PERCENTAGE');
              setPromotionId(null);
            }}
            appliedCode={promoCode || undefined}
          />

          <div className="cart-summary">
            <div className="cart-summary-row">
              <span>{t('cart.subtotal')}:</span>
              <span>{subtotal.toFixed(2)} €</span>
            </div>
            {discountAmount > 0 && (
              <div className="cart-summary-row discount">
                <span>{t('common.discount')} {promoCode}:</span>
                <span>-{discountAmount.toFixed(2)} €</span>
              </div>
            )}
            
            {/* Lieferzeit-Optionen */}
            <div className="delivery-speed-options">
              <label className="delivery-speed-label">{t('cart.deliverySpeed', { defaultValue: 'Liefergeschwindigkeit' })}:</label>
              <div className="delivery-speed-buttons">
                <button
                  type="button"
                  className={`delivery-speed-btn ${deliverySpeed === 'standard' ? 'active' : ''}`}
                  onClick={() => {
                    setDeliverySpeed('standard');
                    const baseFee = deliverySpeed === 'priority' ? deliveryFee / 1.5 : deliveryFee;
                    setDeliveryFee(baseFee);
                    const baseTime = estimatedDeliveryTime || 30;
                    setEstimatedDeliveryTime(deliverySpeed === 'priority' ? baseTime + 10 : baseTime);
                  }}
                >
                  <div className="delivery-speed-name">{t('cart.standard', { defaultValue: 'Standard' })}</div>
                  <div className="delivery-speed-time">{estimatedDeliveryTime ? `${estimatedDeliveryTime} ${t('common.min')}` : '30-45 Min'}</div>
                  <div className="delivery-speed-price">{deliverySpeed === 'standard' ? deliveryFee.toFixed(2) : (deliveryFee / 1.5).toFixed(2)} €</div>
                </button>
                <button
                  type="button"
                  className={`delivery-speed-btn ${deliverySpeed === 'priority' ? 'active' : ''}`}
                  onClick={() => {
                    setDeliverySpeed('priority');
                    const baseFee = deliverySpeed === 'priority' ? deliveryFee / 1.5 : deliveryFee;
                    setDeliveryFee(baseFee * 1.5);
                    const baseTime = estimatedDeliveryTime || 30;
                    setEstimatedDeliveryTime(Math.max(15, baseTime - 10));
                  }}
                >
                  <div className="delivery-speed-name">{t('cart.priority', { defaultValue: 'Priorität' })}</div>
                  <div className="delivery-speed-time">{estimatedDeliveryTime ? `${Math.max(15, estimatedDeliveryTime - 10)} ${t('common.min')}` : '20-30 Min'}</div>
                  <div className="delivery-speed-price">{deliverySpeed === 'priority' ? deliveryFee.toFixed(2) : (deliveryFee * 1.5).toFixed(2)} €</div>
                  <div className="delivery-speed-badge">{t('cart.faster', { defaultValue: 'Schneller' })}</div>
                </button>
              </div>
            </div>

            {deliveryFee > 0 && (
              <div className="cart-summary-row">
                <span>{t('cart.deliveryFee')}:</span>
                <span>{deliveryFee.toFixed(2)} €</span>
              </div>
            )}
            {serviceFee > 0 && (
              <div className="cart-summary-row">
                <span>{t('cart.serviceFee', { defaultValue: 'Servicegebühr' })}:</span>
                <span>{serviceFee.toFixed(2)} €</span>
              </div>
            )}
            {estimatedDeliveryTime && (
              <div className="cart-summary-row delivery-time">
                <span>{t('cart.estimatedDelivery')}:</span>
                <span>{estimatedDeliveryTime} {t('common.min')}</span>
              </div>
            )}
            {minOrderAmount > 0 && (
              <div className={`cart-summary-row min-order ${minOrderMissing > 0 ? 'warning' : ''}`}>
                <span>{t('cart.minOrder')}:</span>
                <span>
                  {subtotal.toFixed(2)} / {minOrderAmount.toFixed(2)} €
                  {minOrderMissing > 0 && ` (${t('cart.minOrderMissing', { amount: minOrderMissing.toFixed(2) })})`}
                </span>
              </div>
            )}
          <div className="cart-total">
              <span>{t('cart.total')}:</span>
              <span>{totalAmount.toFixed(2)} €</span>
            </div>
          </div>

          <form onSubmit={handleCheckoutSubmit} className="checkout-submit-form">
            {!user && (
            <div className="guest-checkout-form" style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-secondary, #F0F2F5)', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>Gast-Bestellung</h4>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>Name *</label>
                <input
                  type="text"
                  value={guestInfo.name}
                  onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color, #E4E6EB)' }}
                  placeholder="Ihr Name"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>E-Mail *</label>
                <input
                  type="email"
                  value={guestInfo.email}
                  onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color, #E4E6EB)' }}
                  placeholder="ihre@email.de"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>Telefon *</label>
                <input
                  type="tel"
                  value={guestInfo.phone}
                  onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color, #E4E6EB)' }}
                  placeholder="+43 123 456789"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>Lieferadresse *</label>
                <input
                  type="text"
                  value={guestInfo.address}
                  onChange={(e) => setGuestInfo({ ...guestInfo, address: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color, #E4E6EB)' }}
                  placeholder="Straße, Hausnummer, PLZ, Stadt"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="order-button"
            disabled={loading}
            data-testid="checkout-button"
          >
            {loading ? t('cart.placingOrder') : t('cart.placeOrder')}
          </button>
          </form>

          {!user && (
            <p className="login-hint" style={{ marginTop: '12px', fontSize: '14px', textAlign: 'center', color: '#65676B' }}>
              Oder <a href="/login" style={{ color: 'var(--primary-500, #1877F2)', textDecoration: 'underline' }}>anmelden</a> für schnellere Bestellungen
            </p>
          )}
        </>
      )}
      </div>
    </>
  );
}

