import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { 
  useFormValidation, 
  validateEmail, 
  validatePassword, 
  validatePhone, 
  validateIBAN, 
  validateRequired, 
  validatePostalCode,
  useFormValidationHelpers 
} from '../useFormValidation';

describe('useFormValidation', () => {
  describe('email validation', () => {
    it('should validate correct email', () => {
      const isValid = validateEmail('test@example.com');
      expect(isValid).toBe(true);
    });

    it('should reject invalid email', () => {
      const isValid = validateEmail('invalid-email');
      expect(isValid).toBe(false);
    });

    it('should reject empty email', () => {
      const isValid = validateEmail('');
      expect(isValid).toBe(false);
    });
  });

  describe('password validation', () => {
    it('should validate strong password', () => {
      const isValid = validatePassword('StrongPass123!');
      expect(isValid).toBe(true);
    });

    it('should reject weak password', () => {
      const isValid = validatePassword('weak');
      expect(isValid).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const isValid = validatePassword('password123!');
      expect(isValid).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const isValid = validatePassword('PASSWORD123!');
      expect(isValid).toBe(false);
    });

    it('should reject password without numbers', () => {
      const isValid = validatePassword('Password!');
      expect(isValid).toBe(false);
    });

    it('should reject password without special characters', () => {
      const isValid = validatePassword('Password123');
      expect(isValid).toBe(false);
    });
  });

  describe('phone validation', () => {
    it('should validate Austrian phone number', () => {
      const isValid = validatePhone('+43 123 456 789');
      expect(isValid).toBe(true);
    });

    it('should validate international phone number', () => {
      const isValid = validatePhone('+1 555 123 4567');
      expect(isValid).toBe(true);
    });

    it('should reject invalid phone number', () => {
      const isValid = validatePhone('invalid-phone');
      expect(isValid).toBe(false);
    });
  });

  describe('IBAN validation', () => {
    it('should validate correct Austrian IBAN', () => {
      const isValid = validateIBAN('AT611904300234573201');
      expect(isValid).toBe(true);
    });

    it('should validate correct German IBAN', () => {
      const isValid = validateIBAN('DE89370400440532013000');
      expect(isValid).toBe(true);
    });

    it('should reject invalid IBAN', () => {
      const isValid = validateIBAN('INVALID_IBAN');
      expect(isValid).toBe(false);
    });

    it('should reject IBAN with wrong length', () => {
      const isValid = validateIBAN('AT61190430023457320');
      expect(isValid).toBe(false);
    });
  });

  describe('required field validation', () => {
    it('should validate non-empty string', () => {
      const isValid = validateRequired('test value');
      expect(isValid).toBe(true);
    });

    it('should reject empty string', () => {
      const isValid = validateRequired('');
      expect(isValid).toBe(false);
    });

    it('should reject whitespace-only string', () => {
      const isValid = validateRequired('   ');
      expect(isValid).toBe(false);
    });
  });

  describe('postal code validation', () => {
    it('should validate Austrian postal code', () => {
      const isValid = validatePostalCode('1010', 'AT');
      expect(isValid).toBe(true);
    });

    it('should validate German postal code', () => {
      const isValid = validatePostalCode('80331', 'DE');
      expect(isValid).toBe(true);
    });

    it('should reject invalid postal code', () => {
      const isValid = validatePostalCode('INVALID', 'AT');
      expect(isValid).toBe(false);
    });
  });

  describe('form validation integration', () => {
    it('should validate complete registration form', () => {
      const { result } = renderHook(() => useFormValidationHelpers());

      const testPassword = process.env.TEST_PASSWORD ?? 'StrongPass123!';
      const formData = {
        email: 'test@example.com',
        password: testPassword,
        confirmPassword: testPassword,
        firstName: 'John',
        lastName: 'Doe',
        phone: '+43 123 456 789',
      };

      const errors = result.current.validateForm(formData, {
        email: 'required|email',
        password: 'required|password',
        confirmPassword: 'required|matches:password',
        firstName: 'required|min:2',
        lastName: 'required|min:2',
        phone: 'required|phone',
      });

      expect(errors).toEqual({});
    });

    it('should return validation errors for invalid form', () => {
      const { result } = renderHook(() => useFormValidationHelpers());

      const formData = {
        email: 'invalid-email',
        password: 'weak',
        confirmPassword: 'different',
        firstName: '',
        lastName: 'D',
        phone: 'invalid-phone',
      };

      const errors = result.current.validateForm(formData, {
        email: 'required|email',
        password: 'required|password',
        confirmPassword: 'required|matches:password',
        firstName: 'required|min:2',
        lastName: 'required|min:2',
        phone: 'required|phone',
      });

      expect(errors.email).toBeDefined();
      expect(errors.password).toBeDefined();
      expect(errors.confirmPassword).toBeDefined();
      expect(errors.firstName).toBeDefined();
      expect(errors.lastName).toBeDefined();
      expect(errors.phone).toBeDefined();
    });
  });
});




