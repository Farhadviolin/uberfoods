/**
 * Image Optimization Utilities
 * For lazy loading, responsive images, and optimization
 */

/**
 * Creates a responsive image srcset
 */
export function createSrcSet(
  baseUrl: string,
  widths: number[] = [320, 640, 960, 1280, 1920]
): string {
  return widths.map((width) => `${baseUrl}?w=${width} ${width}w`).join(', ');
}

/**
 * Lazy loads an image
 */
export function lazyLoadImage(
  img: HTMLImageElement,
  src: string,
  placeholder?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (placeholder) {
      img.src = placeholder;
    }

    const imageLoader = new Image();
    imageLoader.onload = () => {
      img.src = src;
      resolve();
    };
    imageLoader.onerror = reject;
    imageLoader.src = src;
  });
}

/**
 * Preloads an image
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Gets optimal image size based on viewport
 */
export function getOptimalImageSize(
  containerWidth: number,
  devicePixelRatio: number = window.devicePixelRatio || 1
): number {
  const optimalWidth = containerWidth * devicePixelRatio;
  
  // Round to nearest standard size
  const sizes = [320, 640, 960, 1280, 1920, 2560];
  return sizes.find((size) => size >= optimalWidth) || sizes[sizes.length - 1];
}

