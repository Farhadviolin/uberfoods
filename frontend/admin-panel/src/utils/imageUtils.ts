/**
 * Image Utility Functions
 * Verbesserte Image-Fallbacks mit lokalen Placeholders
 */

import { config } from '../config';

// Liefert Environment-Variablen auch in Jest (ohne import.meta Support)
const env =
  (() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metaEnv = (globalThis as any).import?.meta?.env;
      return metaEnv || (globalThis as any).__TEST_ENV__ || {};
    } catch {
      // Fallback für Testumgebungen
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (globalThis as any).__TEST_ENV__ || {};
    }
  })() as Record<string, string | undefined>;

/**
 * Generiert eine SVG Placeholder-Image als Data URL
 * Verwendet lokale Placeholder statt externe URLs
 */
export function generatePlaceholderImage(
  text: string = 'No Image',
  width: number = 80,
  height: number = 80,
  backgroundColor: string = '#e0e0e0',
  textColor: string = '#999999'
): string {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, sans-serif" 
        font-size="12" 
        fill="${textColor}" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >
        ${text}
      </text>
    </svg>
  `.trim();
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Standard Placeholder-Images (vorgefertigt für Performance)
 */
export const PLACEHOLDER_IMAGES = {
  restaurant: generatePlaceholderImage('Restaurant', 80, 80),
  dish: generatePlaceholderImage('Dish', 80, 80),
  customer: generatePlaceholderImage('Customer', 80, 80),
  driver: generatePlaceholderImage('Driver', 80, 80),
  order: generatePlaceholderImage('Order', 80, 80),
  default: generatePlaceholderImage('No Image', 80, 80),
};

/**
 * Escaped eine URL für sichere Verwendung in src-Attributen
 * Verhindert XSS durch Escaping von gefährlichen Zeichen
 */
function escapeUrlForSrc(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  // Erlaube ausschließlich https, http (optional), oder data:image
  const lowerUrl = url.toLowerCase().trim();
  const allowedProtocol =
    lowerUrl.startsWith('https://') ||
    lowerUrl.startsWith('http://') ||
    lowerUrl.startsWith('data:image');

  if (!allowedProtocol) {
    return '';
  }
  
  // Erlaube nur data:image für Placeholder
  if (lowerUrl.startsWith('data:image')) {
    // Validiere data:image URLs
    if (!lowerUrl.match(/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/)) {
      return '';
    }
    return url;
  }
  
  // Escaped gefährliche Zeichen in URLs
  return url.replace(/[<>'"]/g, '');
}

/**
 * Erstellt eine vollständige Image-URL mit Fallback
 */
export function getImageUrl(
  imageUrl: string | null | undefined,
  type: 'restaurant' | 'dish' | 'customer' | 'driver' | 'order' | 'default' = 'default'
): string {
  if (!imageUrl) {
    return PLACEHOLDER_IMAGES[type];
  }
  
  // Wenn bereits vollständige URL (http/https), validiere sie
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    // Grundlegende Validierung: Prüfe auf gefährliche Protokolle
    try {
      const url = new URL(imageUrl);
      // Erlaube nur https (oder http, falls explizit freigegeben)
      const allowHttp = (env.VITE_ALLOW_HTTP_IMAGES ?? 'false') === 'true';
      if (!['https:'].includes(url.protocol) && !(allowHttp && url.protocol === 'http:')) {
        return PLACEHOLDER_IMAGES[type];
      }
      const hostname = url.hostname.toLowerCase();
      const allowedHostsEnv = env.VITE_IMAGE_HOST_WHITELIST || '';
      const allowedHosts = allowedHostsEnv
        .split(',')
        .map(h => h.trim().toLowerCase())
        .filter(Boolean);
      const isSameOrigin = typeof window !== 'undefined' && url.origin === window.location.origin;
      const isAllowedHost = allowedHosts.length > 0 && allowedHosts.includes(hostname);
      // Blockiere private/localhost in Production
      const isPrivate =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.');
      if (isPrivate && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        return PLACEHOLDER_IMAGES[type];
      }
      if (isSameOrigin || isAllowedHost) {
        // Escaped URL für sichere Verwendung
        return escapeUrlForSrc(imageUrl);
      }
      return PLACEHOLDER_IMAGES[type];
    } catch {
      // Ungültige URL
      return PLACEHOLDER_IMAGES[type];
    }
  }
  
  // Relative URL - mit API URL kombinieren
  const baseUrl = config.apiUrl.replace(/\/$/, ''); // Entferne trailing slash
  const cleanImageUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  
  // Escaped auch relative URLs
  return escapeUrlForSrc(`${baseUrl}${cleanImageUrl}`);
}

/**
 * Image Error Handler - verwendet lokale Placeholder
 */
export function handleImageError(
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  type: 'restaurant' | 'dish' | 'customer' | 'driver' | 'order' | 'default' = 'default'
): void {
  const img = event.target as HTMLImageElement;
  img.src = PLACEHOLDER_IMAGES[type];
  img.onerror = null; // Verhindere Endlosschleife
}

/**
 * Prüft ob eine Image-URL gültig ist
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  // Prüfe auf gültige Image-Formate
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const lowerUrl = url.toLowerCase();
  
  return imageExtensions.some(ext => lowerUrl.includes(ext)) || 
         url.startsWith('data:image') ||
         url.startsWith('http://') ||
         url.startsWith('https://');
}

/**
 * Validiert ein Bild-File
 */
export function validateImage(file: File): { valid: boolean; error?: string } {
  // Prüfe Dateityp
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Ungültiger Dateityp. Nur JPEG, PNG, WebP und GIF sind erlaubt.',
    };
  }

  // Prüfe Dateigröße (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Datei ist zu groß. Maximal 5MB erlaubt.',
    };
  }

  return { valid: true };
}

/**
 * Verarbeitet und komprimiert ein Bild
 */
export async function processImage(
  file: File,
  options: { maxWidth: number; maxHeight: number; quality: number }
): Promise<{ valid: boolean; compressedFile?: File; error?: string }> {
  try {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          // Berechne neue Dimensionen
          let { width, height } = img;
          const { maxWidth, maxHeight, quality } = options;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }
          
          // Erstelle Canvas für Komprimierung
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve({
              valid: false,
              error: 'Canvas-Kontext konnte nicht erstellt werden.',
            });
            return;
          }
          
          // Zeichne Bild auf Canvas
          ctx.drawImage(img, 0, 0, width, height);
          
          // Konvertiere zu Blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve({
                  valid: false,
                  error: 'Fehler bei der Bildkomprimierung.',
                });
                return;
              }
              
              // Erstelle neues File-Objekt
              const compressedFile = new File(
                [blob],
                file.name,
                {
                  type: file.type,
                  lastModified: Date.now(),
                }
              );
              
              resolve({
                valid: true,
                compressedFile,
              });
            },
            file.type,
            quality
          );
        };
        
        img.onerror = () => {
          resolve({
            valid: false,
            error: 'Fehler beim Laden des Bildes.',
          });
        };
        
        if (e.target?.result) {
          img.src = e.target.result as string;
        }
      };
      
      reader.onerror = () => {
        resolve({
          valid: false,
          error: 'Fehler beim Lesen der Datei.',
        });
      };
      
      reader.readAsDataURL(file);
    });
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler bei der Bildverarbeitung.',
    };
  }
}

/**
 * Erstellt eine Preview-URL für ein Bild
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Fehler beim Erstellen der Vorschau.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Fehler beim Lesen der Datei.'));
    };
    
    reader.readAsDataURL(file);
  });
}
