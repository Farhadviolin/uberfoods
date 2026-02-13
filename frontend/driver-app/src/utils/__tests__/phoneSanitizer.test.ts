import { sanitizePhoneNumber, isValidPhoneNumber, formatPhoneForDisplay } from '../phoneSanitizer';

describe('phoneSanitizer', () => {
  describe('sanitizePhoneNumber', () => {
    it('entfernt ungültige Zeichen', () => {
      expect(sanitizePhoneNumber('+49 (0) 123 456-789')).toBe('+490123456789');
      expect(sanitizePhoneNumber('123-456-789')).toBe('123456789');
    });

    it('behält Plus nur am Anfang', () => {
      expect(sanitizePhoneNumber('+49+123+456')).toBe('+49123456');
      expect(sanitizePhoneNumber('49+123+456')).toBe('49123456');
    });

    it('begrenzt auf 15 Zeichen', () => {
      const long = '+491234567890123456789';
      expect(sanitizePhoneNumber(long).length).toBe(15);
      expect(sanitizePhoneNumber(long)).toBe('+49123456789012');
    });

    it('handelt null/undefined', () => {
      expect(sanitizePhoneNumber(null)).toBe('');
      expect(sanitizePhoneNumber(undefined)).toBe('');
      expect(sanitizePhoneNumber('')).toBe('');
    });

    it('entfernt XSS-Versuche', () => {
      expect(sanitizePhoneNumber('<script>alert("xss")</script>')).toBe('');
      expect(sanitizePhoneNumber('123; DROP TABLE')).toBe('123');
    });
  });

  describe('isValidPhoneNumber', () => {
    it('validiert gültige Nummern', () => {
      expect(isValidPhoneNumber('+49123456789')).toBe(true);
      expect(isValidPhoneNumber('123456789')).toBe(true);
      expect(isValidPhoneNumber('+1234567890')).toBe(true);
    });

    it('lehnt zu kurze Nummern ab', () => {
      expect(isValidPhoneNumber('1234')).toBe(false);
      expect(isValidPhoneNumber('+12')).toBe(false);
    });

    it('lehnt leere Strings ab', () => {
      expect(isValidPhoneNumber('')).toBe(false);
    });
  });

  describe('formatPhoneForDisplay', () => {
    it('formatiert deutsche Nummern', () => {
      expect(formatPhoneForDisplay('+491234567890')).toBe('+49 123 4567890');
    });

    it('gibt andere Nummern unverändert zurück', () => {
      expect(formatPhoneForDisplay('+1234567890')).toBe('+1234567890');
    });
  });
});
