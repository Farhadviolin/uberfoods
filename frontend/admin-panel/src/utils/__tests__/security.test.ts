import { validateImageUrl, escapeHtmlAttribute, sanitizeFilename } from '../security';

describe('Security Utils', () => {
  describe('validateImageUrl', () => {
    it('accepts same-origin HTTP URLs and returns a safe relative path', () => {
      expect(validateImageUrl('http://localhost/image.jpg')).toBe('/image.jpg');
      expect(validateImageUrl('http://localhost/image.png?size=2')).toBe('/image.png?size=2');
    });

    it('accepts relative paths', () => {
      expect(validateImageUrl('/uploads/image.jpg')).toBe('/uploads/image.jpg');
      expect(validateImageUrl('uploads/image.png')).toBe('');
    });

    it('rejects javascript: URLs', () => {
      expect(validateImageUrl('javascript:alert(1)')).toBe('');
    });

    it('rejects data: URLs with scripts', () => {
      expect(validateImageUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    it('rejects data URLs because image sources are limited to HTTP(S) or relative paths', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANS...';
      expect(validateImageUrl(dataUrl)).toBe('');
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

  describe('sanitizeFilename', () => {
    it('removes path traversal sequences', () => {
      expect(sanitizeFilename('../../orders.csv')).toBe('--orders.csv');
    });

    it('replaces path separators and removes reserved characters', () => {
      expect(sanitizeFilename('reports\\2026/q?:*.pdf')).toBe('reports-2026-q.pdf');
    });

    it('preserves a safe filename', () => {
      expect(sanitizeFilename('orders-2026.csv')).toBe('orders-2026.csv');
    });

    it('handles null/undefined', () => {
      expect(sanitizeFilename(null as any)).toBe('file');
      expect(sanitizeFilename(undefined as any, 'download')).toBe('download');
    });
  });
});
