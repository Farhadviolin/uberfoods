import { renderHook, act } from '@testing-library/react';
import { useFormValidation } from '../useFormValidation';

describe('useFormValidation', () => {
  const rules = {
    email: { required: true, email: true },
    password: { required: true, minLength: 8 },
    name: { required: true, maxLength: 50 },
    phone: { phone: true },
    optional: { minLength: 3 },
  };

  it('should initialize with no errors', () => {
    const { result } = renderHook(() => useFormValidation(rules));
    expect(result.current.errors).toEqual({});
  });

  it('should validate required fields', () => {
    const { result } = renderHook(() => useFormValidation(rules));
    
    act(() => {
      const error = result.current.validateField('email', '');
      expect(error).toBe('email ist erforderlich');
    });
  });

  it('should validate email format', () => {
    const { result } = renderHook(() => useFormValidation(rules));
    
    act(() => {
      const error = result.current.validateField('email', 'invalid-email');
      expect(error).toBe('Ungültige E-Mail-Adresse');
    });

    act(() => {
      const error = result.current.validateField('email', 'valid@email.com');
      expect(error).toBeNull();
    });
  });

  it('should validate minLength', () => {
    const { result } = renderHook(() => useFormValidation(rules));
    
    act(() => {
      const error = result.current.validateField('password', 'short');
      expect(error).toBe('Mindestens 8 Zeichen erforderlich');
    });

    act(() => {
      const error = result.current.validateField('password', 'longpassword');
      expect(error).toBeNull();
    });
  });

  it('should validate maxLength', () => {
    const { result } = renderHook(() => useFormValidation(rules));
    
    act(() => {
      const error = result.current.validateField('name', 'a'.repeat(51));
      expect(error).toBe('Maximal 50 Zeichen erlaubt');
    });
  });

  it('should validate phone format', () => {
    const { result } = renderHook(() => useFormValidation(rules));
    
    act(() => {
      const error = result.current.validateField('phone', 'invalid');
      expect(error).toBe('Ungültige Telefonnummer');
    });

    act(() => {
      const error = result.current.validateField('phone', '+43 123 456789');
      expect(error).toBeNull();
    });
  });

  it('should skip validation for empty optional fields', () => {
    const { result } = renderHook(() => useFormValidation(rules));
    
    act(() => {
      const error = result.current.validateField('optional', '');
      expect(error).toBeNull();
    });
  });

  it('should validate entire form', () => {
    const { result } = renderHook(() => useFormValidation(rules));
    
    act(() => {
      const isValid = result.current.validateForm({
        email: '',
        password: '',
        name: '',
        phone: '',
        optional: '',
      });
      expect(isValid).toBe(false);
    });
    
    // Errors should be set after validation
    expect(result.current.errors.email).toBeTruthy();
    expect(result.current.errors.password).toBeTruthy();
  });

  it('should return true for valid form', () => {
    const { result } = renderHook(() => useFormValidation(rules));
    
    act(() => {
      const isValid = result.current.validateForm({
        email: 'test@example.com',
        password: process.env.TEST_PASSWORD ?? 'TestPass123!',
        name: 'Test User',
        phone: '+43 123 456789',
        optional: 'value',
      });
      expect(isValid).toBe(true);
      expect(Object.values(result.current.errors).every(e => e === null)).toBe(true);
    });
  });

  it('should clear errors', () => {
    const { result } = renderHook(() => useFormValidation(rules));
    
    act(() => {
      result.current.validateForm({ email: '', password: '' });
    });
    
    expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);
    
    act(() => {
      result.current.clearErrors();
    });
    
    expect(result.current.errors).toEqual({});
  });

  it('should set custom error', () => {
    const { result } = renderHook(() => useFormValidation(rules));
    
    act(() => {
      result.current.setError('email', 'Custom error message');
    });
    
    expect(result.current.errors.email).toBe('Custom error message');
  });

  it('should handle custom validation function', () => {
    const customRules = {
      value: {
        custom: (val: any) => {
          if (val === 'forbidden') return 'This value is forbidden';
          return null;
        },
      },
    };
    
    const { result } = renderHook(() => useFormValidation(customRules));
    
    act(() => {
      const error = result.current.validateField('value', 'forbidden');
      expect(error).toBe('This value is forbidden');
    });

    act(() => {
      const error = result.current.validateField('value', 'allowed');
      expect(error).toBeNull();
    });
  });

  it('should handle pattern validation', () => {
    const patternRules = {
      code: {
        pattern: /^[A-Z]{3}$/,
      },
    };
    
    const { result } = renderHook(() => useFormValidation(patternRules));
    
    act(() => {
      const error = result.current.validateField('code', 'abc');
      expect(error).toBe('Ungültiges Format');
    });

    act(() => {
      const error = result.current.validateField('code', 'ABC');
      expect(error).toBeNull();
    });
  });

  it('should validate price range for dishes', () => {
    const dishRules = {
      price: {
        required: true,
        custom: (value: any) => {
          const num = parseFloat(value);
          if (isNaN(num) || num < 0) return 'Preis muss eine positive Zahl sein';
          if (num > 999.99) return 'Preis darf maximal 999.99 € betragen';
          return null;
        }
      },
    };

    const { result } = renderHook(() => useFormValidation(dishRules));

    act(() => {
      const error = result.current.validateField('price', '-5');
      expect(error).toBe('Preis muss eine positive Zahl sein');
    });

    act(() => {
      const error = result.current.validateField('price', '1000');
      expect(error).toBe('Preis darf maximal 999.99 € betragen');
    });

    act(() => {
      const error = result.current.validateField('price', '15.50');
      expect(error).toBeNull();
    });

    act(() => {
      const error = result.current.validateField('price', '0');
      expect(error).toBeNull();
    });
  });

  it('should validate dish category length', () => {
    const dishRules = {
      category: { required: true, minLength: 2, maxLength: 50 },
    };

    const { result } = renderHook(() => useFormValidation(dishRules));

    act(() => {
      const error = result.current.validateField('category', 'A');
      expect(error).toBe('Mindestens 2 Zeichen erforderlich');
    });

    act(() => {
      const error = result.current.validateField('category', 'A'.repeat(51));
      expect(error).toBe('Maximal 50 Zeichen erlaubt');
    });

    act(() => {
      const error = result.current.validateField('category', 'Pizza');
      expect(error).toBeNull();
    });
  });

  it('should validate restaurant form fields', () => {
    const restaurantRules = {
      name: { required: true, minLength: 2, maxLength: 100 },
      description: { maxLength: 500 },
      address: { required: true, minLength: 5, maxLength: 200 },
      phone: { required: true, phone: true },
      email: { required: true, email: true },
    };

    const { result } = renderHook(() => useFormValidation(restaurantRules));

    // Test required fields
    act(() => {
      expect(result.current.validateField('name', '')).toBe('name ist erforderlich');
      expect(result.current.validateField('address', '')).toBe('address ist erforderlich');
      expect(result.current.validateField('phone', '')).toBe('phone ist erforderlich');
      expect(result.current.validateField('email', '')).toBe('email ist erforderlich');
    });

    // Test field lengths
    act(() => {
      expect(result.current.validateField('name', 'A')).toBe('Mindestens 2 Zeichen erforderlich');
      expect(result.current.validateField('name', 'A'.repeat(101))).toBe('Maximal 100 Zeichen erlaubt');
      expect(result.current.validateField('address', 'Addr')).toBe('Mindestens 5 Zeichen erforderlich');
      expect(result.current.validateField('description', 'A'.repeat(501))).toBe('Maximal 500 Zeichen erlaubt');
    });

    // Test email validation
    act(() => {
      expect(result.current.validateField('email', 'invalid-email')).toBe('Ungültige E-Mail-Adresse');
      expect(result.current.validateField('email', 'valid@email.com')).toBeNull();
    });

    // Test phone validation
    act(() => {
      expect(result.current.validateField('phone', 'invalid-phone')).toBe('Ungültige Telefonnummer');
      expect(result.current.validateField('phone', '+43 123 456789')).toBeNull();
      expect(result.current.validateField('phone', '0123456789')).toBeNull();
    });
  });
});

