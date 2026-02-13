import { useState, useCallback } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => string | null;
  email?: boolean;
  phone?: boolean;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export interface FormErrors {
  [key: string]: string | null;
}

export interface UseFormValidationReturn<T> {
  errors: FormErrors;
  validateField: (name: keyof T, value: unknown) => string | null;
  validateForm: (data: T) => boolean;
  clearErrors: () => void;
  setError: (name: keyof T, message: string) => void;
}

/**
 * Wiederverwendbarer Hook für Form-Validierung
 */
export function useFormValidation<T extends Record<string, unknown>>(
  rules: ValidationRules
): UseFormValidationReturn<T> {
  const [errors, setErrors] = useState<FormErrors>({});

  const validateField = useCallback(
    (name: keyof T, value: unknown): string | null => {
      const rule = rules[name as string];
      if (!rule) return null;

      // Required check
      if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
        return `${String(name)} ist erforderlich`;
      }

      // Skip other validations if value is empty and not required
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return null;
      }

      // Email validation
      if (rule.email && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Ungültige E-Mail-Adresse';
        }
      }

      // Phone validation
      if (rule.phone && typeof value === 'string') {
        const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
        if (!phoneRegex.test(value.replace(/\s/g, ''))) {
          return 'Ungültige Telefonnummer';
        }
      }

      // Min length
      if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
        return `Mindestens ${rule.minLength} Zeichen erforderlich`;
      }

      // Max length
      if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
        return `Maximal ${rule.maxLength} Zeichen erlaubt`;
      }

      // Pattern validation
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        return 'Ungültiges Format';
      }

      // Custom validation
      if (rule.custom) {
        const customError = rule.custom(value);
        if (customError) return customError;
      }

      return null;
    },
    [rules]
  );

  const validateForm = useCallback(
    (data: T): boolean => {
      const newErrors: FormErrors = {};
      let isValid = true;

      Object.keys(rules).forEach((key) => {
        const error = validateField(key as keyof T, data[key]);
        if (error) {
          newErrors[key] = error;
          isValid = false;
        } else {
          newErrors[key] = null;
        }
      });

      setErrors(newErrors);
      return isValid;
    },
    [rules, validateField]
  );

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const setError = useCallback((name: keyof T, message: string) => {
    setErrors((prev) => ({ ...prev, [name as string]: message }));
  }, []);

  return {
    errors,
    validateField,
    validateForm,
    clearErrors,
    setError,
  };
}

// Standalone validation functions for convenience
export function validateEmail(email: string): boolean {
  if (!email || email.trim() === '') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): boolean {
  if (!password || password.length < 8) return false;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
}

export function validatePhone(phone: string): boolean {
  if (!phone || phone.trim() === '') return false;
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

export function validateIBAN(iban: string): boolean {
  if (!iban) return false;
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  // IBAN must be between 15 and 34 characters
  if (cleaned.length < 15 || cleaned.length > 34) return false;
  // Basic IBAN validation - check format: 2 letters, 2 digits, then alphanumeric
  // AT IBAN should be exactly 20 characters (AT + 2 check digits + 16 BBAN)
  // Test expects 'AT61190430023457320' (19 chars) to be invalid
  const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/;
  if (!ibanRegex.test(cleaned)) return false;
  // Additional length validation for specific countries
  // AT (Austria) should be 20 chars, DE (Germany) should be 22 chars
  if (cleaned.startsWith('AT') && cleaned.length !== 20) return false;
  if (cleaned.startsWith('DE') && cleaned.length !== 22) return false;
  return true;
}

export function validateRequired(value: string): boolean {
  return value !== null && value !== undefined && value.trim() !== '';
}

export function validatePostalCode(postalCode: string, country: string = 'AT'): boolean {
  if (!postalCode || postalCode.trim() === '') return false;
  const trimmed = postalCode.trim();
  
  if (country === 'AT') {
    // Austrian postal codes: 4 digits
    return /^\d{4}$/.test(trimmed);
  } else if (country === 'DE') {
    // German postal codes: 5 digits
    return /^\d{5}$/.test(trimmed);
  }
  
  // Default: alphanumeric, 4-10 characters
  return /^[A-Z0-9]{4,10}$/i.test(trimmed);
}

// Export a hook that provides all validation functions
export function useFormValidationHelpers() {
  return {
    validateEmail,
    validatePassword,
    validatePhone,
    validateIBAN,
    validateRequired,
    validatePostalCode,
    validateForm: (data: Record<string, unknown>, rules: Record<string, string>) => {
      const errors: Record<string, string> = {};
      // Simple rule parser: 'required|email' -> { required: true, email: true }
      Object.keys(rules).forEach((field) => {
        const ruleString = rules[field];
        const value = data[field];
        
        if (ruleString.includes('required')) {
          if (!validateRequired(String(value || ''))) {
            errors[field] = `${field} ist erforderlich`;
          }
        }
        
        if (ruleString.includes('email') && value) {
          if (!validateEmail(String(value))) {
            errors[field] = 'Ungültige E-Mail-Adresse';
          }
        }
        
        if (ruleString.includes('password') && value) {
          if (!validatePassword(String(value))) {
            errors[field] = 'Passwort muss mindestens 8 Zeichen lang sein und Großbuchstaben, Kleinbuchstaben, Zahlen und Sonderzeichen enthalten';
          }
        }
        
        if (ruleString.includes('phone') && value) {
          if (!validatePhone(String(value))) {
            errors[field] = 'Ungültige Telefonnummer';
          }
        }
        
        if (ruleString.includes('matches:')) {
          const matchField = ruleString.split('matches:')[1];
          if (value !== data[matchField]) {
            errors[field] = `${field} stimmt nicht überein`;
          }
        }
        
        if (ruleString.includes('min:')) {
          const minLength = parseInt(ruleString.split('min:')[1]);
          if (String(value || '').length < minLength) {
            errors[field] = `Mindestens ${minLength} Zeichen erforderlich`;
          }
        }
      });
      
      return errors;
    },
  };
}

