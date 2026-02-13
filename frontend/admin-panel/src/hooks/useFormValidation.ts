import { useState, useCallback } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
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
  validateField: (name: keyof T, value: any) => string | null;
  validateForm: (data: T) => boolean;
  clearErrors: () => void;
  setError: (name: keyof T, message: string) => void;
}

/**
 * Wiederverwendbarer Hook für Form-Validierung
 */
export function useFormValidation<T extends Record<string, any>>(
  rules: ValidationRules
): UseFormValidationReturn<T> {
  const [errors, setErrors] = useState<FormErrors>({});

  const validateField = useCallback(
    (name: keyof T, value: any): string | null => {
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
        const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
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

