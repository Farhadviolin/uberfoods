import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { render } from '../../test-utils';
import { useCart } from '../../contexts/CartContext';
import { CartProvider } from '../../contexts/CartContext';

describe('useCart Hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with empty cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    expect(result.current.items).toEqual([]);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.total).toBe(0);
  });

  it('adds item to cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    const dish = {
      id: 'dish_1',
      name: 'Margherita Pizza',
      price: 12.90,
      restaurantId: 'rest_1',
    };

    act(() => {
      result.current.addItem(dish, 2);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.total).toBe(25.80);
  });

  it('increases item quantity', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    const dish = {
      id: 'dish_1',
      name: 'Margherita Pizza',
      price: 12.90,
      restaurantId: 'rest_1',
    };

    act(() => {
      result.current.addItem(dish, 1);
    });

    act(() => {
      result.current.increaseQuantity('dish_1');
    });

    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.total).toBe(25.80);
  });

  it('decreases item quantity', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    const dish = {
      id: 'dish_1',
      name: 'Margherita Pizza',
      price: 12.90,
      restaurantId: 'rest_1',
    };

    act(() => {
      result.current.addItem(dish, 2);
    });

    act(() => {
      result.current.decreaseQuantity('dish_1');
    });

    expect(result.current.items[0].quantity).toBe(1);
    expect(result.current.total).toBe(12.90);
  });

  it('removes item from cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    const dish = {
      id: 'dish_1',
      name: 'Margherita Pizza',
      price: 12.90,
      restaurantId: 'rest_1',
    };

    act(() => {
      result.current.addItem(dish, 2);
    });

    act(() => {
      result.current.removeItem('dish_1');
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it('clears entire cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    const dishes = [
      { id: 'dish_1', name: 'Pizza', price: 12.90, restaurantId: 'rest_1' },
      { id: 'dish_2', name: 'Burger', price: 8.90, restaurantId: 'rest_1' },
    ];

    act(() => {
      dishes.forEach(dish => result.current.addItem(dish, 1));
    });

    expect(result.current.items).toHaveLength(2);

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it('calculates correct total', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    const dishes = [
      { id: 'dish_1', name: 'Pizza', price: 12.90, restaurantId: 'rest_1' },
      { id: 'dish_2', name: 'Burger', price: 8.90, restaurantId: 'rest_1' },
      { id: 'dish_3', name: 'Salad', price: 6.50, restaurantId: 'rest_1' },
    ];

    act(() => {
      result.current.addItem(dishes[0], 2); // 25.80
      result.current.addItem(dishes[1], 1); // 8.90
      result.current.addItem(dishes[2], 3); // 19.50
    });

    expect(result.current.total).toBe(54.20);
    expect(result.current.itemCount).toBe(6);
  });

  it('prevents adding items from different restaurants', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    const dish1 = {
      id: 'dish_1',
      name: 'Pizza',
      price: 12.90,
      restaurantId: 'rest_1',
    };

    const dish2 = {
      id: 'dish_2',
      name: 'Burger',
      price: 8.90,
      restaurantId: 'rest_2', // Different restaurant
    };

    act(() => {
      result.current.addItem(dish1, 1);
    });

    act(() => {
      result.current.addItem(dish2, 1);
    });

    // Should only have first restaurant's items
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].restaurantId).toBe('rest_1');
  });

  it('persists cart to localStorage', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    const dish = {
      id: 'dish_1',
      name: 'Pizza',
      price: 12.90,
      restaurantId: 'rest_1',
    };

    act(() => {
      result.current.addItem(dish, 2);
    });

    const storedCart = localStorage.getItem('cart');
    expect(storedCart).toBeTruthy();

    const parsedCart = JSON.parse(storedCart!);
    expect(parsedCart.items).toHaveLength(1);
    expect(parsedCart.items[0].quantity).toBe(2);
  });
});




