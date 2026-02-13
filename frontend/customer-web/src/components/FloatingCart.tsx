import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { logDebug } from '../utils/errorReporting';
import './FloatingCart.css';

interface CartItem {
  dish: {
    id: string;
    name: string;
    price: number;
  };
  quantity: number;
}

export function FloatingCart() {
  const { t } = useTranslation();
  const [itemCount, setItemCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Lese alle Carts aus localStorage
    const getAllCarts = () => {
      let totalItems = 0;
      let total = 0;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cart_')) {
          try {
            const cartData = localStorage.getItem(key);
            if (cartData) {
              const cart: CartItem[] = JSON.parse(cartData);
              cart.forEach(item => {
                totalItems += item.quantity;
                total += item.dish.price * item.quantity;
              });
            }
          } catch (e) {
            logDebug('Fehler beim Lesen des Carts', e, { component: 'FloatingCart', action: 'getAllCarts', metadata: { key } });
          }
        }
      }

      setItemCount(totalItems);
      setTotalAmount(total);
    };

    getAllCarts();
    
    // Aktualisiere bei Storage-Änderungen
    const handleStorageChange = () => {
      getAllCarts();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Polling für localStorage-Änderungen (da storage-Event nur zwischen Tabs funktioniert)
    const interval = setInterval(getAllCarts, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [location.pathname]);

  // Verstecke FAB auf Cart/Checkout-Seiten
  if (itemCount === 0 || location.pathname.includes('/cart') || location.pathname.includes('/payment')) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="floating-cart"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <motion.button
          className="floating-cart-button"
          onClick={() => setIsExpanded(!isExpanded)}
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          aria-label={t('accessibility.showCart')}
        >
          <ShoppingCart size={24} />
          {itemCount > 0 && (
            <motion.span
              className="cart-badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            >
              {itemCount > 99 ? '99+' : itemCount}
            </motion.span>
          )}
        </motion.button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="floating-cart-preview"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="cart-preview-header">
                <h3>Warenkorb</h3>
                <span className="cart-total">€{totalAmount.toFixed(2)}</span>
              </div>
              <div className="cart-preview-info">
                <p>{itemCount} {itemCount === 1 ? 'Artikel' : 'Artikel'}</p>
              </div>
              <button
                className="cart-checkout-btn"
                onClick={() => {
                  setIsExpanded(false);
                  // Navigiere zur letzten Cart-Seite oder zur Restaurant-Liste
                  const cartKeys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
                    .filter(key => key && key.startsWith('cart_'));
                  
                  if (cartKeys.length > 0) {
                    const lastKey = cartKeys[cartKeys.length - 1];
                    const restaurantId = lastKey?.replace('cart_', '');
                    if (restaurantId) {
                      navigate(`/restaurant/${restaurantId}`);
                    }
                  } else {
                    navigate('/');
                  }
                }}
              >
                Zum Warenkorb
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

