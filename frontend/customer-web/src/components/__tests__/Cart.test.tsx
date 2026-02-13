import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { Cart } from '../Cart';
import { CartProvider } from '../../contexts/CartContext';

// Mock the cart context
jest.mock('../../contexts/CartContext', () => ({
  CartProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useCart: () => ({
    items: [
      {
        id: '1',
        dishId: 'dish1',
        name: 'Test Dish',
        price: 12.99,
        quantity: 2,
        customizations: [],
      },
    ],
    total: 25.98,
    addItem: jest.fn(),
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
  }),
}));

const createTest = () => new ({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(component);
};

describe('Cart Component', () => {
  it('renders empty cart message when no items', () => {
    // Override the mock for empty cart
    jest.doMock('../../contexts/CartContext', () => ({
      CartProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      useCart: () => ({
        items: [],
        total: 0,
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
        clearCart: jest.fn(),
      }),
    }));

    render(<Cart />);
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
  });

  it('renders cart items correctly', () => {
    render(<Cart />);

    expect(screen.getByText('Test Dish')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Quantity
    expect(screen.getByText('€12.99')).toBeInTheDocument(); // Unit price
    expect(screen.getByText('€25.98')).toBeInTheDocument(); // Total
  });

  it('displays cart total', () => {
    render(<Cart />);

    expect(screen.getByText('Total: €25.98')).toBeInTheDocument();
  });

  it('allows quantity updates', () => {
    const mockUpdateQuantity = jest.fn();
    jest.doMock('../../contexts/CartContext', () => ({
      CartProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      useCart: () => ({
        items: [
          {
            id: '1',
            dishId: 'dish1',
            name: 'Test Dish',
            price: 12.99,
            quantity: 2,
            customizations: [],
          },
        ],
        total: 25.98,
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: mockUpdateQuantity,
        clearCart: jest.fn(),
      }),
    }));

    render(<Cart />);

    const increaseButton = screen.getByLabelText('Increase quantity');
    fireEvent.click(increaseButton);

    expect(mockUpdateQuantity).toHaveBeenCalledWith('1', 3);
  });

  it('allows item removal', () => {
    const mockRemoveItem = jest.fn();
    jest.doMock('../../contexts/CartContext', () => ({
      CartProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      useCart: () => ({
        items: [
          {
            id: '1',
            dishId: 'dish1',
            name: 'Test Dish',
            price: 12.99,
            quantity: 2,
            customizations: [],
          },
        ],
        total: 25.98,
        addItem: jest.fn(),
        removeItem: mockRemoveItem,
        updateQuantity: jest.fn(),
        clearCart: jest.fn(),
      }),
    }));

    render(<Cart />);

    const removeButton = screen.getByLabelText('Remove item');
    fireEvent.click(removeButton);

    expect(mockRemoveItem).toHaveBeenCalledWith('1');
  });

  it('shows checkout button', () => {
    render(<Cart />);

    expect(screen.getByText('Proceed to Checkout')).toBeInTheDocument();
  });

  it('handles minimum order amount', () => {
    jest.doMock('../../contexts/CartContext', () => ({
      CartProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      useCart: () => ({
        items: [
          {
            id: '1',
            dishId: 'dish1',
            name: 'Cheap Dish',
            price: 5.99,
            quantity: 1,
            customizations: [],
          },
        ],
        total: 5.99,
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
        clearCart: jest.fn(),
      }),
    }));

    render(<Cart />);

    expect(screen.getByText('Minimum order: €15.00')).toBeInTheDocument();
    expect(screen.getByText('Add €9.01 more to proceed')).toBeInTheDocument();
  });

  it('displays delivery fee', () => {
    render(<Cart />);

    expect(screen.getByText('Delivery fee: €2.50')).toBeInTheDocument();
  });

  it('calculates final total with delivery fee', () => {
    render(<Cart />);

    expect(screen.getByText('Final total: €28.48')).toBeInTheDocument();
  });

  it('prevents checkout when below minimum order', () => {
    jest.doMock('../../contexts/CartContext', () => ({
      CartProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      useCart: () => ({
        items: [
          {
            id: '1',
            dishId: 'dish1',
            name: 'Cheap Dish',
            price: 5.99,
            quantity: 1,
            customizations: [],
          },
        ],
        total: 5.99,
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
        clearCart: jest.fn(),
      }),
    }));

    render(<Cart />);

    const checkoutButton = screen.getByText('Proceed to Checkout');
    expect(checkoutButton).toBeDisabled();
  });
});






