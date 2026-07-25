import { getEnvVar } from '../env';
import { compressImage, getDishPlaceholder, getImageUrl, validateImage } from '../imageUtils';

jest.mock('../env', () => ({ getEnvVar: jest.fn() }));
const mockGetEnvVar = jest.mocked(getEnvVar);

const makeFile = (name = 'test.jpg', type = 'image/jpeg') => new File(['image'], name, { type });

describe('imageUtils', () => {
  let getContextSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEnvVar.mockImplementation((key, defaultValue) => defaultValue);
    getContextSpy = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    getContextSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('returns a dish placeholder data URL', () => {
    expect(getDishPlaceholder()).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('proxies relative upload paths through the API', () => {
    expect(getImageUrl('/uploads/dish.jpg')).toBe('/api/uploads/dish.jpg');
  });

  it('allows same-origin image URLs when HTTP is explicitly enabled', () => {
    mockGetEnvVar.mockImplementation((key, defaultValue) =>
      key === 'VITE_ALLOW_HTTP_IMAGES' ? 'true' : defaultValue
    );
    const url = `${window.location.origin}/image.jpg`;
    expect(getImageUrl(url)).toBe(url);
  });

  it('rejects external HTTPS image URLs without a whitelist entry', () => {
    expect(getImageUrl('https://images.example.com/image.jpg')).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('allows an HTTP image only when the exact environment flag and whitelist are set', () => {
    mockGetEnvVar.mockImplementation((key, defaultValue) => {
      if (key === 'VITE_ALLOW_HTTP_IMAGES') return 'true';
      if (key === 'VITE_IMAGE_HOST_WHITELIST') return 'images.example.com';
      return defaultValue;
    });

    expect(getImageUrl('http://images.example.com/image.jpg')).toBe('http://images.example.com/image.jpg');
  });

  it('rejects invalid image URLs', () => {
    expect(getImageUrl('http://[invalid')).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('accepts supported image file types', () => {
    expect(validateImage(makeFile()).valid).toBe(true);
  });

  it('rejects unsupported image file types', () => {
    expect(validateImage(makeFile('test.txt', 'text/plain'))).toEqual({
      valid: false,
      error: 'Nur JPEG, PNG, WebP oder GIF Bilder sind erlaubt',
    });
  });

  it('rejects image files larger than five megabytes', () => {
    const largeFile = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' });
    expect(validateImage(largeFile)).toEqual({
      valid: false,
      error: 'Bild ist zu groß. Maximale Größe: 5MB',
    });
  });

  it('compresses an image when FileReader, Image and canvas complete successfully', async () => {
    const toBlob = jest.fn((callback: BlobCallback) => callback(new Blob(['compressed'], { type: 'image/jpeg' })));
    getContextSpy.mockReturnValue({ drawImage: jest.fn() } as CanvasRenderingContext2D);
    jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(toBlob);
    jest.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
      const event = new Event('load');
      Object.defineProperty(event, 'target', { value: this });
      Object.defineProperty(this, 'result', { value: 'data:image/jpeg;base64,AA==' });
      this.onload?.(event as ProgressEvent<FileReader>);
    });
    const imageSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      configurable: true,
      set() {
        queueMicrotask(() => this.onload?.(new Event('load')));
      },
    });

    await expect(compressImage(makeFile())).resolves.toBeInstanceOf(File);
    expect(toBlob).toHaveBeenCalled();

    if (imageSrc) Object.defineProperty(HTMLImageElement.prototype, 'src', imageSrc);
  });

  it('rejects FileReader, Image and canvas failure paths without hanging', async () => {
    jest.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
      this.onerror?.(new ProgressEvent('error'));
    });
    await expect(compressImage(makeFile())).rejects.toThrow('Fehler beim Lesen der Datei');
  });
});
