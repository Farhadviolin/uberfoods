import { 
  getDishPlaceholder, 
  getImageUrl, 
  validateImage,
  compressImage 
} from '../imageUtils';

describe('Image Utils', () => {
  describe('getDishPlaceholder', () => {
    it('should return placeholder for dish category', () => {
      expect(getDishPlaceholder('Pizza')).toContain('pizza');
      expect(getDishPlaceholder('Burger')).toContain('burger');
      expect(getDishPlaceholder('Salad')).toContain('salad');
    });

    it('should return default for unknown category', () => {
      expect(getDishPlaceholder('Unknown')).toContain('default');
    });
  });

  describe('getImageUrl', () => {
    it('should return full URL for relative paths', () => {
      const result = getImageUrl('/uploads/dish.jpg');

      expect(result).toContain('http');
      expect(result).toContain('/uploads/dish.jpg');
    });

    it('should return URL as-is for absolute URLs', () => {
      const url = 'https://example.com/image.jpg';
      const result = getImageUrl(url);

      expect(result).toBe(url);
    });

    it('should handle null/undefined', () => {
      expect(getImageUrl(null as any)).toBe('');
      expect(getImageUrl(undefined as any)).toBe('');
    });
  });

  describe('validateImage', () => {
    it('should validate file type', () => {
      const jpgFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const result = validateImage(jpgFile);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid file types', () => {
      const txtFile = new File([''], 'test.txt', { type: 'text/plain' });
      const result = validateImage(txtFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('format');
    });

    it('should validate file size', () => {
      const largeData = new Array(6 * 1024 * 1024).join('x'); // 6 MB
      const largeFile = new File([largeData], 'large.jpg', { type: 'image/jpeg' });
      
      const result = validateImage(largeFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('5 MB');
    });

    it('should accept valid file', () => {
      const smallData = new Array(1024).join('x'); // 1 KB
      const validFile = new File([smallData], 'valid.jpg', { type: 'image/jpeg' });
      
      const result = validateImage(validFile);

      expect(result.valid).toBe(true);
    });
  });

  describe('compressImage', () => {
    it('should compress image maintaining aspect ratio', async () => {
      // Create mock canvas
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn(() => ({
          drawImage: jest.fn(),
        })),
        toBlob: jest.fn((callback) => {
          callback(new Blob(['compressed'], { type: 'image/jpeg' }));
        }),
      };

      global.document.createElement = jest.fn(() => mockCanvas as any);

      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
      
      const result = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.8,
      });

      expect(result).toBeInstanceOf(File);
    });

    it('should handle compression errors', async () => {
      const invalidFile = new File([''], 'test.jpg', { type: 'image/jpeg' });

      await expect(
        compressImage(invalidFile, { maxWidth: 800 })
      ).rejects.toThrow();
    });
  });
});
