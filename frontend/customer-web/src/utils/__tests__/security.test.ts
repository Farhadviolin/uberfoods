import {
  sanitizeEmail,
  sanitizeFilename,
  sanitizeHtml,
  sanitizePhone,
  sanitizeUrl,
  validateImageUrl,
} from '../security';

describe('Security Utils', () => {
  describe('sanitizeUrl', () => {
    it('preserves relative URLs and in-page anchors', () => {
      expect(sanitizeUrl('/orders/123?view=details')).toBe('/orders/123?view=details');
      expect(sanitizeUrl('#order-status')).toBe('#order-status');
    });

    it('rejects dangerous protocols, protocol-relative URLs and control characters', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
      expect(sanitizeUrl('//attacker.example/path')).toBeNull();
      expect(sanitizeUrl('/safe\npath')).toBeNull();
    });

    it('rejects external hosts unless they are explicitly allowlisted', () => {
      expect(sanitizeUrl('https://cdn.example/image.jpg')).toBeNull();
      expect(sanitizeUrl('https://cdn.example/image.jpg', ['https:'], ['cdn.example']))
        .toBe('https://cdn.example/image.jpg');
    });

    it('handles empty and non-string input deterministically', () => {
      expect(sanitizeUrl('')).toBeNull();
      expect(sanitizeUrl(null as unknown as string)).toBeNull();
    });
  });

  describe('sanitizePhone', () => {
    it('preserves dialable punctuation and removes other characters', () => {
      expect(sanitizePhone('+43 (1) 234-56 ext. 7')).toBe('+43 (1) 234-56  7');
    });

    it('handles empty and non-string input deterministically', () => {
      expect(sanitizePhone('')).toBe('');
      expect(sanitizePhone(undefined as unknown as string)).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('preserves typical, plus-addressed and subdomain addresses', () => {
      expect(sanitizeEmail('test@example.com')).toBe('test@example.com');
      expect(sanitizeEmail('user.name+tag@subdomain.example.com'))
        .toBe('user.name+tag@subdomain.example.com');
    });

    it('rejects malformed addresses instead of normalizing them', () => {
      [
        '',
        'invalid',
        'invalid@',
        '@example.com',
        'two@@example.com',
        'user@.example.com',
        'user@example',
        ' user@example.com',
        'user@example.com ',
      ].forEach((email) => expect(sanitizeEmail(email)).toBe(''));
    });

    it('handles non-string input deterministically', () => {
      expect(sanitizeEmail(null as unknown as string)).toBe('');
    });
  });

  describe('sanitizeHtml', () => {
    it('preserves allowlisted markup and Unicode text', () => {
      const input = '<p>Grüße 👋 <strong>aus Wien</strong></p>';
      expect(sanitizeHtml(input)).toBe(input);
    });

    it('removes scripts together with their executable content', () => {
      expect(sanitizeHtml('<script>alert("xss")</script><p>Hello World</p>'))
        .toBe('<p>Hello World</p>');
    });

    it('removes event handlers, inline styles and unsafe link protocols', () => {
      const input = '<p onclick="alert(1)" style="color:red">Safe</p><a href="javascript:alert(1)">Link</a>';
      expect(sanitizeHtml(input)).toBe('<p>Safe</p><a>Link</a>');
    });

    it('allows a sanitized relative link', () => {
      expect(sanitizeHtml('<a href="/orders/123">Order</a>'))
        .toBe('<a href="/orders/123">Order</a>');
    });

    it('handles empty input without changing global DOM state', () => {
      const bodyBefore = document.body.innerHTML;
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(undefined as unknown as string)).toBe('');
      expect(document.body.innerHTML).toBe(bodyBefore);
    });
  });

  describe('sanitizeFilename', () => {
    it('removes path traversal and filesystem-reserved characters', () => {
      expect(sanitizeFilename('../invoices/order:123?.pdf')).toBe('-invoices-order123.pdf');
    });

    it('uses the requested fallback for empty or unusable names', () => {
      expect(sanitizeFilename('', 'invoice.pdf')).toBe('invoice.pdf');
      expect(sanitizeFilename('???', 'invoice.pdf')).toBe('invoice.pdf');
    });

    it('limits filenames to 255 characters', () => {
      expect(sanitizeFilename('a'.repeat(300))).toHaveLength(255);
    });
  });

  describe('validateImageUrl', () => {
    it('preserves relative image URLs', () => {
      expect(validateImageUrl('/uploads/dish.jpg')).toBe('/uploads/dish.jpg');
    });

    it('normalizes same-origin absolute URLs to relative URLs', () => {
      expect(validateImageUrl(`${window.location.origin}/uploads/dish.jpg`))
        .toBe('/uploads/dish.jpg');
    });

    it('rejects external, dangerous, empty and non-string URLs', () => {
      expect(validateImageUrl('https://attacker.example/image.jpg')).toBe('');
      expect(validateImageUrl('javascript:alert(1)')).toBe('');
      expect(validateImageUrl('')).toBe('');
      expect(validateImageUrl(null)).toBe('');
    });
  });
});
