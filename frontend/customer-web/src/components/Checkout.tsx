import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Cart } from './Cart';

interface Dish {
  id: string;
  name: string;
  price: number;
}

interface CheckoutCartItem {
  dish: Dish;
  quantity: number;
  modifications?: {
    extras?: string[];
    removals?: string[];
    notes?: string;
  };
  specialInstructions?: string;
}

interface StoredCart {
  restaurantId: string;
  items: CheckoutCartItem[];
}

function readCartFromStorage(): StoredCart | null {
  const keys = Object.keys(localStorage).filter((key) => key.startsWith('cart_'));
  if (keys.length === 0) return null;

  const key = keys[keys.length - 1];
  const restaurantId = key.replace('cart_', '');
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    const items = JSON.parse(raw) as CheckoutCartItem[];
    if (!Array.isArray(items) || items.length === 0) return null;
    return { restaurantId, items };
  } catch {
    return null;
  }
}

export function Checkout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [storedCart, setStoredCart] = useState<StoredCart | null>(() => readCartFromStorage());

  useEffect(() => {
    const sync = () => setStoredCart(readCartFromStorage());
    sync();
    window.addEventListener('storage', sync);
    const interval = window.setInterval(sync, 500);
    return () => {
      window.removeEventListener('storage', sync);
      window.clearInterval(interval);
    };
  }, []);

  const restaurant = useMemo(() => {
    if (!storedCart) return null;
    return {
      id: storedCart.restaurantId,
      name: t('cart.title', { defaultValue: 'Your Cart' }),
    };
  }, [storedCart, t]);

  const updateQuantity = (dishId: string, quantity: number) => {
    if (!storedCart) return;
    const nextItems = storedCart.items
      .map((item) => (item.dish.id === dishId ? { ...item, quantity } : item))
      .filter((item) => item.quantity > 0);

    if (nextItems.length === 0) {
      localStorage.removeItem(`cart_${storedCart.restaurantId}`);
    } else {
      localStorage.setItem(`cart_${storedCart.restaurantId}`, JSON.stringify(nextItems));
    }

    setStoredCart(nextItems.length > 0 ? { ...storedCart, items: nextItems } : null);
  };

  const clearCart = () => {
    if (!storedCart) return;
    localStorage.removeItem(`cart_${storedCart.restaurantId}`);
    setStoredCart(null);
    navigate('/');
  };

  if (!storedCart || !restaurant) {
    return (
      <div style={{ padding: '24px' }}>
        <h2>{t('cart.empty', { defaultValue: 'Your cart is empty' })}</h2>
        <button type="button" onClick={() => navigate('/')}>
          {t('menu.backToRestaurants', { defaultValue: 'Back to restaurants' })}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <button type="button" onClick={() => navigate(`/restaurant/${restaurant.id}`)}>
        {t('menu.backToRestaurants', { defaultValue: 'Back to restaurants' })}
      </button>
      <Cart
        cart={storedCart.items}
        restaurant={restaurant}
        updateQuantity={updateQuantity}
        onClearCart={clearCart}
      />
    </div>
  );
}
