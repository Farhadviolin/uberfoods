// Setup minimal Env und window vor Modul-Import
(global as any).__TEST_ENV__ = {
  VITE_ALLOW_HTTP_IMAGES: 'false',
  VITE_IMAGE_HOST_WHITELIST: 'example.com,cdn.example.com',
};

Object.defineProperty(window, 'location', {
  value: { origin: 'https://app.example.com', hostname: 'app.example.com' },
  writable: true,
});

jest.mock('../../config', () => ({
  config: {
    apiUrl: 'https://api.example.com',
  },
}));

import {
  generatePlaceholderImage,
  PLACEHOLDER_IMAGES,
  getImageUrl,
  handleImageError,
  isValidImageUrl,
  validateImage,
} from '../imageUtils';

describe('generatePlaceholderImage', () => {
  it('generiert eine SVG-Data-URL mit Standardparametern', () => {
    const result = generatePlaceholderImage();
    expect(result).toContain('data:image/svg+xml;base64,');
    expect(result.length).toBeGreaterThan(50);
  });

  it('generiert eine benutzerdefinierte Placeholder-Image', () => {
    const result = generatePlaceholderImage('Test', 100, 50, '#ff0000', '#ffffff');
    expect(result).toContain('data:image/svg+xml;base64,');
    expect(result.length).toBeGreaterThan(50);
  });
});

describe('PLACEHOLDER_IMAGES', () => {
  it('enthält alle erwarteten Placeholder-Typen', () => {
    expect(PLACEHOLDER_IMAGES.restaurant).toContain('data:image/svg+xml;base64,');
    expect(PLACEHOLDER_IMAGES.dish).toContain('data:image/svg+xml;base64,');
    expect(PLACEHOLDER_IMAGES.customer).toContain('data:image/svg+xml;base64,');
    expect(PLACEHOLDER_IMAGES.driver).toContain('data:image/svg+xml;base64,');
    expect(PLACEHOLDER_IMAGES.order).toContain('data:image/svg+xml;base64,');
    expect(PLACEHOLDER_IMAGES.default).toContain('data:image/svg+xml;base64,');
  });
});

describe('getImageUrl', () => {
  it('gibt Placeholder zurück bei null/undefined', () => {
    expect(getImageUrl(null)).toBe(PLACEHOLDER_IMAGES.default);
    expect(getImageUrl(undefined)).toBe(PLACEHOLDER_IMAGES.default);
  });

  it('akzeptiert HTTPS-URLs von erlaubten Hosts', () => {
    const url = 'https://cdn.example.com/image.jpg';
    const result = getImageUrl(url);
    expect(result.length).toBeGreaterThan(0);
  });

  it('kombiniert relative URLs mit API-Base-URL', () => {
    expect(getImageUrl('/uploads/image.jpg')).toBe('https://api.example.com/uploads/image.jpg');
    expect(getImageUrl('uploads/image.jpg')).toBe('https://api.example.com/uploads/image.jpg');
  });

  it('liefert bei http ohne Freigabe den Placeholder', () => {
    const url = 'http://cdn.example.com/image.jpg';
    expect(getImageUrl(url)).toBe(PLACEHOLDER_IMAGES.default);
  });
});

describe('handleImageError', () => {
  let mockImg: HTMLImageElement;

  beforeEach(() => {
    mockImg = {
      src: '',
      onerror: null,
    } as HTMLImageElement;
  });

  it('setzt Placeholder als Fallback', () => {
    const mockEvent = { target: mockImg };
    handleImageError(mockEvent as any);

    expect(mockImg.src).toBe(PLACEHOLDER_IMAGES.default);
    expect(mockImg.onerror).toBeNull();
  });

  it('verwendet spezifischen Placeholder-Typ', () => {
    const mockEvent = { target: mockImg };
    handleImageError(mockEvent as any, 'restaurant');

    expect(mockImg.src).toBe(PLACEHOLDER_IMAGES.restaurant);
  });
});

describe('isValidImageUrl', () => {
  it('validiert verschiedene Image-Formate', () => {
    expect(isValidImageUrl('https://example.com/image.jpg')).toBe(true);
    expect(isValidImageUrl('https://example.com/image.jpeg')).toBe(true);
    expect(isValidImageUrl('https://example.com/image.png')).toBe(true);
    expect(isValidImageUrl('https://example.com/image.gif')).toBe(true);
    expect(isValidImageUrl('https://example.com/image.webp')).toBe(true);
    expect(isValidImageUrl('https://example.com/image.svg')).toBe(true);
  });

  it('validiert Data-URLs', () => {
    expect(isValidImageUrl('data:image/png;base64,abc')).toBe(true);
    expect(isValidImageUrl('data:image/jpeg;base64,abc')).toBe(true);
  });

  it('lehnt ungültige URLs ab', () => {
    expect(isValidImageUrl(null)).toBe(false);
    expect(isValidImageUrl(undefined)).toBe(false);
    expect(isValidImageUrl('')).toBe(false);
    expect(isValidImageUrl('not-a-url')).toBe(false);
  });
});

describe('validateImage', () => {
  it('akzeptiert gültige Image-Dateien', () => {
    const validFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }); // 1MB

    const result = validateImage(validFile);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('lehnt ungültige Dateitypen ab', () => {
    const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });

    const result = validateImage(invalidFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Ungültiger Dateityp');
  });

  it('lehnt zu große Dateien ab', () => {
    const largeFile = new File([''], 'large.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 10 * 1024 * 1024 }); // 10MB

    const result = validateImage(largeFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('zu groß');
  });

  it('akzeptiert alle unterstützten Formate', () => {
    const formats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    formats.forEach(format => {
      const file = new File([''], 'test.jpg', { type: format });
      Object.defineProperty(file, 'size', { value: 1024 });

      const result = validateImage(file);
      expect(result.valid).toBe(true);
    });
  });
});