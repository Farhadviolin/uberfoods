import { validateImageUrl, escapeHtmlAttribute, sanitizeInput } from '../security';

describe('Security Utils', () => {
  describe('validateImageUrl', () => {
    it('accepts valid HTTP URLs', () => {
      expect(validateImageUrl('http://example.com/image.jpg')).toBe('http://example.com/image.jpg');
      expect(validateImageUrl('https://example.com/image.png')).toBe('https://example.com/image.png');
    });

    it('accepts relative paths', () => {
      expect(validateImageUrl('/uploads/image.jpg')).toBe('/uploads/image.jpg');
      expect(validateImageUrl('uploads/image.png')).toBe('uploads/image.png');
    });

    it('rejects javascript: URLs', () => {
      expect(validateImageUrl('javascript:alert(1)')).toBe('');
    });

    it('rejects data: URLs with scripts', () => {
      expect(validateImageUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    it('accepts safe data: URLs', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANS...';
      expect(validateImageUrl(dataUrl)).toBe(dataUrl);
    });

    it('rejects invalid input types', () => {
      expect(validateImageUrl(null as any)).toBe('');
      expect(validateImageUrl(undefined as any)).toBe('');
      expect(validateImageUrl(123 as any)).toBe('');
    });
  });

  describe('escapeHtmlAttribute', () => {
    it('escapes HTML special characters', () => {
      expect(escapeHtmlAttribute('Test & "Quote" <tag>')).toBe('Test &amp; &quot;Quote&quot; &lt;tag&gt;');
    });

    it('handles empty strings', () => {
      expect(escapeHtmlAttribute('')).toBe('');
    });

    it('handles apostrophes', () => {
      expect(escapeHtmlAttribute("It's a test")).toBe("It&#x27;s a test");
    });

    it('prevents XSS in attributes', () => {
      const malicious = '"><script>alert(1)</script>';
      const escaped = escapeHtmlAttribute(malicious);
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
    });
  });

  describe('sanitizeInput', () => {
    it('removes script tags', () => {
      expect(sanitizeInput('<script>alert(1)</script>Hello')).toBe('Hello');
    });

    it('removes event handlers', () => {
      expect(sanitizeInput('<div onclick="alert(1)">Test</div>')).not.toContain('onclick');
    });

    it('preserves safe HTML', () => {
      expect(sanitizeInput('<p>Hello <b>World</b></p>')).toContain('Hello');
      expect(sanitizeInput('<p>Hello <b>World</b></p>')).toContain('World');
    });

    it('handles null/undefined', () => {
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });
  });
});
