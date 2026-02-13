/**
 * Validation Utilities
 * For validating user input
 */

/**
 * Validates an email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates a phone number (basic validation)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  const digits = phone.replace(/\D/g, '');
  return phoneRegex.test(phone) && digits.length >= 8 && digits.length <= 15;
}

/**
 * Validates a URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a postal code (Austria/Germany format)
 */
export function isValidPostalCode(postalCode: string): boolean {
  const postalCodeRegex = /^\d{4,5}$/;
  return postalCodeRegex.test(postalCode);
}

/**
 * Validates a credit card number (Luhn algorithm)
 */
export function isValidCreditCard(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  
  if (digits.length < 13 || digits.length > 19) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validates a password strength
 */
export interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  isValid: boolean;
}

export function validatePassword(password: string, minLength: number = 8): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (password.length < minLength) {
    feedback.push(`Mindestens ${minLength} Zeichen erforderlich`);
    return { score: 0, feedback, isValid: false };
  }

  if (password.length >= minLength) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score < 3) {
    feedback.push('Passwort sollte Groß- und Kleinbuchstaben, Zahlen und Sonderzeichen enthalten');
  }

  return {
    score,
    feedback,
    isValid: score >= 3,
  };
}

/**
 * Validates coordinates (latitude/longitude)
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

