import { sanitizeInput, validateEmail, escapeHtml, generateSecureToken } from '../security';

describe('Security Utils', () => {
  describe('sanitizeInput', () => {
    it('should remove dangerous HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const result = sanitizeInput(input);
      expect(result).toBe('Hello World');
    });

    it('should remove SQL injection attempts', () => {
      const input = "'; DROP TABLE users; --";
      const result = sanitizeInput(input);
      expect(result).not.toContain('DROP TABLE');
      expect(result).not.toContain(';');
    });

    it('should preserve safe content', () => {
      const input = 'Hello World 123';
      const result = sanitizeInput(input);
      expect(result).toBe('Hello World 123');
    });

    it('should handle empty input', () => {
      const result = sanitizeInput('');
      expect(result).toBe('');
    });

    it('should handle null input', () => {
      const result = sanitizeInput(null as any);
      expect(result).toBe('');
    });

    it('should handle undefined input', () => {
      const result = sanitizeInput(undefined as any);
      expect(result).toBe('');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
      expect(validateEmail('test.email@subdomain.example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('invalid@')).toBe(false);
      expect(validateEmail('@invalid.com')).toBe(false);
      expect(validateEmail('invalid.com')).toBe(false);
      expect(validateEmail('invalid@.com')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateEmail('a@b.c')).toBe(true); // minimal valid email
      expect(validateEmail('test@123.456')).toBe(true);
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      const input = '<div>"Hello & goodbye"</div>';
      const result = escapeHtml(input);
      expect(result).toBe('&lt;div&gt;&quot;Hello &amp; goodbye&quot;&lt;/div&gt;');
    });

    it('should escape all dangerous characters', () => {
      const input = '<>"\'&';
      const result = escapeHtml(input);
      expect(result).toBe('&lt;&gt;&quot;&#39;&amp;');
    });

    it('should handle empty input', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should handle safe content', () => {
      const input = 'Hello World 123';
      const result = escapeHtml(input);
      expect(result).toBe('Hello World 123');
    });
  });

  describe('generateSecureToken', () => {
    it('should generate a token', () => {
      const token = generateSecureToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate different tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });

    it('should generate tokens with sufficient length', () => {
      const token = generateSecureToken();
      expect(token.length).toBeGreaterThanOrEqual(32); // at least 32 characters
    });

    it('should contain only safe characters', () => {
      const token = generateSecureToken();
      const safeChars = /^[a-zA-Z0-9_-]+$/;
      expect(safeChars.test(token)).toBe(true);
    });

    it('should accept custom length', () => {
      const token = generateSecureToken(16);
      expect(token.length).toBe(16);
    });

    it('should handle minimum length', () => {
      const token = generateSecureToken(8);
      expect(token.length).toBe(8);
    });
  });
});