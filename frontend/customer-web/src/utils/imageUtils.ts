/**
 * Image Upload Utilities - Kompression und Validierung
 */

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  file?: File;
}

/**
 * Validiert ein Bild-File
 */
export function validateImage(file: File): ImageValidationResult {
  // Prüfe Dateityp
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Nur JPEG, PNG, WebP oder GIF Bilder sind erlaubt',
    };
  }

  // Prüfe Dateigröße (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Bild ist zu groß. Maximale Größe: 5MB',
    };
  }

  return { valid: true, file };
}

/**
 * Komprimiert ein Bild
 */
export function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Berechne neue Dimensionen
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          } else {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context nicht verfügbar'));
          return;
        }

        // Zeichne Bild auf Canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Konvertiere zu Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Komprimierung fehlgeschlagen'));
              return;
            }

            // Erstelle neues File-Objekt
            const compressedFile = new File(
              [blob],
              file.name,
              { type: file.type, lastModified: Date.now() }
            );

            resolve(compressedFile);
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error('Fehler beim Laden des Bildes'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei'));
    reader.readAsDataURL(file);
  });
}

/**
 * Erstellt eine Vorschau-URL für ein Bild
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Fehler beim Erstellen der Vorschau'));
      }
    };
    reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei'));
    reader.readAsDataURL(file);
  });
}

/**
 * Validiert und komprimiert ein Bild
 */
export async function processImage(
  file: File,
  options?: { maxWidth?: number; maxHeight?: number; quality?: number }
): Promise<ImageValidationResult & { compressedFile?: File }> {
  // Validiere zuerst
  const validation = validateImage(file);
  if (!validation.valid) {
    return validation;
  }

  try {
    // Komprimiere Bild
    const compressedFile = await compressImage(
      file,
      options?.maxWidth,
      options?.maxHeight,
      options?.quality
    );

    return {
      valid: true,
      file: compressedFile,
      compressedFile,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Fehler bei der Bildverarbeitung';
    return {
      valid: false,
      error: errorMessage,
    };
  }
}

/**
 * Erstellt eine Image-URL, die über den API-Proxy lädt (verhindert CORS-Probleme)
 */
export function getImageUrl(imagePath?: string | null): string {
  if (!imagePath) {
    return getPlaceholderImage();
  }

  // Wenn die URL bereits vollständig ist (http/https), prüfe sie grundlegend
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    // Grundlegende Validierung: Prüfe auf gefährliche Protokolle
    try {
      const url = new URL(imagePath);
      const allowHttp = (import.meta.env.VITE_ALLOW_HTTP_IMAGES ?? 'false') === 'true';
      if (!['https:'].includes(url.protocol) && !(allowHttp && url.protocol === 'http:')) {
        return getPlaceholderImage();
      }
      const hostname = url.hostname.toLowerCase();
      const allowedHostsEnv = import.meta.env.VITE_IMAGE_HOST_WHITELIST || '';
      const allowedHosts = allowedHostsEnv.split(',').map(h => h.trim().toLowerCase()).filter(Boolean);
      const isSameOrigin = typeof window !== 'undefined' && url.origin === window.location.origin;
      const isAllowedHost = allowedHosts.length > 0 && allowedHosts.includes(hostname);
      const isPrivate =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.');
      if (isPrivate && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        return getPlaceholderImage();
      }
      if (isSameOrigin || isAllowedHost) {
        return imagePath;
      }
      return getPlaceholderImage();
    } catch {
      // Ungültige URL
      return getPlaceholderImage();
    }
  }

  // Wenn die URL mit /uploads beginnt, verwende den API-Proxy
  if (imagePath.startsWith('/uploads/')) {
    return `/api${imagePath}`;
  }

  // Wenn die URL relativ ist, füge /api hinzu
  if (imagePath.startsWith('/')) {
    return `/api${imagePath}`;
  }

  // Andernfalls füge /api/uploads/ hinzu (Standard-Upload-Pfad)
  return `/api/uploads/${imagePath}`;
}

/**
 * Erstellt ein Placeholder-Bild als Data-URL
 */
export function getPlaceholderImage(text: string = 'Bild', width: number = 300, height: number = 200): string {
  // Erstelle ein Canvas für das Placeholder-Bild
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    // Fallback: Einfache SVG Data-URL
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#F0F2F5"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#8A8D91" text-anchor="middle" dominant-baseline="middle">${text}</text>
      </svg>
    `)}`;
  }

  // Zeichne Hintergrund
  ctx.fillStyle = '#F0F2F5';
  ctx.fillRect(0, 0, width, height);

  // Zeichne Text
  ctx.fillStyle = '#8A8D91';
  ctx.font = '16px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  return canvas.toDataURL('image/png');
}

/**
 * Restaurant Placeholder
 */
export function getRestaurantPlaceholder(): string {
  return getPlaceholderImage('Restaurant', 300, 200);
}

/**
 * Dish Placeholder
 */
export function getDishPlaceholder(): string {
  return getPlaceholderImage('Gericht', 250, 150);
}
