import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

// Types
export interface CartItem {
  id: string;
  dishId: string;
  name: string;
  price: number;
  quantity: number;
  restaurantId: string;
  customizations?: any[];
}

interface CartState {
  items: CartItem[];
  restaurantId: string | null;
}

interface CartContextType extends CartState {
  itemCount: number;
  total: number;
  addItem: (dish: { id: string; name: string; price: number; restaurantId: string }, quantity?: number) => void;
  increaseQuantity: (dishId: string) => void;
  decreaseQuantity: (dishId: string) => void;
  removeItem: (dishId: string) => void;
  clearCart: () => void;
}

// Actions
type CartAction =
  | { type: 'ADD_ITEM'; payload: { dish: { id: string; name: string; price: number; restaurantId: string }; quantity: number } }
  | { type: 'INCREASE_QUANTITY'; payload: { dishId: string } }
  | { type: 'DECREASE_QUANTITY'; payload: { dishId: string } }
  | { type: 'REMOVE_ITEM'; payload: { dishId: string } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_FROM_STORAGE'; payload: CartState };

// Initial state
const initialState: CartState = {
  items: [],
  restaurantId: null,
};

// Reducer
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { dish, quantity = 1 } = action.payload;

      // Prevent adding items from different restaurants
      if (state.restaurantId && state.restaurantId !== dish.restaurantId) {
        return state; // Don't add the item
      }

      // Check if item already exists
      const existingItemIndex = state.items.findIndex(item => item.dishId === dish.id);

      if (existingItemIndex >= 0) {
        // Update quantity of existing item
        const updatedItems = [...state.items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity,
        };

        return {
          ...state,
          items: updatedItems,
        };
      } else {
        // Add new item
        const newItem: CartItem = {
          id: `${dish.id}_${Date.now()}`,
          dishId: dish.id,
          name: dish.name,
          price: dish.price,
          quantity,
          restaurantId: dish.restaurantId,
        };

        return {
          ...state,
          items: [...state.items, newItem],
          restaurantId: dish.restaurantId,
        };
      }
    }

    case 'INCREASE_QUANTITY': {
      const { dishId } = action.payload;
      const updatedItems = state.items.map(item =>
        item.dishId === dishId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );

      return {
        ...state,
        items: updatedItems,
      };
    }

    case 'DECREASE_QUANTITY': {
      const { dishId } = action.payload;
      const updatedItems = state.items.map(item =>
        item.dishId === dishId
          ? { ...item, quantity: Math.max(0, item.quantity - 1) }
          : item
      ).filter(item => item.quantity > 0); // Remove items with 0 quantity

      return {
        ...state,
        items: updatedItems,
        restaurantId: updatedItems.length > 0 ? updatedItems[0].restaurantId : null,
      };
    }

    case 'REMOVE_ITEM': {
      const { dishId } = action.payload;
      const updatedItems = state.items.filter(item => item.dishId !== dishId);

      return {
        ...state,
        items: updatedItems,
        restaurantId: updatedItems.length > 0 ? updatedItems[0].restaurantId : null,
      };
    }

    case 'CLEAR_CART':
      return initialState;

    case 'LOAD_FROM_STORAGE':
      return action.payload;

    default:
      return state;
  }
}

// Context
const CartContext = createContext<CartContextType | undefined>(undefined);

// Provider component
export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Load from localStorage on mount
  useEffect(() => {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      try {
        const parsedCart = JSON.parse(storedCart);
        dispatch({ type: 'LOAD_FROM_STORAGE', payload: parsedCart });
      } catch (error) {
        console.error('Failed to parse cart from localStorage:', error);
      }
    }
  }, []);

  // Save to localStorage whenever cart changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state));
  }, [state]);

  // Computed values
  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Actions
  const addItem = (dish: { id: string; name: string; price: number; restaurantId: string }, quantity = 1) => {
    dispatch({ type: 'ADD_ITEM', payload: { dish, quantity } });
  };

  const increaseQuantity = (dishId: string) => {
    dispatch({ type: 'INCREASE_QUANTITY', payload: { dishId } });
  };

  const decreaseQuantity = (dishId: string) => {
    dispatch({ type: 'DECREASE_QUANTITY', payload: { dishId } });
  };

  const removeItem = (dishId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { dishId } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const value: CartContextType = {
    ...state,
    itemCount,
    total,
    addItem,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    clearCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

// Hook
export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
